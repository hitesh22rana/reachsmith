# F05 — Outreach Compose + Tracking

## Goal
Generate message, copy manually, track status (`SPEC.md` §3.5, §6.4, §9.4, §9.6). Sending is manual — no email integration.

## Dependencies
F01, F03, F04. If either missing: hardcode `target_id` / allow null `template_id` (custom message path) with `// TODO` markers; do not rebuild those features.

## Scope
- `Outreach` model exactly per `SPEC.md` §6.4: `target_id, template_id?, channel, subject?, body_final, status, sent_at?, last_status_change_at, metadata Json?, created_at, updated_at`. Status enum verbatim.
- `lib/outreach.ts`: `buildOutreachBody(template.body?, target, sender, {job_title?, job_link?})` reusing `renderTemplate` from F04 (if F04 missing, inline the 4-var substitution with a `// TODO(F04)` marker).
- APIs: `POST /api/outreach` (creates `draft`, fills body via template or custom text), `PATCH /api/outreach/[id]` (status transitions set `sent_at` on first `sent` + always bump `last_status_change_at`), `GET /api/outreach?status=&targetId=` for pipeline + history.
- UI: "New Outreach" flow on `/targets/[id]` (purpose, channel, template picker, edit, copy-to-clipboard, mark `sent`); `/outreach` pipeline table with status filter + inline status change, sorted by `sent_at`/`last_status_change`.

## Tasks
1. Prisma model + migration.
2. `lib/outreach.ts` + APIs.
3. Compose flow + pipeline view.

## Acceptance
- Pick template → preview filled from target → edit → save draft → copy → mark `sent` (sets `sent_at`) → transition to `replied`/`success` updates pipeline + target history.
- Custom message with null `template_id` works.

## Non-goals
Auto-send, Gmail/Outlook sync, reply detection, `send-email` worker.
