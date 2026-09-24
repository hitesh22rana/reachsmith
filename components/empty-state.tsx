import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  href: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-enter flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <Link href={action.href} className={cn(buttonVariants(), "pressable")}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
