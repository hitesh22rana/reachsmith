# AGENTS.md

Follow `MEMORY.md`: it holds durable user preferences.

Greenfield repo. `SPECS.md` is the source of truth: read it before coding. Per-feature build prompts live in `docs/features/<name>/SPEC.md` (`docs/README.md` maps build order).

## Planned stack (not scaffolded yet: no package.json, no toolchain)
- Next.js App Router + TypeScript, Tailwind + shadcn/ui, Drizzle on managed Postgres, Better Auth, Valibot validation, TanStack Query, BullMQ + Redis workers, external email-verification API. See `SPECS.md` §5.

## Layout to follow when scaffolding (`SPECS.md` §12)
- `app/` pages + `app/api/` handlers; `db/` (Drizzle schema + client) + `drizzle/` migrations; `lib/` (validators, email patterns, template engine, `lib/auth.ts`), `lib/queues/`; `workers/` (email-guess, email-verify); `components/`; `styles/`; `docs/features/<name>/SPEC.md` per-feature specs.
- Env via `.env`: database URL, Redis URL, verifier API key, Better Auth secrets.

## Constraints agents miss
- Auth = Better Auth only. No NextAuth, no hand-rolled sessions. Every domain row carries `user_id` from the session.
- SECURITY is non-negotiable: every query filters by session `user_id`; every `:id` route re-checks ownership (404 on mismatch, never 403); never trust client-supplied `user_id` or nested `target_id`/`template_id`; workers re-verify ownership from DB before writing. Enforce in app queries + Postgres RLS where supported.
- Validate at trust boundaries with shared Valibot schemas (`lib/validators.ts`); forms use react-hook-form with the Valibot resolver; client data flows through TanStack Query, server components fetch directly.
- No server-side LinkedIn scraping (ToS). Enrichment = manual input + compliant APIs only (`SPECS.md` §6.2, §10).
- Outreach sending is manual in MVP: generate message, copy to clipboard, mark `sent`. No Gmail/Outlook sync, no `send-email` worker yet (`SPECS.md` §3.5, §8.1).
- Keep Postgres enums (Drizzle pgEnum) exactly as specced: `source_type`, `enrichment_status`, `channel`, `audience_type`, `Outreach.status`, `EmailGuess.status` (`SPECS.md` §6). Template vars are `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- Email pipeline order: `POST /api/targets` → `email-guess { targetId }` → `EmailGuess` rows → `email-verify { candidateId }` → `target.primary_email`. Workers are standalone Node processes, not in the Next.js server (`SPECS.md` §7–8).
- Build order: `docs/README.md`: foundation → auth → targets/templates → outreach/email-pipeline. Don't build SaaS/billing/multi-region (`SPECS.md` §2.2, §11).
