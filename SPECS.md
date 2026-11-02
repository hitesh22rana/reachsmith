# ReachSmith: SPECS.md

## 1. Overview

ReachSmith is a personal outreach and contact engine focused on job hunting, referrals, and recruiting conversations. It helps a user:

- Collect and organize target contacts (recruiters, HRs, employees, hiring managers).
- Store manually entered contact details and public profile references.
- Generate personalized outreach messages from reusable templates.
- Suggest likely work email addresses from names, domains, and context with optional Emailable deliverability checks, without claiming person ownership.
- Track outreach status, follow-ups, and outcomes over time.

The core MVP is implemented in this repository. Hosted service operations and integrations remain future work.

---

## 2. Goals & Non‑Goals

### 2.1 Primary goals (MVP)

- Make it easy for job seekers to:
  - Create and manage a list of target contacts.
  - Generate high-quality, personalized messages for referrals and HR outreach.
  - Have a single place to track who they reached out to and what happened.
- Implement an asynchronous pipeline to:
  - Generate likely email candidates from known patterns.
  - Rank likely work email addresses and optionally check deliverability with Emailable.
- Provide a clean, responsive UI with good defaults, using shadcn/ui and open-source components.
- Use Next.js as both frontend and backend, and Postgres with tenant row-level security.

### 2.2 Non‑goals (for MVP)

- Full-blown sales CRM functionality.
- Deep email provider integrations (Gmail/Outlook syncing, auto reply detection).
- Robust LinkedIn scraping that risks violating ToS.
- Multi-tenant SaaS scaling concerns (multi-region, complex sharding, etc.).

---

## 3. Core Use Cases

### 3.1 Add and manage target contacts

User can:

- Add a contact through the manual form, with optional profile URLs as references. A URL alone does not populate a contact.
- See contacts in a card grid with:
  - Name, role, company, email (if available).
  - Source (LinkedIn, GitHub, manual).
  - Status tags (no outreach, draft, sent, replied, etc.).
- View a contact detail page:
  - Basic profile info.
  - Manually entered contact links, location, and notes.
  - Outreach history and statuses.

### 3.2 Contact context and future enrichment

- MVP stores manually entered names, roles, companies, locations, notes, company websites, and social URLs.
- Profile links are references; the app does not fetch them or run an enrichment worker.
- Compliant enrichment APIs and user-initiated browser capture are future work. No server-side LinkedIn scraping.

### 3.3 Email pattern suggestions

- Given:
  - Contact’s full name.
  - Company / domain (derived from company website, or manually provided).
- ReachSmith:
  - Generates a small set of candidate emails using common patterns.
  - Ranks the complete deduplicated company-domain candidate set using notes, patterns, and social handles.
  - Labels unchecked guesses and provider results distinctly, and lets the user copy or manually save an address for outreach.

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
  - Channel (email, LinkedIn DM, other).
  - Template (or writes from scratch).
- ReachSmith:
  - Fills template variables using:
    - Target contact data (first name, role, company).
    - Editable values entered for each declared placeholder, including any sender details, job links, or custom context.
- User can:
  - Edit final message.
  - Copy it to clipboard for LinkedIn messaging.
  - Mark it as “sent” (for now, sending is manual).
- Outreach records:
  - Statuses: draft, sent, replied, rejected, no response, success (e.g., got referral).
  - Timestamps: created_at, sent_at, last_status_change_at.

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
- **Database**: Postgres with tenant RLS; `DATABASE_URL` is the migration owner and `APP_DATABASE_URL` is the non-superuser runtime role without `BYPASSRLS`.
- **ORM**: Drizzle (for schema, migrations, and type-safe access).
- **Styling/UI**: Tailwind CSS + shadcn/ui components.
- **Background jobs**: BullMQ + Redis (e.g., Upstash or any hosted Redis).
- **Email suggestions**: BullMQ workers with deterministic ranking and optional Emailable batch checks.
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
    - `POST /api/targets` – create target; attempt to enqueue an email-guess job.
    - `GET /api/targets` – list targets.
    - `POST /api/outreach` – create outreach.
    - `PATCH /api/outreach/[id]` – update status.
    - `POST /api/templates` – create template.
    - `PATCH /api/templates/[id]` – update template.
- Background workers:
  - `email-guess` queue worker.
  - (Later) `enrich-profile` worker.

---

## 6. Data Model

Persisted column names below correspond to the Drizzle tables in `db/schema.ts`. Better Auth also owns `sessions`, `accounts`, and `verifications`; its user rows include `email_verified` and optional `image`.

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
- `social_urls` (nullable text array of profile/reference URLs; forms accept up to five, one per line)
- `location` (nullable)
- `extra_enrichment` (nullable JSON, reserved; not populated by an MVP enrichment worker)
- `email_generation` (generation ID, status, input fingerprint, generated domain)
- `email_check` (confirmed address snapshot, remaining addresses, batch progress)
- `email_verifications` (durable results keyed by normalized email address)
- `source_type` (enum: `linkedin`, `github`, `website`, `manual`, `other`)
- `enrichment_status` (enum: `not_started`, `pending`, `success`, `failed`)
- `notes` (text)
- `created_at`
- `updated_at`

### 6.3 Template

Represents a reusable message template.

- `id`
- `user_id`
- `name` (e.g., “Referral request – backend role”)
- `channel` (enum: `email`, `linkedin_dm`, `other`)
- `audience_id` (nullable FK to `audiences.id`; audience is free text, not an enum)
- `purpose` (free text; e.g., `referral_request`, `cold_intro`, `follow_up`)
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
- `metadata` (nullable JSON of filled placeholder values; template-backed messages allow only declared keys, custom messages permit user-supplied keys, at most 50)
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

### 6.6 Audience

Per-user free-text presets in `audiences`: `id`, `user_id`, `name`, `created_at`. Names are unique case-insensitively within each user. Deleting a preset sets related `templates.audience_id` to null. Built-in suggestions are constants, not shared database rows.

## 7. Company Email Suggestions

### 7.1 Overview

Given a target's name and company domain, generate and retain every ranked, deduplicated work-email candidate. Guesses start unchecked. Optional Emailable results report deliverability, not proof that an address belongs to the target. Only the user can save a `primary_email` for outreach. See `docs/features/email-accuracy/SPEC.md` for the current contract.

### 7.2 Domain determination

- Use the owner's explicit `domain` first.
- Otherwise use the registrable domain of an HTTP(S) company website as a provisional domain, using the Public Suffix List through `tldts`. Support company subdomains and multi-label suffixes such as `co.uk`. Reject public email, social, hosted/private suffixes, link-shortener, IP, reserved, localhost, and unrecognized suffixes; require an explicit domain in those cases. The website domain can still differ from the email domain.
- Notes addresses and social profiles never supply the company domain. No domain means no suggestions and an actionable prompt to enter one. There is no Gmail fallback.

### 7.3 Candidate generation and ranking

- Generate the name patterns: `first.last`, `f.last`, `first`, `first_last`, `last.first`, `f_last`, `flast`, `last`, `firstlast`, `firstl`, `fl`, `initials`, `fmlast`, `first.l`, `lastf`, and `initialslast` (compound given-name initials plus the full surname). Fold accents and offer observed aliases, hyphenated given names, and alternatives for compound names and middle initials. Keep name overrides and outreach greetings unchanged.
- Read quoted or parenthetical aliases tied to the supplied given name, fuller opening biography names with the same surname, and short-name subjects sharing at least three opening letters. These are email-only interpretations: do not change name overrides or outreach greetings. English subject cues are heuristic; arbitrary nicknames and unprovided surnames are not invented.
- Include social-handle candidates and notes addresses only at the resolved company domain.
- Use `nameParts()` for the same name tokens used in outreach greetings.
- Rank using notes context, observed handles, fixed global pattern priorities, and penalties for alternative name interpretations. Same-domain notes can supply pattern evidence. Short given names observed in the biography rank above the unshortened given-name guess, while other biography interpretations receive a penalty; direct address evidence still ranks highest. Priorities were tuned on diagnostic seeds; no model or learned organization-specific ranking runs in production. Keep every candidate on the company domain.
- Persist every candidate in `email_guesses` with source, pattern, context, and rank in `score`. Keep deterministic ranking independent from optional provider results in `targets.email_verifications` JSONB keyed by normalized address.

### 7.4 User decision

- Show the complete ranked list without pagination or a “Show more” step, with a copy action, unchecked labels, and optional provider state, score, check time, test-mode indication, and accept-all warnings.
- Allow manual entry of any valid email address, including a personal address, into `target.primary_email`. Validate through the shared feature schema with inline feedback, without native browser popups. This is an owner selection, not a verification result.
- The user sends outreach manually and tracks the outcome. A reply can be recorded through outreach status; copying or saving an address never proves deliverability.

### 7.5 Accuracy experiments

The [email guess accuracy experiment](docs/experiments/email-guess-accuracy/EXPERIMENT.md) evaluates the production candidate and ranking functions offline against published addresses. `MEMORY.md` describes how to run and report it. Keep expected answers and evidence out of pipeline inputs. Report top-k accuracy and candidate coverage separately; diagnostic seed results do not establish deliverability or independent generalization.

---

## 8. Asynchronous Processing with BullMQ

- `POST /api/targets` enqueues `email-guess { targetId, userId, generation }` once on creation. Target edits never regenerate or clear suggestions or verification. The owner uses `POST /api/targets/[id]/guesses` to regenerate manually; input fingerprints identify a stale list.
- The standalone `email-guess` worker reloads the target under `asUser(userId, ...)`, checks ownership, resolves the domain, ranks candidates, and replaces the stored suggestions with the complete ranked set in one transaction. It runs outside Next.js and uses Redis/BullMQ.
- The queue payload scopes RLS but does not authorize the job. A missing or cross-tenant target yields no writes.
- The UI polls briefly while suggestions are generated, then shows the ranked list. When `EMAILABLE_API_KEY` is configured, the owner can confirm a deliverability check for unchecked addresses, or explicitly recheck the complete set, in a credit-use dialog. Only then does the authenticated verify route queue `email-verify`. Creating or editing targets never spends verification credits. Verification uses private server-side credentials and batches of at most 1,000, checks available live credits before submission, and polls the provider without a public callback. Store progress and the immutable confirmed address list in `targets.email_check`, generation status and input fingerprint in `targets.email_generation`, and durable results by normalized address in `targets.email_verifications`. Regeneration preserves both checks and results. New candidates start unchecked; returning candidates reuse results and dates. Active checks finish their original snapshot even if regeneration removes those addresses. Generation and batch IDs reject duplicate or superseded check responses. Never automatically set `primary_email`. Targets use authenticated `POST /api/targets/[id]/verify` to start or resume a known batch. Ambiguous submissions are not automatically repeated.

---

## 9. Frontend UX Flows

### 9.1 Onboarding

- Better Auth email/password login/signup. Signup continues at `/login?new=1`, without automatically creating a session.
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
- Source type and location (optional).
- Email (optional, if known).
- Email domain (optional, drives guessing).
- Social URLs (up to 5, one per line).
- Company website (optional contact link).
- Notes (optional).

Behavior:

- On submit:
  - Creates the Target.
  - Attempts to enqueue email guessing. Queue failures are logged and do not roll back target creation. A company name alone cannot supply a domain.
  - With no resolvable domain, generation yields no suggestions; the UI prompts for a domain. Otherwise the suggestions section polls briefly.

### 9.4 Target detail page

Sections:

- Header:
  - Name, role, company, and any manually saved primary_email.
  - “Edit target” dialog covering every field.
- Contact info:
  - Profile links, location, company website, and notes.
  - Notes save automatically after an 800 ms typing pause or on blur, only when changed. Keep the editor styling steady, preserve newer typing during saves, and offer retry on failure.
- Email suggestions section:
  - Show the ranked list from the last generation with a copy action. Edits show a quiet stale-input hint and a Regenerate suggestions action. Cached check results survive ranking changes and removed/returning addresses.
  - Place the selected outreach email and manual email entry above the suggestions.
  - Each suggestion offers explicit Use email and Copy actions. Show rank, source, verification state, score, and check date; keep existing results visible with a separate rechecking indicator. Regeneration and checking share a toolbar, with stale-input guidance distinguishing their behavior.
- Outreach history (live):
  - List of Outreach records with status, sent date, copy button, and inline status change.
- “New Outreach” button:
  - Opens a flow to select template and channel, fill editable fields for the template’s declared placeholders, edit the message, copy to clipboard, then save draft or save and mark `sent`.

### 9.5 Template management

- List of templates with:
  - Name, channel, audience, updated_at.
- Template editor:
  - Name.
  - Channel (email, LinkedIn DM, other).
  - Free-text audience with per-user preset suggestions.
  - Purpose.
  - Body text with detected placeholder chips; any lowercase `snake_case` name in double braces, up to 50.

### 9.6 Outreach view

- Global outreach table or simple pipeline:
  - Filters by status (draft, sent, replied, etc.).
  - Ability to quickly change status (e.g., mark as replied).
  - Cursor pagination by immutable `(created_at, id)` descending. The Updated column displays `last_status_change_at` without changing list order.

---

## 10. Security, Privacy & Compliance

- Store minimal personally identifiable information (PII) needed for outreach.
- Allow user to:
  - Delete a target (and related EmailGuess/Outreach records).
- Make it clear in future ToS/Privacy:
  - User is responsible for having legitimate interest/consent for emails they send.
- Respect platform ToS:
  - No server-side LinkedIn scraping.
  - Prefer enrichment APIs or user-run browser extensions.
- Every domain query uses `forUser()` or worker `asUser()` with tenant RLS, plus ownership checks. APIs return 401 when logged out and 404 for foreign record IDs.
- `forUser()` verifies the runtime role cannot bypass RLS before its first domain transaction; worker `asUser()` performs its own role check.
- Better Auth rate limits authentication; future enrichment or sending requires its own abuse limits.

---

## 11. Implementation Phases

Phases 1 and 2 are implemented; phases 3 and 4 describe future work. See `docs/README.md` for feature status.

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
- Surface ranked guesses and optional deliverability results and the manually selected `primary_email` in the UI.

### 11.3 Phase 3 – Enrichment & integrations

- Optional profile enrichment via compliant APIs.
- Browser extension for capturing LinkedIn profiles to ReachSmith.
- Optional email sending via provider (Gmail/Outlook/SMTP).

### 11.4 Phase 4 – Towards SaaS

- Hosted SaaS operations and scaling; session ownership and tenant RLS are already required in the MVP.
- Billing, rate limits, usage analytics.
- Hardened security and privacy controls.

---

## 12. Repository Conventions

- Repository name: `ReachSmith` or `reachsmith`.
- Language: TypeScript.
- Directory layout (high-level):

  - `app/` – Next.js App Router entry points, layouts, route handlers, and global CSS. Route files connect URLs to features.
  - `features/<name>/` – domain UI, schemas, and logic that change together. Existing features are `auth`, `landing`, `dashboard`, `targets`, `templates`, `outreach`, `email`, and `audiences`; add others when implemented.
  - `features/<name>/index.ts` – public UI entry point for routes and other features. Server-only code uses an explicit server entry point so client bundles cannot import database logic.
  - `components/ui/` – domain-agnostic UI primitives; other shared components stay in `components/` only when used across features.
  - `lib/` – shared framework setup and cross-feature helpers, including the common request body parser and Better Auth server setup.
  - `db/` – Drizzle schema (`db/schema.ts`) and client (`db/index.ts`); `drizzle/` – generated migrations.
  - `lib/queues/` – BullMQ queue definitions for the email pipeline.
  - `workers/` – email pipeline workers (one `pnpm worker` process); `scripts/` – one-off tooling.
  - `Dockerfile` (multi-stage `web`/`worker` images, deterministic suggestion worker) + `compose.yaml` (local Postgres 18 + Redis 8, prod profile).
  - `docs/experiments/` – experiment plans, seeds, runners, and final reports.

- Keep feature internals local. Other features import public entry points; shared UI and helpers never import feature code. Colocate feature-specific validation and TanStack Query hooks. Use server components for direct data reads, TanStack Query for client server state, and local React state for local UI state. Add global client state only when a real cross-feature need appears.
- Prefer one clear owner for each behavior (DRY), small focused modules where behavior warrants it (SOLID), and no empty directories or speculative layers (YAGNI).

- Config:
  - `.env` for owner/runtime database URLs, Redis URL, and Better Auth secrets.
  - `README.md` for quickstart and local dev setup.
  - `SPECS.md` (this file) to describe the platform.
