# Email Pipeline: SPEC

## Goal
Async candidates → verification → `target.primary_email` (`SPECS.md` §3.3, §6.5, §7–8).

## Dependencies
Foundation, targets. Trigger is `POST /api/targets`; if targets missing, drive workers via script with a raw `targetId`.

## Scope
- `EmailGuess` model exactly per `SPECS.md` §6.5: `user_id, target_id, email, pattern_used, status, verification_meta Json?, created_at, updated_at`. Status enum verbatim. Skip `DomainPattern` (later optimization, §6.6).
- `lib/email-patterns.ts`: pure `generateCandidates({first_name, last_name, domain})` emitting the 6 SPEC patterns (`first.last, f.last, first, first_last, last.first, f_last`), lowercased, syntax-validated.
- `lib/queues/`: `email-guess { targetId }`, `email-verify { candidateId }` BullMQ definitions; `POST /api/targets` enqueues guess (wire into targets hook point). Queue payloads carry IDs only: workers re-load and re-verify ownership.
- `workers/email-guess.ts`: load target → derive domain (`company_website` field, else manual domain on target, else skip with no rows: no company-name→domain lookup, §7.2) → generate → insert `pending` rows → enqueue one verify job each.
- `workers/email-verify.ts`: standalone Node process: `pending → verifying` → MX check (no MX → `invalid`, early exit) → verifier API → map to `valid|invalid|unknown|accept_all` per §7.4, store raw response in `verification_meta` → recompute `target.primary_email` per §7.5 (prefer `valid` by pattern frequency `first.last` first; catch-all flagged risky; none valid → leave null). Concurrency 5–10, rate-limit, exponential-backoff retries.
- UI (in `/targets/[id]` email section): "Finding email…" pending state, final `primary_email` + confidence, candidate list with statuses, manual override to set `primary_email` (override validated with `parseBody`; candidate fetching via TanStack Query).

## Security
- Workers never trust job payloads: reload `target`/`EmailGuess` from DB and confirm `user_id` chain (`EmailGuess.target.user_id`) before any read/write; mismatched or missing ownership → drop the job, write nothing.
- `primary_email` write-back must stay inside the target owner's row. Candidate-list/manual-override endpoints are `user_id`-scoped like all other `:id` routes (404 on mismatch).
- Verifier API key stays server-side in workers only; rate-limit verify jobs to respect provider limits and avoid abuse.

## Tasks
1. Drizzle table + migration.
2. `lib/email-patterns.ts` + `lib/queues/` + `POST` hook wiring.
3. Both workers + verifier client (key from `EMAIL_VERIFIER_API_KEY`, mockable offline).
4. Email section UI with pending/confidence/override states.

## Acceptance
- Create target with domain → guess rows appear → verify resolves → valid candidate lands on `target.primary_email`; no-MX domain → `invalid` without API call; unknown domain input → no rows, UI shows "email not found – try manual or LinkedIn DM".
- Workers run as separate processes (`npm run worker:email-guess`, `npm run worker:email-verify` or equivalent); no worker code imported by Next.js server.
- Forged `{ targetId }` / `{ candidateId }` for another user's rows changes nothing.

## Non-goals
`DomainPattern` learning, enrichment worker, sending.
