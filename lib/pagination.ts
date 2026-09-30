import * as v from "valibot";
import { and, eq, lt, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

// Bounded so one request cannot ask for the whole table. The default is
// String(DEFAULT_LIMIT), not DEFAULT_LIMIT: a valibot default is validated as
// an *input*, and this schema's input is a string. The output is still number.
export const PaginationQuerySchema = v.object({
  limit: v.optional(
    v.pipe(
      v.string(),
      v.transform(Number),
      v.integer("Limit must be a whole number"),
      v.minValue(1, "Limit must be at least 1"),
      v.maxValue(MAX_LIMIT, `Limit must be ${MAX_LIMIT} or fewer`),
    ),
    String(DEFAULT_LIMIT),
  ),
  cursor: v.optional(v.string()),
});

/** A keyset position, not an identity. No `user_id`: the tenant filter always
 *  comes from the session, so a foreign cursor resolves to nothing. */
export interface Cursor {
  createdAt: Date;
  id: string;
}

export type CursorRow = Cursor;

// Exactly what encodeCursor emits, and nothing looser.
const CURSOR_PARTS = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\.([\w-]{1,64})$/;

export function encodeCursor(row: CursorRow): string {
  return Buffer.from(`${row.createdAt.toISOString()}.${row.id}`, "utf8").toString("base64url");
}

// Client input, so nothing is trusted: the payload must match CURSOR_PARTS
// before it becomes a Date. null lets the route answer 400.
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) {
    return null;
  }
  const match = CURSOR_PARTS.exec(Buffer.from(raw, "base64url").toString("utf8"));
  if (!match) {
    return null;
  }
  const createdAt = new Date(match[1]!);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }
  return { createdAt, id: match[2]! };
}

// Strictly-after for a descending (created_at, id) keyset. Both halves are
// load-bearing: created_at alone repeats tied rows, id alone cannot order
// timestamps. Truncating to JS millisecond precision is safe because it rounds
// down, leaving the cursor <= the last row's real value.
export function keysetAfter(
  createdAt: AnyPgColumn,
  id: AnyPgColumn,
  cursor: Cursor,
): SQL {
  return or(
    lt(createdAt, cursor.createdAt),
    and(eq(createdAt, cursor.createdAt), lt(id, cursor.id)),
  )!;
}

// `limit + 1` rows: the extra one is the only way to know another page exists
// without a count. `key` locates the sort key, which a joined select wraps.
export function paginate<T, K extends CursorRow>(
  rows: T[],
  limit: number,
  key: (row: T) => K = (row) => row as unknown as K,
): { items: T[]; nextCursor: string | null } {
  if (rows.length > limit) {
    return {
      items: rows.slice(0, limit),
      nextCursor: encodeCursor(key(rows[limit - 1]!)),
    };
  }
  return { items: rows, nextCursor: null };
}
