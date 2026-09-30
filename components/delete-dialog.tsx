"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Closes on confirm; the caller surfaces any failure underneath.
// w-20: this button shares a card footer with an Edit or Open button, and a
// content-sized pair reads as one pill wider than the other. Match the width
// the caller puts on its sibling, and the centered label lines up with it.
export function DeleteDialog({
  itemName,
  description,
  onConfirm,
  pending,
}: {
  itemName: string;
  description: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="w-20 text-destructive hover:text-destructive"
            aria-label={`Delete ${itemName}`}
          >
            Delete
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemName}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            className="pressable"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
