# ReachSmith: Feature Build Map

`SPECS.md` is source of truth. `AGENTS.md` holds repo constraints. Each `docs/features/<name>/SPEC.md` is a self-contained build prompt: give one to one agent/session.

## Features (build order)

1. `foundation`: scaffolding only. No dependencies.
2. `auth` (Better Auth): needs foundation. Stub-able: skip session check, hardcode `user_id`.
3. `targets`: needs foundation (+ auth for ownership; stub `user_id` if missing).
4. `templates`: needs foundation (+ auth for ownership). Independent of targets except preview uses a sample target: hardcode one if targets missing.
5. `outreach`: needs foundation, targets, templates. If missing: hardcoded `target_id` / nullable `template_id` (custom message path).
6. `email-pipeline`: needs foundation, targets. Enqueues from `POST /api/targets`; if targets missing, trigger via script with a raw `targetId`.

Parallel-safe pairs: targets + templates, then outreach + email-pipeline.

## Shared contracts (do not reinvent per feature)

- Layout: `app/`, `app/api/`, `db/`, `drizzle/`, `lib/`, `lib/queues/`, `workers/`, `components/` (`SPECS.md` §12).
- Enums verbatim (`SPECS.md` §6): `source_type: linkedin|github|website|manual|other`, `enrichment_status: not_started|pending|success|failed`, `channel: email|linkedin_dm|other`, `audience_type: hr|recruiter|engineer|founder|generic`, `Outreach.status: draft|sent|replied|rejected|no_response|success`, `EmailGuess.status: pending|verifying|valid|invalid|unknown|accept_all`.
- Template vars only: `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- Hard rules: no server-side LinkedIn scraping; outreach sending is manual (copy + mark `sent`); workers are standalone Node processes, never inside Next.js.

## Security (every feature, no exceptions)

- Every row is owned by a `user_id` from the Better Auth session. Every query filters by it; every `:id` route re-checks ownership and returns 404 (not 403) on mismatch so IDs can't be probed.
- Never trust client-supplied `user_id` or nested IDs: verify `target_id`/`template_id` belong to the caller before use.
- Defense in depth: enforce ownership in app queries and Postgres RLS policies where the stack supports it.

## Out of scope (all features)

Phase 3–4: enrichment APIs, browser extension, real email sending, billing/multi-tenancy (`SPECS.md` §11.3–11.4).
