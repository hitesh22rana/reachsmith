"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared by both cursor-paginated lists. Rendered only when a next page
// exists, so there is nothing to show otherwise.
export function LoadMore({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center">
      <Button type="button" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Loading" : "Load more"}
      </Button>
    </div>
  );
}
