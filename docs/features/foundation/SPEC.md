# Foundation — SPEC

## Goal
Empty runnable skeleton every other feature builds on (`SPECS.md` §5, §12).

## Dependencies
None.

## Scope
- Next.js App Router + TypeScript, Tailwind + shadcn/ui setup.
- Prisma + managed Postgres connection (`prisma/schema.prisma` with datasource only, no models — models belong to their features), Prisma client singleton in `lib/db.ts`.
- `.env.example`: `DATABASE_URL`, `REDIS_URL`, `EMAIL_VERIFIER_API_KEY`, Better Auth secrets. Never commit real `.env`.
- Base layout + `/` placeholder dashboard with empty-state CTAs (`SPECS.md` §9.1). `/targets`, `/templates`, `/outreach` placeholder pages (empty states only — real UI lives in targets/outreach/templates features).
- `README.md` quickstart: install, `prisma migrate dev`, `npm run dev`.

## Security
- No auth logic here, but scaffold the guard helper import point so `auth` can enforce it without refactoring pages/APIs.
- `.env.example` lists secret names only — no real values, ever.

## Tasks
1. Scaffold app per `SPECS.md` §12 layout (`app/`, `app/api/`, `prisma/`, `lib/`, `lib/queues/`, `workers/`, `components/`).
2. Wire Tailwind + shadcn/ui, base layout, placeholder routes above.
3. Add Prisma datasource + `lib/db.ts` singleton. No domain models.
4. Add `.env.example`, update `README.md` quickstart.

## Acceptance
- `npm run dev` renders `/` with no errors; placeholder routes return empty states.
- `npx prisma validate` passes; `fetch('/api/health')` (or equivalent) confirms DB connectivity path exists.

## Non-goals
Auth, any domain model/API/UI, queues, workers.
