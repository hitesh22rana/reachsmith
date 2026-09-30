import * as v from "valibot";

export const AUDIENCE_MAX_LENGTH = 50;

export const AudienceCreateSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Audience is required"),
    v.maxLength(AUDIENCE_MAX_LENGTH, `Must be ${AUDIENCE_MAX_LENGTH} characters or fewer`),
  ),
});


// Server-to-client audience shape. id is null for the built-in defaults,
// which are a constant and not rows, so there is nothing to delete.
export const AudienceJsonSchema = v.object({
  id: v.nullable(v.string()),
  name: v.string(),
});

export const AudienceListSchema = v.object({
  audiences: v.array(AudienceJsonSchema),
});

export type ApiAudience = v.InferOutput<typeof AudienceJsonSchema>;
