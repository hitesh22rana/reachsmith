import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  title: string;
  description: string;
}

// Centered stepper: circle on top, title and description below, progress
// line running through the circles. Completed steps are clickable to go back.
export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: StepDef[];
  current: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol aria-label="Progress" className="flex items-start">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = done && onSelect !== undefined;
        const circle = (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
              done || active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
          </span>
        );
        return (
          <li
            key={step.title}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <span className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1",
                  index === 0 ? "bg-transparent" : index <= current ? "bg-primary" : "bg-border",
                )}
              />
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={`Go back to ${step.title}`}
                  className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {circle}
                </button>
              ) : (
                <span aria-hidden="true">{circle}</span>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1",
                  index === steps.length - 1
                    ? "bg-transparent"
                    : index < current
                      ? "bg-primary"
                      : "bg-border",
                )}
              />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 px-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  done || active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
