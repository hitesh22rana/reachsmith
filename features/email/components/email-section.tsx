"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuessListSchema, PrimaryEmailSchema, type ApiEmailGuess } from "../validation";

const STATUS_STYLES: Record<ApiEmailGuess["status"], string> = {
  pending: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  verifying: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  valid: "border-green-500/40 text-green-600 dark:text-green-400",
  invalid: "text-muted-foreground",
  unknown: "text-muted-foreground",
  accept_all: "border-orange-500/40 text-orange-600 dark:text-orange-400",
};

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

function CandidateList({ guesses }: { guesses: ApiEmailGuess[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {guesses.map((guess) => (
        <li
          key={guess.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm"
        >
          <span className="min-w-0 truncate">
            {guess.email}
            <span className="ml-2 text-xs text-muted-foreground">{guess.patternUsed}</span>
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[guess.status]}`}
          >
            {guess.status.replace("_", "-")}
          </span>
        </li>
      ))}
    </ul>
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
  const [override, setOverride] = useState("");

  const save = useMutation({
    mutationFn: (email: string) => savePrimaryEmail(targetId, email),
    onSuccess: () => {
      setOverride("");
      onSaved();
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
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

  const running = !!guesses.data && !settled(guesses.data);
  const match = guesses.data?.find((guess) => guess.email === primaryEmail);
  const confidence = !primaryEmail
    ? null
    : match?.status === "valid"
      ? `Verified · pattern ${match.patternUsed}`
      : match?.status === "accept_all"
        ? "Catch-all domain · risky"
        : "Set manually";

  async function copyEmail() {
    if (!primaryEmail) {
      return;
    }
    await navigator.clipboard.writeText(primaryEmail);
    setCopiedEmail(primaryEmail);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold tracking-tight">Email candidates</p>
        {running ? (
          <p className="mt-1 text-sm text-muted-foreground" role="status">
            Finding email…
          </p>
        ) : null}
        {!running && guesses.data && guesses.data.length === 0 && !primaryEmail ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Email not found – try manual entry or LinkedIn DM.
          </p>
        ) : null}
      </div>

      {primaryEmail ? (
        <ResultCard
          primaryEmail={primaryEmail}
          confidence={confidence}
          copiedEmail={copiedEmail}
          onCopy={() => void copyEmail()}
        />
      ) : null}

      {guesses.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load candidates. Check the connection and try again.
        </p>
      ) : null}
      {guesses.data && guesses.data.length > 0 ? (
        <CandidateList guesses={guesses.data} />
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
