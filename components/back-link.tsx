import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// The quiet way back out of a page, above the title rather than beside the
// page's actions.
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <div className="animate-enter">
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {children}
      </Link>
    </div>
  );
}
