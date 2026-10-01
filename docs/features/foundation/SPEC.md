# Foundation: SPEC

## Goal
Initial scaffolding stage every other feature builds on (`SPECS.md` §5, §12). The empty tables and placeholder pages below describe this stage, not the completed app; current setup is in `README.md`.

## Dependencies
None.

## Scope

- Next.js App Router + TypeScript, Tailwind + shadcn/ui setup.
- Valibot feature-owned schemas (`features/<name>/validation.ts`) for client + API validation with react-hook-form; TanStack Query provider for client fetching.
- Drizzle + managed Postgres connection (`db/schema.ts` with no tables: tables belong to their features), Drizzle client singleton in `db/index.ts`.
- `.env.example`: `DATABASE_URL`, `APP_DATABASE_URL`, `REDIS_URL`, Better Auth secrets. Never commit real `.env`.
- Base layout + placeholder dashboard at `/dashboard` with empty-state CTAs (`SPECS.md` §9.1). `/` is owned by the landing feature; `/targets`, `/templates`, `/outreach` placeholder pages (empty states only: real UI lives in targets/outreach/templates features).
- `README.md` quickstart: install, configure `.env`, start compose services, `pnpm db:migrate`, `pnpm dev`. Use `pnpm db:generate` only when changing the schema.

## Security

- No auth logic here, but scaffold the guard helper import point so `auth` can enforce it without refactoring pages/APIs.
- `.env.example` lists secret names only: no real values, ever.

## Tasks

1. Scaffold app per `SPECS.md` §12 layout (`app/`, `app/api/`, `db/`, `drizzle/`, `lib/`, `lib/queues/`, `workers/`, `components/`).
2. Wire Tailwind + shadcn/ui, base layout, placeholder routes above.
3. Add Drizzle config + client (`drizzle.config.ts`, `db/`). No domain tables.
4. Add `.env.example`, update `README.md` quickstart.

## Acceptance

- `pnpm dev` renders `/` with no errors; placeholder routes return empty states.
- `pnpm db:generate` passes; `pnpm db:migrate` applies against the compose Postgres and the app boots with both database URLs and Better Auth settings configured. `DATABASE_URL` runs migrations; `APP_DATABASE_URL` connects the app as the constrained runtime role.

## Non-goals
Auth, any domain model/API/UI, queues, workers.
