import * as v from "valibot";

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

export const DomainSchema = v.optional(
  v.union(
    [
      v.literal(""),
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(253, "Must be 253 characters or fewer"),
        v.regex(
          /^[a-z0-9.-]+\.[a-z]{2,}$/i,
          "Enter a domain like company.com",
        ),
      ),
    ],
    "Enter a domain like company.com",
  ),
);

// One URL per line, at most 5. Stays raw text through the form; the
// server mapper splits it into the stored array.
function socialUrlLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function linesAreUrls(raw: string): boolean {
  return socialUrlLines(raw).every((line) => {
    try {
      const url = new URL(line);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  });
}

export const SocialUrlsSchema = v.optional(
  v.pipe(
    v.string(),
    v.check((raw) => socialUrlLines(raw).length <= 5, "At most 5 URLs"),
    v.check(linesAreUrls, "Each line must be a valid URL starting with https://"),
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
  source_type: v.optional(SourceTypeSchema, "manual"),
  notes: OptionalTextSchema(2000),
  location: OptionalTextSchema(100),
  company_website: OptionalUrlSchema,
  domain: DomainSchema,
  social_urls: SocialUrlsSchema,
});

export const TargetPatchSchema = v.partial(TargetCreateSchema);

export type TargetCreateInput = v.InferOutput<typeof TargetCreateSchema>;
export type TargetPatchInput = v.InferOutput<typeof TargetPatchSchema>;

// Server-to-client target shape (dates cross as ISO strings; no user_id).
export const TargetJsonSchema = v.object({
  id: v.string(),
  fullName: v.string(),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  company: v.nullable(v.string()),
  roleTitle: v.nullable(v.string()),
  primaryEmail: v.nullable(v.string()),
  sourceType: SourceTypeSchema,
  enrichmentStatus: v.picklist(["not_started", "pending", "success", "failed"]),
  notes: v.nullable(v.string()),
  location: v.nullable(v.string()),
  companyWebsite: v.nullable(v.string()),
  domain: v.nullable(v.string()),
  socialUrls: v.nullable(v.array(v.string())),
  extraEnrichment: v.unknown(),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const TargetListSchema = v.object({
  targets: v.array(TargetJsonSchema),
});

export type ApiTarget = v.InferOutput<typeof TargetJsonSchema>;
