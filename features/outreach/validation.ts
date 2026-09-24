import * as v from "valibot";
import { ChannelSchema } from "@/features/templates/validation";

export const OutreachStatusSchema = v.picklist(
  ["draft", "sent", "replied", "rejected", "no_response", "success"],
  "Pick a valid status",
);

const OptionalTextSchema = (max: number) =>
  v.optional(
    v.pipe(v.string(), v.trim(), v.maxLength(max, `Must be ${max} characters or fewer`)),
  );

export const OutreachCreateSchema = v.object({
  target_id: v.pipe(v.string(), v.minLength(1, "Target is required")),
  template_id: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
  channel: v.optional(ChannelSchema, "email"),
  subject: OptionalTextSchema(200),
  body: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(5000, "Must be 5000 characters or fewer"))),
  job_title: OptionalTextSchema(200),
  job_link: OptionalTextSchema(2048),
});

export const OutreachPatchSchema = v.object({
  status: OutreachStatusSchema,
});

export type OutreachCreateInput = v.InferOutput<typeof OutreachCreateSchema>;
export type OutreachPatchInput = v.InferOutput<typeof OutreachPatchSchema>;

// Server-to-client outreach shape (dates cross as ISO strings),
// with the target's name alongside for list views. No user_id, target_id,
// template_id, or metadata: nothing client-side reads them.
export const OutreachJsonSchema = v.object({
  id: v.string(),
  channel: ChannelSchema,
  subject: v.nullable(v.string()),
  bodyFinal: v.string(),
  status: OutreachStatusSchema,
  sentAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
  lastStatusChangeAt: v.pipe(v.string(), v.isoTimestamp()),
  targetName: v.string(),
  targetCompany: v.nullable(v.string()),
});

export const OutreachListSchema = v.object({
  outreach: v.array(OutreachJsonSchema),
});

export type ApiOutreach = v.InferOutput<typeof OutreachJsonSchema>;
