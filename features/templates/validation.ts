import * as v from "valibot";

export const ChannelSchema = v.picklist(
  ["email", "linkedin_dm", "other"],
  "Pick a valid channel",
);

export const AudienceTypeSchema = v.picklist(
  ["hr", "recruiter", "engineer", "founder", "generic"],
  "Pick a valid audience",
);

const OptionalTextSchema = (max: number) =>
  v.optional(
    v.pipe(v.string(), v.trim(), v.maxLength(max, `Must be ${max} characters or fewer`)),
  );

export const TemplateCreateSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Name is required"),
    v.maxLength(100, "Must be 100 characters or fewer"),
  ),
  channel: v.optional(ChannelSchema, "email"),
  audience_type: v.optional(AudienceTypeSchema, "generic"),
  purpose: OptionalTextSchema(200),
  body: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Body is required"),
    v.maxLength(5000, "Must be 5000 characters or fewer"),
  ),
});

export const TemplatePatchSchema = v.partial(TemplateCreateSchema);

export type TemplateCreateInput = v.InferOutput<typeof TemplateCreateSchema>;
export type TemplatePatchInput = v.InferOutput<typeof TemplatePatchSchema>;

// Server-to-client template shape (dates cross as ISO strings).
export const TemplateJsonSchema = v.object({
  id: v.string(),
  userId: v.string(),
  name: v.string(),
  channel: ChannelSchema,
  audienceType: AudienceTypeSchema,
  purpose: v.nullable(v.string()),
  body: v.string(),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const TemplateListSchema = v.object({
  templates: v.array(TemplateJsonSchema),
});

export type ApiTemplate = v.InferOutput<typeof TemplateJsonSchema>;
