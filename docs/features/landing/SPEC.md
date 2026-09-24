# Landing: SPEC

## Goal
Public marketing page at `/`; the dashboard moves behind auth to `/dashboard` (`SPECS.md` §5.2, §9.1). Logged-out visitors see landing; logged-in visitors go to their dashboard.

Design follows the landing-page-design skill (Part A strategy before Part B visuals). Locked intake decisions: primary action is account creation, top objection is email accuracy, direction is minimal editorial, layout type A (classic hero plus sections: the product is understandable from a dashboard screenshot).

## Dependencies
Foundation (layout, design system, motion tokens) + auth (session state for the redirect).

## Scope
- `/` becomes a public landing page: hero (product name, one-line pitch, Log in / Create account CTAs), feature highlights (targets, templates, outreach, email verification), footer. No app data, no user-specific content.
- Move the current dashboard (stat cards, session-aware header) from `/` to `/dashboard`, guarded by `requireUserId()`.
- Logged-in visit to `/` redirects to `/dashboard`. Post-login/post-signup redirect becomes `/dashboard` (update `auth-form.tsx` + auth SPEC).
- Reuse Card/Button/motion tokens (`animate-enter`, `pressable`, stagger); honor reduced motion. SEO metadata for `/`.
- Skill compliance notes: hero heading uses the skill's text gradient (the only allowed gradient); spacing uses only skill table steps (all valid Tailwind steps); Lucide stays as the icon set for app-wide consistency (not a banned set); tagline reveal section (B11) is mandatory; FAQ leads with the accuracy objection and risk reversal leans on confidence labels plus manual override (no auto-send); `noindex` until public launch.

## Security
- Landing renders zero user data and calls no authenticated endpoints. `/dashboard` enforces the same session guard as other app routes.

## Tasks
1. Move dashboard page to `app/dashboard/page.tsx` + guard.
2. Build public landing at `app/page.tsx` (server component, session checked only for the redirect).
3. Point post-login redirects at `/dashboard`; add `/dashboard` to guarded routes.

## Acceptance
- Logged-out `/` shows landing with CTAs; no dashboard content or user data leaks.
- Logged-in `/` redirects to `/dashboard`; logged-out `/dashboard` redirects to `/login`.
- `typecheck`, `lint`, `build` green.

## Non-goals
Marketing CMS, blog, pricing/billing pages, logged-in personalization of landing.
