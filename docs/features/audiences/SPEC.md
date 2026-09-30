# Audiences: SPEC

## Goal
Free-text audience tagging with per-user presets, replacing the `audience_type` enum (`SPECS.md` §3.4, §6.3). `engineer` was wrong for designers and everyone else, so the set is open and the common roles are suggestions.

## Dependencies
Foundation (+ auth for `user_id`, same stub rule as targets). Consumed by templates (`docs/features/templates/SPEC.md`); independent of targets.

## Scope
- `Audience` model: `id, user_id, name, created_at`. No `updated_at` and no rename: the name is the key, so a change means delete and retype. Unique index on `(user_id, lower(name))`.
- `templates.audience_type` (enum + column) is dropped and `templates.audience_id` added as a nullable FK to `audiences.id` with `onDelete: set null`, so deleting a preset unlinks its templates instead of blocking. The name is not duplicated as text on `templates`; it lives on the row.
- `DEFAULT_AUDIENCES = ["HR", "Recruiter", "Founder", "Generic"]` is a constant in `features/audiences/server.ts`, not rows. No per-user seeding and nothing to backfill; the defaults are not deletable because they have no row.
- APIs: `GET /api/audiences` returns the defaults unioned with the caller's rows, caller's rows first, deduped case-insensitively on display name. `POST /api/audiences` creates one (trim, 1..50 chars); the unique index makes a dupe a 400, not a 409. `DELETE /api/audiences/[id]` 404s a foreign id. No PATCH.
- `POST`/`PATCH /api/templates` take `audience` as free text and resolve-or-create the row in the same statement, so the editor never creates-then-selects. A known name reuses the row, a new one inserts it.
- Validation: `features/audiences/validation.ts` with `AudienceCreateSchema`, `AudienceJsonSchema`, `AudienceListSchema` (singular `audiences` key, per the `docs/README.md` list convention), same four-layer shape as templates.
- UI: the template editor's audience field is a free-text input with a native `datalist` over `GET /api/audiences`, so the browser draws the suggestions and any typed name is still accepted; the value is the plain name, not an id. A selected preset of the caller's own shows a "Remove from your presets" button (the built-in defaults have no row and offer none). `/templates` cards show the name or nothing.
- Schema is applied by editing the existing baseline in place; no new migration file (no users yet). `drizzle/0001_tenant_rls.sql` also gains `audiences` in its explicit `ENABLE`/`FORCE ROW LEVEL SECURITY` + `tenant_isolation` list, which drizzle-kit will not emit for you.

## Security
- Every query filters by session `user_id`; `DELETE /api/audiences/[id]` 404s on owner mismatch; no client-supplied `user_id`.
- Names are plain text rendered by React, never interpolated into SQL or markup. Resolve-or-create matches `lower(name)` within the caller's rows only, so presets are per user: the same name in two tenants is two independent rows, not a conflict and not a probe.

## Tasks
1. Drop the `audience_type` enum and `templates.audience_type`; add `audiences`, `templates.audience_id`, the unique index, and the RLS policy entry.
2. `features/audiences/{server,validation,index}.ts` + `GET/POST /api/audiences` + `DELETE /api/audiences/[id]`.
3. Resolve-or-create in the templates POST/PATCH mappers; drop `audience_type` from `TemplateCreateSchema`/`TemplatePatchSchema` in favour of `audience`.
4. Combobox in the template editor, name on the `/templates` card.
5. Docs sync: `SPECS.md` §3.4 and §6.3, `AGENTS.md`, `docs/README.md` drop `audience_type` from the verbatim enum list.

## Acceptance
- A fresh account sees HR, Recruiter, Founder, Generic as suggestions; typing `Designer` and saving tags the template `Designer` and offers `Designer` next time.
- A second user saving the same `Designer` gets their own row, not a 400 and not a leak.
- Deleting a preset unlinks its templates (audience shows empty), never blocks, and a foreign id 404s.
- A 51-character audience name is rejected with a message.

## Non-goals
Renaming, reordering, shared or team audiences, a role taxonomy, filtering the outreach pipeline by audience.
