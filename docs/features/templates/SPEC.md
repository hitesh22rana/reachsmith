# Templates: SPEC

## Goal
Reusable message templates with variable substitution (`SPECS.md` §3.4, §6.3, §9.5).

## Dependencies
Foundation (+ auth for `user_id`, same stub rule as targets). Independent of targets.

## Scope
- `Template` model exactly per `SPECS.md` §6.3: `user_id, name, channel, audience_type, purpose (string), body, created_at, updated_at`. Enums verbatim from `docs/README.md`.
- `features/templates/render.ts`: `renderTemplate(body, vars)` substituting only `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`; unknown vars left intact. Pure function, no DB.
- APIs: `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`, all `user_id`-scoped. Validate bodies with feature schemas and shared `parseBody` (`lib/validators.ts`), 400 + message on failure; client fetching via TanStack Query.
- UI: `/templates` list (name, channel, audience, updated_at) + editor (name, channel, audience, purpose, body with placeholder hints).

## Security
- Same ownership rule as targets: every query filters by session `user_id`; `:id` routes 404 on owner mismatch; no client-supplied `user_id`.

## Tasks
1. Drizzle table + migration.
2. `features/templates/render.ts` + unit check (render sample body with all four vars + one unknown var).
3. API routes + list/editor UI.

## Acceptance
- Create → edit → delete; `renderTemplate` substitutes known variables and leaves unknown or missing variables intact.
- User B cannot access user A's templates (404).

## Non-goals
Outreach records, sending, AI generation.
