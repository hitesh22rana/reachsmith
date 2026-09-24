# F06 — Email Guess + Verify Pipeline

## Goal
Async candidates → verification → `target.primary_email` (`SPEC.md` §3.3, §6.5, §7–8).

## Dependencies
F01, F03. Trigger is `POST /api/targets`; if F03 missing, drive workers via script with a raw `targetId`.

## Scope
- `EmailGuess` model exactly per `SPEC.md` §6.5: `target_id, email, pattern_used, status, verification_meta Json?, created_at, updated_at`. Status enum verbatim. Skip `DomainPattern` (later optimization, §6.6).
- `lib/email-patterns.ts`: pure `generateCandidates({first_name, last_name, domain})` emitting the 6 SPEC patterns (`first.last, f.last, first, first_last, last.first, f_last`), lowercased, syntax-validated.
- `lib/queues/`: `email-guess { targetId }`, `email-verify { candidateId }` BullMQ definitions; `POST /api/targets` enqueues guess (wire into F03 hook point).
- `workers/email-guess.ts`: load target → derive domain (`company_website` field, else manual domain on target, else skip with no rows — no company-name→domain lookup, §7.2) → generate → insert `pending` rows → enqueue one verify job each.
- `workers/email-verify.ts`: standalone Node process: `pending → verifying` → MX check (no MX → `invalid`, early exit) → verifier API → map to `valid|invalid|unknown|accept_all` per §7.4, store raw response in `verification_meta` → recompute `target.primary_email` per §7.5 (prefer `valid` by pattern frequency `first.last` first; catch-all flagged risky; none valid → leave null). Concurrency 5–10, rate-limit, exponential-backoff retries.
- UI (in `/targets/[id]` email section): "Finding email…" pending state, final `primary_email` + confidence, candidate list with statuses, manual override to set `primary_email`.

## Tasks
1. Prisma model + migration.
2. `lib/email-patterns.ts` + `lib/queues/` + `POST` hook wiring.
3. Both workers + verifier client (key from `EMAIL_VERIFIER_API_KEY`, mockable offline).
4. Email section UI with pending/confidence/override states.

## Acceptance
- Create target with domain → guess rows appear → verify resolves → valid candidate lands on `target.primary_email`; no-MX domain → `invalid` without API call; unknown domain input → no rows, UI shows "email not found – try manual or LinkedIn DM".
- Workers run as separate processes (`npm run worker:email-guess`, `npm run worker:email-verify` or equivalent); no worker code imported by Next.js server.

## Non-goals
`DomainPattern` learning, enrichment worker, sending.
