import * as v from "valibot";

// Shared Valibot schemas for client and API routes. Validate at every
// trust boundary: forms before submit, request bodies before writes.

export const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email("Enter a valid email address"),
);

export const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(8, "Password must be at least 8 characters"),
);

export const LoginSchema = v.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const SignupSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Name is required")),
  email: EmailSchema,
  password: PasswordSchema,
});

export const HealthSchema = v.object({
  status: v.string(),
});

export type LoginInput = v.InferOutput<typeof LoginSchema>;
export type SignupInput = v.InferOutput<typeof SignupSchema>;

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
