# Email Accuracy: Feature SPEC

## Goal

Offer likely work-email addresses without presenting a guess as a verified mailbox. Keep every generated candidate on the resolved company domain. The owner decides which address, if any, to use for manual outreach.

## Dependencies

Build on targets and the email-pipeline feature. SPECS.md sections 7 and 8 are the source of truth. This feature replaces the former external verification stage in the baseline schema before deployment.

## Domain boundary

1. The explicit target domain wins.
2. Otherwise derive a provisional domain only from a straightforward HTTP(S) company website hostname. Strip www; reject IPs, localhost, public mailbox providers, social sites, hosted-page domains, link shorteners, and ambiguous subdomains. Do not fetch or scrape the website.
3. Without a trustworthy domain, create no suggestions and ask the owner for the company email domain. Never fall back to Gmail or a notes address.
4. Include an address found in notes only when its domain exactly matches the resolved company domain. A personal address at another domain remains in notes but is neither a suggestion nor pattern evidence.
5. The six name patterns and social-handle candidates use nameParts() and the resolved company domain. Candidates are ranked deterministically, with no model inference.

## Ranking and storage

- Persist at most ten suggestions per target with email, pattern_used, source, score, and optional context. Higher score means higher selected rank.
- Only the email-guess BullMQ worker creates suggestion rows. It reloads the target under asUser(userId, ...) and rechecks ownership before writing. Queue payloads carry targetId and userId as scope, not authority.
- A target edit that submits name, domain, company website, notes, or social URLs clears old suggestions and enqueues a new search. Unrelated edits leave suggestions alone.
- GET /api/targets/[id]/guesses is scoped to the session owner and returns only rows matching the currently resolved domain, ordered by score descending.
- No DNS or SMTP probe, verifier API, email-verify queue, validity status, verification metadata, or automatic primary_email selection is used.

## User-facing behavior

- Show ranked suggestions with their source or pattern and a Copy action. State clearly that they are unverified.
- If the website supplied the domain, label it provisional and ask the user to confirm it before outreach.
- Keep manual email entry available, including personal addresses. A saved primary_email is an owner choice, not a validity claim.
- Poll briefly while the guess worker generates suggestions; if none appear by the ceiling, show a non-definitive message and the manual entry path. Do not say an email was not found merely because generation or the worker failed.
- Outreach remains manual: compose, copy, and mark sent or replied. A reply is user-recorded evidence of contact, not a mailbox check performed by the app.

## Schema and cleanup

- Remove email_guesses.status, email_guesses.verification_meta, the email_guess_status enum, and targets.primary_email_source from the existing baseline schema and migration. No new migration file is needed before deployment.
- Existing local test databases can be reset and migrated from the updated baseline. If adjusted in place, clear any previously automatic primary_email values before dropping provenance; preserve manually entered values.
- Exclude any legacy off-domain rows from API results. An input edit regenerates rows with current rules.
- Remove EMAIL_VERIFIER_API_KEY, the verifier queue and worker, provider mapping, verifier-only tests, and claims of automatic verification from product copy and documentation.
- Better Auth's verifications table and users.email_verified field are authentication data and must remain.

## Acceptance

- With domain acme.com and notes containing example@gmail.com, every suggestion ends in @acme.com.
- With only a Gmail address in notes and no company domain or website, there are no suggestions.
- A straightforward company website supplies a provisional domain; a social or mailbox website does not.
- Suggestions never write target.primary_email. A manually saved address remains after later suggestion refreshes.
- A fresh database from the baseline has no verifier fields, and existing local test data has no old automatic primary emails.
- A cross-tenant target ID yields no suggestions or writes. The API returns 404 for a foreign target.
- No active code reads EMAIL_VERIFIER_API_KEY or starts an email-verify worker.
