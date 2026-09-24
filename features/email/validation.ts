import * as v from "valibot";

export const EmailGuessStatusSchema = v.picklist(
  ["pending", "verifying", "valid", "invalid", "unknown", "accept_all"],
  "Pick a valid status",
);

// Server-to-client guess shape: only what the section renders
// (email, pattern, provenance, status). IDs and audit fields stay server-side.
export const EmailGuessJsonSchema = v.object({
  email: v.string(),
  patternUsed: v.string(),
  source: v.string(),
  status: EmailGuessStatusSchema,
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
