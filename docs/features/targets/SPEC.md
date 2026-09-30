# Targets: SPEC

## Goal
Contact list + detail foundation (`SPECS.md` §3.1, §6.2, §9.2–9.4).

## Dependencies
Foundation (+ auth for `user_id`; if auth missing, hardcode a stub `user_id` constant with a `// TODO(auth)` marker).

## Scope
- `Target` model per `SPECS.md` §6.2: `user_id, full_name, first_name?, last_name?, company?, role_title?, primary_email?, source_type, enrichment_status, notes?, location?, social_urls? (max 5 plain URLs), domain? (explicit email domain), company_website? (contact link and provisional domain source when its hostname is unambiguous), created_at, updated_at`. See `docs/features/email-accuracy/SPEC.md` for current domain rules.
- **Three name columns, one fact.** `full_name` is the name: required, the only one the add form asks for, and the only one the UI reads for display. `first_name`/`last_name` are an *override* for the cases where splitting `full_name` is wrong, such as `Bae Suzy` (family name first), `van der Berg` (multi-token surname), `Mary-Kate O'Neill` (hyphenated given name), `Cher` (mononym), and `J. Smith` (initial). They are null on most rows and are not kept in sync with `full_name`; nothing copies one into the other. `lib/target-name.ts` holds the single `nameParts()` implementation both consumers share, so a name splits identically for the email pipeline and for `{{first_name}}`/`{{last_name}}`.
- The add wizard asks only for the full name. Entering the split there was redundant (three boxes, one fact) and actively unsafe: editing `full_name` later left `first_name`/`last_name` describing the *previous* person, so the pipeline guessed `aarav.sharma@` for a target now called Priya Menon. The override moved to the edit dialog, behind a collapsed "Name for email patterns" disclosure that says blank means split, so the one case that needs it is still one keystroke away and the default stays correct.
- APIs: `GET/POST /api/targets`, `GET/PATCH/DELETE /api/targets/[id]`. `POST` validates `full_name` required; sets `enrichment_status: not_started`. `DELETE` cascades to `Outreach` rows via FK (`EmailGuess` cascade lands with email-pipeline).
- Validate `POST`/`PATCH` bodies with feature schemas and shared `parseBody` (`lib/validators.ts`), 400 + message on failure; client fetching via TanStack Query.
- UI: `/targets` card grid (avatar, name, role at company, primary_email or "not set", latest outreach status or "No outreach yet"), 3-step add-target wizard with stepper (Basics, Contact, Notes plus review), `/targets/[id]` detail (header + edit-target dialog with every field, contact info/notes, email candidates, live outreach history).
- `POST /api/targets` enqueues `email-guess { targetId, userId }` when the queue is available.

## Security
- Every query filters `where: { user_id }`; `GET/PATCH/DELETE /api/targets/[id]` return 404 unless the row's `user_id` matches the session. No endpoint accepts a client-supplied `user_id`.
- `DELETE` cascade must only touch rows owned by the caller (scoped child deletes).

## Tasks
1. Drizzle table + migration.
2. API routes with `user_id` scoping + validation.
3. Card grid + multi-step modal + detail page with edit dialog and empty states.
4. `lib/target-name.ts` + add-wizard drops the split fields, edit dialog gains the collapsed override.

## Acceptance
- Create (wizard) → appears as a card → detail renders → edit any field via the edit dialog → delete removes row.
- `POST` without `full_name` → 400. User B cannot read/update/delete user A's target (gets 404); other users' rows invisible in list.
- The add wizard asks for no first/last name. A target added as `Bae Suzy` and left alone guesses `bae.suzy@…` *and* prefills `{{first_name}}` with `Bae`; adding the same person with the override filled in flips both to `Suzy`/`Bae` together.
- Renaming a target's full name changes what the email pipeline and `{{first_name}}` resolve to, with no stale split left behind.

## Non-goals
Enrichment jobs, email guessing UI, outreach compose (placeholders only). Deriving and persisting the name split on save: null leaves `nameParts()`'s fallback in charge and the field visibly empty until corrected, whereas a stored split would bake in a wrong reading of `Bae Suzy` as if it were known. Name-pattern detection or a per-locale surname database.
