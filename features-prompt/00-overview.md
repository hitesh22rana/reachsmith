# ReachSmith — Feature Build Map

`SPEC.md` is source of truth. `AGENTS.md` holds repo constraints. Each file in this folder is a self-contained build prompt — give one file to one agent/session.

## Features (build order)

1. `01-foundation.md` — scaffolding only. No dependencies.
2. `02-auth.md` — needs #1. Stub-able: skip session check, hardcode `user_id`.
3. `03-targets.md` — needs #1 (+ #2 for ownership; stub `user_id` if missing).
4. `04-templates.md` — needs #1 (+ #2 for ownership). Independent of #3 except preview uses a sample target — hardcode one if #3 missing.
5. `05-outreach.md` — needs #1, #3, #4. If missing: use hardcoded `target_id`/`template_id`, nullable `template_id` covers custom messages.
6. `06-email-pipeline.md` — needs #1, #3. Enqueues from `POST /api/targets`; if #3 missing, trigger via script with a raw `targetId`.

Parallel-safe pairs: #3 + #4, then #5 + #6.

## Shared contracts (do not reinvent per feature)

- Layout: `app/`, `app/api/`, `prisma/`, `lib/`, `lib/queues/`, `workers/`, `components/` (`SPEC.md` §12).
- Enums verbatim (`SPEC.md` §6): `source_type: linkedin|github|website|manual|other`, `enrichment_status: not_started|pending|success|failed`, `channel: email|linkedin_dm|other`, `audience_type: hr|recruiter|engineer|founder|generic`, `Outreach.status: draft|sent|replied|rejected|no_response|success`, `EmailGuess.status: pending|verifying|valid|invalid|unknown|accept_all`.
- Template vars only: `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- Hard rules: no server-side LinkedIn scraping; outreach sending is manual (copy + mark `sent`); workers are standalone Node processes, never inside Next.js.

## Out of scope (all features)

Phase 3–4: enrichment APIs, browser extension, real email sending, billing/multi-tenancy (`SPEC.md` §11.3–11.4).
