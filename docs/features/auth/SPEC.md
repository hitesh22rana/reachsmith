# Auth (Better Auth): SPEC

## Goal
Login/signup + session-guarded app (`SPECS.md` §9.1, §11.1). Auth provider is **Better Auth**: no NextAuth/Auth.js, no Supabase Auth, no hand-rolled passwords/sessions.

## Dependencies
`docs/features/foundation/SPEC.md`. If its Prisma client is missing, stub with an in-memory session map: do not build your own DB layer.

## Scope
- Better Auth integration (Prisma adapter): use its schema models (`user`, `session`, `account`, `verification`) via the Better Auth CLI/schema tooling: do not hand-write competing `User` tables.
- Email/password (provider default) + logout; post-login redirect to `/`.
- Session helper (`lib/auth.ts`: `getUserId()` or Better Auth equivalent) returning the caller id for ownership scoping.
- Guard `/targets`, `/templates`, `/outreach` + all `POST`/`PATCH` APIs: unauthenticated → login.

## Security
- All later features scope rows by this session `user_id`. Sessions/secrets stay server-side; never expose tokens or IDs to the client beyond what Better Auth requires.
- Auth-bypass stub (`// TODO(auth)`) is dev-only and must fail closed (deny) if session is absent.

## Tasks
1. Add Better Auth schema (via its tooling) + migration.
2. Wire Better Auth server/client, `lib/auth.ts` session helper.
3. Add login/signup UI, logout, guard helper for pages + API routes.

## Acceptance
- Signup → login → visit `/targets` works; logged-out visit redirects to login.
- Two users see isolated data (verified once targets exists, or via direct DB rows with distinct `user_id`).

## Non-goals
Teams, roles, billing, password-reset flows beyond Better Auth default.
