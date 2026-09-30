# Email Pipeline: SPEC

For current domain selection, verification order, and result semantics, see `docs/features/email-accuracy/SPEC.md`. The rules below describe the original pipeline where they do not conflict with that feature.

## Goal
Ranked candidates → top-k verification → `target.primary_email` (`SPECS.md` §3.3, §6.5, §7–8). No blind guessing: every verification attempt is budgeted and ordered by evidence.

## Dependencies
Foundation, targets. Trigger is `POST /api/targets` and `PATCH /api/targets/[id]` when email-search inputs are submitted. A search refresh clears prior guesses and any automatically selected address; manual overrides remain.

## Scope
- `Target` model (see `docs/features/targets/SPEC.md`): `social_urls` (max 5, plain URLs, no types), explicit optional `domain`, and `company_website` as a contact link and provisional domain source when its hostname is unambiguous.
- `EmailGuess` model per `SPECS.md` §6.5 plus ranking columns: `source` (`notes | pattern`), `score` (numeric, higher first), `context` (notes window around an extracted address, nullable). Status enum verbatim. Skip `DomainPattern` (§6.6).
- `lib/email-patterns.ts`: `generateCandidates({first_name, last_name, domain})` emitting the 6 SPEC patterns (`first.last, f.last, first, first_last, last.first, f_last`), lowercased, syntax-validated.
- The `{first_name, last_name}` handed to the ranker comes from `nameParts()` in `lib/target-name.ts`, not from a split local to the worker: the stored `first_name`/`last_name` are an override for names that do not split naively, and the fallback splits `full_name`. `features/outreach/server.ts` calls the same helper for `{{first_name}}`, so the guessed addresses and the compose greeting can never disagree about a person's name.
- `lib/email-rank.ts` (pure, unit-checked): deterministic scorer.
  - Eligible notes addresses (regex-extracted at the resolved company domain): base score highest, adjusted by context cues in a ±40-character window (positive: personal, correct, new, updated, reach me at, his/her; negative: example, e.g., like, don't, old, wrong, former, sample) and by name-in-local-part (plus, never a hard gate).
  - Pattern inference: an eligible notes address at the resolved company domain can boost its matching pattern. Notes never supply the company domain.
  - Name-pattern candidates: frequency order; patterns requiring a missing name part are omitted.
  - Social handles: last URL path segments (`github.com/foo` → `foo`) become `{handle}@{domain}` candidates (pattern `handle`, scored below `first.last`); the handle list also feeds the SLM prompt as context. Social URLs contribute no other score.
- Domain resolution: explicit `target.domain` → straightforward `company_website` hostname → no candidates (no rows, UI asks for a domain). Only notes addresses at that resolved domain can become candidates.
- `lib/queues/`: `email-guess { targetId, userId }`, `email-verify { candidateId, userId }` BullMQ definitions. The `userId` scopes tenant RLS, and workers reload rows and recheck ownership before writing.
- `workers/email-guess.ts` (guess starter): load target → resolve domain → extract + generate with evidence bundles → rank (SLM when loaded, deterministic otherwise) → insert up to 10 ranked rows → enqueue the first verify job.
- `workers/email-rank-model.ts` (backend rank stage, `node-llama-cpp`): Qwen2.5-0.5B-Instruct GGUF, one model, one context and one prompt at a time, loaded once for the process from baked weights (`HF_MODEL_CACHE`). Output shape enforced at generation level by a JSON-schema grammar over candidate indices, so unknown IDs are unrepresentable and every response parses. Input: target fields + notes + known social handles + numbered candidate IDs with evidence, via chat template. Omitted candidates keep deterministic spots; any failure falls back to deterministic order silently. The model may only reorder: unknown IDs dropped, omitted candidates keep deterministic positions, any failure falls back to deterministic order silently. The load is memoized on the in-flight promise and every rank call is chained through one queue, because the guess worker runs at concurrency 5: a guard on the resolved session lets five jobs in together and each loads its own copy of the weights.
- `workers/email-verify.ts` (verify starter): `pending → verifying` → MX or implicit-MX address check (null MX/NXDOMAIN invalid; transient DNS unknown) → verifier API → map to `valid|invalid|unknown|accept_all` per §7.4, raw response in `verification_meta` → recompute `target.primary_email` from the highest ranked valid result. A non-valid result schedules the next ranked candidate; a valid result stops the chain. Manual `primary_email` is never overwritten. Concurrency 5 across targets, rate-limit, exponential-backoff retries. A final failed job settles to `unknown`; the verifier call is bounded by a 10s timeout.
- `workers/run.ts`: one process hosting both starters (`pnpm worker`).
- Budget: verify at most `min(candidates, 10)` sequentially in rank order, stopping at the first `valid`.
- UI (in `/targets/[id]` email section): `processing` ("Finding email…", polls until settled or a 120s ceiling), `found` (address + provenance from the stored `primary_email_source` marker; verified means deliverable, not proven to belong to the person), `needs_domain` (asks for a company domain), and `not_found` (suggests manual entry or LinkedIn DM). A collapsed "What was tried" table lists attempted addresses with pattern, source, and status. Manual override stays (validated email, writes `primary_email` directly and stamps `primary_email_source = 'manual'`).
- Production: model weights baked into the worker image at build time (pinned revision); deterministic fallback stays even with baked weights.

## Security
- Workers never trust job payloads: reload `target`/`EmailGuess` from DB and confirm `user_id` chain before any read/write; mismatched or missing ownership → drop the job, write nothing. The same chain check guards the `failed`-listener recovery write.
- Jobs also run inside tenant RLS: `processGuessJob`/`processVerifyJob` wrap their reads and writes in `asUser(job.data.userId, ...)`, and the queue payload carries `userId` for that reason. The payload is a scope, not a grant: RLS can only ever narrow the worker to rows already owned by that user, and the ownership-chain re-check runs on top. A forged payload naming another tenant's target matches zero rows and the job exits.
- `primary_email` write-back stays inside the target owner's row, and the recompute additionally requires the row not be marked `manual`. Candidate-list/manual-override endpoints are `user_id`-scoped (404 on mismatch).
- CSRF is applied once in `proxy.ts` (matcher `/api/:path*`) via `isCsrfAttempt` in `lib/csrf.ts`, not repeated per handler, so a new route cannot forget it. Authentication and authorization stay in the handlers: every route still calls `getUserId()` and 404s a foreign id. A Server Action would post to its page route and bypass the matcher, so one must re-check origin itself.
- The model is resolved from the baked, revision-pinned weights in `HF_MODEL_CACHE` (a directory, resolved with `resolveModelFile(file#rev, dir)`), so the shipped worker makes no model egress at runtime.
- Verifier API key stays server-side in workers only; rate-limit verify jobs.
- `GET /api/targets/[id]/guesses` returns this target's candidates ordered by `score DESC, created_at DESC`. The stored score encodes the selected rank; the guess worker inserts a whole batch in one statement, so `created_at` alone cannot order it. The list is bounded at 10 candidates per search and is not paginated.

## Tasks
1. Schema changes in `db/schema.ts` (no new schema file): drop `profile_url`/`linkedin_url`/`github_url`, add `social_urls` + `domain`, extend `EmailGuess` with `source`/`score`/`context`; squash migrations to one fresh baseline, wipe local dev DB, re-migrate, re-seed.
2. `lib/email-rank.ts` + unit check (keyword cues, name signal, pattern boost, ordering).
3. `lib/queues/` + `POST`/`PATCH` hook wiring (already live; extend trigger to notes/domain changes).
4. Guess worker + backend SLM rank stage + verifier mapping/primary-pick helpers with direct checks.
5. Email section UI with processing/found/not-found states plus a collapsed tried-candidates table (no per-row actions).
6. Worker image bakes the pinned model; compose gains the cache env and offline flag.

## Acceptance
- Create target with `domain=acme.com` and notes mentioning `example@gmail.com` → only `@acme.com` candidates are verified; a valid result lands on `target.primary_email`.
- Notes saying "don't use X" demote X below pattern candidates.
- No company domain or eligible website → no rows, UI asks for the domain.
- Null MX or NXDOMAIN → `invalid` without API call; no MX with A/AAAA is eligible for verification.
- Unknown/missing model → deterministic order still verifies correctly.
- Forged `{ targetId }` / `{ candidateId }` for another user's rows changes nothing.
- Workers run as one process (`pnpm worker`) hosting both BullMQ workers; no worker code imported by Next.js server.

## Non-goals
`DomainPattern` learning, enrichment worker, sending, all-MiniLM-L6-v2 (bench warmer for later similarity work, e.g. duplicate-target detection), frontend inference.
