"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendJson } from "@/lib/api";
import { TargetEnvelopeSchema, TargetPatchSchema } from "../validation";

const NotesSchema = v.object({
  notes: v.optional(v.string()),
});

type NotesInput = v.InferOutput<typeof NotesSchema>;

function saveNotes(id: string, data: NotesInput) {
  return sendJson(
    "PATCH",
    `/api/targets/${id}`,
    v.parse(TargetPatchSchema, data),
    TargetEnvelopeSchema,
    "save notes",
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<NotesInput>({
    resolver: valibotResolver(NotesSchema),
    // values, not defaultValues: always mounted with no open to reset on, and
    // the edit dialog above edits the same column, so saving there used to
    // leave this textarea stale. Re-syncs on a real server change only.
    values: { notes: notes ?? "" },
  });

  const save = useMutation({
    mutationFn: (data: NotesInput) => saveNotes(id, data),
    onSuccess: () => {
      setSaved(true);
      setServerError(null);
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
    },
    onError: (error) => {
      setSaved(false);
      setServerError(error instanceof Error ? error.message : "Failed to save notes");
    },
  });

  async function onValid(data: NotesInput): Promise<void> {
    setSaved(false);
    setServerError(null);
    await save.mutateAsync(data);
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3" noValidate>
      <Label htmlFor="target-notes">Notes</Label>
      <Textarea id="target-notes" rows={4} {...register("notes")} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || save.isPending} className="pressable">
          {isSubmitting || save.isPending ? "Saving" : "Save notes"}
        </Button>
        {saved ? <span className="text-sm text-muted-foreground">Saved</span> : null}
        {serverError ? (
          <span role="alert" className="text-sm text-destructive">
            {serverError}
          </span>
        ) : null}
      </div>
    </form>
  );
}
