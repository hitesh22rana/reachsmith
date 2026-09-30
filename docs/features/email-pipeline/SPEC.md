# Email Pipeline: SPEC

## Goal

Generate up to ten ranked, unverified work-email suggestions for a target. SPECS.md sections 7 and 8 and docs/features/email-accuracy/SPEC.md define the current behavior.

## Dependencies

Foundation, auth, targets. Target creation and search-input edits enqueue email-guess with targetId and userId. The worker is a standalone Node process using BullMQ and Redis.

## Candidate generation

- Resolve the company domain from target.domain, or an eligible company_website hostname. Notes and social profiles never supply the domain. If none is available, write no rows.
- Use nameParts() to obtain the same given and family names that outreach templates use.
- Generate the six name patterns: first.last, f.last, first, first_last, last.first, f_last. Include observed social handles at the company domain.
- Extract note addresses only at the resolved domain. Rank them using nearby positive and negative context cues and name matches; a known name pattern in notes can boost matching generated candidates.
- Deduplicate, syntax-check, and rank eligible candidates. The locally hosted Qwen 0.5B model may reorder them. It loads once, serializes prompts, and falls back to deterministic ranking on failure. The model only reorders supplied candidate IDs.
- Store the top ten in email_guesses with source, pattern_used, score, and optional context. No candidate receives a validity or deliverability label.

## Worker and security

- processGuessJob reloads the target in an asUser(userId, ...) transaction under tenant RLS. A missing or cross-tenant target writes nothing.
- Job payload userId scopes RLS and never substitutes for the ownership check.
- The worker inserts rows and stops. There is no verifier queue, provider call, SMTP probe, or automatic primary_email update.
- The model is baked into the worker image at a pinned revision; deterministic fallback works without it.
- GET /api/targets/[id]/guesses checks the session owner and returns only current-domain candidates ordered by score descending. A foreign ID returns 404.
- The verifier API key is not an environment variable.

## UI

- Show suggestions in rank order with Copy actions and an explicit unverified label. A website-derived domain is provisional.
- If no domain can be resolved, ask the user to enter one. If no suggestions appear before the poll ceiling, avoid claiming no mailbox exists.
- The owner may set primary_email manually. The app never fills it from a guess. Outreach sending remains manual.

## Acceptance

- An out-of-domain address in notes never appears as a candidate or changes the guessed domain.
- A candidate cannot cross the company-domain boundary even when the model reorders.
- The first ten persisted rows reflect the selected rank and the list endpoint preserves it.
- A manual primary email survives a later suggestion refresh.
- Forged cross-tenant jobs and API IDs reveal or change nothing.
- pnpm worker starts only email-guess and requires no verifier API key.
