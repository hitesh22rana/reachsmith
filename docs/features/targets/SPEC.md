# Targets: SPEC

## Goal
Contact list + detail foundation (`SPECS.md` §3.1, §6.2, §9.2–9.4).

## Dependencies
Foundation (+ auth for `user_id`; if auth missing, hardcode a stub `user_id` constant with a `// TODO(auth)` marker).

## Scope
- `Target` model exactly per `SPECS.md` §6.2: `user_id, full_name, first_name?, last_name?, company?, role_title?, primary_email?, profile_url?, source_type, enrichment_status, notes?, created_at, updated_at` (+ optional `location, company_website, github_url, linkedin_url, extra_enrichment Json?` only if trivial).
- APIs: `GET/POST /api/targets`, `GET/PATCH/DELETE /api/targets/[id]`. `POST` validates `full_name` required; sets `enrichment_status: not_started`. `DELETE` cascades to `Outreach` rows via FK (`EmailGuess` cascade lands with email-pipeline).
- Validate `POST`/`PATCH` bodies with feature schemas and shared `parseBody` (`lib/validators.ts`), 400 + message on failure; client fetching via TanStack Query.
- UI: `/targets` card grid (avatar, name, role at company, primary_email or "not set", latest outreach status or "No outreach yet"), 3-step add-target wizard with stepper (Basics, Contact, Notes plus review), `/targets/[id]` detail (header + edit-target dialog with every field, contact info/notes, email-candidates placeholder owned by email-pipeline, live outreach history owned by outreach).
- `POST /api/targets` must enqueue `email-guess { targetId }` if `lib/queues/` exists; otherwise leave a clearly marked hook point (`// TODO(email-pipeline): enqueue email-guess`): do not build queues here.

## Security
- Every query filters `where: { user_id }`; `GET/PATCH/DELETE /api/targets/[id]` return 404 unless the row's `user_id` matches the session. No endpoint accepts a client-supplied `user_id`.
- `DELETE` cascade must only touch rows owned by the caller (scoped child deletes).

## Tasks
1. Drizzle table + migration.
2. API routes with `user_id` scoping + validation.
3. Card grid + multi-step modal + detail page with edit dialog and empty states.

## Acceptance
- Create (wizard) → appears as a card → detail renders → edit any field via the edit dialog → delete removes row.
- `POST` without `full_name` → 400. User B cannot read/update/delete user A's target (gets 404); other users' rows invisible in list.

## Non-goals
Enrichment jobs, email guessing UI, outreach compose (placeholders only).
