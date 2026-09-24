"use client";

import { useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { HealthSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

async function fetchHealth(): Promise<v.InferOutput<typeof HealthSchema>> {
  const response = await fetch("/api/health");
  const data: unknown = await response.json();
  return v.parse(HealthSchema, data);
}

// Small connectivity pill for the dashboard. Green when the API reports
// ok, red otherwise, neutral while loading.
export function SystemStatus() {
  const query = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  if (query.isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
        Checking systems
      </span>
    );
  }

  const ok = query.data?.status === "ok";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", ok ? "bg-green-600 dark:bg-green-400" : "bg-destructive")}
        aria-hidden="true"
      />
      {ok ? "Systems connected" : "Database unavailable"}
    </span>
  );
}
