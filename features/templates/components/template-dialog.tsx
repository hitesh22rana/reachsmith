"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { X } from "lucide-react";
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
import { AudienceListSchema, type ApiAudience } from "@/features/audiences/validation";
import { PLACEHOLDER_MAX, parsePlaceholders, type Placeholder } from "../render";
import {
  TemplateCreateSchema,
  TemplateJsonSchema,
  type ApiTemplate,
} from "../validation";

type TemplateFormInput = v.InferInput<typeof TemplateCreateSchema>;
type TemplateForm = UseFormReturn<TemplateFormInput>;

const CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  other: "Other",
} as const;

async function fetchAudiences(): Promise<ApiAudience[]> {
  const response = await fetch("/api/audiences");
  if (!response.ok) {
    return [];
  }
  const data: unknown = await response.json();
  return v.parse(AudienceListSchema, data).audiences;
}

async function deleteAudience(id: string): Promise<void> {
  const response = await fetch(`/api/audiences/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to remove audience (${response.status})`);
  }
}

async function saveTemplate(id: string | null, data: TemplateFormInput): Promise<void> {
  const parsed = v.parse(TemplateCreateSchema, data);
  const response = await fetch(id ? `/api/templates/${id}` : "/api/templates", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body !== null &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Failed to save template (${response.status})`;
    throw new Error(message);
  }
  const body: unknown = await response.json();
  v.parse(v.object({ template: TemplateJsonSchema }), body);
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

// Free text with the caller's presets offered as suggestions, which is what
// a datalist is for: the browser draws the list, so any name they type is
// still accepted. Resolved to a row server-side on save.
function AudienceField({
  form,
  presets,
  onRemove,
  removing,
}: {
  form: TemplateForm;
  presets: ApiAudience[];
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const { register, watch, setValue, formState: { errors } } = form;
  const audience = watch("audience") ?? "";
  const preset = presets.find(
    (item) => item.id !== null && item.name.toLowerCase() === audience.trim().toLowerCase(),
  );
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor="template-audience">Audience</Label>
      <Input
        id="template-audience"
        autoComplete="off"
        list="template-audience-options"
        placeholder="Founder"
        {...register("audience")}
      />
      <datalist id="template-audience-options">
        {presets.map((item) => (
          <option key={item.id ?? item.name} value={item.name} />
        ))}
      </datalist>
      <FieldError message={errors.audience?.message} />
      {/* Only a preset the caller added has a row to take back out; the
          built-in defaults are a constant and offer nothing to remove. Spelled
          out rather than an icon in the field, which reads as "clear this". */}
      {preset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={removing}
          onClick={() => {
            onRemove(preset.id as string);
            setValue("audience", "");
          }}
          className="self-start px-0 text-muted-foreground"
        >
          <X aria-hidden="true" />
          Remove from your presets
        </Button>
      ) : null}
    </div>
  );
}

// What the body will ask for when composing, or exactly what is wrong with
// it. Same list the server validates against, so the two cannot disagree.
function PlaceholderHints({
  placeholders,
  issues,
}: {
  placeholders: Placeholder[];
  issues: { name: string; message: string }[];
}) {
  if (issues.length > 0) {
    return (
      <ul role="alert" className="flex flex-col gap-0.5 text-xs text-destructive">
        {issues.map((issue) => (
          <li key={`${issue.name}-${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    );
  }
  if (placeholders.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No placeholders yet. The compose form will ask for whatever this body declares.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {placeholders.map((placeholder) => (
        <li
          key={placeholder.name}
          title={
            placeholder.source === "target"
              ? `{{${placeholder.name}}} is filled from the target, editable per message`
              : `{{${placeholder.name}}} is filled in when composing`
          }
          className="rounded-md border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          {placeholder.name}
        </li>
      ))}
    </ul>
  );
}

export function TemplateDialog({ template }: { template?: ApiTemplate }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const audiences = useQuery({ queryKey: ["audiences"], queryFn: fetchAudiences });

  const form = useForm<TemplateFormInput>({
    resolver: valibotResolver(TemplateCreateSchema),
    mode: "onChange",
    defaultValues: {
      name: template?.name ?? "",
      channel: template?.channel ?? "email",
      audience: template?.audience ?? "",
      purpose: template?.purpose ?? "",
      body: template?.body ?? "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Parsed on every keystroke so the chips and the errors under the body
  // track the text the caller is actually looking at.
  const body = watch("body") ?? "";
  const { placeholders, issues } = useMemo(() => parsePlaceholders(body), [body]);

  const removePreset = useMutation({
    mutationFn: deleteAudience,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["audiences"] });
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const save = useMutation({
    mutationFn: (data: TemplateFormInput) => saveTemplate(template?.id ?? null, data),
    onSuccess: () => {
      setServerError(null);
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      setOpen(false);
      reset();
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "Failed to save template");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          template ? (
            <Button variant="ghost" size="sm" className="pressable">
              Edit
            </Button>
          ) : (
            <Button className="pressable">New template</Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            Wrap anything in double braces to make it a placeholder, in lowercase snake_case
            like {"{{first_name}}"} or {"{{resume_link}}"}. Up to {PLACEHOLDER_MAX} per template.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-name">Name *</Label>
            <Input
              id="template-name"
              autoComplete="off"
              placeholder="Referral request, backend role"
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="template-channel">Channel</Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "email"}
                    onValueChange={(value) =>
                      field.onChange(value as TemplateFormInput["channel"])
                    }
                  >
                    <SelectTrigger id="template-channel" className="w-full">
                      <SelectValue>{CHANNEL_LABELS[field.value ?? "email"]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin_dm">LinkedIn DM</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.channel?.message} />
            </div>
            <AudienceField
              form={form}
              presets={audiences.data ?? []}
              removing={removePreset.isPending}
              onRemove={(id) => removePreset.mutate(id)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-purpose">Purpose</Label>
            <Input
              id="template-purpose"
              autoComplete="off"
              placeholder="Ask for a referral"
              {...register("purpose")}
            />
            <FieldError message={errors.purpose?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-body">Body *</Label>
            <Textarea
              id="template-body"
              rows={8}
              placeholder={"Hi {{first_name}}, I saw the {{job_title}} role at {{company}}…"}
              {...register("body")}
            />
            <PlaceholderHints placeholders={placeholders} issues={issues} />
            <FieldError message={errors.body?.message} />
          </div>
          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
          {removePreset.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not remove that audience. Try again.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending} className="pressable">
              {template ? "Save changes" : "Create template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
