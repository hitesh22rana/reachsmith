"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { ChevronRight, Pencil } from "lucide-react";
import { FieldError } from "@/components/field-error";
import { sendJson } from "@/lib/api";
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
import {
  TargetCreateSchema,
  TargetEnvelopeSchema,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  type ApiTarget,
} from "../validation";

type TargetFormInput = v.InferInput<typeof TargetCreateSchema>;

function saveTarget(id: string, data: TargetFormInput) {
  return sendJson(
    "PATCH",
    `/api/targets/${id}`,
    v.parse(TargetCreateSchema, data),
    TargetEnvelopeSchema,
    "save target",
  );
}

// A function because useForm reads defaultValues once, at mount.
function formDefaults(target: ApiTarget): TargetFormInput {
  return {
    full_name: target.fullName,
    first_name: target.firstName ?? "",
    last_name: target.lastName ?? "",
    company: target.company ?? "",
    role_title: target.roleTitle ?? "",
    primary_email: target.primaryEmail ?? "",
    domain: target.domain ?? "",
    source_type: target.sourceType,
    notes: target.notes ?? "",
    location: target.location ?? "",
    company_website: target.companyWebsite ?? "",
    social_urls: (target.socialUrls ?? []).join("\n"),
  };
}

export function EditTargetDialog({ target }: { target: ApiTarget }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetFormInput>({
    resolver: valibotResolver(TargetCreateSchema),
    mode: "onChange",
    defaultValues: formDefaults(target),
  });

  const save = useMutation({
    mutationFn: (data: TargetFormInput) => saveTarget(target.id, data),
    onSuccess: () => {
      setServerError(null);
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
      setOpen(false);
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "Failed to save target");
    },
  });

  // Reset on open, not off the prop: a useEffect keyed on `target` would
  // reset on every background refetch and eat the user's typing.
  function openDialog(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      reset(formDefaults(target));
    } else {
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger render={<Button className="pressable"><Pencil aria-hidden="true" data-icon="inline-start" />Edit target</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit target</DialogTitle>
          <DialogDescription>Only the full name is required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-full-name">Full name *</Label>
            <Input id="edit-full-name" autoComplete="off" {...register("full_name")} />
            <FieldError message={errors.full_name?.message} />
          </div>
          <details className="group rounded-lg border px-3 py-2 open:pb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Name for email patterns
              <ChevronRight
                className="size-4 shrink-0 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            {/* The only place these are entered. Blank means "split the full
                name", which is right for almost everyone; fill them in only
                when that split is wrong, e.g. Bae Suzy, van der Berg, Cher.
                See lib/target-name.ts. */}
            <p className="mt-2 text-sm text-muted-foreground">
              Leave blank to split the full name. Only fill these in if that split is wrong,
              which is what puts them in guessed email addresses and{" "}
              <code>{"{{first_name}}"}</code>.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-first-name">First name</Label>
                <Input id="edit-first-name" autoComplete="off" {...register("first_name")} />
                <FieldError message={errors.first_name?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-last-name">Last name</Label>
                <Input id="edit-last-name" autoComplete="off" {...register("last_name")} />
                <FieldError message={errors.last_name?.message} />
              </div>
            </div>
          </details>
      <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-company">Company</Label>
              <Input id="edit-company" autoComplete="off" {...register("company")} />
              <FieldError message={errors.company?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-role">Role title</Label>
              <Input id="edit-role" autoComplete="off" {...register("role_title")} />
              <FieldError message={errors.role_title?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" autoComplete="off" {...register("primary_email")} />
              <FieldError message={errors.primary_email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-source">Source</Label>
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
                    <SelectTrigger id="edit-source" className="w-full">
                      <SelectValue>{SOURCE_LABELS[field.value ?? "manual"]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.source_type?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-domain">Email domain (if known)</Label>
            <Input id="edit-domain" autoComplete="off" placeholder="company.com" {...register("domain")} />
            <FieldError message={errors.domain?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" autoComplete="off" {...register("location")} />
              <FieldError message={errors.location?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-website">Company website</Label>
              <Input id="edit-website" type="url" autoComplete="off" placeholder="https://" {...register("company_website")} />
              <FieldError message={errors.company_website?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-social">Social URLs (one per line, up to 5)</Label>
            <Textarea
              id="edit-social"
              rows={3}
              autoComplete="off"
              placeholder={"https://linkedin.com/in/…\nhttps://github.com/…"}
              {...register("social_urls")}
            />
            <FieldError message={errors.social_urls?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" rows={4} {...register("notes")} />
            <FieldError message={errors.notes?.message} />
          </div>
          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => openDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending} className="pressable">
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
