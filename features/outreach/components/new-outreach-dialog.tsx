"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { buildOutreachBody } from "@/features/outreach/server";
import { TemplateListSchema } from "@/features/templates/validation";
import { OutreachCreateSchema, OutreachJsonSchema } from "../validation";
import type { OutreachTarget } from "../server";

const OutreachFormSchema = v.omit(OutreachCreateSchema, ["target_id"]);

type OutreachFormInput = v.InferInput<typeof OutreachFormSchema>;

const CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  other: "Other",
} as const;

async function fetchTemplates() {
  const response = await fetch("/api/templates");
  if (!response.ok) {
    throw new Error(`Failed to load templates (${response.status})`);
  }
  const data: unknown = await response.json();
  return v.parse(TemplateListSchema, data).templates;
}

async function saveOutreach(targetId: string, data: OutreachFormInput, markSent: boolean) {
  const parsed = v.parse(OutreachCreateSchema, { ...data, target_id: targetId });
  const created = await fetch("/api/outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!created.ok) {
    throw new Error(`Failed to save outreach (${created.status})`);
  }
  const createdBody: unknown = await created.json();
  const { outreach } = v.parse(v.object({ outreach: OutreachJsonSchema }), createdBody);
  if (markSent) {
    const sent = await fetch(`/api/outreach/${outreach.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    if (!sent.ok) {
      throw new Error(`Saved as draft, but marking sent failed (${sent.status})`);
    }
  }
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

export function NewOutreachDialog({
  target,
}: {
  target: { id: string } & OutreachTarget;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedBody, setCopiedBody] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["templates"], queryFn: fetchTemplates });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OutreachFormInput>({
    resolver: valibotResolver(OutreachFormSchema),
    mode: "onChange",
    defaultValues: {
      template_id: null,
      channel: "email",
      subject: "",
      body: "",
      job_title: "",
      job_link: "",
    },
  });

  const save = useMutation({
    mutationFn: ({ data, markSent }: { data: OutreachFormInput; markSent: boolean }) =>
      saveOutreach(target.id, data, markSent),
    onSuccess: () => {
      setServerError(null);
      void queryClient.invalidateQueries({ queryKey: ["outreach"] });
      setOpen(false);
      reset();
      setCopiedBody(null);
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "Failed to save outreach");
    },
  });

  const body = watch("body") ?? "";
  const templateId = watch("template_id") ?? null;

  function applyTemplate(id: string | null) {
    if (!id) {
      return;
    }
    const template = templates.data?.find((item) => item.id === id);
    if (!template) {
      return;
    }
    const values = getValues();
    setValue(
      "body",
      buildOutreachBody(template.body, target, {
        job_title: values.job_title,
        job_link: values.job_link,
      }),
      { shouldValidate: true },
    );
  }

  async function copyBody() {
    if (!body) {
      return;
    }
    await navigator.clipboard.writeText(body);
    setCopiedBody(body);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="pressable">New outreach</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New outreach</DialogTitle>
          <DialogDescription>
            Pick a template or write a custom message, copy it to send manually.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => save.mutate({ data, markSent: false }))}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outreach-channel">Channel</Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "email"}
                    onValueChange={(value) =>
                      field.onChange(value as OutreachFormInput["channel"])
                    }
                  >
                    <SelectTrigger id="outreach-channel" className="w-full">
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
                      applyTemplate(id);
                    }}
                  >
                    <SelectTrigger id="outreach-template" className="w-full">
                      <SelectValue>
                        {field.value
                          ? (templates.data?.find((item) => item.id === field.value)?.name ??
                            "Template")
                          : "Custom message"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="custom">Custom message</SelectItem>
                      {(templates.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.template_id?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="outreach-subject">Subject</Label>
            <Input
              id="outreach-subject"
              autoComplete="off"
              placeholder="For email; skipped for DMs"
              {...register("subject")}
            />
            <FieldError message={errors.subject?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outreach-job-title">Job title</Label>
              <Input id="outreach-job-title" autoComplete="off" {...register("job_title")} />
              <FieldError message={errors.job_title?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outreach-job-link">Job link</Label>
              <Input id="outreach-job-link" autoComplete="off" placeholder="https://" {...register("job_link")} />
              <FieldError message={errors.job_link?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="outreach-body">Message *</Label>
              <div className="flex items-center gap-1">
                {templateId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyTemplate(templateId)}
                  >
                    Re-apply template
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="sm" disabled={!body} onClick={copyBody}>
                  {copiedBody === body && body ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <Textarea
              id="outreach-body"
              rows={6}
              placeholder={"Hi {{first_name}}… (renders from the template, or type a custom message)"}
              {...register("body")}
            />
            <FieldError message={errors.body?.message} />
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
            <Button type="submit" variant="outline" disabled={isSubmitting || save.isPending} className="pressable">
              Save draft
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || save.isPending}
              className="pressable"
              onClick={handleSubmit((data) => save.mutate({ data, markSent: true }))}
            >
              Save and mark sent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
