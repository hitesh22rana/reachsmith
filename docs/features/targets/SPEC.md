# Targets: SPEC

## Goal
Contact list + detail foundation (`SPECS.md` §3.1, §6.2, §9.2–9.4).

## Dependencies
Foundation (+ auth for `user_id`; if auth missing, hardcode a stub `user_id` constant with a `// TODO(auth)` marker).

## Scope
- `Target` model exactly per `SPECS.md` §6.2: `user_id, full_name, first_name?, last_name?, company?, role_title?, primary_email?, profile_url?, source_type, enrichment_status, notes?, created_at, updated_at` (+ optional `location, company_website, github_url, linkedin_url, extra_enrichment Json?` only if trivial).
- APIs: `GET/POST /api/targets`, `GET/PATCH/DELETE /api/targets/[id]`. `POST` validates `full_name` required; sets `enrichment_status: not_started`. `DELETE` cascades to `EmailGuess`/`Outreach` rows if those tables exist, else just deletes target (add cascade when outreach/email-pipeline land).
- UI: `/targets` table (name, company, role, primary_email or "not set", latest outreach status or "No outreach yet"), add-target modal (fields per §9.3), `/targets/[id]` detail (header, contact info/notes, placeholders for email-candidates + outreach history sections owned by email-pipeline/outreach).
- `POST /api/targets` must enqueue `email-guess { targetId }` if `lib/queues/` exists; otherwise leave a clearly marked hook point (`// TODO(email-pipeline): enqueue email-guess`): do not build queues here.

## Security
- Every query filters `where: { user_id }`; `GET/PATCH/DELETE /api/targets/[id]` return 404 unless the row's `user_id` matches the session. No endpoint accepts a client-supplied `user_id`.
- `DELETE` cascade must only touch rows owned by the caller (scoped child deletes).

## Tasks
1. Prisma model + migration.
2. API routes with `user_id` scoping + validation.
3. Table + modal + detail page with empty states.

## Acceptance
- Create (modal + manual form) → appears in table → detail renders → edit notes → delete removes row.
- `POST` without `full_name` → 400. User B cannot read/update/delete user A's target (gets 404); other users' rows invisible in list.

## Non-goals
Enrichment jobs, email guessing UI, outreach compose (placeholders only).
