# Email Pipeline: SPEC

## Goal

Generate and retain the complete ranked list of unverified work-email suggestions for a target. SPECS.md sections 7 and 8 and docs/features/email-accuracy/SPEC.md define the current behavior.

## Dependencies

Foundation, auth, targets. Target creation and search-input edits enqueue email-guess with targetId and userId. The worker is a standalone Node process using BullMQ and Redis.

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
- The worker locks the owned target row, deletes its old suggestions, and inserts the complete current set within the same transaction. Concurrent reruns serialize, so they cannot create duplicates or mix batches. Store strictly descending positive scores as candidate count minus zero-based rank. A no-domain or empty-candidate run clears old suggestions. There is no verifier queue, provider call, SMTP probe, or automatic primary_email update.
- GET /api/targets/[id]/guesses checks the session owner and returns only current-domain candidates ordered by score descending. A foreign ID returns 404.
- The verifier API key is not an environment variable.

## UI

- Show every suggestion in rank order with Copy actions, without pagination or a “Show more” control and an explicit unverified label. A website-derived domain is provisional.
- If no domain can be resolved, ask the user to enter one. If no suggestions appear before the poll ceiling, avoid claiming no mailbox exists.
- The owner may set primary_email manually. The app never fills it from a guess. Outreach sending remains manual.

## Acceptance

- An out-of-domain address in notes never appears as a candidate or changes the guessed domain.
- Every candidate stays on the resolved company domain.
- Every generated candidate is persisted, including ranks beyond ten, and the list endpoint preserves the full rank order. Reruns repair previously capped lists. Existing targets get the complete set when their job next runs; saving email-search inputs in the edit dialog enqueues a refresh.
- A manual primary email survives a later suggestion refresh.
- Forged cross-tenant jobs and API IDs reveal or change nothing.
- pnpm worker starts only email-guess and requires no verifier API key.
- `node --experimental-strip-types --no-warnings scripts/check-email-worker.ts` verifies full ranked persistence, concurrent reruns, refresh, and tenant isolation against a migrated local database. It creates disposable fixtures and removes them after the check; no Redis or app server is required.
