"use client";

import { useState } from "react";
import { useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { fetchOutreachPage, setOutreachStatus } from "../client";
import { EmptyState } from "@/components/empty-state";
import { LoadMore } from "@/components/load-more";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LABELS } from "@/features/templates/validation";
import { BackLink } from "@/components/back-link";
import { StatusSelect } from "./status-select";
import { STATUS_LABELS, type ApiOutreach, type OutreachStatus } from "../validation";
import type { StatusFilter } from "../client";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  ...STATUS_LABELS,
};

const FILTER_KEYS = Object.keys(FILTER_LABELS) as StatusFilter[];

function PendingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <tr key={row} className="border-b align-top last:border-b-0" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-full animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-5/6 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

function OutreachRow({
  item,
  busy,
  onStatus,
}: {
  item: ApiOutreach;
  busy: boolean;
  onStatus: (status: OutreachStatus) => void;
}) {
  return (
    <tr className="border-b align-top last:border-b-0">
      <td className="px-4 py-3">
        <p className="truncate font-medium">{item.targetName}</p>
        <p className="line-clamp-2 text-muted-foreground">{item.bodyFinal}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {CHANNEL_LABELS[item.channel]}
      </td>
      <td className="px-4 py-3">
        <StatusSelect
          value={item.status}
          ariaLabel={`Status for ${item.targetName}`}
          disabled={busy}
          onChange={(status) => onStatus(status)}
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {item.lastStatusChangeAt.slice(0, 10)}
      </td>
    </tr>
  );
}

export function OutreachView() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const outreach = useInfiniteQuery({
    queryKey: ["outreach", { status: filter }],
    queryFn: ({ pageParam }) => fetchOutreachPage(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const items = outreach.data?.pages.flatMap((page) => page.outreach) ?? [];
  const loaded = outreach.data ? items.length : null;

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OutreachStatus }) =>
      setOutreachStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["outreach"] });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <BackLink href="/dashboard">Back to dashboard</BackLink>
      <div className="animate-enter flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Outreach</h1>
          <p className="text-muted-foreground">
            {loaded === null
              ? "Copy, send manually, track."
              : // "+" so the count never claims rows the user has not loaded.
                `${loaded}${outreach.hasNextPage ? "+" : ""} messages`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="outreach-filter" className="sr-only">
            Filter by status
          </Label>
          <Select value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
            <SelectTrigger id="outreach-filter" className="w-44">
              <SelectValue>{FILTER_LABELS[filter]}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {FILTER_KEYS.map((status) => (
                <SelectItem key={status} value={status}>
                  {FILTER_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {outreach.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load outreach. Check the connection and try again.
        </p>
      ) : null}
      {outreach.isPending || items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table
            className="w-full min-w-[44rem] table-fixed text-left text-sm"
            aria-label="Outreach messages"
            aria-busy={outreach.isPending}
          >
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[19%]" />
              <col className="w-[27%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-3">Target</th>
                <th scope="col" className="px-4 py-3">Channel</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {outreach.isPending ? (
                <PendingRows />
              ) : (
                items.map((item) => (
                  <OutreachRow
                    key={item.id}
                    item={item}
                    busy={changeStatus.isPending}
                    onStatus={(status) => changeStatus.mutate({ id: item.id, status })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {loaded === 0 ? (
        <EmptyState
          icon={Send}
          title="No outreach yet"
          description="Compose a message from a template, copy it, and mark it sent."
        />
      ) : null}
      {outreach.hasNextPage ? (
        <LoadMore
          pending={outreach.isFetchingNextPage}
          onClick={() => void outreach.fetchNextPage()}
        />
      ) : null}
      {changeStatus.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not update the status. Try again.
        </p>
      ) : null}
    </div>
  );
}
