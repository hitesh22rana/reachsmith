# Email Pipeline: SPEC

## Goal
Ranked candidates → top-k verification → `target.primary_email` (`SPECS.md` §3.3, §6.5, §7–8). No blind guessing: every verification attempt is budgeted and ordered by evidence.

## Dependencies
Foundation, targets. Trigger is `POST /api/targets` and `PATCH /api/targets/[id]` (names, domain, or notes changed); workers dedupe already-guessed addresses.

## Scope
- `Target` model (see `docs/features/targets/SPEC.md`): `social_urls` (max 5, plain URLs, no types), explicit optional `domain`, `company_website` kept as a dumb contact link with no pipeline role. No website-based domain derivation.
- `EmailGuess` model per `SPECS.md` §6.5 plus ranking columns: `source` (`notes | pattern | domain_inferred`), `score` (numeric, higher first), `context` (notes window around an extracted address, nullable). Status enum verbatim. Skip `DomainPattern` (§6.6).
- `lib/email-patterns.ts`: `generateCandidates({first_name, last_name, domain})` emitting the 6 SPEC patterns (`first.last, f.last, first, first_last, last.first, f_last`), lowercased, syntax-validated.
- `lib/email-rank.ts` (pure, unit-checked): deterministic scorer.
  - Notes addresses (regex-extracted): base score highest, adjusted by context cues in a ±6-word window (positive: personal, correct, new, updated, reach me at, his/her; negative: example, e.g., like, don't, old, wrong, former, sample) and by name-in-local-part (plus, never a hard gate).
  - Pattern inference: a notes address parsing as a known pattern boosts that pattern for generated candidates; its domain feeds domain resolution.
  - Name-pattern candidates: frequency order, scaled by name completeness (full first+last beats first-only).
  - Social handles: last URL path segments (`github.com/foo` → `foo`) become `{handle}@{domain}` candidates (pattern `handle`, scored below `first.last`, preferred in primary pick); the handle list also feeds the SLM prompt as context. Social URLs contribute no other score.
- Domain resolution (first hit wins): explicit `target.domain` → domain parsed from a notes-extracted address → no candidates (no rows, UI shows not-found).
- `lib/queues/`: `email-guess { targetId }`, `email-verify { candidateId }` BullMQ definitions. Payloads carry IDs only; workers re-load and re-verify ownership.
- `workers/email-guess.ts`: standalone Node process. Load target → resolve domain → extract + generate with evidence bundles → rank (SLM when loaded, deterministic otherwise) → insert rows → enqueue verify jobs in rank order.
- `workers/email-rank-model.ts` (backend rank stage, `node-llama-cpp`): Qwen2.5-0.5B-Instruct GGUF, loaded once at worker startup from baked weights (`HF_MODEL_CACHE`). Output shape enforced at generation level by a JSON-schema grammar over candidate indices, so unknown IDs are unrepresentable and every response parses. Input: target fields + notes + known social handles + numbered candidate IDs with evidence, via chat template. Omitted candidates keep deterministic spots; any failure falls back to deterministic order silently. The model may only reorder: unknown IDs dropped, omitted candidates keep deterministic positions, any failure falls back to deterministic order silently.
- `workers/email-verify.ts`: standalone Node process. `pending → verifying` → MX check (no MX → `invalid`, no API call) → verifier API → map to `valid|invalid|unknown|accept_all` per §7.4, raw response in `verification_meta` → recompute `target.primary_email` per §7.5 (valid only, `first.last` first; anything else leaves the target untouched). Concurrency 5, rate-limit, exponential-backoff retries.
- Budget: verify top `min(candidates, 10)` in rank order, stop at the first `valid`.
- UI (in `/targets/[id]` email section): `processing` ("Finding email…", polls until settled), `found` (address + provenance: verified pattern / notes-sourced / manual / risky catch-all), `not_found` ("try manual entry or LinkedIn DM"). A collapsed "What was tried" table lists attempted addresses with pattern, source, and status. Manual override stays (validated email, writes `primary_email` directly).
- Production: model weights baked into the worker image at build time (pinned revision); deterministic fallback stays even with baked weights.

## Security
- Workers never trust job payloads: reload `target`/`EmailGuess` from DB and confirm `user_id` chain before any read/write; mismatched or missing ownership → drop the job, write nothing.
- `primary_email` write-back stays inside the target owner's row. Candidate-list/manual-override endpoints are `user_id`-scoped (404 on mismatch).
- Verifier API key stays server-side in workers only; rate-limit verify jobs.

## Tasks
1. Schema changes in `db/schema.ts` (no new schema file): drop `profile_url`/`linkedin_url`/`github_url`, add `social_urls` + `domain`, extend `EmailGuess` with `source`/`score`/`context`; squash migrations to one fresh baseline, wipe local dev DB, re-migrate, re-seed.
2. `lib/email-rank.ts` + unit check (keyword cues, name signal, pattern boost, ordering).
3. `lib/queues/` + `POST`/`PATCH` hook wiring (already live; extend trigger to notes/domain changes).
4. Guess worker + backend SLM rank stage + verifier mapping/primary-pick helpers with direct checks.
5. Email section UI with processing/found/not-found states (candidate list removed).
6. Worker image bakes the pinned model; compose gains the cache env and offline flag.

## Acceptance
- Create target with domain + notes mentioning a personal address → notes address ranks first → verify resolves → valid lands on `target.primary_email`.
- Notes saying "don't use X" demote X below pattern candidates.
- No domain anywhere → no rows, UI shows not-found.
- No-MX domain → `invalid` without API call.
- Unknown/missing model → deterministic order still verifies correctly.
- Forged `{ targetId }` / `{ candidateId }` for another user's rows changes nothing.
- Workers run as one process (`pnpm worker`) hosting both BullMQ workers; no worker code imported by Next.js server.

## Non-goals
`DomainPattern` learning, enrichment worker, sending, all-MiniLM-L6-v2 (bench warmer for later similarity work, e.g. duplicate-target detection), frontend inference.
