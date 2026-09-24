"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuessListSchema, PrimaryEmailSchema, type ApiEmailGuess } from "../validation";

async function fetchGuesses(targetId: string): Promise<ApiEmailGuess[]> {
  const response = await fetch(`/api/targets/${targetId}/guesses`);
  if (!response.ok) {
    throw new Error(`Failed to load candidates (${response.status})`);
  }
  const data: unknown = await response.json();
  return v.parse(GuessListSchema, data).guesses;
}

async function savePrimaryEmail(targetId: string, email: string): Promise<void> {
  const parsed = v.parse(PrimaryEmailSchema, { email });
  const response = await fetch(`/api/targets/${targetId}/primary-email`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Failed to save email (${response.status})`);
  }
}

function settled(guesses: ApiEmailGuess[] | undefined): boolean {
  return !!guesses && guesses.every((guess) => guess.status !== "pending" && guess.status !== "verifying");
}

function ResultCard({
  primaryEmail,
  confidence,
  copiedEmail,
  onCopy,
}: {
  primaryEmail: string;
  confidence: string | null;
  copiedEmail: string | null;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{primaryEmail}</p>
        {confidence ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{confidence}</p>
        ) : null}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        {copiedEmail === primaryEmail ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function OverrideForm({
  targetId,
  onSaved,
}: {
  targetId: string;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [override, setOverride] = useState("");

  const save = useMutation({
    mutationFn: (email: string) => savePrimaryEmail(targetId, email),
    onSuccess: () => {
      setOverride("");
      onSaved();
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
    },
    onError: () => undefined,
  });

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (override.trim()) {
          save.mutate(override.trim());
        }
      }}
    >
      <Label htmlFor="email-override">Set email manually</Label>
      <div className="flex gap-2">
        <Input
          id="email-override"
          type="email"
          autoComplete="off"
          placeholder="name@company.com"
          value={override}
          onChange={(event) => setOverride(event.target.value)}
        />
        <Button type="submit" variant="outline" disabled={save.isPending || !override.trim()} className="pressable">
          Save
        </Button>
      </div>
      {save.isError ? (
        <p role="alert" className="text-xs text-destructive">
          {save.error instanceof Error ? save.error.message : "Could not save the email."}
        </p>
      ) : null}
    </form>
  );
}

function confidenceFor(primaryEmail: string, guesses: ApiEmailGuess[] | undefined): string | null {
  const match = guesses?.find((guess) => guess.email === primaryEmail);
  if (match?.status === "valid") {
    return `Verified · pattern ${match.patternUsed}`;
  }
  if (match?.status === "accept_all") {
    return "Catch-all domain · risky";
  }
  if (match?.source === "notes") {
    return "From your notes · unverified";
  }
  return "Set manually";
}

function StatusHeader({
  running,
  empty,
}: {
  running: boolean;
  empty: boolean;
}) {
  return (
    <div>
      <p className="text-base font-semibold tracking-tight">Email candidates</p>
      {running ? (
        <p className="mt-1 text-sm text-muted-foreground" role="status">
          Finding email…
        </p>
      ) : null}
      {empty ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Email not found – try manual entry or LinkedIn DM.
        </p>
      ) : null}
    </div>
  );
}

export function TargetEmailSection({
  targetId,
  primaryEmail,
}: {
  targetId: string;
  primaryEmail: string | null;
}) {
  const queryClient = useQueryClient();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const guesses = useQuery({
    queryKey: ["guesses", targetId],
    queryFn: () => fetchGuesses(targetId),
    refetchInterval: (query) => (settled(query.state.data) ? false : 3000),
  });

  const running = guesses.isPending || (!!guesses.data && !settled(guesses.data));
  // Settled with no winner (all invalid/unknown, nothing set) is the same
  // "not found" state as zero guesses: the section must never go silent.
  const empty =
    !!guesses.data && settled(guesses.data) && !primaryEmail;

  async function copyEmail() {
    if (!primaryEmail) {
      return;
    }
    await navigator.clipboard.writeText(primaryEmail);
    setCopiedEmail(primaryEmail);
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusHeader running={running} empty={empty} />

      {primaryEmail ? (
        <ResultCard
          primaryEmail={primaryEmail}
          confidence={confidenceFor(primaryEmail, guesses.data)}
          copiedEmail={copiedEmail}
          onCopy={() => void copyEmail()}
        />
      ) : null}

      {guesses.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load candidates. Check the connection and try again.
        </p>
      ) : null}

      <OverrideForm
        targetId={targetId}
        onSaved={() => {
          setCopiedEmail(null);
          void queryClient.invalidateQueries({ queryKey: ["guesses", targetId] });
        }}
      />
    </div>
  );
}
