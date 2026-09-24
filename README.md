# reachsmith
Personal outreach engine for job seekers: organize targets, predict/verify emails, and track outreach.

## Docs
- `SPECS.md`: product source of truth.
- `docs/README.md`: feature build map (start here for build order).
- `docs/features/<name>/SPEC.md`: self-contained build prompt per feature.
- `SPECS.md` §12: repository structure and feature boundaries.

## Stack
Next.js App Router + TypeScript, Tailwind + shadcn/ui, Drizzle on Postgres, Better Auth, Valibot validation with react-hook-form, TanStack Query, BullMQ + Redis, external email-verification API.

## Quickstart
- `pnpm install`
- `cp .env.example .env` and fill in values (never commit `.env`)
- `docker compose up -d` (local Postgres + Redis)
- `pnpm db:generate` (Drizzle schema check; migrations land per feature)
- `pnpm dev`

## Code structure

- `app/`: URL routes, API handlers, layouts, and global CSS.
- `features/`: domain UI and logic. Each feature exposes route-facing UI through `index.ts`; server-only logic has a separate entry point.
- `components/ui/`: reusable UI primitives; `components/`: cross-feature UI and providers.
- `lib/`: shared framework setup and request parsing; `db/` and `drizzle/`: database schema, client, and migrations.

Keep domain validation and client queries with their feature. Use local state for local UI, TanStack Query for client server state, and direct reads in server components. Add folders or state libraries when real code needs them.
