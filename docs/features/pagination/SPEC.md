# Pagination: SPEC

## Goal
Keyset (cursor) pagination for the two unbounded list endpoints, `GET /api/targets` and `GET /api/outreach`, plus the composite indexes that make the keyset scan an index scan instead of a sort.

## Dependencies
Foundation (+ auth for `user_id`, + targets/templates for outreach). Optional on every other feature: no other route imports `lib/pagination.ts` except the two below.

## Why keyset and not offset
Not for deep-offset cost, which is irrelevant at this scale and would argue for offset. Keyset is here because of a correctness bug offset cannot avoid, and because it is the smaller diff for the UI.

- `outreaches.last_status_change_at` is **mutable**: `PATCH /api/outreach/[id]` rewrites it on every status transition. A keyset over a column that moves reorders the list under the reader, and an offset over it duplicates and skips rows as soon as anything is written mid-scroll. Neither is acceptable.
- Numbered pages would mean page state, disabled prev/next and a `total` count, for lists a single user reads top to bottom. "Load more" is both the smaller diff and the right UX.

## Scope
- **Paginated:** `GET /api/targets`, `GET /api/outreach` (`status` and `targetId` filters keep working; the cursor composes with either).
- **Never paginated, deliberately:** `GET /api/templates` and `GET /api/audiences` are *pickers*, not feeds. `new-outreach-dialog.tsx` maps the whole template array into a `<Select>` and resolves the chosen name with `templates.find(...)`; a first page only would show a truncated dropdown and fail to name an off-page selection. They need search, not pages, and they are already small. `GET /api/targets/[id]/guesses` is bounded to roughly one row per email pattern for one domain (~5–20). It gains an `orderBy` for determinism — `score DESC, created_at DESC`, because the guess worker inserts a ranked batch in one statement and `created_at` alone cannot order rows sharing a transaction timestamp — and nothing else.
- **Cursor is opaque and immutable-keyed:** base64url of `<createdAt ISO>.<id>`, keyset on `(created_at, id)` — the same tuple the index is built on. `id` is the tiebreaker so two rows sharing a timestamp cannot both be skipped.
- **`outreaches` now orders by `created_at DESC, id DESC`, not `last_status_change_at DESC`.** This is a visible behaviour change and the whole point: the sort key must not move. The table's Updated column still renders `lastStatusChangeAt`, so a message you replied to today shows today's date on a row ordered by when it was written. A stable list is worth more here than a list that reorders itself, and a mutable key makes pagination incorrect rather than merely imperfect.
- **Indexes:** `targets` and `outreaches` swap `*_user_id_idx` for `*_user_id_created_at_id_idx` on `(user_id, created_at, id)`. The composite strictly dominates the old index (`user_id` is its leading column, so it still serves every `user_id`-only lookup), so the old one is dropped rather than left to rot. Built ascending: Postgres scans an index backwards for `ORDER BY ... DESC`, so `DESC` modifiers would be noise.
- **Applied to the baseline, not a new migration.** There are no users and no deployment, so the index change is folded into `drizzle/0000_baseline.sql` and the migrations are renumbered to a two-file set (`0000_baseline`, `0001_tenant_rls`, previously `0000`/`0001`/`0002_tenant_rls`). `db/schema.ts` is the source of truth and the snapshot under `drizzle/meta/` is regenerated from it, so the next `db:generate` diffs clean. A deployed database instead takes a normal additive migration: drop the old index, create the composite.
- **Page size:** `limit` optional, default 25, max 100. A route fetches `limit + 1` rows and drops the extra, because that extra row is the only way to know another page exists without a count query.
- **Response:** the existing array key plus `nextCursor: string | null`. No `hasMore` — `nextCursor !== null` is `hasMore`, and no `total`, because counting the whole set costs the scan pagination just removed.
- **Client:** `useInfiniteQuery` with a "Load more" button. The count in the page header becomes `N+ contacts` / `N+ messages` when a further page exists, so the number never overstates what is on screen.
- **Dashboard:** the pipeline card counted statuses by pulling every outreach row into JS. It is now a `groupBy(status)` in SQL, and `outreachCount` is the sum of those groups, which also retires the separate `count()` query.
- No offset/limit window syntax anywhere, and no page-number parameters.

## Security
- A cursor is client input and is validated before it reaches SQL: base64url charset check, then the decoded `createdAt` must match an ISO-8601 shape, then the `id` must be non-empty text. Anything else is a 400, not a query. A cursor is never interpolated into SQL text — it is bound as a parameter and compared with `lt`/`and`/`or`.
- A cursor encodes a position, not an identity: it carries no `user_id`, and the tenant predicate is always `eq(table.userId, sessionUserId)` from the session, never from the cursor. A cursor minted for user A applied by user B simply resolves to nothing, because B's `user_id` filter excludes those rows. Handing a foreign cursor over is a no-op, not a leak.
- `targetId` stays an ordinary filter; ownership is unchanged, and the joined `targets` row in the outreach list is still constrained by the caller's `user_id`.
- RLS is untouched: the same `forUser(userId, ...)` transaction wrapper, same `app.user_id` GUC, same 404-not-403 rule on `:id` routes.

## Tasks
1. `lib/pagination.ts`: `DEFAULT_LIMIT`, `MAX_LIMIT`, the `limit`/`cursor` query-param Valibot schema, `encodeCursor`, `decodeCursor`, `keysetAfter`, and `paginate` (the `limit + 1` fetch-and-trim helper, whose `key` argument locates the sort key for a joined select that wraps the row).
2. `db/schema.ts`: replace the two `*_user_id_idx` with the composite triples; regenerate.
3. `GET /api/targets` and `GET /api/outreach`: read the params, add the keyset predicate, `orderBy(desc(createdAt), desc(id))`, trim to `limit`, emit `nextCursor`. Outreach's order-by change rides along here.
4. `nextCursor` on `TargetListSchema` and `OutreachListSchema`.
5. `useInfiniteQuery` + Load more in `targets-view.tsx` and `outreach-view.tsx`; `target-outreach-section.tsx` reads the new shape. The page fetchers go through `lib/api.ts`'s `getJson` (`docs/README.md` shared contracts), and the two fetchers the compose dialog and the pipeline view share — `fetchTemplates` and `setOutreachStatus` — live in their feature's `client.ts` rather than being copied into a component.
6. `orderBy(desc(emailGuesses.score), desc(emailGuesses.createdAt))` on the guesses query.
7. Dashboard `groupBy`.
8. selfcheck coverage for the cursor codec.
9. Docs sync: `docs/README.md` status + build order.

## Acceptance
- `GET /api/targets` with 30 rows returns 25 and a `nextCursor`; the cursor returns the remaining 5 and `nextCursor: null`. No row is repeated or dropped across the seam.
- 30 targets where 10 share the same `created_at` still page without a duplicate or a skip (the `id` tiebreaker).
- Inserting a target between page 1 and page 2 shifts nothing: page 2 still returns the next 5 oldest-first-in-DESC terms, and the new target appears only after a refetch from the top.
- `?limit=0`, `?limit=101`, `?cursor=not-a-cursor`, `?cursor=<valid base64 of garbage>` and `?cursor=<cursor for another user>` are all 400 or empty — never a 500, never a foreign row.
- `GET /api/outreach` marks one row `replied` mid-scroll, then loads the next page: no row moves between pages.
- `GET /api/templates` and `GET /api/audiences` responses are byte-identical to before apart from absent pagination, and the compose dialog's template dropdown still lists every template.
- `EXPLAIN` on the unfiltered targets list uses `targets_user_id_created_at_id_idx` and no `Sort` node.
- The dashboard's pipeline card renders the same counts with one fewer query and no full outreach scan.

## Non-goals
Paginating templates, audiences or email guesses. Search on any list. Jumping to page N, a total count, or a "last page" link. Cursors that encode a sort column name, a direction or a filter set — the codec is fixed at `(created_at, id)` descending. Cached or prefetched pages. An index for the `status`/`targetId` filtered outreach list: the composite's `user_id` prefix plus a cheap filter is fine at this volume, and a `(user_id, status, created_at, id)` becomes worth building only when a filtered list is measurably slow.
