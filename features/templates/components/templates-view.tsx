"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { DeleteDialog } from "@/components/delete-dialog";
import { TemplateDialog } from "./template-dialog";
import { fetchTemplates } from "../client";
import { DeletedSchema, sendJson } from "@/lib/api";
import { CHANNEL_LABELS } from "../validation";

function deleteTemplate(id: string): Promise<{ id: string }> {
  return sendJson("DELETE", `/api/templates/${id}`, undefined, DeletedSchema, "delete template");
}

function SkeletonCard() {
  return (
    <Card aria-hidden="true" className="min-h-52 min-w-0 gap-4 last:hidden md:last:flex">
      <CardHeader className="gap-1">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
      </CardHeader>
      {/* gap-1 with h-4 bars, not h-5 with no gap: both come to the same 20px
          pitch the real text occupies (text-sm line box), so the card does not
          change height when the body replaces the placeholder. */}
      <CardContent className="flex flex-1 flex-col gap-1 text-sm">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter className="justify-between gap-2 bg-transparent py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-1">
          <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function TemplatesView() {
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: fetchTemplates });

  const remove = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <BackLink href="/dashboard">Back to dashboard</BackLink>
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
          {[0, 1].map((card) => <SkeletonCard key={card} />)}
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
          description="Save reusable outreach messages. Wrap anything in double braces, like {{first_name}}, and the compose form will ask for it."
        />
      ) : null}
      {templates.data && templates.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.data.map((template) => (
            <Card
              key={template.id}
              className="min-h-52 min-w-0 gap-4 transition-shadow duration-200 hover:ring-foreground/20"
            >
              <CardHeader className="gap-1">
                <CardTitle className="truncate text-lg leading-6 font-semibold tracking-tight">
                  {template.name}
                </CardTitle>
                <CardDescription className="truncate">
                  {CHANNEL_LABELS[template.channel]}
                  {template.audience ? ` · ${template.audience}` : ""}
                  {template.purpose ? ` · ${template.purpose}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col text-sm text-muted-foreground">
                <p className="line-clamp-3 whitespace-pre-wrap">{template.body}</p>
              </CardContent>
              <CardFooter className="justify-between gap-2 bg-transparent py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Updated {template.updatedAt.slice(0, 10)}
                </span>
                <div className="flex items-center gap-1">
                  <TemplateDialog template={template} />
                  <DeleteDialog
                    itemName={template.name}
                    description="This permanently deletes the template. Outreach messages already made from it keep their text but lose the template link. This cannot be undone."
                    onConfirm={() => remove.mutate(template.id)}
                    pending={remove.isPending}
                  />
                </div>
              </CardFooter>
            </Card>
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
