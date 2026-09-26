# SEO: SPEC

## Goal
Make the public landing indexable with complete meta tags, schema markup, crawler files, and mobile plus Core Web Vitals hardening, while keeping private app routes out of the index.

## Dependencies
Foundation (root layout, metadata API) + landing (public `/` content, FAQ source for schema).

## Scope
- Root layout: `metadataBase`, title template (`%s | ReachSmith`), description, keywords, authors, canonical `/`, OpenGraph + Twitter `summary_large_image`, icons, manifest ref, `viewport` (`device-width`, `initialScale: 1`, light/dark `themeColor`), font `display: "swap"`, Organization + WebSite JSON-LD, noscript fallback for the Reveal hidden state.
- `/`: indexable metadata + canonical + FAQPage JSON-LD built from the exported `FAQS` array (single source, no duplicated copy).
- Crawler files: `app/robots.ts` (allow `/`, disallow `/api/` and app routes), `app/sitemap.ts` (`/` weekly), `app/manifest.ts`, `app/opengraph-image.tsx` (1200x630).
- Private and auth routes (`dashboard`, `targets`, `targets/[id]`, `templates`, `outreach`, `login`, `signup`, `not-found`): title + description + `noindex, nofollow`.
- Landing chrome: brand logo `alt` text, 48px mobile menu target, static header with floating menu panel on mobile.
- Brand favicons generated from the mascot: `app/icon.svg`, multi-size `app/favicon.ico` (16/32/48), white-flattened 180px `app/apple-icon.png`; wired via file convention plus explicit manifest entries. Titles use `|` separators, never em dashes (repo rule).
- Keyword is `referral outreach` (title, description, hero sub, footer tagline). Density stays below 1%: the page is short and repeating the phrase to hit the range would be stuffing, so that WARN is accepted.

## Security
- No user data in metadata, schema, or sitemap. Private routes stay `noindex` on top of existing session guards. Site URL comes from env with a public fallback; no secrets anywhere.

## Tasks
1. Harden `app/layout.tsx` (metadata, viewport, JSON-LD, noscript fallback) and unblock `app/page.tsx` (`index, follow`, canonical, FAQ schema from exported `FAQS`).
2. Add `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`.
3. Add `noindex` metadata to private/auth routes plus `not-found`.
4. Fix logo `alt` text and mobile menu tap target; set `poweredByHeader: false`, AVIF/WebP formats, `optimizePackageImports` for `lucide-react`.

## Acceptance
- Logged-out `/` renders indexable metadata + canonical + FAQ schema; private routes render `noindex`.
- `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image` resolve (visible in `pnpm build` route list).
- `pnpm typecheck`, `pnpm lint`, `pnpm build` green.

## Non-goals
Marketing CMS, blog, per-page OG images, hreflang, pricing/billing pages.
