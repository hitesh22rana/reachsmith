# ReachSmith: Feature Build Map

`SPECS.md` is source of truth. `AGENTS.md` holds repo constraints. Each `docs/features/<name>/SPEC.md` is a self-contained build prompt: give one to one agent/session.

## Status

- [x] `foundation`: scaffolded and verified (`typecheck`, `lint`, `build`, dev render, `db:generate`); local `compose.yaml` (Postgres + Redis) included.
- [x] `auth`: Better Auth email/password, Drizzle tables + migration, login/signup UI, guards on `/targets` `/templates` `/outreach`; verified signup → session → guarded 200 / logged-out 307.
- [x] `landing`: public `/`, guarded `/dashboard`, and post-auth redirects.
- [x] `targets`: table + enums + migration, scoped CRUD APIs with Valibot validation, card grid/multi-step wizard/detail UI with full edit dialog, cascade-warning delete dialogs; fields are domain + social URLs (website is a dumb link); verified isolation (404s) plus doctor clean.
- [x] `templates`: table + channel/audience enums + migration, `renderTemplate` + unit check, scoped CRUD APIs with Valibot validation, list/editor UI; verified CRUD, isolation (404s), and 400/401 cases.
- [x] `outreach`: table + status enum + migration, `buildOutreachBody` on `renderTemplate`, scoped CRUD APIs with owned-target/template checks, compose flow (picker, subject, edit, copy, mark sent) + per-target history + pipeline with filter/inline status; verified transitions, isolation (404s), and 400/401 cases.
- [x] `email-pipeline`: v1 shipped earlier; v2 ranked discovery: evidence-ranked candidates (notes extraction, context cues, handle derivation, pattern inference), domain without website, backend grammar-enforced SLM re-rank, top-10 budget, hidden candidate list with processing/found/not-found states, squashed migration. Verified live resolution, isolation, forged-job drops. Needs `EMAIL_VERIFIER_API_KEY` for real `valid` verdicts.
- [x] `docker`: single multi-stage `Dockerfile` (`web`, `worker`, `builder`-as-migrator), rank model baked at build (pinned revision), prod profile in `compose.yaml` (Postgres 18.0, Redis 8.2.1, healthchecks, non-root, pruned prod deps). Verified `runner-web` + `runner-worker` images build.
- [x] `seo`: indexable `/` (metadata, canonical, FAQPage schema from exported `FAQS`), Organization + WebSite JSON-LD, `robots`/`sitemap`/`manifest`/`opengraph-image`, `noindex` on private/auth routes, viewport + themeColor, logo alt text, 48px menu target, brand favicons from the mascot, pipe title separators, font swap + `optimizePackageImports`. Verified `typecheck`, `lint`, `build` plus crawler routes resolve.

## Features (build order)

1. `foundation`: scaffolding only. No dependencies.
2. `auth` (Better Auth): needs foundation. Stub-able: skip session check, hardcode `user_id`.
3. `landing`: public `/`, dashboard moves to guarded `/dashboard`. Needs foundation + auth.
4. `targets`: needs foundation (+ auth for ownership; stub `user_id` if missing).
5. `templates`: needs foundation (+ auth for ownership). Independent of targets.
6. `outreach`: needs foundation, targets, templates. If missing: hardcoded `target_id` / nullable `template_id` (custom message path).
7. `email-pipeline`: needs foundation, targets. Enqueues from `POST /api/targets`; if targets missing, trigger via script with a raw `targetId`.
8. `seo`: needs foundation + landing. Parallel-safe with any feature after landing.

Parallel-safe pairs: targets + templates, then outreach + email-pipeline.

## Shared contracts (do not reinvent per feature)

- Layout: `app/` routes, `features/<name>/` domain code, `components/ui/` shared primitives, `lib/` shared setup, `db/` and `drizzle/` persistence; add `lib/queues/` and `workers/` with the pipeline (`SPECS.md` §12).
- Enums verbatim (`SPECS.md` §6): `source_type: linkedin|github|website|manual|other`, `enrichment_status: not_started|pending|success|failed`, `channel: email|linkedin_dm|other`, `audience_type: hr|recruiter|engineer|founder|generic`, `Outreach.status: draft|sent|replied|rejected|no_response|success`, `EmailGuess.status: pending|verifying|valid|invalid|unknown|accept_all`.
- Template vars only: `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- Validation: feature-owned Valibot schemas in `features/<name>/validation.ts`; forms use react-hook-form with the Valibot resolver, API routes check bodies with shared `parseBody` from `lib/validators.ts` (400 + message). Client fetching via TanStack Query (`components/providers.tsx`); server components fetch directly. Routes import feature public UI from `index.ts`; server-only helpers use explicit server entry points.
- Hard rules: no server-side LinkedIn scraping; outreach sending is manual (copy + mark `sent`); workers are standalone Node processes, never inside Next.js.

## Security (every feature, no exceptions)

- Every row is owned by a `user_id` from the Better Auth session. Every query filters by it; every `:id` route re-checks ownership and returns 404 (not 403) on mismatch so IDs can't be probed.
- Never trust client-supplied `user_id` or nested IDs: verify `target_id`/`template_id` belong to the caller before use.
- Defense in depth: enforce ownership in app queries and Postgres RLS policies where the stack supports it.

## Out of scope (all features)

Phase 3–4: enrichment APIs, browser extension, real email sending, billing/multi-tenancy (`SPECS.md` §11.3–11.4).
