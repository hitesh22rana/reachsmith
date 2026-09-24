"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  LoginSchema,
  SignupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  mode: "login" | "signup";
}

type AuthPayload =
  | { mode: "login"; data: LoginInput }
  | { mode: "signup"; data: SignupInput };

// Calls Better Auth and returns the failure message, or null on success.
// The discriminated payload keeps both branches type-exact with no casts.
async function submitAuth(payload: AuthPayload): Promise<string | null> {
  const result =
    payload.mode === "signup"
      ? await authClient.signUp.email(payload.data)
      : await authClient.signIn.email(payload.data);
  if (result.error) {
    return result.error.message ?? "Authentication failed";
  }
  return null;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: valibotResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onValid(data: LoginInput): Promise<void> {
    setServerError(null);
    const message = await submitAuth({ mode: "login", data });
    if (message) {
      setServerError(message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <FieldError message={serverError ?? undefined} />
      <Button type="submit" disabled={isSubmitting} className="pressable">
        {isSubmitting ? "Please wait" : "Log in"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: valibotResolver(SignupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onValid(data: SignupInput): Promise<void> {
    setServerError(null);
    const message = await submitAuth({ mode: "signup", data });
    if (message) {
      setServerError(message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-name">Name</Label>
        <Input id="signup-name" autoComplete="name" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <FieldError message={serverError ?? undefined} />
      <Button type="submit" disabled={isSubmitting} className="pressable">
        {isSubmitting ? "Please wait" : "Create account"}
      </Button>
    </form>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  return (
    <div className="animate-enter mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{isSignup ? "Create account" : "Log in"}</CardTitle>
          <CardDescription>
            {isSignup ? "Start tracking outreach in minutes." : "Welcome back to ReachSmith."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignup ? <SignupForm /> : <LoginForm />}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Create account
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
