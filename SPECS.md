# ReachSmith – SPEC.md

## 1. Overview

ReachSmith is a personal outreach and contact engine focused on job hunting, referrals, and recruiting conversations. It helps a user:

- Collect and organize target contacts (recruiters, HRs, employees, hiring managers).
- Enrich those contacts from public profiles (e.g., LinkedIn, GitHub) and manual data.
- Generate personalized outreach messages from reusable templates.
- Suggest likely work email addresses from names, domains, and context without claiming verification.
- Track outreach status, follow-ups, and outcomes over time.

The initial goal is to build a functional MVP in a private GitHub repository, with a clear path to evolve into a hosted service later.

---

## 2. Goals & Non‑Goals

### 2.1 Primary goals (MVP)

- Make it easy for job seekers to:
  - Create and manage a list of target contacts.
  - Generate high-quality, personalized messages for referrals and HR outreach.
  - Have a single place to track who they reached out to and what happened.
- Implement an asynchronous pipeline to:
  - Generate likely email candidates from known patterns.
  - Rank likely work email addresses without an external verifier.
- Provide a clean, responsive UI with good defaults, using shadcn/ui and open-source components.
- Use Next.js as both frontend and backend, and a managed SQL database.

### 2.2 Non‑goals (for MVP)

- Full-blown sales CRM functionality.
- Deep email provider integrations (Gmail/Outlook syncing, auto reply detection).
- Robust LinkedIn scraping that risks violating ToS.
- Multi-tenant SaaS scaling concerns (multi-region, complex sharding, etc.).

---

## 3. Core Use Cases

### 3.1 Add and manage target contacts

User can:

- Add a new contact via:
  - A profile URL (LinkedIn, GitHub, personal website, company profile).
  - A manual form (name, role, company, email if known).
- See all contacts in a table with:
  - Name, role, company, email (if available).
  - Source (LinkedIn, GitHub, manual).
  - Status tags (no outreach, draft, sent, replied, etc.).
- View a contact detail page:
  - Basic profile info.
  - Enrichment data (where available).
  - Outreach history and statuses.

### 3.2 Enrich contact data

- Given a profile URL, ReachSmith may:
  - Store the URL as a reference.
  - Optionally trigger an asynchronous enrichment job (via compliant APIs).
- The enrichment may populate:
  - Full name.
  - Role/title.
  - Company.
  - Location.
  - Public links (GitHub, personal website).
- Due to ToS constraints, enrichment via direct scraping is not the default. Instead:
  - MVP favors manual input plus optional third-party enrichment APIs.
  - Future phases might add browser-extension–based scraping (user-initiated).

### 3.3 Email pattern suggestions

- Given:
  - Contact’s full name.
  - Company / domain (derived from company website, or manually provided).
- ReachSmith:
  - Generates a small set of candidate emails using common patterns.
  - Ranks up to ten company-domain suggestions using notes, patterns, and social handles.
  - Labels suggestions as unverified and lets the user copy or manually save an address for outreach.

### 3.4 Outreach template management

User can:

- Create and store templates with variables: any lowercase `snake_case` name in double braces (e.g. `{{first_name}}`, `{{resume_link}}`), up to 50 per template, declared on the template and filled in when composing.
- Tag templates by:
  - Channel: email, LinkedIn DM (and others later).
  - Audience: free text, e.g. HR, recruiter, founder, designer, with per-user presets (`audiences`).
  - Purpose: referral request, cold intro, follow-up, etc.
- Render templates for a specific contact + job when composing outreach.

### 3.5 Outreach creation and tracking

For a selected contact:

- User chooses:
  - Purpose (e.g., “Ask for referral to Job X”).
  - Channel (email, LinkedIn DM).
  - Template (or writes from scratch).
- ReachSmith:
  - Fills template variables using:
    - Target contact data (first name, role, company).
    - User’s own profile (sender name, current role).
    - Optional job link or custom context.
- User can:
  - Edit final message.
  - Copy it to clipboard for LinkedIn messaging.
  - Mark it as “sent” (for now, sending is manual).
- Outreach records:
  - Statuses: draft, sent, replied, rejected, no response, success (e.g., got referral).
  - Timestamps: created, sent_at, last_status_change.

---

## 4. User Personas

### 4.1 Job seeker (primary)

- Needs to reach out to many recruiters/employees across different companies.
- Wants high‑quality personalized messages without rewriting from scratch.
- Doesn’t want to manually track outreach on spreadsheets.

### 4.2 Power user / builder (secondary)

- Someone who wants to experiment with email pattern guessing and enrichment.
- Comfortable customizing ReachSmith and trying experimental features.
- May connect optional enrichment APIs in a later phase.

---

## 5. System Architecture

### 5.1 Tech stack

- **Frontend & backend**: Next.js (App Router, TypeScript).
- **Database**: Managed SQL (e.g., Postgres via Supabase, Neon, PlanetScale, or Railway).
- **ORM**: Drizzle (for schema, migrations, and type-safe access).
- **Styling/UI**: Tailwind CSS + shadcn/ui components.
- **Background jobs**: BullMQ + Redis (e.g., Upstash or any hosted Redis).
- **Email suggestions**: BullMQ worker with deterministic ranking; no external verifier.
- **Auth**: Better Auth with email/password.
- **Validation**: Valibot with feature-owned schemas shared between forms and API routes; forms via react-hook-form + Valibot resolver.
- **Client data**: TanStack Query; server components fetch directly.

### 5.2 High-level components

- Next.js app:
  - Pages:
    - `/` – public landing page.
    - `/dashboard` – dashboard (auth required).
    - `/targets` – list of targets.
    - `/targets/[id]` – target details.
    - `/templates` – template list and CRUD.
    - `/outreach` – pipeline view (outreach records, loaded a page at a time).
  - API routes / server actions:
    - `POST /api/targets` – create target; enqueue enrichment/email guess jobs.
    - `GET /api/targets` – list targets.
    - `POST /api/outreach` – create outreach.
    - `PATCH /api/outreach/[id]` – update status.
    - `POST /api/templates` – create template.
    - `PATCH /api/templates/[id]` – update template.
- Background workers:
  - `email-guess` queue worker.
  - (Later) `enrich-profile` worker.

---

## 6. Data Model (Initial Draft)

Using generic field names; actual implementation will use Drizzle tables.

### 6.1 User

Represents an authenticated user of ReachSmith.

- `id`
- `email`
- `name`
- `created_at`
- `updated_at`

### 6.2 Target

Represents a target contact (recruiter, HR, employee, etc.).

- `id`
- `user_id` (owner)
- `full_name`
- `first_name` / `last_name` are an optional override, not a second copy of the full name: the UI asks only for the full name, and the split used for email patterns and `{{first_name}}` is derived from it unless someone corrects it (`docs/features/targets/SPEC.md`).
- `company`
- `role_title`
- `primary_email` (nullable, set by the owner for outreach; never filled by the suggestion worker)
- `domain` (nullable company email domain, used for suggestions)
- `company_website` (nullable, can supply a provisional domain)
- `profile_url` (e.g., LinkedIn/GitHub URL)
- `source_type` (enum: `linkedin`, `github`, `website`, `manual`, `other`)
- `enrichment_status` (enum: `not_started`, `pending`, `success`, `failed`)
- `notes` (text)
- `created_at`
- `updated_at`

Optional enrichment fields (for later):

- `location`
- `company_website`
- `github_url`
- `linkedin_url` (if different from profile_url)
- `extra_enrichment` (JSON)

### 6.3 Template

Represents a reusable message template.

- `id`
- `user_id`
- `name` (e.g., “Referral request – backend role”)
- `channel` (enum: `email`, `linkedin_dm`, `other`)
- `audience_id` (nullable FK to `audiences.id`; audience is free text, not an enum)
- `purpose` (string/enum; e.g., `referral_request`, `cold_intro`, `follow_up`)
- `body` (text with placeholders like `{{first_name}}`, `{{resume_link}}`)
- `placeholders` (JSON: one `{name, label, source}` per placeholder in the body, derived on save)
- `created_at`
- `updated_at`

### 6.4 Outreach

Represents a specific message (or planned message) from user to a target.

- `id`
- `user_id`
- `target_id`
- `template_id` (nullable; user might write a custom message)
- `channel` (enum: `email`, `linkedin_dm`, `other`)
- `subject` (for email; nullable for DMs)
- `body_final` (the actual text used/sent)
- `status` (enum: `draft`, `sent`, `replied`, `rejected`, `no_response`, `success`)
- `sent_at` (nullable)
- `last_status_change_at`
- `metadata` (JSON – can store things like job_link, job_title, email_message_id later)
- `created_at`
- `updated_at`

### 6.5 EmailGuess

Represents a candidate email address generated for a target.

- `id`
- `user_id`
- `target_id`
- `email`
- `pattern_used` (e.g., `first.last`, `f_last`, `first`, etc.)
- `source` (`notes` or `pattern`)
- `score` (integer rank, higher first)
- `context` (nullable evidence snippet)
- `created_at`
- `updated_at`

## 7. Company Email Suggestions

### 7.1 Overview

Given a target's name and company domain, generate up to ten ranked work-email suggestions. Suggestions are unverified. The system does not claim that a mailbox exists, accepts messages, or belongs to the target. Only the user can save a `primary_email` for outreach. See `docs/features/email-accuracy/SPEC.md` for the current contract.

### 7.2 Domain determination

- Use the owner's explicit `domain` first.
- Otherwise use a straightforward company website hostname as a provisional domain. Reject public email, social, hosting, link-shortener, IP, localhost, and ambiguous hostnames; require an explicit domain in those cases.
- Notes addresses and social profiles never supply the company domain. No domain means no suggestions and an actionable prompt to enter one. There is no Gmail fallback.

### 7.3 Candidate generation and ranking

- Generate the six name patterns: `first.last`, `f.last`, `first`, `first_last`, `last.first`, and `f_last`.
- Include social-handle candidates and notes addresses only at the resolved company domain.
- Use `nameParts()` for the same name tokens used in outreach greetings.
- Rank from notes context, pattern frequency, and other available evidence. Use deterministic ordering and keep every candidate on the company domain.
- Persist the top ten in `email_guesses` with source, pattern, context, and rank in `score`. Do not assign validity or deliverability status.

### 7.4 User decision

- Show the ranked suggestions with a copy action and an explicit "not verified" label.
- Allow manual entry of any email, including a personal address, into `target.primary_email`. This is an owner selection, not a verification result.
- The user sends outreach manually and tracks the outcome. A reply can be recorded through outreach status; copying or saving an address never proves deliverability.

---

## 8. Asynchronous Processing with BullMQ

- `POST /api/targets` enqueues `email-guess { targetId, userId }`. A target edit affecting email-search inputs clears and regenerates its suggestions; unrelated edits do not restart the search.
- The standalone `email-guess` worker reloads the target under `asUser(userId, ...)`, checks ownership, resolves the domain, ranks candidates, and stores up to ten suggestions. It runs outside Next.js and uses Redis/BullMQ.
- The queue payload scopes RLS but does not authorize the job. A missing or cross-tenant target yields no writes.
- The UI polls briefly while suggestions are generated, then shows the ranked list. No external verifier API, SMTP probe, `email-verify` queue, or automatic `primary_email` write is part of the MVP.

---

## 9. Frontend UX Flows

### 9.1 Onboarding

- Simple login/signup.
- Post-login redirect to `/dashboard`:
  - A minimal dashboard showing:
    - “Add your first target” CTA.
    - Live per-section counts (targets, templates, outreach).
    - Empty states for targets and outreach.

### 9.2 Target list

- Card grid with:
  - Avatar, name, role at company.
  - Primary email (“not set” if missing).
  - Source label; latest outreach status or “No outreach yet”.
- Actions:
  - Add new target (opens the wizard dialog).
  - Title link or Open button to reach target detail; inline delete with confirm.

### 9.3 Add target modal

Three-step wizard (Basics, Contact, Notes plus review) with a stepper. Fields:

- Full name (required).
- Company (optional but recommended).
- Role/title (optional).
- Email (optional, if known).
- Email domain (optional, drives guessing).
- Social URLs (up to 5, one per line).
- Company website (optional contact link).
- Notes (optional).

Behavior:

- On submit:
  - Creates the Target.
  - Optionally triggers:
    - Email guessing pipeline (if company/domain is available).
    - Enrichment job in future.
  - UI shows pending state for email if pipeline is running.

### 9.4 Target detail page

Sections:

- Header:
  - Name, role, company, and any manually saved primary_email.
  - “Edit target” dialog covering every field.
- Contact info:
  - Profile links, notes, enrichment info.
- Email suggestions section:
  - Show ranked company-domain suggestions with a copy action.
  - Allow the user to save an email manually for outreach.
- Outreach history (live):
  - List of Outreach records with status, sent date, copy button, and inline status change.
- “New Outreach” button:
  - Opens a flow to select template and channel, fill job title/link, edit, copy-to-clipboard, then save draft or save and mark `sent`.

### 9.5 Template management

- List of templates with:
  - Name, channel, audience, updated_at.
- Template editor:
  - Name.
  - Channel (email, LinkedIn DM).
  - Audience type.
  - Purpose.
  - Body text with placeholder hints (list of supported variables).

### 9.6 Outreach view

- Global outreach table or simple pipeline:
  - Filters by status (draft, sent, replied, etc.).
  - Ability to quickly change status (e.g., mark as replied).
  - Sorting by sent_at or last_status_change.

---

## 10. Security, Privacy & Compliance

- Store minimal personally identifiable information (PII) needed for outreach.
- Allow user to:
  - Delete a target (and related EmailGuess/Outreach records).
- Make it clear in future ToS/Privacy:
  - User is responsible for having legitimate interest/consent for emails they send.
- Respect platform ToS:
  - Avoid large-scale LinkedIn scraping from server-side.
  - Prefer enrichment APIs or user-run browser extensions.
- Rate-limit:
- Any future enrichment or email sending to avoid abuse and IP blocking.

---

## 11. Implementation Phases

### 11.1 Phase 1 – Core MVP

- Auth.
- Target CRUD (manual entry).
- Template CRUD with simple variable substitution.
- Outreach creation (generate messages, copy to clipboard).
- Outreach status tracking.
- Simple UI using Next.js + shadcn/ui.
- Basic EmailGuess suggestion table and worker, with manual email input.

### 11.2 Phase 2 – Email suggestions

- Implement EmailGuess model.
- Implement BullMQ + Redis.
- Implement the `email-guess` queue and deterministic ranking.
- Surface ranked, unverified suggestions and the manually selected `primary_email` in the UI.

### 11.3 Phase 3 – Enrichment & integrations

- Optional profile enrichment via compliant APIs.
- Browser extension for capturing LinkedIn profiles to ReachSmith.
- Optional email sending via provider (Gmail/Outlook/SMTP).

### 11.4 Phase 4 – Towards SaaS

- Multi-tenant best practices (if needed).
- Billing, rate limits, usage analytics.
- Hardened security and privacy controls.

---

## 12. Repository Conventions

- Repository name: `ReachSmith` or `reachsmith`.
- Language: TypeScript.
- Directory layout (high-level):

  - `app/` – Next.js App Router entry points, layouts, route handlers, and global CSS. Route files connect URLs to features.
  - `features/<name>/` – domain UI, schemas, and logic that change together. Existing features are `auth`, `landing`, `dashboard`, `targets`, `templates`, `outreach`, and `email`; add others when implemented.
  - `features/<name>/index.ts` – public UI entry point for routes and other features. Server-only code uses an explicit server entry point so client bundles cannot import database logic.
  - `components/ui/` – domain-agnostic UI primitives; other shared components stay in `components/` only when used across features.
  - `lib/` – shared framework setup and cross-feature helpers, including the common request body parser and Better Auth server setup.
  - `db/` – Drizzle schema (`db/schema.ts`) and client (`db/index.ts`); `drizzle/` – generated migrations.
  - `lib/queues/` – BullMQ queue definitions for the email pipeline.
  - `workers/` – email pipeline workers (one `pnpm worker` process); `scripts/` – one-off tooling.
  - `Dockerfile` (multi-stage `web`/`worker` images, deterministic suggestion worker) + `compose.yaml` (local Postgres 18 + Redis 8, prod profile).
  - `workers/` – standalone worker entry points when the email pipeline is implemented.

- Keep feature internals local. Other features import public entry points; shared UI and helpers never import feature code. Colocate feature-specific validation and TanStack Query hooks. Use server components for direct data reads, TanStack Query for client server state, and local React state for local UI state. Add global client state only when a real cross-feature need appears.
- Prefer one clear owner for each behavior (DRY), small focused modules where behavior warrants it (SOLID), and no empty directories or speculative layers (YAGNI).

- Config:
  - `.env` for database URL, Redis URL, and Better Auth secrets.
  - `README.md` for quickstart and local dev setup.
  - `SPEC.md` (this file) to describe the platform.
