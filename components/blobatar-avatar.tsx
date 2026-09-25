"use client";

import { Blobatar } from "@blobatar/react";
import { cn } from "@/lib/utils";

export function BlobatarAvatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Blobatar
      name={name.trim() || "?"}
      size={size}
      alt={name}
      className={cn("shrink-0 rounded-full bg-muted", className)}
    />
  );
}
