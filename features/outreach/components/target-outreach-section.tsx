"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { NewOutreachDialog } from "./new-outreach-dialog";
import { fetchTargetOutreach, setOutreachStatus } from "../client";
import { StatusSelect } from "./status-select";
import { STATUS_LABELS, type ApiOutreach, type OutreachStatus } from "../validation";
import type { OutreachTarget } from "../server";

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
    mutationFn: ({ id, status }: { id: string; status: OutreachStatus }) =>
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
                  <StatusSelect
                    value={item.status}
                    ariaLabel="Change status"
                    disabled={changeStatus.isPending}
                    onChange={(status) => changeStatus.mutate({ id: item.id, status })}
                  />
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
