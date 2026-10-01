# MEMORY.md

Durable user preferences. `AGENTS.md` points here: always follow this file.

- Always make multiple logical signed commits (split by concern, `git commit -S`), never one lump commit.
- Never compromise on SECURITY and SAFETY: every data access is scoped to the session owner (`user_id` filter + ownership re-check + RLS where supported) so no user can reach another user's data.
- Never use em-dashes in repo content or agent output; use commas, colons, or hyphens instead.
- For any UI or design work, always load and follow the Emil Kowalski design skills via the skill tool before building: emil-design-eng (main design/animation guidance), animate, review-animations, improve-animations, find-animation-opportunities, prototype, animation-vocabulary, apple-design, pick-ui-library.
- When working with TypeScript, always load and follow mastering-typescript-skill (https://github.com/SpillwaveSolutions/mastering-typescript-skill) via the skill tool.
- Before pushing frontend-related changes, always run `npx react-doctor@latest` and fix the reported issues first.
- For any SEO work, always load and follow the `nextjs-seo-audit` skill at `.agents/skills/nextjs-seo-audit` before auditing or changing metadata, schema, robots, sitemap, or viewport.

- Email accuracy experiments retain only the final `RESULTS.md` report. Keep working data in memory, remove intermediate outputs after analysis, and do not reference discarded outputs in documentation or PR descriptions.
