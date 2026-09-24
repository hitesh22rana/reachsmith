# F02 — Auth

## Goal
Login/signup + session-guarded app (`SPEC.md` §9.1, §11.1).

## Dependencies
F01. If F01 Prisma client missing, stub with in-memory session map — do not build your own DB layer.

## Scope
- `User` model in `prisma/schema.prisma`: `id, email (unique), name?, created_at, updated_at`.
- NextAuth/Auth.js (or Supabase Auth if stack chose it in F01 — reuse, don't add a second provider): signup/login, post-login redirect to `/`.
- Guard `/targets`, `/templates`, `/outreach` + all `POST`/`PATCH` APIs: unauthenticated → login.
- All later features scope rows by `user_id` from session.

## Tasks
1. Add `User` model + migration.
2. Wire provider, session helper (`lib/auth.ts`: `getUserId()` or equivalent).
3. Add login/signup UI, logout, guard helper for pages + API routes.

## Acceptance
- Signup → login → visit `/targets` works; logged-out visit redirects to login.
- Two users see isolated data (verified once F03 exists, or via direct DB rows with distinct `user_id`).

## Non-goals
Teams, roles, billing, password-reset flows beyond provider default.
