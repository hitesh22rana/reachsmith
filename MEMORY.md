# MEMORY.md

Durable user preferences. `AGENTS.md` points here: always follow this file.

- Always make multiple logical signed commits (split by concern, `git commit -S`), never one lump commit.
- Never compromise on SECURITY and SAFETY: every data access is scoped to the session owner (`user_id` filter + ownership re-check + RLS where supported) so no user can reach another user's data.
- Never use em-dashes in repo content or agent output; use commas, colons, or hyphens instead.

- Always make multiple logical signed commits (split by concern, `git commit -S`), never one lump commit.
- Never compromise on SECURITY and SAFETY: every data access is scoped to the session owner (`user_id` filter + ownership re-check + RLS where supported) so no user can reach another user's data.
