# Email Pipeline: SPEC

## Goal

Generate and retain the complete ranked list of work-email guesses with optional deliverability checks for a target. SPECS.md sections 7 and 8 and docs/features/email-accuracy/SPEC.md define the current behavior.

## Dependencies

Foundation, auth, targets. Target creation enqueues email-guess once with targetId, userId, and generation. Later runs require the owner to POST /api/targets/[id]/guesses; edits never queue generation. The worker is a standalone Node process using BullMQ and Redis.

## Candidate generation

- Resolve the company domain from target.domain, or the provisional registrable domain of an eligible company_website, using the Public Suffix List. Notes and social profiles never supply the domain. If none is available, write no rows.
- Use nameParts() to obtain the same given and family names that outreach templates use.
- Generate the name patterns: `first.last`, `f.last`, `first`, `first_last`, `last.first`, `f_last`, `flast`, `last`, `firstlast`, `firstl`, `fl`, `initials`, `fmlast`, `first.l`, `lastf`, and `initialslast` (compound given-name initials plus the full surname). Fold accents and offer observed aliases, hyphenated given names, and alternatives for compound names and middle initials. Keep name overrides and outreach greetings unchanged.
- Extract observed biography aliases and fuller names under SPECS.md section 7.3. Preserve source snippets as candidate context; use those names only for email interpretations, without changing stored names or greetings. No nickname dictionary is used.
- Extract note addresses only at the resolved domain. Rank them using nearby positive and negative context cues and name matches; a known name pattern in notes can boost matching generated candidates.
- Deduplicate, syntax-check, and rank eligible candidates deterministically. Global priorities favor given-name-only and initial/surname patterns, tuned on the diagnostic seeds. Alternative name interpretations receive a score penalty; observed short given names in biographies can outrank the unshortened given-name guess. Direct address evidence remains strongest, and observed handles retain their fixed score. Keep the strongest pattern score for duplicate name candidates.
- Store every candidate in email_guesses with source, pattern_used, score, and optional context. No candidate receives a validity or deliverability label.

## Worker and security

- processGuessJob reloads the target in an asUser(userId, ...) transaction under tenant RLS. A missing or cross-tenant target writes nothing.
- Job payload userId scopes RLS and never substitutes for the ownership check.
- The worker locks the owned target row, deletes its old suggestions, and inserts the complete current set within the same transaction. Generation IDs and target locks reject superseded jobs and duplicate deliveries, so they cannot create duplicates or mix batches. Record the generated input fingerprint and domain in targets.email_generation. Store strictly descending positive scores as candidate count minus zero-based rank. A no-domain or empty-candidate run clears old suggestions. Optional verification runs separately after the complete ranked set is stored; it never updates primary_email.
- GET /api/targets/[id]/guesses checks the session owner and returns the last generated list ordered by score descending, with cached verification results and a stale-input hint. An edited domain does not hide that list. A foreign ID returns 404.
- `EMAILABLE_API_KEY` is an optional private server/worker key. When configured, the owner can start checks after confirming the unchecked address count, or explicitly rechecking the full list, and credit usage in a dialog; creating/editing targets and offline/demo callers do not submit checks.

## UI

- Show every suggestion in rank order with Copy actions, without pagination or a “Show more” control and unchecked or provider-result labels, including accept-all warnings and simulated-test results. A website-derived domain is provisional.
- Poll while generation is pending, including when the old list remains visible. Provide Regenerate suggestions and a quiet stale-input hint after relevant edits. If no domain can be resolved, ask the user to enter one and regenerate; a failed or empty run never proves no mailbox exists.
- The owner may set primary_email manually. The app never fills it from a guess. Outreach sending remains manual.
- Place the selected outreach email and manual input first. A suggestion's Use email action calls the same owned primary-email endpoint, without verification or regeneration. Show rank, concise status badges, check dates, and separate in-progress indicators while retaining prior results. Group regeneration/check actions and explain that rechecking uses the existing list when inputs are stale.
- Manual email entry uses the same Valibot schema as the API. Enable Use email only for valid addresses, show accessible inline validation after blur, and disable native browser validation popups. Copy feedback belongs to the clicked button and resets after two seconds, even when the same address appears in the selected summary and suggestions.
- Use distinct action icons: refresh for regeneration and badge-check for rechecking. Shared button icons are 14 px, or 12 px in extra-small buttons. Add target and New template use plus icons; Edit target uses a pencil and the same primary variant.

## Acceptance

- An out-of-domain address in notes never appears as a candidate or changes the guessed domain.
- Every candidate stays on the resolved company domain.
- Every generated candidate is persisted, including ranks beyond ten, and the list endpoint preserves the full rank order. Reruns repair previously capped lists. Existing targets get the complete set when their job next runs; editing inputs preserves the existing list until the owner regenerates it.
- A manual primary email survives a later suggestion refresh.
- Forged cross-tenant jobs and API IDs reveal or change nothing.
- `pnpm worker` starts email-guess and email-verify. Without an Emailable key it generates unchecked suggestions only.
- `node --experimental-strip-types --no-warnings scripts/check-email-worker.ts` verifies full ranked persistence, concurrent reruns, refresh, and tenant isolation against a migrated local database. It creates disposable fixtures and removes them after the check; no Redis or app server is required.

## Emailable verification

- Private-key batch submission and polling run in `workers/email-verify.ts`. Use batches of at most 1,000 to keep responses in JSON; larger candidate sets continue in subsequent batches. Check live credit availability before each submission to avoid requesting a batch that exceeds the balance.
- Store generation, progress, current batch ID, submitted addresses, test mode, and safe error text in `targets.email_check`. Store state, reason, accept-all, provider score, checked time, and test mode in targets.email_verifications, keyed by normalized address. This cache survives suggestion replacement and includes removed addresses, allowing reuse if they return. Provider scores never replace rank scores.
- Target-row locks serialize claims. Commit the submission claim before HTTP; never blindly repeat an uncertain POST. Known failed batches may resume polling through the authenticated owner-only verify route. Reject unexpected or duplicate provider addresses and incomplete final results.
- Poll with delayed BullMQ jobs; errors and a bounded processing timeout become visible failed states. Checks retain an immutable confirmed address snapshot plus remaining addresses. Edits and regeneration do not interrupt them or add addresses to subsequent chunks. Results persist for removed addresses; check-generation and batch IDs reject superseded responses.
- `node --experimental-strip-types --no-warnings scripts/check-email-verification.ts` exercises the real database and an isolated Redis database with mocked HTTP, including partial results, full-list persistence, test labels, tenant isolation, preserved primary email, cached results across ranking/domain changes, immutable consent across chunks, and no duplicate submission. It spends no live credits and cleans up fixtures.

- The verification POST requires explicit confirmation, the selected address count, and the suggestion generation ID. A changed generation/count or pending regeneration returns 409 before queuing. Default checks select unchecked addresses only; explicit rechecks select the full current list. Simulated results do not count as live checks and never overwrite live results. The UI explains live credits or simulated test mode before confirmation and uses provider-neutral wording.
