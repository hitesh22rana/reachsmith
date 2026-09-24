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

export type LoginInput = v.InferOutput<typeof LoginSchema>;
export type SignupInput = v.InferOutput<typeof SignupSchema>;

export const SourceTypeSchema = v.picklist(
  ["linkedin", "github", "website", "manual", "other"],
  "Pick a valid source",
);

const OptionalTextSchema = (max: number) =>
  v.optional(
    v.pipe(v.string(), v.trim(), v.maxLength(max, `Must be ${max} characters or fewer`)),
  );

// Empty stays empty (field is optional); anything typed must be a valid URL.
export const OptionalUrlSchema = v.optional(
  v.union(
    [
      v.literal(""),
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(2048, "Must be 2048 characters or fewer"),
        v.url("Enter a valid URL starting with https://"),
      ),
    ],
    "Enter a valid URL starting with https://",
  ),
);
// Empty stays empty (field is optional); anything typed must be a valid email.
export const OptionalEmailSchema = v.optional(
  v.union(
    [
      v.literal(""),
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(254, "Must be 254 characters or fewer"),
        v.email("Enter a valid email address"),
      ),
    ],
    "Enter a valid email address",
  ),
);

export const TargetCreateSchema = v.object({
  full_name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Full name is required"),
    v.maxLength(100, "Must be 100 characters or fewer"),
  ),
  first_name: OptionalTextSchema(100),
  last_name: OptionalTextSchema(100),
  company: OptionalTextSchema(100),
  role_title: OptionalTextSchema(100),
  primary_email: OptionalEmailSchema,
  profile_url: OptionalUrlSchema,
  source_type: v.optional(SourceTypeSchema, "manual"),
  notes: OptionalTextSchema(2000),
  location: OptionalTextSchema(100),
  company_website: OptionalUrlSchema,
  github_url: OptionalUrlSchema,
  linkedin_url: OptionalUrlSchema,
});

export const TargetPatchSchema = v.partial(TargetCreateSchema);

export type TargetCreateInput = v.InferOutput<typeof TargetCreateSchema>;
export type TargetPatchInput = v.InferOutput<typeof TargetPatchSchema>;

// Server-to-client target shape (dates cross as ISO strings).
export const TargetJsonSchema = v.object({
  id: v.string(),
  userId: v.string(),
  fullName: v.string(),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  company: v.nullable(v.string()),
  roleTitle: v.nullable(v.string()),
  primaryEmail: v.nullable(v.string()),
  profileUrl: v.nullable(v.string()),
  sourceType: SourceTypeSchema,
  enrichmentStatus: v.picklist(["not_started", "pending", "success", "failed"]),
  notes: v.nullable(v.string()),
  location: v.nullable(v.string()),
  companyWebsite: v.nullable(v.string()),
  githubUrl: v.nullable(v.string()),
  linkedinUrl: v.nullable(v.string()),
  extraEnrichment: v.unknown(),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const TargetListSchema = v.object({
  targets: v.array(TargetJsonSchema),
});

export type ApiTarget = v.InferOutput<typeof TargetJsonSchema>;

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
