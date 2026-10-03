# Email Accuracy: Feature SPEC

## Goal

Offer likely work-email addresses with optional provider deliverability results, without claiming person ownership. Keep every generated candidate on the resolved company domain. The owner decides which address, if any, to use for manual outreach.

## Dependencies

Build on targets and the email-pipeline feature. SPECS.md sections 7 and 8 are the source of truth. Optional Emailable checks and generation metadata are defined in `0002_email_verification.sql`.

## Domain boundary

1. The explicit target domain wins.
2. Otherwise derive a provisional registrable domain from an HTTP(S) company website using `tldts` and the Public Suffix List, including company subdomains and multi-label suffixes. Reject IPs, localhost, reserved names, unknown suffixes, public mailbox providers, social sites, hosted/private suffixes, and link shorteners, including their subdomains. A registrable website domain is still provisional and may differ from the email domain. Do not fetch or scrape the website.
3. Without a trustworthy domain, create no suggestions and ask the owner for the company email domain. Never fall back to Gmail or a notes address.
4. Include an address found in notes only when its domain exactly matches the resolved company domain. A personal address at another domain remains in notes but is neither a suggestion nor pattern evidence.
5. The supported name patterns and social-handle candidates use nameParts() and the resolved company domain. Candidates are ranked deterministically. Biography Notes can supply observed aliases and fuller names under the constraints in SPECS.md section 7.3; those interpretations do not change greetings or stored names.

## Ranking and storage

- Persist the complete deduplicated candidate set per target with email, pattern_used, source, score, and optional context. Higher score means higher selected rank; the worker stores candidate count minus zero-based rank, so scores remain positive for any list size.
- The email-guess worker handler creates suggestion rows, through BullMQ in production or directly from the local demo seed CLI. Each run replaces the complete set in one transaction under a target row lock, including clearing stale rows when generation returns nothing. It reloads the target under asUser(userId, ...) and rechecks ownership before writing. Queue payloads carry targetId, userId, and generation; IDs scope work without replacing ownership checks.
- Creation automatically generates once. Every edit preserves suggestions and paid results. The owner manually regenerates using current target inputs; a fingerprint signals when existing suggestions reflect older inputs.
- GET /api/targets/[id]/guesses is scoped to the session owner and returns the last generated list ordered by score descending, even if the current target domain has changed.
- Optional Emailable batch results are stored separately from rank in targets.email_verifications, keyed by normalized email address. Removed addresses retain their results, returning addresses reuse them, and active checks finish their originally confirmed address list. There is no automatic primary_email selection or local SMTP probe. See the email-pipeline SPEC for queue, retries, generation, credit handling, and test-mode rules.

## User-facing behavior

- Show the complete ranked list with each source or pattern and a Copy action, without pagination or “Show more”. Label unchecked candidates and distinguish provider states, accept-all uncertainty, and simulated results. Deliverable does not establish target ownership.
- If the website supplied the domain, label it provisional and ask the user to confirm it before outreach.
- Keep manual email entry available, including personal addresses. A saved primary_email is an owner choice, not a validity claim.
- Poll while the guess worker is pending. Keep the old list visible during manual regeneration, show failures and an actionable empty state, and retain the manual entry path. Do not say an email was not found merely because generation or the worker failed.
- Outreach remains manual: compose, copy, and mark sent or replied. A reply is user-recorded evidence of contact, not a mailbox check performed by the app.

## Schema

- targets.email_generation records pending/completed/failed generation, input fingerprint, and generated domain.
- targets.email_check records verification progress, original confirmed addresses, remaining addresses, current batch, and test mode.
- targets.email_verifications is a durable normalized-address result cache independent of email_guesses. Existing results and timestamps survive regeneration; new addresses are unchecked.
- There is no guess status enum, automatic primary-email provenance, or automatic primary-email selection. Better Auth's verifications table and users.email_verified field are separate authentication data.

## Acceptance

- With domain acme.com and notes containing example@gmail.com, every suggestion ends in @acme.com.
- With only a Gmail address in notes and no company domain or website, there are no suggestions.
- A straightforward company website supplies a provisional domain; a social or mailbox website does not.
- Suggestions beyond rank ten remain stored and returned. Existing targets expand on their next guess job; manual regeneration requests it.
- Suggestions never write target.primary_email. A manually saved address remains after later suggestion refreshes.
- A migrated database includes durable target/address verification JSONB and generation metadata. Existing primary emails remain unchanged.
- A cross-tenant target ID yields no suggestions or writes. The API returns 404 for a foreign target.
- No active code reads EMAIL_VERIFIER_API_KEY. The new email-verify worker uses only the private EMAILABLE_API_KEY.
