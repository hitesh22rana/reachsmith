import * as v from "valibot";

type ParseSuccess<T> = { ok: true; data: T };
type ParseFailure = { ok: false; message: string };

// Backend helper: validate an unknown request body, fail with a message
// the route can return as a 400. Never throws on invalid input.
export function parseBody<TSchema extends v.GenericSchema>(
  schema: TSchema,
  data: unknown,
): ParseSuccess<v.InferOutput<TSchema>> | ParseFailure {
  const result = v.safeParse(schema, data);
  if (result.success) {
    return { ok: true, data: result.output };
  }
  const first = result.issues[0];
  if (!first) {
    return { ok: false, message: "Invalid request body" };
  }
  const path = first.path?.map((segment) => String(segment.key)).join(".");
  return { ok: false, message: path ? `${path}: ${first.message}` : first.message };
}

const ErrorBodySchema = v.object({ message: v.optional(v.string()) });

// The message a route returned, or the caller's own text. A body that is not
// JSON at all, or carries no string message, falls back rather than throwing.
export function errorMessage(body: unknown, fallback: string): string {
  const parsed = v.safeParse(ErrorBodySchema, body);
  return (parsed.success ? parsed.output.message : undefined) ?? fallback;
}
