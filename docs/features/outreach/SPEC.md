# Outreach: SPEC

## Goal
Compose against whatever variables the chosen template declares, then copy manually and track status (`SPECS.md` §3.5, §6.4, §9.4, §9.6). Sending is manual: no email integration.

## Dependencies
Foundation, targets, templates. If either missing: hardcode `target_id` / allow null `template_id` (custom message path) with `// TODO` markers; do not rebuild those features.

## Scope
- `Outreach` model exactly per `SPECS.md` §6.4: `user_id, target_id, template_id?, channel, subject?, body_final, status, sent_at?, last_status_change_at, metadata, created_at, updated_at`. Status enum verbatim. `metadata` is now `{[placeholder]: value}` for whatever variables the template declared; the old fixed `job_title`/`job_link` pair is gone.
- `features/outreach/server.ts`: `buildOutreachBody(template.body?, target, variables)` over `renderTemplate` (no `sender` param: no variable consumes one). Target-sourced values fill first, then user-entered `variables` override them, so any prefilled field can be corrected per message. The existing `job_title → target.roleTitle` fallback is preserved.
- `POST /api/outreach` takes `variables: Record<string, string>` in place of `job_title`/`job_link`. The server re-reads the owned template, intersects the submitted keys with that template's stored placeholder names, and drops everything else, so `metadata` can only ever hold declared variables (at most 50). With `template_id` null the key set is arbitrary and capped at 50, else 400. A blank `body` still falls back to the server-side render, else 400 `Provide a template or message text`.
- `PATCH /api/outreach/[id]` is unchanged (status transitions set `sent_at` on first `sent`, always bump `last_status_change_at`). `GET /api/outreach?status=&targetId=` is unchanged for pipeline + history.
- UI, a 4-step dialog on `/targets/[id]`, reusing `components/ui/stepper.tsx` (moved out of `features/targets/components/`) and the per-step `trigger` gate from `add-target-dialog`:
  1. Channel + template picker, including the Custom message option.
  2. Variables: one field per placeholder in stored order. `source: target` prefills from the target row and stays editable; `source: input` starts empty. Two columns at `sm+`, one below, `min-w-0` on every grid child so a long label ellipsizes instead of overflowing; the label is the stored `label` with the full name in a `title` attribute.
  3. Message: subject, body textarea, Copy, Re-apply template.
  4. Review and save: read-only summary of channel, template, subject, and every variable value, then Save draft / Save and mark sent.
- Live re-render: while `bodyDirty` is false the body follows the variables on every change. The first keystroke in the body sets `bodyDirty`, which stops live re-render and reveals Re-apply template. Re-apply or a template switch clears it. With no template the body is a plain textarea.
- Step changes scroll the content to the top and focus the step heading, as `add-target-dialog` already does.

## Security
- Scope all queries by session `user_id`. On create/update, verify `target_id` (and `template_id` if set) belong to the caller: reject with 404 otherwise. Never trust client `user_id` or cross-user IDs.
- `GET` filters (`status`, `targetId`) apply inside the caller's rows only.
- `variables` keys are never trusted: the template's stored placeholder list is the allowlist, so a client cannot smuggle unbounded or foreign keys into `metadata`.

## Tasks
1. `metadata` shape, `OutreachCreateSchema` `variables`, server-side key intersection and 50 cap in the create route.
2. Move `stepper.tsx` to `components/ui/` and repoint the targets wizard.
3. The 4-step dialog, per-step `trigger(variableNames)` gate on step 2.
4. Review step, `bodyDirty` live re-render, ellipsis/responsive pass at 360px.
5. Docs sync: `SPECS.md` §3.5 and §6.4, `AGENTS.md`, `docs/README.md` drop the four-var list and the job title/link form fields.

## Acceptance
- A template with `{{first_name}}`, `{{company}}`, `{{resume_link}}` shows three fields on step 2, two prefilled and editable, `resume_link` empty.
- Filling `resume_link` updates the body live; hand-editing the body stops live re-render, and Re-apply template restores it.
- A 50-placeholder template renders 50 fields and saves; 51 is rejected at save naming the 51st.
- A long custom placeholder name ellipsizes on step 2 and does not break the grid at 360px.
- Save draft → copy → mark `sent` (sets `sent_at`) → transition to `replied`/`success` updates pipeline + target history.
- Custom message with null `template_id` works and stores no `metadata`.
- A submitted variable key that the template does not declare is dropped server-side.
- User B cannot create outreach on user A's target, nor read/update user A's outreach (404).

## Non-goals
Auto-send, Gmail/Outlook sync, reply detection, `send-email` worker, per-variable required flags, editing variables after save.
