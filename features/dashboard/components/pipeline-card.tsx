import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type OutreachStatus } from "@/features/outreach/validation";

// The dot colour is the only thing this card adds, so the labels come from
// the one status map. Typed against the enum: a new status is a compile error
// here instead of an undefined label in the legend.
const OUTREACH_STATUSES = [
  { value: "draft", label: STATUS_LABELS.draft, dot: "bg-muted-foreground" },
  { value: "sent", label: STATUS_LABELS.sent, dot: "bg-sky-500" },
  { value: "replied", label: STATUS_LABELS.replied, dot: "bg-emerald-500" },
  { value: "no_response", label: STATUS_LABELS.no_response, dot: "bg-amber-500" },
  { value: "rejected", label: STATUS_LABELS.rejected, dot: "bg-rose-500" },
  { value: "success", label: STATUS_LABELS.success, dot: "bg-emerald-700" },
] as const satisfies readonly { value: OutreachStatus; label: string; dot: string }[];

export function PipelineCard({
  outreachCount,
  statusCounts,
}: {
  outreachCount: number;
  statusCounts: Record<string, number>;
}) {
  return (
    <Card className="animate-enter lg:col-span-2" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              {outreachCount === 0
                ? "Outreach by status will appear here."
                : `${outreachCount} message${outreachCount === 1 ? "" : "s"} tracked.`}
            </CardDescription>
          </div>
          <Image
            src="/reachsmith-mascot.svg"
            alt="ReachSmith logo"
            width={44}
            height={44}
            className="size-11 shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent>
        {outreachCount === 0 ? (
          <p className="rounded-xl bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
            Nothing in the pipeline yet. Drafts, sends, and replies will be counted here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {OUTREACH_STATUSES.map((status) => {
              const value = statusCounts[status.value] ?? 0;
              const pct = Math.round((value / outreachCount) * 100);
              return (
                <li key={status.value} className="flex items-center gap-3 text-sm">
                  <span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden="true" />
                  <span className="w-24 shrink-0 text-muted-foreground">{status.label}</span>
                  <span
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${status.label}: ${value} of ${outreachCount}`}
                  >
                    <span
                      className="block h-full rounded-full bg-foreground/70"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right font-medium tabular-nums">{value}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
