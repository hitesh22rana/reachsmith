import * as v from "valibot";
import { AUDIENCE_MAX_LENGTH } from "@/features/audiences/validation";
import { PLACEHOLDER_MAX_LENGTH } from "./render";

export const ChannelSchema = v.picklist(
  ["email", "linkedin_dm", "other"],
  "Pick a valid channel",
);

// The one place the channel list is written down. Every channel picker in the
// app maps over this and reads its label from the same object, so adding a
// channel is one edit rather than three, and an option cannot exist without a
// label.
export const CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  other: "Other",
} as const satisfies Record<v.InferOutput<typeof ChannelSchema>, string>;

export const CHANNEL_OPTIONS = (
  Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]
).map((value) => ({ value, label: CHANNEL_LABELS[value] }));

export const PlaceholderSchema = v.object({
  name: v.pipe(v.string(), v.maxLength(PLACEHOLDER_MAX_LENGTH)),
  label: v.pipe(v.string(), v.maxLength(PLACEHOLDER_MAX_LENGTH + 4)),
  source: v.picklist(["target", "input"], "Pick a valid placeholder source"),
});

const OptionalTextSchema = (max: number) =>
  v.optional(
    v.pipe(v.string(), v.trim(), v.maxLength(max, `Must be ${max} characters or fewer`)),
  );

// Audience is free text, not an enum: the enum was wrong for anyone whose
// role was not one of the five. The row is resolved server-side on save,
// so a name the caller has not used before is fine here.
const AudienceNameSchema = OptionalTextSchema(AUDIENCE_MAX_LENGTH);

// The body's placeholders are deliberately NOT checked here. A valibot
// check has one static message, so it cannot name the offender, and the
// route's placeholderError 400 is the one that can. The editor shows the
// same per-placeholder problems live under the body as you type, so there
// is nothing for a second, vaguer error channel to add.
export const TemplateCreateSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Name is required"),
    v.maxLength(100, "Must be 100 characters or fewer"),
  ),
  channel: v.optional(ChannelSchema, "email"),
  audience: AudienceNameSchema,
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

// Server-to-client template shape (dates cross as ISO strings; no user_id).
// audience is the resolved name, not the id, so the editor round-trips a
// plain string and cannot point at another tenant's row.
export const TemplateJsonSchema = v.object({
  id: v.string(),
  name: v.string(),
  channel: ChannelSchema,
  audience: v.nullable(v.string()),
  purpose: v.nullable(v.string()),
  body: v.string(),
  placeholders: v.array(PlaceholderSchema),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const TemplateListSchema = v.object({
  templates: v.array(TemplateJsonSchema),
});

export const TemplateEnvelopeSchema = v.object({ template: TemplateJsonSchema });

export type ApiTemplate = v.InferOutput<typeof TemplateJsonSchema>;
