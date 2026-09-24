"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TemplateDialog } from "./template-dialog";
import { TemplateListSchema, type ApiTemplate } from "../validation";
import { cn } from "@/lib/utils";

async function fetchTemplates(): Promise<ApiTemplate[]> {
  const response = await fetch("/api/templates");
  if (!response.ok) {
    throw new Error(`Failed to load templates (${response.status})`);
  }
  const data: unknown = await response.json();
  return v.parse(TemplateListSchema, data).templates;
}

async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete template (${response.status})`);
  }
}

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

function SkeletonCard({ hidden = false }: { hidden?: boolean }) {
  return (
    <Card aria-hidden="true" className={cn("min-h-48 min-w-0 gap-4", hidden && "invisible")}>
      <CardHeader className="gap-1">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <div className="h-5 w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter className="justify-between gap-2 bg-transparent py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-1">
          <div className="h-8 w-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function TemplatesView() {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["templates"], queryFn: fetchTemplates });

  const remove = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      setConfirmId(null);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="animate-enter">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
      <div className="animate-enter flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            {templates.data ? `${templates.data.length} templates` : "Reusable outreach messages."}
          </p>
        </div>
        <TemplateDialog />
      </div>

      {templates.isPending ? (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Loading templates">
          {[0, 1, 2].map((card) => <SkeletonCard key={card} />)}
        </div>
      ) : null}
      {templates.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load templates. Check the connection and try again.
        </p>
      ) : null}
      {templates.data && templates.data.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Save reusable outreach messages with variables like {{first_name}} and {{company}}."
        />
      ) : null}
      {templates.data && templates.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.data.map((template) => (
            <Card
              key={template.id}
              className="min-h-48 min-w-0 gap-4 transition-shadow duration-200 hover:ring-foreground/20"
            >
              <CardHeader className="gap-1">
                <CardTitle className="truncate text-lg leading-6 font-semibold tracking-tight">
                  {template.name}
                </CardTitle>
                <CardDescription>
                  {CHANNEL_LABELS[template.channel]} · {AUDIENCE_LABELS[template.audienceType]}
                  {template.purpose ? ` · ${template.purpose}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-3 whitespace-pre-wrap">{template.body}</p>
              </CardContent>
              <CardFooter className="justify-between gap-2 bg-transparent py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Updated {template.updatedAt.slice(0, 10)}
                </span>
                <div className="flex items-center gap-1">
                  <TemplateDialog template={template} />
                  {confirmId === template.id ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(template.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmId(template.id)}
                      aria-label={`Delete ${template.name}`}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
          {Array.from({ length: Math.max(0, 3 - templates.data.length) }, (_, index) => (
            <SkeletonCard key={`reserved-${index}`} hidden />
          ))}
        </div>
      ) : null}
      {remove.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not delete the template. Try again.
        </p>
      ) : null}
    </div>
  );
}
