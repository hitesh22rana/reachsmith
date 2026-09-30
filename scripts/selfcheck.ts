import assert from "node:assert/strict";
import { isCrossOrigin, isCsrfAttempt } from "../lib/csrf.ts";
import { DomainSchema, OptionalUrlSchema, TargetPatchSchema } from "../features/targets/validation.ts";
import { toTargetPatch } from "../features/targets/server.ts";
// render.ts only, because it is the one templates module with no imports:
// everything reached from this script must resolve without tsconfig path
// aliases, which node --experimental-strip-types does not read.
import { parsePlaceholders, placeholderError, renderTemplate } from "../features/templates/render.ts";
import { pickDeclaredVariables, targetVariables } from "../features/outreach/server.ts";
import { nameParts } from "../lib/target-name.ts";
import { rankCandidates, resolveDomain } from "../lib/email-rank.ts";
import {
  decodeCursor,
  encodeCursor,
  keysetAfter,
  paginate,
  PaginationQuerySchema,
  MAX_LIMIT,
} from "../lib/pagination.ts";
import * as v from "valibot";

// Self-check for the security-relevant pure logic. No framework: run with
//   node --experimental-strip-types --no-warnings scripts/selfcheck.ts

const HOST = "app.example.com";
const CROSS = "https://evil.example";
const SAME = `https://${HOST}`;

// A personal address in notes cannot set the company domain or enter the
// suggestions. This is the bug that previously generated Gmail guesses.
assert.equal(rankCandidates({ first_name: "Ada", last_name: "Lovelace", notes: "Personal: example@gmail.com" }).length, 0);
assert.ok(rankCandidates({ first_name: "Ada", last_name: "Lovelace", domain: "acme.com", notes: "Personal: example@gmail.com" })
  .every((candidate) => candidate.email.endsWith("@acme.com")));
assert.equal(resolveDomain(null, "https://www.acme.com/about"), "acme.com");
assert.equal(resolveDomain(null, "https://github.com/acme"), null);
assert.equal(resolveDomain(null, "https://gmail.com"), null);
const websiteCandidates = rankCandidates({ first_name: "Ada", last_name: "Lovelace", company_website: "https://www.acme.com/about" });
assert.ok(websiteCandidates.length > 0 && websiteCandidates.every((candidate) => candidate.email.endsWith("@acme.com")));
assert.equal(v.safeParse(DomainSchema, "acme..com").success, false);
assert.equal(v.safeParse(DomainSchema, "-acme.com").success, false);

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

// Manually entered addresses remain the only source of primary_email.
const set = toTargetPatch(v.parse(TargetPatchSchema, { primary_email: "a@b.com" }));
assert.equal(set.primaryEmail, "a@b.com", "owner value stored");
assert.equal(
  toTargetPatch(v.parse(TargetPatchSchema, { primary_email: "" })).primaryEmail,
  null,
  "owner can clear the saved address",
);
assert.equal(
  toTargetPatch(v.parse(TargetPatchSchema, { company: "Acme" })).primaryEmail,
  undefined,
  "unrelated patch leaves the saved address alone",
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

// metadata is written from this, and the submitted key set is entirely
// client-controlled, so a key the template never asked for must not survive.
const declared = ["first_name", "job_title", "resume_link"];
assert.deepEqual(
  pickDeclaredVariables(
    { first_name: "Aarav", job_title: "Engineer", resume_link: "", not_declared: "x" },
    declared,
    true,
  ),
  { first_name: "Aarav", job_title: "Engineer" },
  "undeclared and empty keys are dropped when a template is chosen",
);
assert.deepEqual(
  pickDeclaredVariables({ anything: "x", __proto__: "y" }, declared, true),
  {},
  "nothing a template did not declare gets through",
);
assert.deepEqual(
  pickDeclaredVariables({ anything: "x" }, [], false),
  { anything: "x" },
  "a custom message owns its own key set",
);

// Cursors are client input: they must round-trip, and anything that is not
// exactly what the encoder emits has to decode to null so the route can 400.
const AT = new Date("2026-03-04T05:06:07.008Z");
const ID = "550e8400-e29b-41d4-a716-446655440000";
const roundTrip = decodeCursor(encodeCursor({ createdAt: AT, id: ID }));
assert.equal(roundTrip?.createdAt.toISOString(), AT.toISOString(), "cursor round-trips its timestamp");
assert.equal(roundTrip?.id, ID, "cursor round-trips its id");
assert.equal(decodeCursor(undefined), null, "no cursor decodes to null, not an epoch");
assert.equal(decodeCursor(""), null, "an empty cursor is not a position");
for (const hostile of [
  "not-a-cursor",
  "!!!!",
  "////",
  Buffer.from("2026-03-04T05:06:07.008Z", "utf8").toString("base64url"), // no id half
  Buffer.from(`2026-03-04T05:06:07.008Z.${ID}.extra`, "utf8").toString("base64url"), // trailing junk
  Buffer.from("2026-03-04T05:06:07.8Z." + ID, "utf8").toString("base64url"), // wrong precision
  Buffer.from("2026-03-04 05:06:07.008Z." + ID, "utf8").toString("base64url"), // not ISO-8601
  Buffer.from(`not-a-date.${ID}`, "utf8").toString("base64url"),
  Buffer.from("2026-13-45T99:99:99.999Z." + ID, "utf8").toString("base64url"), // shaped, not a date
  Buffer.from(`${AT.toISOString()}.${"x".repeat(65)}`, "utf8").toString("base64url"), // absurd id
  Buffer.from(`${AT.toISOString()}.\n${ID}`, "utf8").toString("base64url"), // newline
]) {
  assert.equal(decodeCursor(hostile), null, `rejected malformed cursor: ${hostile.slice(0, 32)}`);
}
// No user_id to smuggle: the id half is uuid-shaped. Scope comes from the session.
assert.equal(roundTrip && "userId" in roundTrip, false, "a decoded cursor exposes no tenant field");

// limit is bounded so one request cannot ask for the whole table.
const limitOf = (raw: string) => v.parse(PaginationQuerySchema, { limit: raw }).limit;
assert.equal(limitOf("25"), 25, "an explicit limit is honoured");
assert.equal(limitOf("1"), 1, "the minimum is allowed");
assert.equal(limitOf(String(MAX_LIMIT)), MAX_LIMIT, "the maximum is allowed");
assert.equal(v.parse(PaginationQuerySchema, {}).limit, 25, "an absent limit falls back to the default");
for (const bad of ["0", "-1", String(MAX_LIMIT + 1), "abc", "1.5", "1e3", ""]) {
  assert.equal(
    v.safeParse(PaginationQuerySchema, { limit: bad }).success,
    false,
    `rejected out-of-range limit: ${JSON.stringify(bad)}`,
  );
}

// limit + 1: the extra row only decides nextCursor, and is trimmed.
const rows = Array.from({ length: 30 }, (_, i) => ({
  id: `id-${String(i).padStart(2, "0")}`,
  createdAt: new Date(AT.getTime() - i * 1000),
}));
const full = paginate(rows, 25);
assert.equal(full.items.length, 25, "a full page is exactly the limit");
assert.ok(full.nextCursor, "a full page has a next cursor");
assert.equal(full.nextCursor, encodeCursor(rows[24]!), "the cursor points at the last row sent, not the probe");
const tail = paginate(rows.slice(25), 25);
assert.equal(tail.items.length, 5, "a short page is returned whole");
assert.equal(tail.nextCursor, null, "a short page ends the walk");
assert.equal(paginate([], 25).nextCursor, null, "an empty result has no cursor");
assert.equal(paginate(rows, MAX_LIMIT).nextCursor, null, "fewer rows than the limit is not a next page");
// Rows sharing a timestamp still page, which is what the id half is for.
const tied = Array.from({ length: 4 }, (_, i) => ({ id: `t-${i}`, createdAt: AT }));
assert.equal(paginate(tied, 3).nextCursor, encodeCursor(tied[2]!), "a shared timestamp still yields a distinct cursor");
assert.ok(keysetAfter, "the keyset predicate is constructible");

// Name tokens. The email pipeline and {{first_name}} share this, so a
// regression here changes both guessed addresses and greetings at once.
assert.deepEqual(nameParts({ fullName: "Aarav Sharma" }), { firstName: "Aarav", lastName: "Sharma" }, "two tokens split cleanly");
assert.deepEqual(nameParts({ fullName: "  Priya   Menon  " }), { firstName: "Priya", lastName: "Menon" }, "runs of whitespace collapse");
assert.deepEqual(nameParts({ fullName: "Cher" }), { firstName: "Cher" }, "a mononym has no last name, not an empty string");
assert.deepEqual(nameParts({ fullName: "Mary-Kate O'Neill" }), { firstName: "Mary-Kate", lastName: "O'Neill" }, "hyphenated given name survives");
assert.deepEqual(nameParts({ fullName: "Juan van der Berg" }), { firstName: "Juan", lastName: "van der Berg" }, "a multi-token surname stays whole");
assert.deepEqual(nameParts({ fullName: "J. Smith" }), { firstName: "J.", lastName: "Smith" }, "an initial is the given name");
// Each half falls back independently: correcting only the surname works.
assert.deepEqual(
  nameParts({ fullName: "Bae Suzy", firstName: "Suzy", lastName: "Bae" }),
  { firstName: "Suzy", lastName: "Bae" },
  "an override beats the split, which guessed the family name backwards",
);
assert.deepEqual(
  nameParts({ fullName: "Aarav Sharma", lastName: "Sharma" }),
  { firstName: "Aarav", lastName: "Sharma" },
  "correcting only the last name leaves the split to supply the first",
);
assert.deepEqual(
  nameParts({ fullName: "Aarav Sharma", firstName: "Aarav", lastName: null }),
  { firstName: "Aarav", lastName: "Sharma" },
  "a null override half falls through to the split, it is not a blank",
);
assert.deepEqual(
  nameParts({ fullName: "Cher", lastName: "  " }),
  { firstName: "Cher" },
  "a whitespace-only override is not a last name",
);
// {{first_name}} must resolve the way the pipeline does, not to "".
const GREET = targetVariables({
  fullName: "Bae Suzy",
  firstName: null,
  company: "Acme",
  roleTitle: "Engineer",
});
assert.equal(GREET.first_name, "Bae", "{{first_name}} falls back to the split, matching the pipeline");
assert.equal(GREET.last_name, "Suzy", "{{last_name}} falls back to the split, matching the pipeline");
const GREET_OVERRIDE = targetVariables({
  fullName: "Bae Suzy",
  firstName: "Suzy",
  lastName: "Bae",
  company: "Acme",
  roleTitle: "Engineer",
});
assert.equal(GREET_OVERRIDE.first_name, "Suzy", "an override still wins in the compose form");

console.log("selfcheck: ok");
