"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { ArrowLeft, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OutreachListSchema, OutreachStatusSchema, type ApiOutreach } from "../validation";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | v.InferOutput<typeof OutreachStatusSchema>;

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  draft: "Draft",
  sent: "Sent",
  replied: "Replied",
  rejected: "Rejected",
  no_response: "No response",
  success: "Success",
};

const CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  other: "Other",
} as const;

async function fetchOutreach(status: StatusFilter): Promise<ApiOutreach[]> {
  const params = status === "all" ? "" : `?status=${status}`;
  const response = await fetch(`/api/outreach${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load outreach (${response.status})`);
  }
  const data: unknown = await response.json();
  return v.parse(OutreachListSchema, data).outreach;
}

async function setOutreachStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`/api/outreach/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update status (${response.status})`);
  }
}

export function OutreachView() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const outreach = useQuery({
    queryKey: ["outreach", { status: filter }],
    queryFn: () => fetchOutreach(filter),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      setOutreachStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["outreach"] });
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
          <h1 className="text-3xl font-semibold tracking-tight">Outreach</h1>
          <p className="text-muted-foreground">
            {outreach.data ? `${outreach.data.length} messages` : "Copy, send manually, track."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="outreach-filter" className="sr-only">
            Filter by status
          </Label>
          <Select value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
            <SelectTrigger id="outreach-filter" className="w-44">
              <SelectValue>{STATUS_LABELS[filter]}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {outreach.isPending ? (
        <div className="overflow-hidden rounded-2xl border" aria-label="Loading outreach">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-4 border-b p-4 last:border-b-0">
              <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : null}
      {outreach.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load outreach. Check the connection and try again.
        </p>
      ) : null}
      {outreach.data && outreach.data.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No outreach yet"
          description="Compose a message from a template, copy it, and mark it sent."
        />
      ) : null}
      {outreach.data && outreach.data.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-3">Target</th>
                <th scope="col" className="px-4 py-3">Channel</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {outreach.data.map((item) => (
                <tr key={item.id} className="border-b align-top last:border-b-0">
                  <td className="max-w-64 px-4 py-3">
                    <p className="truncate font-medium">{item.targetName}</p>
                    <p className="line-clamp-2 text-muted-foreground">{item.bodyFinal}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {CHANNEL_LABELS[item.channel]}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={item.status}
                      disabled={changeStatus.isPending}
                      onValueChange={(status) =>
                        changeStatus.mutate({ id: item.id, status: status ?? item.status })
                      }
                    >
                      <SelectTrigger aria-label={`Status for ${item.targetName}`} className="w-36">
                        <SelectValue>{STATUS_LABELS[item.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {(Object.keys(STATUS_LABELS) as StatusFilter[])
                          .filter((status) => status !== "all")
                          .map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {item.lastStatusChangeAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {changeStatus.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not update the status. Try again.
        </p>
      ) : null}
      <div className="animate-enter">
        <Link href="/targets" className={cn(buttonVariants({ variant: "outline" }), "pressable")}>
          Back to targets
        </Link>
      </div>
    </div>
  );
}
