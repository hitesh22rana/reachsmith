# Email Accuracy: Feature SPEC

## Goal
Find a target's company email with evidence that supports the result. Never turn an unrelated notes address or a public mailbox domain into a company guessing domain. Do not claim that mailbox deliverability proves the mailbox belongs to the target.

## Dependencies and source of truth
Build on `docs/features/email-pipeline/SPEC.md` and `SPECS.md` §7-8. This feature supersedes their notes-domain fallback, all-at-once verification, and MX-only rejection. Keep the existing schema, enum values, ownership rules, workers, and manual override precedence. No migration or new model is required.

## Domain and candidate rules
1. `target.domain` is authoritative when present. Normalize lowercase. Generate and verify company candidates only at this domain.
2. Otherwise use `target.company_website` only when it is an HTTP(S) URL with a straightforward company hostname. Strip `www`; reject IPs, localhost, public email providers, and hosting/social/link shortener domains. Ambiguous hosts (for example a deep subdomain or public suffix case) require an explicit domain. Do not fetch the site or scrape search results. A website-derived domain is provisional and is not persisted over the user's `domain` field.
3. With neither trustworthy source, generate no candidates, spend no verifier credits, and tell the user to enter the company's email domain. Never fall back to Gmail or another domain found in notes.
4. Notes addresses are candidates only if their domain equals the resolved company domain. Other addresses can remain in notes as context but must never be verified or used as pattern evidence. `example@gmail.com` with `domain=acme.com` must yield only `@acme.com` candidates. If both fields are absent, it yields no candidates.
5. Keep six name patterns and social-handle candidates. Continue using `nameParts()` for name tokens. The model may reorder eligible candidates only; it cannot admit a candidate from another domain.

## Verification and selection
1. Persist the selected rank for each new candidate in the existing `score` column. Verify in that order, one candidate at a time for each target, with a maximum of 10 attempts. Stop launching candidates after the first `valid` and remove the unattempted pending rows. A search-input edit clears prior guesses before regenerating candidates; unrelated edits do not restart the search.
2. Interpret QuickEmailVerification's `result`, `safe_to_send`, `accept_all`, `disposable`, and `role` fields using their documented boolean representations, including string booleans. `valid` requires an affirmative safe-to-send result and no catch-all, disposable, or role flag. Catch-all is `accept_all`; invalid/disposable is `invalid`; missing or contradictory information is `unknown`. Preserve the raw response in `verification_meta`. Do not label an address as belonging to the target based solely on verifier output.
3. DNS: a null MX or proven nonexistent domain is invalid; an empty MX answer must check A/AAAA under SMTP's implicit-MX rule; temporary DNS errors remain `unknown` or retry. Never turn a DNS timeout into `invalid`.
4. A valid winner writes `primary_email` only when `primary_email_source` is not `manual`. Recompute by persisted candidate rank, not static pattern preference or job completion order. A later result cannot replace a better ranked valid candidate. A changed explicit or website-derived domain must not leave an old automatically verified address displayed as a current company result.
5. Provider network failures retry under the existing bounded BullMQ policy. After final failure, settle the row to `unknown` and continue to the next eligible candidate. The worker rechecks target/guess ownership inside tenant RLS before every write.

## User-facing behavior
- When no company domain can be resolved, show "Add the company's email domain to find a work address" instead of "email not found".
- Distinguish manually entered, verified deliverable, catch-all/uncertain, and invalid statuses. Say "Verified deliverable" rather than "correct email" or "belongs to this person". Verification is mailbox evidence, not identity proof.
- Keep manual entry available, including personal addresses. A manual address remains an owner decision and is not subject to the company-domain rule.
- Once settled, keep the candidate list limited to attempted addresses from the resolved company domain. Explain that a website-suggested domain is provisional if surfaced to the user.

## Implementation boundaries
- Change the existing ranker, guess worker, verification helpers/worker, and email section. Reuse existing `domain`, `company_website`, `score`, `status`, `verification_meta`, and `primary_email_source` fields. No schema migration, new service, custom trained model, or LinkedIn scraping.
- Every target query and write stays scoped to `user_id` under `asUser()`. Candidate ownership must be checked against the target; mismatches write nothing. API routes preserve 404 for foreign IDs.
- Keep the baked Qwen ranker as an optional reorder stage with deterministic fallback. Do not fine-tune until measured candidate coverage and ranking errors justify it.

## Acceptance checks
- Explicit `acme.com` plus notes containing `example@gmail.com` produces no Gmail candidates and no Gmail verifier calls.
- Gmail-only notes and no company domain or website produce no candidates or verifier calls.
- `https://www.acme.com/about` without explicit domain produces `@acme.com` candidates; ambiguous/public-platform URLs do not supply a domain.
- A provider response with string `safe_to_send: "true"` is interpreted correctly; catch-all and role flags prevent a `valid` verdict.
- No-MX with A/AAAA does not get rejected solely for missing MX. Null MX and NXDOMAIN are invalid; temporary DNS failure is not.
- Only the next ranked candidate is scheduled after a non-valid result; the first valid candidate stops the chain. The chosen primary follows saved rank and manual overrides survive.
- A domain edit removes an old automatically selected address from the current result. Jobs from another tenant cannot read or write rows.
