"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { ReviewList } from "@/components/review-list";
import { buildOutreachBody, targetVariables } from "@/features/outreach/server";
import type { Placeholder } from "@/features/templates/render";
import { CHANNEL_LABELS, CHANNEL_OPTIONS } from "@/features/templates/validation";
import { fetchTemplates } from "@/features/templates/client";
import { createOutreach, markOutreachSent } from "../client";
import { OutreachCreateSchema } from "../validation";
import type { OutreachTarget } from "../server";

const OutreachFormSchema = v.omit(OutreachCreateSchema, ["target_id"]);

type OutreachFormInput = v.InferInput<typeof OutreachFormSchema>;
type FieldName = keyof OutreachFormInput;
type StepForm = UseFormReturn<OutreachFormInput>;

const STEPS: { title: string; description: string; fields: FieldName[] }[] = [
  { title: "Message", description: "Channel and template", fields: ["template_id", "channel"] },
  // No gate here: every placeholder value is optional, and a blank one
  // simply leaves its token in the body. They live outside react-hook-form
  // because the key set comes from the template, not from the schema.
  { title: "Details", description: "What goes in the blanks", fields: [] },
  { title: "Draft", description: "Read and edit", fields: ["body", "subject"] },
  { title: "Review", description: "Save or send", fields: [] },
];

const LAST_STEP = STEPS.length - 1;

function MessageStep({
  form,
  templates,
  onPick,
}: {
  form: StepForm;
  templates: { id: string; name: string }[];
  onPick: (id: string | null) => void;
}) {
  const { control, formState: { errors } } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="outreach-channel">Channel</Label>
        <Controller
          name="channel"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "email"}
              onValueChange={(value) => field.onChange(value as OutreachFormInput["channel"])}
            >
              <SelectTrigger id="outreach-channel" className="w-full">
                <SelectValue>{CHANNEL_LABELS[field.value ?? "email"]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.channel?.message} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="outreach-template">Template</Label>
        <Controller
          name="template_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "custom"}
              onValueChange={(value) => {
                const id = value === "custom" ? null : value;
                field.onChange(id);
                onPick(id);
              }}
            >
              <SelectTrigger id="outreach-template" className="w-full">
                <SelectValue>
                  <span className="block truncate">
                    {field.value
                      ? (templates.find((item) => item.id === field.value)?.name ?? "Template")
                      : "Custom message"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="custom">Custom message</SelectItem>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {/* Same truncation the trigger above already does. A
                        template name is a summary, not body copy, so it
                        ellipsizes rather than wrapping or widening the popup. */}
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.template_id?.message} />
      </div>
    </div>
  );
}

function DetailsStep({
  placeholders,
  variables,
  onChange,
  pending,
  hasTemplate,
}: {
  placeholders: Placeholder[];
  variables: Record<string, string>;
  onChange: (name: string, value: string) => void;
  pending: boolean;
  hasTemplate: boolean;
}) {
  if (pending) {
    return <p className="text-sm text-muted-foreground">Loading templates…</p>;
  }
  if (placeholders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasTemplate
          ? "This template has no placeholders, so there is nothing to fill in."
          : "Pick a template to see what it needs, or write the message yourself on the next step."}
      </p>
    );
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {placeholders.length === 1
          ? "One field. Anything left blank stays as its placeholder in the message."
          : `${placeholders.length} fields. Anything left blank stays as its placeholder in the message.`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {placeholders.map((placeholder) => (
          <div key={placeholder.name} className="flex min-w-0 flex-col gap-1.5">
            {/* label is already ellipsized by parsePlaceholders; the raw name
                is the tooltip, and min-w-0 lets it shrink in the grid. */}
            <Label htmlFor={`outreach-var-${placeholder.name}`} title={placeholder.name}>
              <span className="truncate">{placeholder.label}</span>
            </Label>
            <Input
              id={`outreach-var-${placeholder.name}`}
              autoComplete="off"
              placeholder={`{{${placeholder.name}}}`}
              value={variables[placeholder.name] ?? ""}
              onChange={(event) => onChange(placeholder.name, event.target.value)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function DraftStep({
  form,
  body,
  bodyDirty,
  hasTemplate,
  copied,
  onBodyChange,
  onReapply,
  onCopy,
}: {
  form: StepForm;
  body: string;
  bodyDirty: boolean;
  hasTemplate: boolean;
  copied: boolean;
  onBodyChange: () => void;
  onReapply: () => void;
  onCopy: () => void;
}) {
  const { register, formState: { errors } } = form;
  return (
    <>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="outreach-subject">Subject</Label>
        <Input
          id="outreach-subject"
          autoComplete="off"
          placeholder="For email; skipped for DMs"
          {...register("subject")}
        />
        <FieldError message={errors.subject?.message} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="outreach-body">Message *</Label>
          <div className="flex items-center gap-1">
            {hasTemplate && bodyDirty ? (
              <Button type="button" variant="ghost" size="sm" onClick={onReapply}>
                Re-apply template
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" disabled={!body} onClick={onCopy}>
              {copied && body ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <Textarea
          id="outreach-body"
          rows={8}
          placeholder="Type a custom message, or pick a template on the first step."
          {...register("body", { onChange: onBodyChange })}
        />
        <FieldError message={errors.body?.message} />
        {hasTemplate && bodyDirty ? (
          <p className="text-xs text-muted-foreground">
            You have edited the rendered message. Your text is what gets saved.
          </p>
        ) : null}
      </div>
    </>
  );
}

function ReviewStep({ items, body }: { items: { label: string; value: string }[]; body: string }) {
  return (
    <>
      <ReviewList items={items} empty="Nothing to save yet." />
      {body ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-medium">Message</p>
          {/* break-words, not just pre-wrap: a pasted job link is one
              unbreakable token, and whitespace alone cannot wrap it. */}
          <p className="max-h-40 min-w-0 overflow-y-auto break-words whitespace-pre-wrap rounded-xl border bg-muted/50 p-4 text-sm">
            {body}
          </p>
        </div>
      ) : null}
    </>
  );
}

// Only the active step is mounted, so a hidden step cannot hold focus or
// submit a value the caller cannot see.
function StepContent({
  step,
  form,
  templates,
  templatesPending,
  placeholders,
  variables,
  body,
  bodyDirty,
  copied,
  reviewItems,
  onPick,
  onVarChange,
  onBodyChange,
  onReapply,
  onCopy,
}: {
  step: number;
  form: StepForm;
  templates: { id: string; name: string }[];
  templatesPending: boolean;
  placeholders: Placeholder[];
  variables: Record<string, string>;
  body: string;
  bodyDirty: boolean;
  copied: boolean;
  reviewItems: { label: string; value: string }[];
  onPick: (id: string | null) => void;
  onVarChange: (name: string, value: string) => void;
  onBodyChange: () => void;
  onReapply: () => void;
  onCopy: () => void;
}) {
  if (step === 0) {
    return <MessageStep form={form} templates={templates} onPick={onPick} />;
  }
  if (step === 1) {
    return (
      <DetailsStep
        placeholders={placeholders}
        variables={variables}
        pending={templatesPending}
        hasTemplate={placeholders.length > 0 || body !== ""}
        onChange={onVarChange}
      />
    );
  }
  if (step === 2) {
    return (
      <DraftStep
        form={form}
        body={body}
        bodyDirty={bodyDirty}
        hasTemplate={placeholders.length > 0 || body !== ""}
        copied={copied}
        onBodyChange={onBodyChange}
        onReapply={onReapply}
        onCopy={onCopy}
      />
    );
  }
  return <ReviewStep items={reviewItems} body={body} />;
}

function StepFooter({
  step,
  lastStep,
  busy,
  onCancel,
  onBack,
  onSave,
}: {
  step: number;
  lastStep: number;
  busy: boolean;
  onCancel: () => void;
  onBack: () => void;
  onSave: (markSent: boolean) => void;
}) {
  if (step < lastStep) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {step === 0 ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onBack} className="pressable">
            <ArrowLeft aria-hidden="true" />
            Previous
          </Button>
        )}
        <Button type="submit" className="pressable">
          Next
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={onBack} className="self-start">
        <ArrowLeft aria-hidden="true" />
        Previous
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => onSave(false)}>
          Save draft
        </Button>
        <Button type="button" disabled={busy} className="pressable" onClick={() => onSave(true)}>
          Mark sent
          <Check aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function NewOutreachDialog({
  target,
}: {
  target: { id: string } & OutreachTarget;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedBody, setCopiedBody] = useState<string | null>(null);
  // Body follows the variables until the caller types in it. Once they have,
  // their text is the message; re-applying the template hands control back.
  const [bodyDirty, setBodyDirty] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const templates = useQuery({ queryKey: ["templates"], queryFn: fetchTemplates });

  const derived = targetVariables(target);

  const form = useForm<OutreachFormInput>({
    resolver: valibotResolver(OutreachFormSchema),
    mode: "onChange",
    defaultValues: {
      template_id: null,
      channel: "email",
      subject: "",
      body: "",
    },
  });
  const { handleSubmit, watch, setValue, trigger, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    if (open) {
      stepHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [open, step]);

  const body = watch("body") ?? "";
  const templateId = watch("template_id") ?? null;
  const channel = watch("channel") ?? "email";
  const subject = watch("subject") ?? "";
  const template = templates.data?.find((item) => item.id === templateId) ?? null;
  const placeholders = template?.placeholders ?? [];

  // The whole reason the dialog is a stepper: the fields to fill are not
  // known until a template is picked, and there can be fifty of them.
  useEffect(() => {
    if (bodyDirty || !template) {
      return;
    }
    setValue("body", buildOutreachBody(template.body, target, variables), {
      shouldValidate: true,
    });
  }, [bodyDirty, template, variables, target, setValue]);

  const save = useMutation({
    mutationFn: async ({ data, markSent }: { data: OutreachFormInput; markSent: boolean }) => {
      const parsed = v.parse(OutreachCreateSchema, {
        ...data,
        target_id: target.id,
        variables,
      });
      const { outreach } = await createOutreach(parsed);
      if (markSent) {
        await markOutreachSent(outreach.id);
      }
    },
    onSuccess: () => {
      setServerError(null);
      void queryClient.invalidateQueries({ queryKey: ["outreach"] });
      setOpen(false);
      setStep(0);
      setBodyDirty(false);
      setVariables({});
      setCopiedBody(null);
      reset();
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "Failed to save outreach");
    },
  });

  function pickTemplate(id: string | null) {
    setBodyDirty(false);
    const next = templates.data?.find((item) => item.id === id) ?? null;
    setVariables(
      Object.fromEntries(
        (next?.placeholders ?? []).map((placeholder) => [
          placeholder.name,
          variables[placeholder.name] ??
            (placeholder.source === "target" ? (derived[placeholder.name] ?? "") : ""),
        ]),
      ),
    );
  }

  async function next(): Promise<void> {
    const fields = STEPS[step]?.fields ?? [];
    if (fields.length > 0 && !(await trigger(fields))) {
      return;
    }
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  // Enter in any field advances instead of saving, so the last step's
  // buttons stay the only way to write a row.
  function submitStep(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (step < LAST_STEP) {
      void next();
    }
  }

  function cancel(): void {
    setOpen(false);
    setStep(0);
    setBodyDirty(false);
    setVariables({});
    setServerError(null);
    reset();
  }

  // The list below is the dialog's whole field set, and the cache it comes
  // from is shared with the templates page, so refetch to be sure it matches
  // the template just saved. One small GET, only when the user opens it.
  function openDialog(nextOpen: boolean): void {
    if (nextOpen) {
      setOpen(true);
      void templates.refetch();
      return;
    }
    cancel();
  }

  async function copyBody() {
    if (!body) {
      return;
    }
    await navigator.clipboard.writeText(body);
    setCopiedBody(body);
  }

  const reviewItems = [
    { label: "Channel", value: CHANNEL_LABELS[channel] },
    { label: "Template", value: template?.name ?? "Custom message" },
    { label: "Subject", value: subject },
    ...placeholders.map((placeholder) => ({
      label: placeholder.label,
      value: variables[placeholder.name] ?? "",
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger render={<Button className="pressable">New outreach</Button>} />
      <DialogContent ref={contentRef} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New outreach</DialogTitle>
          <DialogDescription>
            Four short steps. Copy the finished message out and send it yourself.
          </DialogDescription>
        </DialogHeader>
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
        <form
          onSubmit={submitStep}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Keyed on the step so the heading and the fields arrive together
              instead of swapping in place. The form itself stays mounted, which
              is what keeps react-hook-form's field values across a step change,
              and gap-4 restores the spacing the fragment steps used to get from
              the form. */}
          <div key={`heading-${step}`} className="animate-enter">
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-base font-semibold outline-none">
              {step === LAST_STEP ? "Review your outreach" : STEPS[step]?.title}
            </h3>
          </div>
          <div key={step} className="animate-enter flex flex-col gap-4">
            <StepContent
              step={step}
              form={form}
              templates={templates.data ?? []}
              templatesPending={templates.isPending}
              placeholders={placeholders}
              variables={variables}
              body={body}
              bodyDirty={bodyDirty}
              copied={copiedBody === body}
              reviewItems={reviewItems}
              onPick={pickTemplate}
              onVarChange={(name, value) =>
                setVariables((current) => ({ ...current, [name]: value }))
              }
              onBodyChange={() => setBodyDirty(true)}
              onReapply={() => setBodyDirty(false)}
              onCopy={() => void copyBody()}
            />
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <StepFooter
            step={step}
            lastStep={LAST_STEP}
            busy={isSubmitting || save.isPending}
            onCancel={cancel}
            onBack={() => setStep((current) => current - 1)}
            onSave={(markSent) => handleSubmit((data) => save.mutate({ data, markSent }))()}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
