# AGENTS.md

Follow `MEMORY.md` — it holds durable user preferences.

Greenfield repo. `SPEC.md` is the source of truth — read it before coding. `README.md` is a stub.

## Planned stack (not scaffolded yet — no package.json, no toolchain)
- Next.js App Router + TypeScript, Tailwind + shadcn/ui, Prisma on managed Postgres, BullMQ + Redis workers, external email-verification API. See `SPEC.md` §5.

## Layout to follow when scaffolding (`SPEC.md` §12)
- `app/` pages + `app/api/` handlers; `prisma/` schema + migrations; `lib/` (email patterns, template engine), `lib/queues/`; `workers/` (email-guess, email-verify); `components/`; `styles/`.
- Env via `.env`: database URL, Redis URL, verifier API key.

## Constraints agents miss
- No server-side LinkedIn scraping (ToS). Enrichment = manual input + compliant APIs only (`SPEC.md` §6.2, §10).
- Outreach sending is manual in MVP: generate message, copy to clipboard, mark `sent`. No Gmail/Outlook sync, no `send-email` worker yet (`SPEC.md` §3.5, §8.1).
- Keep Prisma enums exactly as specced: `source_type`, `enrichment_status`, `channel`, `audience_type`, `Outreach.status`, `EmailGuess.status` (`SPEC.md` §6). Template vars are `{{first_name}}`, `{{company}}`, `{{job_title}}`, `{{job_link}}`.
- Email pipeline order: `POST /api/targets` → `email-guess { targetId }` → `EmailGuess` rows → `email-verify { candidateId }` → `target.primary_email`. Workers are standalone Node processes, not in the Next.js server (`SPEC.md` §7–8).
- Build order: Phase 1 CRUD/templates/outreach tracking first; email-guess/verify (Phase 2) after. Don't build SaaS/billing/multi-region (`SPEC.md` §2.2, §11).
