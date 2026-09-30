"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getJson, sendJson } from "@/lib/api";
import { resolveDomain } from "@/lib/email-rank";
import { TargetEnvelopeSchema } from "@/features/targets/validation";
import { GuessListSchema, PrimaryEmailSchema } from "../validation";

const POLL_INTERVAL_MS = 3000;
const POLL_DEADLINE_MS = 120_000;

function fetchGuesses(targetId: string) {
  return getJson("/api/targets/" + targetId + "/guesses", GuessListSchema, "suggestions").then(
    (page) => page.guesses,
  );
}

function savePrimaryEmail(targetId: string, email: string) {
  return sendJson(
    "PATCH",
    "/api/targets/" + targetId + "/primary-email",
    v.parse(PrimaryEmailSchema, { email }),
    TargetEnvelopeSchema,
    "save email",
  );
}

function ManualEmailForm({ targetId }: { targetId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const save = useMutation({
    mutationFn: (value: string) => savePrimaryEmail(targetId, value),
    onSuccess: () => {
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
    },
  });

  return (
    <form className="flex flex-col gap-1.5" onSubmit={(event) => {
      event.preventDefault();
      if (email.trim()) save.mutate(email.trim());
    }}>
      <Label htmlFor="email-override">Set an email for outreach</Label>
      <div className="flex gap-2">
        <Input id="email-override" type="email" autoComplete="off" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" variant="outline" disabled={save.isPending || !email.trim()} className="pressable">Save</Button>
      </div>
      {save.isError ? <p role="alert" className="text-xs text-destructive">{save.error instanceof Error ? save.error.message : "Could not save the email."}</p> : null}
    </form>
  );
}

export function TargetEmailSection({
  targetId,
  primaryEmail,
  domain,
  companyWebsite,
  searchVersion,
}: {
  targetId: string;
  primaryEmail: string | null;
  domain: string | null;
  companyWebsite: string | null;
  searchVersion: string;
}) {
  const resolvedDomain = resolveDomain(domain, companyWebsite);
  const domainDescription = !resolvedDomain
    ? "Add the company's email domain to see suggestions."
    : domain
      ? "Ranked work-email suggestions. Mailboxes are not confirmed."
      : `Using ${resolvedDomain} from the company website. Confirm the domain before outreach; mailboxes are not confirmed.`;
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [pastDeadline, setPastDeadline] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPastDeadline(true), POLL_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, []);
  const suggestions = useQuery({
    queryKey: ["guesses", targetId, searchVersion],
    queryFn: () => fetchGuesses(targetId),
    refetchInterval: (query) => !resolvedDomain || query.state.data?.length || pastDeadline ? false : POLL_INTERVAL_MS,
  });

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p className="text-base font-semibold tracking-tight">Suggested work emails</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {domainDescription}
        </p>
      </div>

      {primaryEmail ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{primaryEmail}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your selected email for outreach</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void copyEmail(primaryEmail)}>
            {copiedEmail === primaryEmail ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}

      {resolvedDomain && !pastDeadline && !suggestions.isError && !suggestions.data?.length ? (
        <p className="text-sm text-muted-foreground" role="status">Finding suggestions…</p>
      ) : null}
      {resolvedDomain && pastDeadline && !suggestions.isError && !suggestions.data?.length ? (
        <p className="text-sm text-muted-foreground">No suggestions yet. Check the worker or enter an address manually.</p>
      ) : null}
      {suggestions.isError ? (
        <p role="alert" className="text-sm text-destructive">Could not load suggestions. Check the connection and try again.</p>
      ) : null}
      {suggestions.data?.length ? (
        <ol className="min-w-0 divide-y rounded-xl border">
          {suggestions.data.map((suggestion) => (
            <li key={suggestion.email} className="flex min-w-0 items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={suggestion.email}>{suggestion.email}</p>
                <p className="text-xs text-muted-foreground">{suggestion.source === "notes" ? "From your notes" : suggestion.patternUsed + " pattern"}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyEmail(suggestion.email)} aria-label={"Copy " + suggestion.email}>
                {copiedEmail === suggestion.email ? "Copied" : "Copy"}
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      <ManualEmailForm targetId={targetId} />
    </div>
  );
}
