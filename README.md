# reachsmith
Personal outreach engine for job seekers: organize targets, explore likely work emails, and track outreach.

## Docs

- `SPECS.md`: product source of truth.
- `docs/README.md`: feature build map (start here for build order).
- `docs/features/<name>/SPEC.md`: self-contained build prompt per feature.
- `SPECS.md` §12: repository structure and feature boundaries.

## Stack
Next.js App Router + TypeScript, Tailwind + shadcn/ui, Drizzle on Postgres, Better Auth, Valibot validation with react-hook-form, TanStack Query, BullMQ + Redis.

## Quickstart

- `pnpm install`
- `cp .env.example .env` and fill in values (never commit `.env`)
- Set `DATABASE_URL` for migrations and `APP_DATABASE_URL` for the non-superuser runtime role without `BYPASSRLS`.
- `docker compose up -d` (local Postgres + Redis; a fresh volume creates the runtime role)
- `pnpm db:migrate` (applies committed migrations using the owner `DATABASE_URL`)
- `pnpm dev` and, for the email pipeline, `pnpm worker`
- Production images: `docker compose --profile prod up --build` (migrates, then runs web + worker with deterministic email ranking)

## Checks and experiments

- `pnpm selfcheck`: shared pure-function checks.
- `pnpm typecheck` and `pnpm lint`: application checks.
- [Email guess accuracy](docs/experiments/email-guess-accuracy/EXPERIMENT.md): offline top-k and candidate-coverage evaluation against curated published addresses. Follow `MEMORY.md` for commands, answer isolation, and report retention. No database or Redis is needed for this experiment.

## Code structure

- `app/`: URL routes, API handlers, layouts, and global CSS.
- `features/`: domain UI and logic. Each feature exposes route-facing UI through `index.ts`; server-only logic has a separate entry point.
- `components/ui/`: reusable UI primitives; `components/`: cross-feature UI and providers.
- `lib/`: shared framework setup and request parsing; `db/` and `drizzle/`: database schema, client, and migrations.
- `workers/`: BullMQ suggestion worker (`pnpm worker`); `scripts/`: one-off tooling (`db:seed`); `Dockerfile` + `compose.yaml`: production web/worker images and local services.

Keep domain validation and client queries with their feature. Use local state for local UI, TanStack Query for client server state, and direct reads in server components. Add folders or state libraries when real code needs them.
