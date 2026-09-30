import * as v from "valibot";

// Server-to-client suggestion shape: only what the section renders.
// IDs and audit fields stay server-side.
export const EmailGuessJsonSchema = v.object({
  email: v.string(),
  patternUsed: v.string(),
  source: v.string(),
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
