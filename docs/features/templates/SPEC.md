# Templates: SPEC

## Goal
Reusable message templates whose variables are whatever the author types, not a fixed four (`SPECS.md` §3.4, §6.3, §9.5).

## Dependencies
Foundation + Better Auth for session ownership. Independent of targets. Audiences (`docs/features/audiences/SPEC.md`) for `audience_id`.

## Scope

- `Template` model, `SPECS.md` §6.3 as amended: `user_id, name, channel, audience_id?, purpose (string), body, placeholders, created_at, updated_at`. The `audience_type` enum and column are gone (see audiences SPEC); `audience_id` is a nullable FK to `audiences.id`. `placeholders` is `jsonb` typed `Placeholder[]` (`{name, label, source}`) via `$type`, parsed back through a Valibot schema at the trust boundary.
- `features/templates/render.ts`, pure, no DB:
  - `renderTemplate(body, vars: Record<string, string | undefined>)` matches any `{{name}}`, substitutes when the value is a non-empty trimmed string, otherwise leaves the placeholder intact.
  - `parsePlaceholders(body)` returns `{placeholders, issues}`: every `{{name}}` in first-appearance order, deduped, as `{name, label, source}`, plus one issue per rejected token. `label` is the humanized name, truncated with `…` past 28 chars. `source` is `target` when the name appears in `TARGET_VAR_NAMES` (`first_name, last_name, company, role_title, location, company_website, domain, primary_email`, plus `job_title` which falls back to `role_title`), else `input`.
  - `PLACEHOLDER_MAX = 50`; `PLACEHOLDER_NAME` is `^[a-z][a-z0-9_]*$` capped at 40 chars, i.e. strict lowercase `snake_case`, no spaces, no leading digit. Both checked by `parsePlaceholders`; routes reject issues before saving and the editor displays them live.
  - `placeholders` is always recomputed server-side from `body` on write; a client-sent `placeholders` is ignored, never trusted.
- Validation: more than 50 distinct placeholders, or any name failing `PLACEHOLDER_NAME`, returns 400 with the offending name. The check lives in the route, not in the schema: a valibot check carries one static message and cannot name the offender, so a second, vaguer error channel in the schema would only ever win the race. The editor shows the same per-placeholder problems live under the body, which is the better place for them.
- APIs: `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`, all `user_id`-scoped. `POST`/`PATCH` take `audience` as free text and resolve-or-create the `audiences` row server-side (never a client `audience_id`). `TemplateJsonSchema` gains `audience: v.nullable(v.string())` and `placeholders: v.array(PlaceholderSchema)`. Bodies validated with feature schemas and shared `parseBody` (`lib/validators.ts`), 400 + message on failure; client fetching via TanStack Query.
- UI: `/templates` list (name, channel, audience, updated_at) + editor (name, channel, audience input with a native `datalist`, purpose, body). Editor renders the detected placeholders as chips under the body and states the rule: lowercase `snake_case` in double braces, up to 50.

## Security

- Same ownership rule as targets: every query filters by session `user_id`; `:id` routes 404 on owner mismatch; no client-supplied `user_id`.
- Placeholder names are data, not code: they are JSONB keys validated against `PLACEHOLDER_NAME` and rendered by React (auto-escaped). They are never interpolated into SQL, a class name, or raw HTML.

## Tasks

1. `render.ts`: generic `renderTemplate`, `parsePlaceholders`, `TARGET_VAR_NAMES`, name/limit schemas. Unit check in `scripts/selfcheck.ts`: known-var substitution, unknown var left intact, 51 placeholders rejected, bad name rejected.
2. `placeholders` column + `$type` + `PlaceholderSchema` + recompute on write in `toTemplateInsert`/`toTemplatePatch`, and add it to `toTemplateJson`.
3. Editor: placeholder chips, the `snake_case` hint, audience input with a native `datalist` against `GET /api/audiences`.
4. Docs sync: `SPECS.md` §3.4 and §6.3, `AGENTS.md`, `docs/README.md` drop the four-var list and the `audience_type` enum.

## Acceptance

- Create → edit → delete; `renderTemplate` substitutes any supplied name and leaves unknown or missing ones intact.
- `{{resume_link}}` in a body yields a chip and a compose field; `{{First Name}}`, `{{1st}}`, or 51 distinct names are rejected with a message naming the offender.
- Editing a template body updates the stored placeholder list; an already-saved outreach row keeps the body it was sent with.
- User B cannot access user A's templates (404).

## Non-goals
Outreach records, sending, AI generation, conditional/loop/date-filter placeholders, nested or escaped braces, per-sender profile variables.
