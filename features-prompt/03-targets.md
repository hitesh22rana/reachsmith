# F03 — Targets CRUD

## Goal
Contact list + detail foundation (`SPEC.md` §3.1, §6.2, §9.2–9.4).

## Dependencies
F01 (+ F02 for `user_id`; if F02 missing, hardcode a stub `user_id` constant with a `// TODO(auth)` marker).

## Scope
- `Target` model exactly per `SPEC.md` §6.2: `full_name, first_name?, last_name?, company?, role_title?, primary_email?, profile_url?, source_type, enrichment_status, notes?, created_at, updated_at` (+ optional `location, company_website, github_url, linkedin_url, extra_enrichment Json?` only if trivial).
- APIs: `GET/POST /api/targets`, `GET/PATCH/DELETE /api/targets/[id]`. `POST` validates `full_name` required; sets `enrichment_status: not_started`. `DELETE` cascades to `EmailGuess`/`Outreach` rows if those tables exist, else just deletes target (add cascade when F05/F06 land).
- UI: `/targets` table (name, company, role, primary_email or "—", latest outreach status or "No outreach yet"), add-target modal (fields per §9.3), `/targets/[id]` detail (header, contact info/notes, placeholders for email-candidates + outreach history sections owned by F05/F06).
- `POST /api/targets` must enqueue `email-guess { targetId }` if `lib/queues/` exists; otherwise leave a clearly marked hook point (`// TODO(F06): enqueue email-guess`) — do not build queues here.

## Tasks
1. Prisma model + migration.
2. API routes with `user_id` scoping + validation.
3. Table + modal + detail page with empty states.

## Acceptance
- Create (modal + manual form) → appears in table → detail renders → edit notes → delete removes row.
- `POST` without `full_name` → 400. `DELETE` removes owned target; other users' rows invisible.

## Non-goals
Enrichment jobs, email guessing UI, outreach compose (placeholders only).
