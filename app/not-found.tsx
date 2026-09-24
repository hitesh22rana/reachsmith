import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="max-w-[680px] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        This page went missing
      </h1>
      <p className="max-w-[680px] text-lg text-pretty text-muted-foreground">
        The link brought you somewhere that does not exist. Head back and keep the outreach moving.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className={cn(buttonVariants(), "pressable h-auto px-3 py-2 text-base font-semibold")}>
          Back to start
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "pressable")}>
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
