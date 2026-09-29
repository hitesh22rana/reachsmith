"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewOutreachDialog } from "./new-outreach-dialog";
import { OutreachListSchema, OutreachStatusSchema, type ApiOutreach } from "../validation";
import type { OutreachTarget } from "../server";

const STATUS_LABELS: Record<v.InferOutput<typeof OutreachStatusSchema>, string> = {
  draft: "Draft",
  sent: "Sent",
  replied: "Replied",
  rejected: "Rejected",
  no_response: "No response",
  success: "Success",
};

async function fetchTargetOutreach(targetId: string): Promise<ApiOutreach[]> {
  const response = await fetch(`/api/outreach?targetId=${targetId}`);
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

export function TargetOutreachSection({
  target,
}: {
  target: { id: string } & OutreachTarget;
}) {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["outreach", { targetId: target.id }],
    queryFn: () => fetchTargetOutreach(target.id),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      setOutreachStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["outreach"] });
    },
  });

  async function copyItem(item: ApiOutreach) {
    await navigator.clipboard.writeText(item.bodyFinal);
    setCopiedId(item.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight">Outreach history</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {history.data
              ? `${history.data.length} messages`
              : "Messages and their statuses live here."}
          </p>
        </div>
        <NewOutreachDialog target={target} />
      </div>
      {history.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Loading outreach">
          {[0, 1].map((row) => (
            <div key={row} className="flex flex-col gap-2 rounded-xl border p-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : null}
      {history.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load outreach. Check the connection and try again.
        </p>
      ) : null}
      {history.data && history.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. Compose the first one above.
        </p>
      ) : null}
      {history.data && history.data.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-3">
          {history.data.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
              {item.subject ? (
                <p className="truncate text-sm font-medium">{item.subject}</p>
              ) : null}
              <p className="text-sm break-words whitespace-pre-wrap">{item.bodyFinal}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {STATUS_LABELS[item.status]}
                  {item.sentAt ? ` · sent ${item.sentAt.slice(0, 10)}` : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void copyItem(item)}
                  >
                    {copiedId === item.id ? "Copied" : "Copy"}
                  </Button>
                  <Select
                    value={item.status}
                    disabled={changeStatus.isPending}
                    onValueChange={(status) => changeStatus.mutate({ id: item.id, status: status ?? item.status })}
                  >
                    <SelectTrigger aria-label="Change status" className="w-36">
                      <SelectValue>{STATUS_LABELS[item.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {changeStatus.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not update the status. Try again.
        </p>
      ) : null}
    </div>
  );
}
