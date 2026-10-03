"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { BadgeCheck, Check, CheckCircle2, Copy, Info, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { getJson, sendJson } from "@/lib/api";
import { resolveDomain } from "@/lib/email-rank";
import { TargetEnvelopeSchema } from "@/features/targets/validation";
import { GuessListSchema, PrimaryEmailSchema, type ApiEmailGuess } from "../validation";

const POLL_INTERVAL_MS = 3000;

function LoadingIndicator() {
  return <LoaderCircle aria-hidden="true" data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />;
}

function fetchGuesses(targetId: string) {
  return getJson("/api/targets/" + targetId + "/guesses", GuessListSchema, "suggestions");
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

function ManualEmailForm({ value, hasEmail, saving, error, onChange, onSave }: {
  value: string; hasEmail: boolean; saving: boolean; error: string | null;
  onChange: (value: string) => void; onSave: (email: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const parsed = v.safeParse(PrimaryEmailSchema, { email: value });
  const validationError = touched && value.trim() && !parsed.success ? parsed.issues[0].message : null;
  const fieldError = validationError || error;
  return <form noValidate onSubmit={(event) => {
    event.preventDefault();
    setTouched(true);
    if (parsed.success && !saving) onSave(parsed.output.email);
  }}>
    <FieldGroup>
      <Field data-invalid={Boolean(fieldError)}>
        <FieldLabel htmlFor="email-override">{hasEmail ? "Use a different email" : "Email address"}</FieldLabel>
        <InputGroup className="h-12 sm:h-9">
          <InputGroupInput className="h-full" id="email-override" name="email" type="email" autoComplete="off" placeholder="name@company.com" value={value} onChange={(event) => onChange(event.target.value)} onBlur={() => setTouched(true)} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "email-override-help email-override-error" : "email-override-help"} />
          <InputGroupAddon align="inline-end" className="py-0">
            <InputGroupButton type="submit" variant="default" size="sm" className="min-h-11 sm:min-h-8" disabled={saving || !parsed.success}>
              {saving ? <LoadingIndicator /> : null}
              {saving ? "Saving…" : "Use email"}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription id="email-override-help">Used when composing email outreach. You choose the address.</FieldDescription>
        {fieldError ? <FieldError id="email-override-error" className="min-w-0 break-words">{fieldError}</FieldError> : null}
      </Field>
    </FieldGroup>
  </form>;
}

function CopyEmailButton({ email, copied, onCopy }: { email: string; copied: boolean; onCopy: (email: string) => void }) {
  return <Button type="button" variant="ghost" className="min-h-11 shrink-0 sm:min-h-8" onClick={() => onCopy(email)} aria-label={`${copied ? "Copy again:" : "Copy"} ${email}`}>
    {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
    {copied ? "Copied" : "Copy"}
  </Button>;
}

function isChecking(check: v.InferOutput<typeof GuessListSchema>["check"]) {
  return check !== null && ["pending", "submitting", "verifying"].includes(check.status);
}

function isDeliverable(result: ApiEmailGuess["verification"]) {
  return result?.state === "deliverable" && !result.acceptAll && !result.test;
}

function pollInterval(page: v.InferOutput<typeof GuessListSchema> | undefined) {
  return page && (isChecking(page.check) || page.generation?.status === "pending") ? POLL_INTERVAL_MS : false;
}

function CheckResultsNotice({ guesses }: { guesses: ApiEmailGuess[] }) {
  const count = guesses.filter((guess) => isDeliverable(guess.verification)).length;
  const hasLiveResults = guesses.some((guess) => guess.verification?.test === false);
  return <p role="status" className="text-sm">{hasLiveResults ? `${count} ${count === 1 ? "address" : "addresses"} reported deliverable. Accept-all results remain inconclusive.` : "Simulated results only. No real mailboxes were checked."}</p>;
}

function checkLabels(count: number, resume: boolean, recheck: boolean, test: boolean) {
  if (resume) return { title: "Resume email check?", action: "Resume check", confirm: "Resume check", description: "Continue the previously confirmed check. Completed addresses will not be submitted again." };
  const verb = recheck ? "Recheck" : "Check";
  const addresses = count === 1 ? "1 email suggestion" : `all ${count} email suggestions`;
  const credits = test ? "Simulated check. No credits used." : "This uses live credits and shares addresses with the verification service.";
  return { title: `${verb} ${addresses}?`, action: recheck ? "Recheck suggestions" : "Check unchecked suggestions", confirm: recheck ? "Confirm and recheck" : "Confirm and check", description: `${credits} Results don't confirm ownership.` };
}

function CheckDialog({ count, resume, recheck, test, pending, onCheck }: {
  count: number; resume: boolean; recheck: boolean; test: boolean;
  pending: boolean; onCheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  const labels = checkLabels(count, resume, recheck, test);
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger render={<Button type="button" variant={recheck ? "ghost" : "outline"} className="min-h-11 sm:min-h-8" disabled={pending} />}>
      {pending ? <LoadingIndicator /> : recheck ? <BadgeCheck aria-hidden="true" data-icon="inline-start" /> : null}
      {pending ? "Starting check…" : labels.action}
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{labels.title}</AlertDialogTitle>
        <AlertDialogDescription>
          {labels.description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button type="button" disabled={pending} onClick={() => { onCheck(); setOpen(false); }}>
          {labels.confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function CheckAction({ page, pending, onCheck }: {
  page: v.InferOutput<typeof GuessListSchema>; pending: boolean; onCheck: (recheck: boolean) => void;
}) {
  if (!page.verificationEnabled || isChecking(page.check) || page.generation?.status === "pending") return null;
  if (page.check?.status === "failed") {
    return page.check.resumable ? <CheckDialog count={page.check.emails.length} resume recheck={false} test={page.check.test} pending={pending} onCheck={() => onCheck(false)} /> : null;
  }
  return <div className="flex flex-wrap items-center gap-2">
    {page.uncheckedCount > 0 ? <CheckDialog count={page.uncheckedCount} resume={false} recheck={false} test={page.verificationTest} pending={pending} onCheck={() => onCheck(false)} /> : null}
    {page.uncheckedCount < page.guesses.length ? <CheckDialog count={page.guesses.length} resume={false} recheck test={page.verificationTest} pending={pending} onCheck={() => onCheck(true)} /> : null}
  </div>;
}

function VerificationProgress({ page, error }: {
  page: v.InferOutput<typeof GuessListSchema> | undefined;
  error: string | null;
}) {
  if (!page) return null;
  const check = page.check;
  const checking = isChecking(check ?? null);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {checking ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground [&>svg]:size-4"><LoadingIndicator />Checking deliverability…</p> : null}
      {!checking && page.guesses.some((guess) => guess.verification) ? <CheckResultsNotice guesses={page.guesses} /> : null}
      {check?.status === "failed" ? <Alert variant="destructive"><Info /><AlertTitle>Check could not finish</AlertTitle><AlertDescription>{check.error ?? "The email check failed."}</AlertDescription></Alert> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function VerificationStatus({ result }: { result: NonNullable<ApiEmailGuess["verification"]> }) {
  const state = result.state.charAt(0).toUpperCase() + result.state.slice(1);
  return <>    <Badge variant={isDeliverable(result) ? "default" : result.state === "undeliverable" && !result.test ? "destructive" : "secondary"}>
      {isDeliverable(result) ? <CheckCircle2 /> : null}
      {result.test ? "Test: " : ""}{state}
    </Badge>
    {result.acceptAll ? <span className="text-muted-foreground">Accept-all, ownership unconfirmed</span> : null}
    {!isDeliverable(result) && !result.acceptAll && result.reason ? <span className="text-muted-foreground">{result.reason.replaceAll("_", " ")}</span> : null}
  </>;
}

function VerificationResult({ result, checking }: { result: ApiEmailGuess["verification"]; checking: boolean }) {
  if (!result) return <p className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3">
    {checking ? <LoadingIndicator /> : null}{checking ? "Checking…" : "Not checked"}
  </p>;
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
    <VerificationStatus result={result} />
    {result.score !== null ? <span className="tabular-nums text-muted-foreground" title="Deliverability score">Score {result.score}/100</span> : null}
    <time className="text-muted-foreground" dateTime={result.checkedAt} title={result.checkedAt}>Checked {result.checkedAt.slice(0, 10)}</time>
    {checking ? <span className="flex items-center gap-1.5 text-muted-foreground [&>svg]:size-3"><LoadingIndicator />Rechecking…</span> : null}
  </div>;
}

function SuggestionsLoading() {
  return <div role="status" aria-label="Loading email suggestions" className="flex flex-col gap-4 rounded-xl border p-4">
    <span className="sr-only">Loading email suggestions…</span>
    {[0, 1, 2].map((row) => <div key={row} aria-hidden="true" className="flex flex-col gap-2">
      <Skeleton className="h-4 w-2/3 max-w-72" />
      <Skeleton className="h-3 w-1/3 max-w-40" />
    </div>)}
  </div>;
}

function useEmailSelection(targetId: string, setManualEmail: React.Dispatch<React.SetStateAction<string>>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (email: string) => savePrimaryEmail(targetId, email),
    onSuccess: async (_result, submitted) => {
      setManualEmail((current) => current.trim() === submitted ? "" : current);
      await queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
    },
  });
}

function SuggestionRow({ suggestion, index, primaryEmail, checking, selection, copiedButton, onCopy }: {
  suggestion: ApiEmailGuess; index: number; primaryEmail: string | null; checking: boolean;
  selection: ReturnType<typeof useEmailSelection>; copiedButton: string | null;
  onCopy: (email: string, button: string) => void;
}) {
  const selected = primaryEmail?.toLowerCase() === suggestion.email.toLowerCase();
  const saving = selection.isPending && selection.variables === suggestion.email;
  return <li key={suggestion.email} className="grid min-w-0 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden="true" className="min-w-5 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="break-all text-sm font-medium">{suggestion.email}</p>
        <p className="text-xs text-muted-foreground">{suggestion.source === "notes" ? "From your notes" : suggestion.patternUsed + " pattern"}</p>
        <VerificationResult result={suggestion.verification} checking={checking} />
        {selection.isError && selection.variables === suggestion.email ? <p role="alert" className="break-words text-xs text-destructive">{selection.error.message}</p> : null}
      </div>
    </div>
    <div className="flex items-center gap-1 pl-8 sm:pl-0">
      {selected ? <Badge variant="outline"><Check />Selected</Badge> : <Button type="button" variant="ghost" className="min-h-11 sm:min-h-8" disabled={selection.isPending} onClick={() => selection.mutate(suggestion.email)} aria-label={`Use ${suggestion.email} for outreach`}>
        {saving ? <LoadingIndicator /> : null}
        {saving ? "Saving…" : "Use email"}
      </Button>}
      <CopyEmailButton email={suggestion.email} copied={copiedButton === `suggestion:${suggestion.email}`} onCopy={(email) => onCopy(email, `suggestion:${email}`)} />
    </div>
  </li>;
}

function useEmailPipeline(targetId: string, searchVersion: string, resolvedDomain: string | null) {
  const suggestions = useQuery({
    queryKey: ["guesses", targetId, searchVersion],
    queryFn: () => fetchGuesses(targetId),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => pollInterval(query.state.data),
  });

  const check = suggestions.data?.check;
  const guesses = suggestions.data?.guesses ?? [];
  const verification = useMutation({
    mutationFn: (recheck: boolean) => sendJson("POST", `/api/targets/${targetId}/verify`, {
      confirmed: true, recheck,
      candidate_count: check?.status === "failed" && check.resumable ? check.emails.length : recheck ? guesses.length : suggestions.data?.uncheckedCount ?? 0,
      suggestion_generation: suggestions.data?.generation?.id ?? null,
    }, v.object({ message: v.string() }), "check suggestions"),
    onSuccess: async () => { await suggestions.refetch(); },
  });
  const checking = isChecking(check ?? null);
  const checkingEmails = new Set(checking ? check?.emails : []);
  const regeneration = useMutation({
    mutationFn: () => sendJson("POST", `/api/targets/${targetId}/guesses`, {}, v.object({ message: v.string() }), "regenerate suggestions"),
    onSuccess: async () => { await suggestions.refetch(); },
  });
  const generating = suggestions.data?.generation?.status === "pending";
  const generatedDomain = suggestions.data?.generatedDomain;
  const domainDescription = generatedDomain
    ? `Ranked guesses for ${generatedDomain}.`
    : resolvedDomain ? "Regenerate suggestions to use the latest target details." : "Add the company's email domain, then regenerate suggestions.";

  return { suggestions, guesses, verification, checkingEmails, regeneration, generating, domainDescription };
}

function SuggestionsList({ pipeline, resolvedDomain, primaryEmail, selection, copiedButton, onCopy }: {
  pipeline: ReturnType<typeof useEmailPipeline>; resolvedDomain: string | null; primaryEmail: string | null;
  selection: ReturnType<typeof useEmailSelection>; copiedButton: string | null;
  onCopy: (email: string, button: string) => void;
}) {
  const { suggestions, guesses, generating, checkingEmails } = pipeline;
  return <>{suggestions.isPending || (generating && !guesses.length) ? <SuggestionsLoading /> : guesses.length ? (
          <ol aria-label="Email suggestions in rank order" className="min-w-0 divide-y rounded-xl border">
            {guesses.map((suggestion, index) => {
              return <SuggestionRow key={suggestion.email} suggestion={suggestion} index={index} primaryEmail={primaryEmail} checking={checkingEmails.has(suggestion.email)} selection={selection} copiedButton={copiedButton} onCopy={onCopy} />;
            })}
          </ol>
        ) : !suggestions.isError ? <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Mail /></EmptyMedia>
            <EmptyTitle>No suggestions yet</EmptyTitle>
            <EmptyDescription>{resolvedDomain ? "Check the target's name and domain, then regenerate suggestions. You can also enter an email above." : "Add the company's email domain in the target details, then regenerate suggestions."}</EmptyDescription>
          </EmptyHeader>
        </Empty> : null}</>;
}

function RegenerateButton({ pipeline }: { pipeline: ReturnType<typeof useEmailPipeline> }) {
  const { suggestions, regeneration, generating } = pipeline;
  return <Button type="button" variant="outline" className="min-h-11 sm:min-h-8" disabled={regeneration.isPending || generating || suggestions.isPending} onClick={() => regeneration.mutate()}>
            {generating || regeneration.isPending || suggestions.isPending ? <LoadingIndicator /> : <RefreshCw data-icon="inline-start" />}
            {suggestions.isPending ? "Loading suggestions…" : generating || regeneration.isPending ? "Generating suggestions…" : "Regenerate suggestions"}
          </Button>;
}

function SuggestionErrors({ pipeline }: { pipeline: ReturnType<typeof useEmailPipeline> }) {
  const { suggestions, regeneration } = pipeline;
  return <>{suggestions.data?.generation?.error ? <Alert variant="destructive"><Info /><AlertTitle>Suggestions could not be generated</AlertTitle><AlertDescription>{suggestions.data.generation.error}</AlertDescription></Alert> : null}
        {suggestions.isError || regeneration.isError ? <Alert variant="destructive"><Info /><AlertTitle>Suggestions are unavailable</AlertTitle><AlertDescription>{regeneration.error?.message ?? "Could not load suggestions. Try again."}</AlertDescription></Alert> : null}</>;
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
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedButton, setCopiedButton] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const selection = useEmailSelection(targetId, setManualEmail);
  const pipeline = useEmailPipeline(targetId, searchVersion, resolvedDomain);
  const { suggestions, guesses, verification, generating, domainDescription } = pipeline;

  async function copyEmail(email: string, button: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setCopiedButton(button);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => { setCopiedEmail(null); setCopiedButton(null); }, 2000);
      setCopyError(null);
    } catch {
      setCopyError("Could not copy the email. Select the address and copy it manually.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby="outreach-email-heading" className="flex min-w-0 flex-col gap-4">
        <h2 id="outreach-email-heading" className="text-base font-semibold tracking-tight">Email for outreach</h2>
        {primaryEmail ? <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Badge variant="secondary">Selected</Badge>
            <p className="break-all text-sm font-medium">{primaryEmail}</p>
          </div>
          <CopyEmailButton email={primaryEmail} copied={copiedButton === `selected:${primaryEmail}`} onCopy={(email) => void copyEmail(email, `selected:${email}`)} />
        </div> : null}
        <ManualEmailForm value={manualEmail} hasEmail={Boolean(primaryEmail)} saving={selection.isPending}
          error={selection.isError ? selection.error.message : null}
          onChange={(value) => { setManualEmail(value); if (selection.isError) selection.reset(); }}
          onSave={(email) => selection.mutate(email)} />
      </section>

      <Separator />

      <section aria-labelledby="email-suggestions-heading" className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 id="email-suggestions-heading" className="text-base font-semibold tracking-tight">Suggested work emails</h2>
              {suggestions.data ? <Badge variant="secondary">{guesses.length}</Badge> : null}
            </div>
            <p className="break-words text-sm text-muted-foreground">{domainDescription}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RegenerateButton pipeline={pipeline} />
          {suggestions.data ? <CheckAction page={suggestions.data} pending={verification.isPending} onCheck={(recheck) => verification.mutate(recheck)} /> : null}
        </div>

        {suggestions.data?.stale ? <Alert role="note">
          <Info />
          <AlertTitle>Target details have changed</AlertTitle>
          <AlertDescription>Regenerate to use the latest details. Rechecking only checks this existing list.</AlertDescription>
        </Alert> : null}
        {generating && guesses.length > 0 ? <p role="status" className="text-sm text-muted-foreground">Existing suggestions and check results stay visible while generation finishes.</p> : null}
        <VerificationProgress page={suggestions.data} error={verification.isError ? verification.error.message : null} />
        <SuggestionErrors pipeline={pipeline} />

        <SuggestionsList pipeline={pipeline} resolvedDomain={resolvedDomain} primaryEmail={primaryEmail} selection={selection} copiedButton={copiedButton} onCopy={(email, button) => void copyEmail(email, button)} />
        {guesses.length > 0 ? <p className="text-xs text-muted-foreground">Deliverability does not confirm who owns an address.</p> : null}
      </section>
      {copyError ? <p role="alert" className="text-sm text-destructive">{copyError}</p> : null}
      <span role="status" className="sr-only">{copiedEmail ? `Copied ${copiedEmail}` : ""}</span>
    </div>
  );
}
