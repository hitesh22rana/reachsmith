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
- `node --experimental-strip-types --no-warnings scripts/check-email-worker.ts`: worker persistence check against a migrated local database; creates and cleans up disposable fixtures.
- [Email guess accuracy](docs/experiments/email-guess-accuracy/EXPERIMENT.md): offline top-k and candidate-coverage evaluation against curated published addresses. Follow `MEMORY.md` for commands, answer isolation, and report retention. No database or Redis is needed for this experiment.

## Development toolchain

DevDependencies use explicit `^major.minor.patch` ranges. TypeScript stays on the newest API-compatible release while `typescript-eslint` requires the JavaScript compiler API. TypeScript 7 currently needs [side-by-side aliases](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0), so it is deferred to preserve the version-range format and working lint checks.

ESLint 10 uses the official `@eslint/compat` wrapper for Next's existing React/import/accessibility plugins. Remove the wrapper when those plugins support the new rule API. Their current peer ranges still report ESLint compatibility warnings; the repository lint command runs with the wrapper.

## Code structure

- `app/`: URL routes, API handlers, layouts, and global CSS.
- `features/`: domain UI and logic. Each feature exposes route-facing UI through `index.ts`; server-only logic has a separate entry point.
- `components/ui/`: reusable UI primitives; `components/`: cross-feature UI and providers.
- `lib/`: shared framework setup and request parsing; `db/` and `drizzle/`: database schema, client, and migrations.
- `workers/`: BullMQ suggestion worker (`pnpm worker`); `scripts/`: one-off tooling (`db:seed`); `Dockerfile` + `compose.yaml`: production web/worker images and local services.

Keep domain validation and client queries with their feature. Use local state for local UI, TanStack Query for client server state, and direct reads in server components. Add folders or state libraries when real code needs them.
