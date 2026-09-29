import assert from "node:assert/strict";
import { isCrossOrigin, isCsrfAttempt } from "../lib/csrf.ts";
import { OptionalUrlSchema, TargetPatchSchema } from "../features/targets/validation.ts";
import { toTargetPatch } from "../features/targets/server.ts";
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

console.log("selfcheck: ok");
