# reachsmith
Personal outreach engine for job seekers: organize targets, predict/verify emails, and track outreach.

## Docs
- `SPECS.md`: product source of truth.
- `docs/README.md`: feature build map (start here for build order).
- `docs/features/<name>/SPEC.md`: self-contained build prompt per feature.

## Stack
Next.js App Router + TypeScript, Tailwind + shadcn/ui, Drizzle on Postgres, Better Auth, Valibot validation with react-hook-form, TanStack Query, BullMQ + Redis, external email-verification API.

## Quickstart
- `pnpm install`
- `cp .env.example .env` and fill in values (never commit `.env`)
- `docker compose up -d` (local Postgres + Redis)
- `pnpm db:generate` (Drizzle schema check; migrations land per feature)
- `pnpm dev`
