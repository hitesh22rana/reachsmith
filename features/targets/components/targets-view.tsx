"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { ArrowLeft, ArrowUpRight, Mail, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { DeleteDialog } from "@/components/delete-dialog";
import { AddTargetDialog } from "./add-target-dialog";
import { TargetListSchema, type ApiTarget } from "../validation";
import { cn, initials } from "@/lib/utils";

async function fetchTargets(): Promise<ApiTarget[]> {
  const response = await fetch("/api/targets");
  if (!response.ok) {
    throw new Error(`Failed to load targets (${response.status})`);
  }
  const data: unknown = await response.json();
  return v.parse(TargetListSchema, data).targets;
}

async function deleteTarget(id: string): Promise<void> {
  const response = await fetch(`/api/targets/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete target (${response.status})`);
  }
}

const SOURCE_LABELS = {
  manual: "Added manually",
  linkedin: "From LinkedIn",
  github: "From GitHub",
  website: "From website",
  other: "Other source",
} as const;

const RESERVED_SLOTS = ["reserved-one", "reserved-two", "reserved-three"] as const;

function SkeletonCard({ hidden = false }: { hidden?: boolean }) {
  return (
    <Card aria-hidden="true" className={cn("min-h-56 min-w-0 gap-5", hidden && "invisible")}>
      <CardHeader className="gap-4">
        <div className="flex items-start gap-4">
          <div className="size-12 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-1 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-5 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
          <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-2 bg-transparent py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-1">
          <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </CardFooter>
    </Card>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Loading targets">
      {[0, 1, 2].map((card) => <SkeletonCard key={card} />)}
    </div>
  );
}

export function TargetsView() {
  const queryClient = useQueryClient();
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });

  const remove = useMutation({
    mutationFn: deleteTarget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
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
          <h1 className="text-3xl font-semibold tracking-tight">Targets</h1>
          <p className="text-muted-foreground">
            {targets.data ? `${targets.data.length} contacts` : "People you want to reach."}
          </p>
        </div>
        <AddTargetDialog />
      </div>

      {targets.isPending ? <SkeletonCards /> : null}
      {targets.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load targets. Check the connection and try again.
        </p>
      ) : null}
      {targets.data && targets.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No targets yet"
          description="Add recruiters, hiring managers, and employees you want to reach."
        />
      ) : null}
      {targets.data && targets.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {targets.data.map((target) => (
            <Card
              key={target.id}
              className="min-h-56 min-w-0 gap-5 transition-shadow duration-200 hover:ring-foreground/20"
            >
              <CardHeader className="gap-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-12 shrink-0 rounded-xl">
                    <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                      {initials(target.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {target.company || "Independent contact"}
                    </p>
                    <CardTitle className="truncate text-lg leading-6 font-semibold tracking-tight">
                      <Link href={`/targets/${target.id}`} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                        {target.fullName}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {target.roleTitle || "Role not added"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{target.primaryEmail || "Email not added"}</span>
                </p>
              </CardContent>
              <CardFooter className="justify-between gap-2 bg-transparent py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {SOURCE_LABELS[target.sourceType]}
                </span>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/targets/${target.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "pressable")}
                  >
                    Open
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <DeleteDialog
                    itemName={target.fullName}
                    description="This permanently deletes the target, its email candidates, and its outreach history. This cannot be undone."
                    onConfirm={() => remove.mutate(target.id)}
                    pending={remove.isPending}
                  />
                </div>
              </CardFooter>
            </Card>
          ))}
          {RESERVED_SLOTS.slice(0, Math.max(0, 3 - targets.data.length)).map((slot) => (
            <SkeletonCard key={slot} hidden />
          ))}
        </div>
      ) : null}
      {remove.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not delete the target. Try again.
        </p>
      ) : null}
    </div>
  );
}
