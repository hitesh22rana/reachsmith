# ReachSmith: Feature Build Map

`SPECS.md` is source of truth. `AGENTS.md` holds repo constraints. Each `docs/features/<name>/SPEC.md` is a self-contained build prompt: give one to one agent/session.

## Experiments

- [Email guess accuracy](experiments/email-guess-accuracy/EXPERIMENT.md): prepared evaluation plan and curated seed data. Not run.

## Status

- [x] `foundation`: scaffolded and verified (`typecheck`, `lint`, `build`, dev render, `db:generate`); local `compose.yaml` (Postgres + Redis) included.
- [x] `auth`: Better Auth email/password, Drizzle tables + migration, login/signup UI, guards on `/targets` `/templates` `/outreach`; verified signup → session → guarded 200 / logged-out 307.
- [x] `landing`: public `/`, guarded `/dashboard`, and post-auth redirects.
- [x] `targets`: table + enums + migration, scoped CRUD APIs with Valibot validation, card grid/multi-step wizard/detail UI with full edit dialog, cascade-warning delete dialogs; fields include an explicit email domain, company website, and social URLs; verified isolation (404s) plus doctor clean.
- [x] `templates`: table + channel enum + migration, `renderTemplate` + `parsePlaceholders` with selfcheck coverage, open `{{snake_case}}` placeholders derived server-side into `placeholders`, free-text audience field (Autocomplete over the caller's presets, new names resolve-or-create on save), list/editor UI; verified CRUD, placeholder derivation and 50/51 boundary, isolation (404s), and 400/401 cases.
- [x] `outreach`: table + status enum + migration, `buildOutreachBody` on `renderTemplate`, scoped CRUD APIs with owned-target/template checks, 4-step compose dialog (channel/template, one field per declared placeholder prefilled from the target, editable draft with live re-render until edited, review) + per-target history + pipeline with filter/inline status; `metadata` key set intersected with the template's declared placeholders server-side. Verified transitions, the key allowlist, isolation (404s), and 400/401 cases.
- [x] `email-pipeline`: ranked work-email suggestions with notes context, handle derivation, pattern inference, backend grammar-enforced SLM re-rank, and a top-10 limit. No external verifier or validity claim.
- [x] `docker`: single multi-stage `Dockerfile` (`web`, `worker`, `builder`-as-migrator), rank model baked at build (pinned revision), prod profile in `compose.yaml` (Postgres 18.0, Redis 8.2.1, healthchecks, non-root, pruned prod deps). Verified `runner-web` + `runner-worker` images build.
- [x] `seo`: indexable `/` (metadata, canonical, FAQPage schema from exported `FAQS`), Organization + WebSite JSON-LD, `robots`/`sitemap`/`manifest`/`opengraph-image`, `noindex` on private/auth routes, viewport + themeColor, logo alt text, 48px menu target, brand favicons from the mascot, pipe title separators, font swap + `optimizePackageImports`. Verified `typecheck`, `lint`, `build` plus crawler routes resolve.
- [x] `audiences`: `audiences` table (free text, per-user presets, unique per user on `lower(name)`, `ON DELETE SET NULL` from templates, RLS in `drizzle/0001_tenant_rls.sql`) replacing the `audience_type` enum; four built-in defaults are a constant, not rows; resolve-or-create via `ON CONFLICT DO NOTHING` so concurrent saves cannot abort the transaction. Verified: two tenants in isolation (404s, one-way 400s), preset removal unlinking templates, seed, `typecheck`, `lint`, `build`, `selfcheck`, react-doctor 100.
- [x] `pagination`: keyset (cursor) pagination on `GET /api/targets` and `GET /api/outreach`; cursor is an opaque base64url `(created_at, id)` position validated before it reaches SQL, `limit+1` fetch derives `nextCursor` (no `hasMore`, no `total`), and `useInfiniteQuery` + Load more in both views. `outreaches` now orders by the immutable `created_at` instead of the mutable `last_status_change_at`, so a status PATCH cannot re-sort the list under a reader mid-scroll. Templates and audiences stay unpaginated because they are pickers, not feeds. Composite `(user_id, created_at, id)` indexes replace the `user_id`-only ones; the dashboard's full-table status scan became a `groupBy`. Verified: 5 page sizes match the DB order exactly with no duplicate or skip across the seam, cursor composes with the `status` filter, a concurrent insert does not disturb an open page 2, hostile cursors and out-of-range limits 400, unauthenticated 401.
- [x] `name-split`: `full_name` is the only name the add wizard asks for. `first_name`/`last_name` are an override for names that do not split naively (`Bae Suzy`, `van der Berg`, `Cher`, `J. Smith`) and now live behind a collapsed disclosure in the edit dialog, so the three-box redundancy and the stale-split bug (editing the full name left the old first/last describing the previous person) are both gone. `lib/target-name.ts` is the single `nameParts()` implementation shared by the email-guess worker and `{{first_name}}`/`{{last_name}}` prefill, which previously disagreed: a target with no override got `bae.suzy@` guesses and a blank greeting. Verified by selfcheck across mononym, multi-token surname, hyphenated given name, initial, whitespace collapse, and per-half override.
- [x] `email-accuracy`: strict company-domain candidate boundary, website-derived domain, ranked suggestions, and manual primary email selection (`docs/features/email-accuracy/SPEC.md`). The baseline migration no longer includes verifier fields.

## Features (build order)

1. `foundation`: scaffolding only. No dependencies.
2. `auth` (Better Auth): needs foundation. Stub-able: skip session check, hardcode `user_id`.
3. `landing`: public `/`, dashboard moves to guarded `/dashboard`. Needs foundation + auth.
4. `targets`: needs foundation (+ auth for ownership; stub `user_id` if missing).
5. `templates`: needs foundation (+ auth for ownership, + `docs/features/audiences` for `audience_id`). Independent of targets.
6. `outreach`: needs foundation, targets, templates. If missing: hardcoded `target_id` / nullable `template_id` (custom message path).
7. `email-pipeline`: needs foundation, targets. Enqueues from `POST /api/targets`; jobs carry target and user IDs for tenant-scoped workers.
8. `seo`: needs foundation + landing. Parallel-safe with any feature after landing.
9. `pagination`: needs foundation (+ auth). Optional on everything else: only `GET /api/targets` and `GET /api/outreach` import `lib/pagination.ts`, so it can land before outreach by paginating targets alone.
10. `email-accuracy`: needs targets and email-pipeline. Current domain and suggestion semantics live in `docs/features/email-accuracy/SPEC.md`.

Parallel-safe pairs: targets + templates, then outreach + email-pipeline.

## Shared contracts (do not reinvent per feature)

- Layout: `app/` routes, `features/<name>/` domain code, `components/ui/` shared primitives, `lib/` shared setup, `db/` and `drizzle/` persistence; add `lib/queues/` and `workers/` with the pipeline (`SPECS.md` §12).
- Enums verbatim (`SPECS.md` §6): `source_type: linkedin|github|website|manual|other`, `enrichment_status: not_started|pending|success|failed`, `channel: email|linkedin_dm|other`, `Outreach.status: draft|sent|replied|rejected|no_response|success`. Email guesses have no validity enum; audiences are free text (`docs/features/audiences/SPEC.md`).
- Template vars are open: any lowercase `snake_case` name in `{{double_braces}}`, up to 50 per template, declared in `templates.placeholders` and filled in `outreaches.metadata` (`docs/features/templates/SPEC.md`, `docs/features/outreach/SPEC.md`).
- Validation: feature-owned Valibot schemas in `features/<name>/validation.ts`; forms use react-hook-form with the Valibot resolver, API routes check bodies with shared `parseBody` from `lib/validators.ts` (400 + message). Client fetching via TanStack Query (`components/providers.tsx`); server components fetch directly. Routes import feature public UI from `index.ts`; server-only helpers use explicit server entry points.
- Client calls go through `lib/api.ts`: `getJson(url, schema, label)` and `sendJson(method, url, body, schema, label)` are the only places a response is checked, turned into an `Error` and parsed, so a view cannot forget the ok-check or the validation. A fetcher used by more than one component lives in that feature's `client.ts` next to its `server.ts` (`features/outreach/client.ts`, `features/templates/client.ts`); a single-caller fetch stays inline. Response envelopes (`TargetEnvelopeSchema`, `OutreachEnvelopeSchema`, `TemplateEnvelopeSchema`, `DeletedSchema`) are named in the feature's `validation.ts` rather than re-spelled as anonymous `v.object({ x: XSchema })` at each call site.
- List endpoints that can grow are cursor-paginated via `lib/pagination.ts`: `?limit` (1–100, default 25) and an opaque `?cursor`, returning the array key plus `nextCursor: string | null`. There is no `hasMore` or `total`; `nextCursor !== null` is the only "is there more" signal. The keyset is always `(created_at, id)` descending, so a list must never be ordered by a mutable column. Pickers (`/api/templates`, `/api/audiences`) are deliberately exempt: they are consumed whole. New list endpoints should follow this rather than inventing paging (`docs/features/pagination/SPEC.md`).
- Hard rules: no server-side LinkedIn scraping; outreach sending is manual (copy + mark `sent`); workers are standalone Node processes, never inside Next.js.

## Security (every feature, no exceptions)

- Every row is owned by a `user_id` from the Better Auth session. Every query filters by it; every `:id` route re-checks ownership and returns 404 (not 403) on mismatch so IDs can't be probed.
- Never trust client-supplied `user_id` or nested IDs: verify `target_id`/`template_id` belong to the caller before use.
- Defense in depth, both live: app queries filter by session `user_id`, and Postgres RLS (`drizzle/0001_tenant_rls.sql`) filters again on `targets`, `templates`, `outreaches`, `email_guesses` and `audiences` via a transaction-local `app.user_id` GUC. `FORCE ROW LEVEL SECURITY` plus a non-superuser runtime role (`APP_DATABASE_URL`) is what makes the policies bind; `getDb()` throws at startup if the role could bypass them.

## Out of scope (all features)

Phase 3–4: enrichment APIs, browser extension, real email sending, billing/multi-tenancy (`SPECS.md` §11.3–11.4).
