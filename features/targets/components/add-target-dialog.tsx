"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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
import {
  TargetCreateSchema,
  TargetJsonSchema,
} from "../validation";

type TargetFormInput = v.InferInput<typeof TargetCreateSchema>;
type FieldName = keyof TargetFormInput;
type StepForm = UseFormReturn<TargetFormInput>;

const STEPS: { title: string; description: string; fields: FieldName[] }[] = [
  {
    title: "Basics",
    description: "Who they are",
    fields: ["full_name", "first_name", "last_name", "company", "role_title"],
  },
  {
    title: "Contact",
    description: "How to reach them",
    fields: [
      "primary_email",
      "domain",
      "source_type",
      "location",
      "company_website",
      "social_urls",
    ],
  },
  {
    title: "Notes",
    description: "Context and review",
    fields: ["notes"],
  },
];

const LAST_STEP = STEPS.length - 1;

const SOURCE_LABELS = {
  manual: "Manual",
  linkedin: "LinkedIn",
  github: "GitHub",
  website: "Website",
  other: "Other",
} as const;

async function createTarget(data: TargetFormInput): Promise<void> {
  const response = await fetch("/api/targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body !== null &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Failed to create target (${response.status})`;
    throw new Error(message);
  }
  const body: unknown = await response.json();
  v.parse(v.object({ target: TargetJsonSchema }), body);
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

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      {" *"}
    </span>
  );
}

function BasicsStep({ form }: { form: StepForm }) {
  const { register, formState: { errors } } = form;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-full-name">
          Full name
          <RequiredMark />
        </Label>
        <Input
          id="target-full-name"
          autoComplete="off"
          aria-required="true"
          aria-invalid={!!errors.full_name}
          {...register("full_name")}
        />
        <FieldError message={errors.full_name?.message} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-first-name">First name</Label>
          <Input id="target-first-name" autoComplete="off" {...register("first_name")} />
          <FieldError message={errors.first_name?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-last-name">Last name</Label>
          <Input id="target-last-name" autoComplete="off" {...register("last_name")} />
          <FieldError message={errors.last_name?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-company">Company</Label>
          <Input id="target-company" autoComplete="off" {...register("company")} />
          <FieldError message={errors.company?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-role">Role / title</Label>
          <Input id="target-role" autoComplete="off" {...register("role_title")} />
          <FieldError message={errors.role_title?.message} />
        </div>
      </div>
    </>
  );
}

function ContactStep({ form }: { form: StepForm }) {
  const { register, control, formState: { errors } } = form;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-email">Email (if known)</Label>
        <Input id="target-email" type="email" autoComplete="off" {...register("primary_email")} />
        <FieldError message={errors.primary_email?.message} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-domain">Email domain (if known)</Label>
          <Input
            id="target-domain"
            autoComplete="off"
            placeholder="company.com"
            {...register("domain")}
          />
          <FieldError message={errors.domain?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-source">Source</Label>
          <Controller
            name="source_type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "manual"}
                onValueChange={(value) =>
                  field.onChange(value as TargetFormInput["source_type"])
                }
              >
                        <SelectTrigger id="target-source" className="w-full">
                          <SelectValue>{SOURCE_LABELS[field.value ?? "manual"]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.source_type?.message} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-location">Location</Label>
          <Input id="target-location" autoComplete="off" {...register("location")} />
          <FieldError message={errors.location?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-website">Company website</Label>
          <Input
            id="target-website"
            type="url"
            autoComplete="off"
            placeholder="https://"
            {...register("company_website")}
          />
          <FieldError message={errors.company_website?.message} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-social">Social URLs (one per line, up to 5)</Label>
        <Textarea
          id="target-social"
          rows={3}
          autoComplete="off"
          placeholder={"https://linkedin.com/in/…\nhttps://github.com/…"}
          {...register("social_urls")}
        />
        <FieldError message={errors.social_urls?.message} />
      </div>
    </>
  );
}

function ReviewTargetValues({ values }: { values: TargetFormInput }) {
  const items = Object.entries(values)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")
    .map(([key, value]) => ({ label: key.replaceAll("_", " "), value }));
  return <ReviewList items={items} empty="Nothing filled in yet." />;
}

function NotesStep({ form }: { form: StepForm }) {
  const { register, getValues, formState: { errors } } = form;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-notes">Notes</Label>
        <Textarea id="target-notes" rows={3} {...register("notes")} />
        <FieldError message={errors.notes?.message} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Review</p>
        <ReviewTargetValues values={getValues()} />
      </div>
    </>
  );
}

const STEP_CONTENT = [BasicsStep, ContactStep, NotesStep];

export function AddTargetDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    if (open) stepHeadingRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  const form = useForm<TargetFormInput>({
    resolver: valibotResolver(TargetCreateSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      first_name: "",
      last_name: "",
      company: "",
      role_title: "",
      primary_email: "",
      domain: "",
      source_type: "manual",
      notes: "",
      location: "",
      company_website: "",
      social_urls: "",
    },
  });
  const { handleSubmit, reset, trigger, formState: { isSubmitting } } = form;

  const create = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      setOpen(false);
      setStep(0);
      reset();
      setServerError(null);
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "Failed to create target");
    },
  });

  async function next(): Promise<void> {
    const fields = STEPS[step]?.fields;
    if (!fields) {
      return;
    }
    const valid = await trigger(fields);
    if (valid) {
      setStep((current) => Math.min(current + 1, LAST_STEP));
    }
  }

  function cancel(): void {
    setOpen(false);
    setStep(0);
    reset();
    setServerError(null);
  }

  function openDialog(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      setStep(0);
    } else {
      setServerError(null);
    }
  }

  async function onValid(data: TargetFormInput): Promise<void> {
    setServerError(null);
    await create.mutateAsync(data);
  }

  function submitStep(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (step < LAST_STEP) void next();
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger
        render={
          <Button className="pressable">
            Add target
          </Button>
        }
      />
      <DialogContent ref={contentRef} className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add target</DialogTitle>
          <DialogDescription>
            Three short steps. Only the full name is required.
          </DialogDescription>
        </DialogHeader>
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
        <h3 ref={stepHeadingRef} tabIndex={-1} className="text-base font-semibold outline-none">
          {step === LAST_STEP ? "Review your target" : STEPS[step]?.title}
        </h3>
        <form onSubmit={submitStep} className="flex flex-col gap-4" noValidate>
          {STEP_CONTENT.map((StepContent, index) =>
            index === step ? <StepContent key={STEPS[index]?.title} form={form} /> : null,
          )}

          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            {step === 0 ? (
              <Button type="button" variant="secondary" onClick={cancel}>
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((current) => current - 1)}
                className="pressable"
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
            )}
            {step < LAST_STEP ? (
              <Button type="submit" className="pressable">
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleSubmit(onValid)()}
                disabled={isSubmitting || create.isPending}
                className="pressable"
              >
                {isSubmitting || create.isPending ? "Saving" : "Save target"}
                <Check aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
