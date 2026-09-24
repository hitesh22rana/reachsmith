# Templates: SPEC

## Goal
Reusable message templates with variable substitution (`SPECS.md` §3.4, §6.3, §9.5).

## Dependencies
Foundation (+ auth for `user_id`, same stub rule as targets). Independent of targets: preview with a hardcoded sample target if targets feature missing.

## Scope
- `Template` model exactly per `SPECS.md` §6.3: `user_id, name, channel, audience_type, purpose (string), body, created_at, updated_at`. Enums verbatim from `docs/README.md`.
- `lib/templates.ts`: `renderTemplate(body, vars)` substituting only `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`; unknown vars left intact. Pure function, no DB.
- APIs: `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`, all `user_id`-scoped.
- UI: `/templates` list (name, channel, audience, updated_at) + editor (name, channel, audience, purpose, body with placeholder hints) + preview against a sample target + `job_title`/`job_link` inputs.

## Security
- Same ownership rule as targets: every query filters by session `user_id`; `:id` routes 404 on owner mismatch; no client-supplied `user_id`.
- Preview renders server-side or with the user's own rows only: never fetch another user's templates by ID.

## Tasks
1. Prisma model + migration.
2. `lib/templates.ts` + unit check (render sample body with all four vars + one unknown var).
3. API routes + list/editor/preview UI.

## Acceptance
- Create → renders in preview with vars substituted → edit → delete.
- Preview with missing `job_link` leaves `{{job_link}}` untouched, substitutes the rest.
- User B cannot access user A's templates (404).

## Non-goals
Outreach records, sending, AI generation.
