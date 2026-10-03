import * as v from "valibot";

export const EmailVerificationSchema = v.object({
  state: v.picklist(["deliverable", "undeliverable", "risky", "unknown", "duplicate"]),
  reason: v.nullable(v.string()), acceptAll: v.nullable(v.boolean()), score: v.nullable(v.number()),
  checkedAt: v.string(), test: v.boolean(),
});
export const EmailCheckJsonSchema = v.nullable(v.object({
  status: v.picklist(["pending", "submitting", "verifying", "completed", "failed"]),
  test: v.boolean(), error: v.optional(v.string()), resumable: v.boolean(),
  emails: v.array(v.string()),
}));

// Server-to-client suggestion shape: only what the section renders.
// IDs and audit fields stay server-side.
export const EmailGuessJsonSchema = v.object({
  email: v.string(),
  patternUsed: v.string(),
  source: v.string(),
  verification: v.nullable(EmailVerificationSchema),
});

export const GuessListSchema = v.object({
  guesses: v.array(EmailGuessJsonSchema),
  check: EmailCheckJsonSchema,
  verificationEnabled: v.boolean(),
  verificationTest: v.boolean(),
  generation: v.nullable(v.object({
    id: v.string(), status: v.picklist(["pending", "completed", "failed"]), error: v.optional(v.string()),
  })),
  stale: v.boolean(),
  generatedDomain: v.nullable(v.string()),
  uncheckedCount: v.number(),
});

export const PrimaryEmailSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Email is required"),
    v.maxLength(254, "Must be 254 characters or fewer"),
    v.email("Enter a valid email address"),
  ),
});

export type ApiEmailGuess = v.InferOutput<typeof EmailGuessJsonSchema>;

export const VerifySuggestionsSchema = v.object({
  confirmed: v.literal(true, "Confirm credit usage before checking suggestions."),
  candidate_count: v.pipe(v.number(), v.integer(), v.minValue(1)),
  suggestion_generation: v.nullable(v.string()),
  recheck: v.optional(v.boolean(), false),
});
