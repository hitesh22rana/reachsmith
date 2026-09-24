"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/features/auth/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProfileMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error.message ?? "Sign out failed");
        return;
      }
      // Session changed: drop all cached queries so the next user
      // never sees the previous user's data.
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      setError("Sign out failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Open profile menu for ${name}`}
            className="pressable rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Signed in to ReachSmith.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            variant="destructive"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
            className="pressable"
          >
            {signOut.isPending ? "Logging out" : "Log out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
