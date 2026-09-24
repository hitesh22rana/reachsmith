import * as v from "valibot";

export const EmailGuessStatusSchema = v.picklist(
  ["pending", "verifying", "valid", "invalid", "unknown", "accept_all"],
  "Pick a valid status",
);

// Server-to-client guess shape (dates cross as ISO strings).
export const EmailGuessJsonSchema = v.object({
  id: v.string(),
  userId: v.string(),
  targetId: v.string(),
  email: v.string(),
  patternUsed: v.string(),
  status: EmailGuessStatusSchema,
  verificationMeta: v.unknown(),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const GuessListSchema = v.object({
  guesses: v.array(EmailGuessJsonSchema),
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
