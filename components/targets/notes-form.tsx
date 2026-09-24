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
import { TargetJsonSchema, TargetPatchSchema } from "@/lib/validators";

const NotesSchema = v.object({
  notes: v.optional(v.string()),
});

type NotesInput = v.InferOutput<typeof NotesSchema>;

async function saveNotes(id: string, data: NotesInput): Promise<void> {
  const parsed = v.parse(TargetPatchSchema, data);
  const response = await fetch(`/api/targets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    throw new Error(`Failed to save notes (${response.status})`);
  }
  const body: unknown = await response.json();
  v.parse(v.object({ target: TargetJsonSchema }), body);
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
    defaultValues: { notes: notes ?? "" },
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
