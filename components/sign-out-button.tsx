"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error.message ?? "Sign out failed");
        return;
      }
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      setError("Sign out failed");
    },
  });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="pressable"
      >
        {signOut.isPending ? "Logging out" : "Log out"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
