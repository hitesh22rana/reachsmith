import * as v from "valibot";

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
