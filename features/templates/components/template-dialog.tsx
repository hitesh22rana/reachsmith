"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
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
import { renderTemplate } from "@/lib/templates";
import {
  TemplateCreateSchema,
  TemplateJsonSchema,
  type ApiTemplate,
} from "../validation";

type TemplateFormInput = v.InferInput<typeof TemplateCreateSchema>;

const CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  other: "Other",
} as const;

const AUDIENCE_LABELS = {
  hr: "HR",
  recruiter: "Recruiter",
  engineer: "Engineer",
  founder: "Founder",
  generic: "Generic",
} as const;

async function saveTemplate(id: string | null, data: TemplateFormInput): Promise<void> {
  const parsed = v.parse(TemplateCreateSchema, data);
  const response = await fetch(id ? `/api/templates/${id}` : "/api/templates", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    throw new Error(`Failed to save template (${response.status})`);
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

export function TemplateDialog({ template }: { template?: ApiTemplate }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sampleName, setSampleName] = useState("Ada");
  const [sampleCompany, setSampleCompany] = useState("Acme");
  const [sampleJobTitle, setSampleJobTitle] = useState("");
  const [sampleJobLink, setSampleJobLink] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormInput>({
    resolver: valibotResolver(TemplateCreateSchema),
    mode: "onChange",
    defaultValues: {
      name: template?.name ?? "",
      channel: template?.channel ?? "email",
      audience_type: template?.audienceType ?? "generic",
      purpose: template?.purpose ?? "",
      body: template?.body ?? "",
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

  const preview = renderTemplate(watch("body") ?? "", {
    first_name: sampleName,
    company: sampleCompany,
    job_title: sampleJobTitle,
    job_link: sampleJobLink,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            Use {"{{first_name}}, {{company}}, {{job_title}}, {{job_link}}"} as placeholders.
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
              placeholder="Referral request – backend role"
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-audience">Audience</Label>
              <Controller
                name="audience_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "generic"}
                    onValueChange={(value) =>
                      field.onChange(value as TemplateFormInput["audience_type"])
                    }
                  >
                    <SelectTrigger id="template-audience" className="w-full">
                      <SelectValue>{AUDIENCE_LABELS[field.value ?? "generic"]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="founder">Founder</SelectItem>
                      <SelectItem value="generic">Generic</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.audience_type?.message} />
            </div>
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
              rows={6}
              placeholder={"Hi {{first_name}}, I saw the {{job_title}} role at {{company}}…"}
              {...register("body")}
            />
            <FieldError message={errors.body?.message} />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Preview with a sample target
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Sample first name"
                value={sampleName}
                onChange={(event) => setSampleName(event.target.value)}
              />
              <Input
                aria-label="Sample company"
                value={sampleCompany}
                onChange={(event) => setSampleCompany(event.target.value)}
              />
              <Input
                aria-label="Sample job title"
                placeholder="Job title"
                value={sampleJobTitle}
                onChange={(event) => setSampleJobTitle(event.target.value)}
              />
              <Input
                aria-label="Sample job link"
                placeholder="Job link"
                value={sampleJobLink}
                onChange={(event) => setSampleJobLink(event.target.value)}
              />
            </div>
            <p className="text-sm whitespace-pre-wrap">{preview || "Nothing to preview yet."}</p>
          </div>
          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
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
