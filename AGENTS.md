# AGENTS.md

Follow `MEMORY.md`: it holds durable user preferences.

`SPECS.md` is the source of truth: read it before coding. Per-feature build prompts live in `docs/features/<name>/SPEC.md` (`docs/README.md` maps build order).

## Stack
- Next.js App Router + TypeScript, Tailwind + shadcn/ui, Drizzle on managed Postgres, Better Auth, Valibot validation, TanStack Query, BullMQ + Redis workers, external email-verification API. See `SPECS.md` §5.

## Repository layout
- `app/` contains thin route entry points and route handlers; domain code lives in `features/<name>/`. See `SPECS.md` §12.
- `features/<name>/index.ts` exports public UI; server-only logic has a separate entry point. `components/ui/` holds shared primitives; `lib/` holds cross-feature framework setup and helpers. `proxy.ts` at the root is the cross-cutting request interceptor; `middleware.ts` is deprecated in Next 16.
- `db/` contains Drizzle schema and client; `drizzle/` contains migrations. Add `lib/queues/` and standalone `workers/` with the email pipeline.
- Env via `.env`: database URL, Redis URL, verifier API key, Better Auth secrets.

## Constraints agents miss
- Auth = Better Auth only. No NextAuth, no hand-rolled sessions. Every domain row carries `user_id` from the session.
- SECURITY is non-negotiable: every query filters by session `user_id`; every `:id` route re-checks ownership (404 on mismatch, never 403); never trust client-supplied `user_id` or nested `target_id`/`template_id`; workers re-verify ownership from DB before writing. App queries are the first layer; Postgres RLS is the second, and it is live: every domain query goes through `forUser(userId, ...)` in `db/index.ts` or `asUser(userId, ...)` in `workers/db.ts`, never a bare client.
- Two database roles, not one. `DATABASE_URL` is the owner (migrations, DDL); `APP_DATABASE_URL` is the runtime role and must be a non-superuser without `BYPASSRLS`, because a superuser ignores RLS outright and `FORCE ROW LEVEL SECURITY` does not apply to it. `getDb()` throws at startup if the runtime role can bypass RLS, so a misconfigured deploy fails closed rather than silently serving other tenants' rows.
- Validate at trust boundaries with feature-owned Valibot schemas (`features/<name>/validation.ts`) and shared `parseBody` (`lib/validators.ts`); forms use react-hook-form with the Valibot resolver; client data flows through TanStack Query, server components fetch directly.
- Cross-cutting request concerns (CSRF origin check) live once in `proxy.ts` via `lib/csrf.ts`; per-tenant authn/authz stays in each handler: every route calls `getUserId()` itself. A Server Action posts to its page route, so it bypasses the `/api` matcher and must check origin itself.
- No server-side LinkedIn scraping (ToS). Enrichment = manual input + compliant APIs only (`SPECS.md` §6.2, §10).
- Outreach sending is manual in MVP: generate message, copy to clipboard, mark `sent`. No Gmail/Outlook sync, no `send-email` worker yet (`SPECS.md` §3.5, §8.1).
- Keep Postgres enums (Drizzle pgEnum) exactly as specced: `source_type`, `enrichment_status`, `channel`, `audience_type`, `Outreach.status`, `EmailGuess.status` (`SPECS.md` §6). Template vars are `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- DB tables and their Drizzle consts are always plural (`users`, `sessions`, `targets`); Better Auth model names map to them explicitly in `lib/auth.ts`.
- Email pipeline order: `POST /api/targets` → `email-guess { targetId }` → `EmailGuess` rows → `email-verify { candidateId }` → `target.primary_email`. Workers are standalone Node processes, not in the Next.js server (`SPECS.md` §7–8).
- Build order: `docs/README.md`: foundation → auth → landing → targets/templates → outreach/email-pipeline. Don't build SaaS/billing/multi-region (`SPECS.md` §2.2, §11).
