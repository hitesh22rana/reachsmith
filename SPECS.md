# ReachSmith – SPEC.md

## 1. Overview

ReachSmith is a personal outreach and contact engine focused on job hunting, referrals, and recruiting conversations. It helps a user:

- Collect and organize target contacts (recruiters, HRs, employees, hiring managers).
- Enrich those contacts from public profiles (e.g., LinkedIn, GitHub) and manual data.
- Generate personalized outreach messages from reusable templates.
- Predict and verify email addresses using patterns and verification APIs.
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
  - Verify candidate emails via a third‑party API.
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

### 3.3 Email pattern guessing and verification

- Given:
  - Contact’s full name.
  - Company / domain (derived from company website, or manually provided).
- ReachSmith:
  - Generates a small set of candidate emails using common patterns.
  - Verifies candidates asynchronously via an external email verification API.
  - Picks the “best” candidate (e.g., safe_to_send, not disposable, not invalid).
  - Stores verification results and highlights confidence in the UI.

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
- May connect their own enrichment / verification APIs.

---

## 5. System Architecture

### 5.1 Tech stack

- **Frontend & backend**: Next.js (App Router, TypeScript).
- **Database**: Managed SQL (e.g., Postgres via Supabase, Neon, PlanetScale, or Railway).
- **ORM**: Drizzle (for schema, migrations, and type-safe access).
- **Styling/UI**: Tailwind CSS + shadcn/ui components.
- **Background jobs**: BullMQ + Redis (e.g., Upstash or any hosted Redis).
- **Email verification**: External API (e.g., QuickEmailVerification or similar free-tier provider).
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
  - `email-verify` queue worker.
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
- `primary_email` (nullable, derived from verification or manual input)
- `primary_email_source` (nullable `manual | verified`; records which of the two authorized writers settled the column, so a later valid guess cannot clobber an owner decision)
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
- `status` (enum: `pending`, `verifying`, `valid`, `invalid`, `unknown`, `accept_all`)
- `verification_meta` (JSON; full API response from verifier)
- `created_at`
- `updated_at`

### 6.6 DomainPattern (optional, later optimization)

Stores discovered email patterns per domain to reduce guessing.

- `id`
- `user_id` (optional: can be global or per user)
- `domain` (e.g., `example.com`)
- `pattern` (`first.last`, `f_last`, etc.)
- `confidence` (numeric score)
- `evidence_count` (how many successful addresses support this pattern)
- `created_at`
- `updated_at`

---

## 7. Email Guessing & Verification Pipeline

### 7.1 Overview

Given a target with a name and company:

1. Determine the company domain.
2. Generate candidate email addresses using a limited set of common patterns.
3. Persist the candidates as EmailGuess records with `status = pending`.
4. Asynchronously verify each candidate via an external email verification API.
5. Mark valid candidates and choose a recommended primary_email for the target.

### 7.2 Domain determination

Strategies:

- Use an explicit “company website” field if provided by user.
- If the target has a LinkedIn company page URL or GitHub organization, extract domain when possible (later).
- As a fallback, user can manually input a domain for the company.

Out-of-scope for MVP: complex domain lookup from company name alone.

### 7.3 Pattern generation

For a given `{first_name, last_name, domain}`, generate a small set of candidates from common global patterns:

- `first.last@domain`
- `f.last@domain`
- `first@domain`
- `first_last@domain`
- `last.first@domain`
- `f_last@domain`

In future, DomainPattern records can reduce this to the most probable 1–2 patterns for known domains.

### 7.4 Verification layers

1. Local / free checks:
   - Basic syntax validation.
   - DNS lookup for MX records; if none, mark as invalid (early exit).
2. External verification API:
   - For each syntactically valid candidate, call the email verification API.
   - Expected fields in response (varies by provider):
     - Result / status: valid, invalid, unknown, disposable, accept_all, etc.
     - `safe_to_send` or equivalent boolean.
3. Status mapping:
   - `valid` + safe_to_send → `status = valid`.
   - `invalid` → `status = invalid`.
   - `disposable` or similar → `status = invalid` or `unknown` based on policy.
   - `accept_all` → `status = accept_all` (user sees a warning).
   - `unknown` → `status = unknown`.

### 7.5 Picking a primary email

Logic:

- Prefer candidates with `status = valid`.
- If multiple valid:
  - Prefer patterns with higher global frequency (e.g., `first.last`).
  - Secondarily, prefer patterns already seen as valid for this domain.
- If only `accept_all` candidates:
  - Optionally assign primary_email but label it as “risky / catch-all”.
- If none valid or acceptable:
  - Do not set primary_email; UI indicates “email not found – try manual or LinkedIn DM”.

The chosen email is written to `target.primary_email` and surfaced in the UI.

**Precedence: an owner's settled override outranks the pipeline.** Every owner-facing
write stamps `primary_email_source = 'manual'`; the recompute stamps `'verified'`
and its `WHERE` clause excludes rows already marked `manual`, so a later valid
candidate never silently overwrites a decision the user made. Clearing the field
clears the marker and lets the pipeline propose again. The UI reads the stored
marker rather than inferring provenance by matching the address against guesses.

---

## 8. Asynchronous Processing with BullMQ

### 8.1 Queues

Planned queues:

- `email-guess`:
  - Job data: `{ targetId }`
  - Responsibility:
    - Load target.
    - Derive domain.
    - Generate candidate emails.
    - Insert EmailGuess rows.
    - Enqueue `email-verify` jobs for each candidate.
- `email-verify`:
  - Job data: `{ candidateId }`
  - Responsibility:
    - Load EmailGuess row.
    - Run verification (local + external API).
    - Update `status` and `verification_meta`.
    - If valid, consider setting target.primary_email.

Later (optional):

- `enrich-profile`:
  - For profile enrichment via external APIs.
- `send-email`:
  - To send emails via SMTP/third-party providers, if implemented.

### 8.2 Worker process

- One Node process hosting both BullMQ workers (not part of Next.js web server).
- Connects to Redis with BullMQ.
- Configuration per queue:
  - Concurrency per queue (e.g., 5–10).
  - Rate limiting to respect external API limits.
  - Retries with exponential backoff.

### 8.3 Data flow

1. User creates/updates a target through Next.js.
2. Server:
   - Stores target in DB.
   - Enqueues a job in `email-guess` with `{ targetId }`.
3. `email-guess` worker:
   - Generates candidates, writes EmailGuess rows.
   - Enqueues `email-verify` jobs for each candidate.
4. `email-verify` worker:
   - Verifies each candidate and updates status.
   - Optionally updates target.primary_email when a good candidate is found.
5. UI:
   - Polls or revalidates data to show:
     - “Email guessing…” while jobs are running.
     - Final result and confidence once done.

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
  - Name, role, company, primary_email or “Finding email…”.
  - “Edit target” dialog covering every field.
- Contact info:
  - Profile links, notes, enrichment info.
- Email guessing section:
  - Show candidates and statuses (optional advanced view).
  - Allow user to override and pick “correct” email if necessary.
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
  - Email verification and any enrichment to avoid abuse and IP blocking.

---

## 11. Implementation Phases

### 11.1 Phase 1 – Core MVP

- Auth.
- Target CRUD (manual entry).
- Template CRUD with simple variable substitution.
- Outreach creation (generate messages, copy to clipboard).
- Outreach status tracking.
- Simple UI using Next.js + shadcn/ui.
- Basic EmailGuess table and pipelines wired, but can start with manual email input.

### 11.2 Phase 2 – Email guessing & verification

- Implement EmailGuess model.
- Implement BullMQ + Redis.
- Implement `email-guess` and `email-verify` queues.
- Integrate with a free-tier email verification API.
- Surface primary_email and candidate status in UI.

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
  - `Dockerfile` (multi-stage `web`/`worker` images, rank model baked in) + `compose.yaml` (local Postgres 18 + Redis 8, prod profile).
  - `workers/` – standalone worker entry points when the email pipeline is implemented.

- Keep feature internals local. Other features import public entry points; shared UI and helpers never import feature code. Colocate feature-specific validation and TanStack Query hooks. Use server components for direct data reads, TanStack Query for client server state, and local React state for local UI state. Add global client state only when a real cross-feature need appears.
- Prefer one clear owner for each behavior (DRY), small focused modules where behavior warrants it (SOLID), and no empty directories or speculative layers (YAGNI).

- Config:
  - `.env` for database URL, Redis URL, and verifier API keys.
  - `README.md` for quickstart and local dev setup.
  - `SPEC.md` (this file) to describe the platform.
