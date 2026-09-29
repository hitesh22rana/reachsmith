import assert from "node:assert/strict";
import { isCrossOrigin, isCsrfAttempt } from "../lib/csrf.ts";
import { OptionalUrlSchema, TargetPatchSchema } from "../features/targets/validation.ts";
import { toTargetPatch } from "../features/targets/server.ts";
// render.ts only, because it is the one templates module with no imports:
// everything reached from this script must resolve without tsconfig path
// aliases, which node --experimental-strip-types does not read.
import { parsePlaceholders, placeholderError, renderTemplate } from "../features/templates/render.ts";
import * as v from "valibot";

// Self-check for the security-relevant pure logic. No framework: run with
//   node --experimental-strip-types --no-warnings scripts/selfcheck.ts

const HOST = "app.example.com";
const CROSS = "https://evil.example";
const SAME = `https://${HOST}`;

// CSRF: only a present-and-foreign Origin is rejected.
assert.equal(isCrossOrigin(null, HOST), false, "missing Origin allowed (non-browser client)");
assert.equal(isCrossOrigin(SAME, HOST), false, "same origin allowed");
assert.equal(isCrossOrigin(CROSS, HOST), true, "cross origin rejected");
assert.equal(isCrossOrigin("null", HOST), true, "opaque origin rejected");
assert.equal(isCrossOrigin("not-a-url", HOST), true, "unparseable origin rejected");
assert.equal(
  isCrossOrigin(`https://${HOST}:8443`, HOST),
  true,
  "same host, different port rejected",
);
assert.equal(isCrossOrigin(SAME, null), true, "no host header is not a match");
assert.equal(
  isCrossOrigin(SAME, `https://${HOST}`),
  true,
  "host header is host:port, not the full origin",
);

// The proxy is the only CSRF gate now, so this method filter is
// load-bearing. Every mutating route must be refused cross-origin and
// allowed same-origin; every read must pass either way.
const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ["POST", "/api/targets"],
  ["GET", "/api/targets"],
  ["PATCH", "/api/targets/t1"],
  ["DELETE", "/api/targets/t1"],
  ["PATCH", "/api/targets/t1/primary-email"],
  ["GET", "/api/targets/t1/guesses"],
  ["POST", "/api/outreach"],
  ["GET", "/api/outreach"],
  ["PATCH", "/api/outreach/o1"],
  ["POST", "/api/templates"],
  ["PATCH", "/api/templates/t1"],
  ["DELETE", "/api/templates/t1"],
  ["GET", "/api/audiences"],
  ["POST", "/api/audiences"],
  ["DELETE", "/api/audiences/a1"],
  ["POST", "/api/auth/sign-in/email"],
];
for (const [method, path] of ROUTES) {
  const safe = method === "GET" || method === "HEAD" || method === "OPTIONS";
  assert.equal(
    isCsrfAttempt(method, CROSS, HOST),
    !safe,
    `${method} ${path} ${safe ? "passes through" : "rejects cross origin"}`,
  );
  assert.equal(isCsrfAttempt(method, SAME, HOST), false, `${method} ${path} allows same origin`);
  assert.equal(
    isCsrfAttempt(method, null, HOST),
    false,
    `${method} ${path} allows a non-browser client with no Origin`,
  );
}


// URL scheme: v.url() accepts these, the rendered href would execute them.
for (const hostile of [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
]) {
  assert.equal(
    v.safeParse(OptionalUrlSchema, hostile).success,
    false,
    `rejected hostile URL: ${hostile}`,
  );
}
assert.equal(v.safeParse(OptionalUrlSchema, "https://example.com").success, true, "https allowed");
assert.equal(v.safeParse(OptionalUrlSchema, "http://example.com").success, true, "http allowed");
assert.equal(v.safeParse(OptionalUrlSchema, "").success, true, "empty allowed");
assert.equal(v.safeParse(OptionalUrlSchema, undefined).success, true, "undefined allowed");

// Provenance: any owner-side write claims the column; clearing drops the marker.
const set = toTargetPatch(v.parse(TargetPatchSchema, { primary_email: "a@b.com" }));
assert.equal(set.primaryEmail, "a@b.com", "owner value stored");
assert.equal(set.primaryEmailSource, "manual", "owner write marked manual");
assert.equal(
  toTargetPatch(v.parse(TargetPatchSchema, { primary_email: "" })).primaryEmailSource,
  null,
  "clearing the email drops the marker so the pipeline may propose again",
);
assert.equal(
  toTargetPatch(v.parse(TargetPatchSchema, { company: "Acme" })).primaryEmailSource,
  undefined,
  "unrelated patch leaves the marker alone",
);

// Placeholders: any snake_case name is a variable, and nothing else is.
// Substitution is by name, so a template can ask for a field the app has
// never heard of; what it cannot do is invent one that breaks the name rule
// and then render as literal text nobody can diagnose.
const BODY = "Hi {{first_name}}, my resume is at {{resume_link}}. Also {{ resume_link }} and {{first_name}}.";
assert.equal(
  renderTemplate(BODY, {
    first_name: " Aarav ",
    resume_link: "https://example.com/a.pdf",
  }),
  "Hi Aarav, my resume is at https://example.com/a.pdf. Also https://example.com/a.pdf and Aarav.",
  "every occurrence substitutes, values are trimmed",
);
assert.equal(
  renderTemplate("Hi {{first_name}}, see {{resume_link}}", { first_name: "Aarav" }),
  "Hi Aarav, see {{resume_link}}",
  "a missing value leaves its placeholder intact",
);
assert.equal(
  renderTemplate("Hi {{ first_name }}", { first_name: "Aarav" }),
  "Hi Aarav",
  "inner whitespace is tolerated",
);
assert.equal(
  renderTemplate("Hi {{First Name}}", { FirstName: "Aarav" }),
  "Hi {{First Name}}",
  "a name outside snake_case is not substitutable",
);

const parsed = parsePlaceholders(BODY);
assert.deepEqual(
  parsed.placeholders.map((placeholder) => placeholder.name),
  ["first_name", "resume_link"],
  "placeholders are deduped in first-appearance order",
);
assert.equal(parsed.placeholders[0]?.source, "target", "first_name comes from the target");
assert.equal(parsed.placeholders[1]?.source, "input", "resume_link is filled in per message");
assert.equal(parsed.placeholders[1]?.label, "Resume link", "label is humanized");
assert.equal(parsed.issues.length, 0, "a valid body reports no issues");

// A name that is too long to label in a two-column grid still stores.
const long = parsePlaceholders("{{a_very_long_placeholder_name_here}}");
assert.equal(long.placeholders[0]?.label.endsWith("…"), true, "long labels ellipsize");
assert.equal(long.issues.length, 0, "32 characters is still a valid name");
assert.notEqual(
  placeholderError("{{a_really_long_custom_placeholder_name_here}}"),
  null,
  "41 characters is over the name limit",
);

for (const bad of ["{{First Name}}", "{{1st}}", "{{}}", "{{bad-name}}", "{{ }}"]) {
  assert.notEqual(placeholderError(bad), null, `rejected placeholder: ${bad}`);
}
assert.equal(placeholderError("{{ok_name}}"), null, "valid placeholder body accepted");

const tooMany = Array.from({ length: 51 }, (_, i) => `{{var_${i}}}`).join(" ");
assert.match(
  placeholderError(tooMany) ?? "",
  /at most 50/,
  "the 51st distinct placeholder is refused with a count",
);
assert.equal(
  placeholderError(Array.from({ length: 50 }, (_, i) => `{{var_${i}}}`).join(" ")),
  null,
  "exactly 50 is allowed",
);
// The name is reported back so the 400 can name the offender, and it is
// never a blank string for a real token.
assert.match(placeholderError("Hi {{First Name}}") ?? "", /\{\{First Name\}\}/);

console.log("selfcheck: ok");
