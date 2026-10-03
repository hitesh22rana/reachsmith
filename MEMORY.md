# MEMORY.md

Durable user preferences. `AGENTS.md` points here: always follow this file.

- Always make multiple logical signed commits (split by concern, `git commit -S`), never one lump commit.
- Declare every devDependency with an explicit `^major.minor.patch` range. Update to current compatible releases and verify lint, type checking, and build after major upgrades.
- Never compromise on SECURITY and SAFETY: every data access is scoped to the session owner (`user_id` filter + ownership re-check + RLS where supported) so no user can reach another user's data.
- Never use em-dashes in repo content or agent output; use commas, colons, or hyphens instead.
- For any UI or design work, always load and follow the Emil Kowalski design skills via the skill tool before building: emil-design-eng (main design/animation guidance), animate, review-animations, improve-animations, find-animation-opportunities, prototype, animation-vocabulary, apple-design, pick-ui-library.
- When working with TypeScript, always load and follow the available `mastering-typescript` skill, resolving its `SKILL.md` from the session skill catalog.
- Before pushing frontend-related changes, always run `npx react-doctor@latest` and fix the reported issues first.
- For any SEO work, always load and follow the `nextjs-seo-audit` skill from the session skill catalog before auditing or changing metadata, schema, robots, sitemap, or viewport.

- Generate email suggestions automatically once on target creation. Edits, including notes autosave, never regenerate suggestions or clear checks. Later generation requires the owner's Regenerate suggestions action; show a quiet stale-input hint.
- Retain verification results per target and normalized address independently of suggestion rows, including removed addresses. Reuse results when an address returns or changes rank. A confirmed check keeps its original address snapshot through edits and regeneration. Check unchecked addresses by default; rechecking requires separate credit confirmation.
- Keep verification-provider branding out of product UI and user-facing errors; use deliverability terminology.
- Keep button icons compact through the shared button variants: 14 px normally, 12 px for extra-small buttons. Use distinct refresh and badge-check icons for regeneration and rechecking. Copy feedback applies only to the clicked button and resets after two seconds. Manual email entry uses inline validation, never native browser validation popups.
- Optional Emailable checks start only after the owner confirms the selected address count and credit usage in a dialog; creating or editing a target and regenerating suggestions never spends verification credits. Keep provider results separate from deterministic ranking, label simulated and accept-all results, never auto-select primary emails, and never spend live credits in demo seeds or offline accuracy checks.

## Experiments and email accuracy runs

- Start with [EXPERIMENT.md](docs/experiments/email-guess-accuracy/EXPERIMENT.md). Keep experiments under `docs/experiments/<name>/` with a plan, form-shaped seeds, their schema, and a runner that reuses production logic.
- For email accuracy, add real people with published individual work/institutional addresses and enough biography. Preserve stable source-prefixed IDs, source links, and inspection dates. Omit unknown fields; never invent inputs from the answer.
- `target.primary_email` is the withheld answer. Case IDs and evidence never enter the guesser. Notes must contain no email addresses; domains, websites, social handles, and name overrides must be independently supported.
- Run from the repository root after `pnpm install`:

```sh
pnpm selfcheck
node --experimental-strip-types --no-warnings docs/experiments/email-guess-accuracy/run.ts --selfcheck
node --experimental-strip-types --no-warnings docs/experiments/email-guess-accuracy/run.ts
```

- The offline runner requires no Docker, database, Redis, or model. It measures fresh candidate generation and ranking, not queue, persistence, or UI behavior.
- Persist, return, and display the complete ranked, deduplicated email candidate set. Do not add a top-k cutoff, pagination, or “Show more” for suggestions. Top-k remains an evaluation metric. Older capped targets expand when their guess job next runs, including after manual regeneration.
- Before a recorded full run, commit the evaluated code and seed changes and start with a clean tracked working tree. The runner records the Git revision, source/input checksums, runtime, and any tracked changes; it does not enforce cleanliness. Commit the report separately after analysis.
- Each run retains only `runs/<timestamp>/RESULTS.md`, including reproducibility metadata. Keep per-case working data in memory, finish diagnostics/comparisons in that report, and delete intermediate outputs after analysis. Do not reference discarded outputs in documentation or PR descriptions.
- Compare top-1/3/5/10 accuracy, full-list accuracy, candidate coverage, conditional ranking, input/source cohorts, macro domain averages, and errors with a prior report on the same seed snapshot. The runner’s deterministic and current-pipeline columns use the same order; they are not an automatic comparison with a historical run. Record the compared revision and input checksums when adding a comparison.
- Keep dataset and cohort totals in each run’s report, not general documentation. Preserve historical reports when seeds grow; changed seeds change the denominator and must be identified before comparing accuracy.
- Treat seeds used to choose patterns or scores as tuning data. Collect an independent holdout from additional organizations before claiming generalization. Published-address agreement does not prove deliverability.
