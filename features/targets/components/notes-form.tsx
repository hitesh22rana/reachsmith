"use client";

import { useCallback, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendJson } from "@/lib/api";
import { TargetEnvelopeSchema, TargetPatchSchema, NotesSchema } from "../validation";

const NotesFormSchema = v.object({ notes: NotesSchema });

type NotesInput = v.InferOutput<typeof NotesFormSchema>;

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
  const inFlight = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
    formState: { defaultValues, dirtyFields, errors },
  } = useForm<NotesInput>({
    resolver: valibotResolver(NotesFormSchema),
    // values, not defaultValues: always mounted with no open to reset on, and
    // the edit dialog above edits the same column, so saving there used to
    // leave this textarea stale. Re-syncs on a real server change only.
    values: { notes: notes ?? "" },
    // A refresh from an earlier save must not erase newer typing.
    resetOptions: { keepDirtyValues: true },
  });
  const draft = useWatch({ control, name: "notes" }) ?? "";
  const changed = Boolean(dirtyFields.notes) && draft.trim() !== (defaultValues?.notes ?? "");

  const save = useMutation({
    mutationFn: (data: NotesInput) => saveNotes(id, data),
    onSuccess: ({ target }, submitted) => {
      const current = getValues("notes") ?? "";
      const editedDuringSave = current !== submitted.notes;
      reset({ notes: target.notes ?? "" }, { keepValues: editedDuringSave });
      if (editedDuringSave) setValue("notes", current, { shouldDirty: true });
      void queryClient.invalidateQueries({ queryKey: ["targets"] });
      router.refresh();
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const { mutate, isPending, isError, variables, error } = save;
  const failedDraft = isError && variables?.notes === draft;

  const submit = useCallback(() => {
    if (inFlight.current) return;
    void handleSubmit((data) => {
      if (inFlight.current || data.notes === (defaultValues?.notes ?? "")) return;
      inFlight.current = true;
      // Keep the raw snapshot so a response can distinguish newer typing.
      mutate({ notes: getValues("notes") ?? "" });
    })();
  }, [defaultValues?.notes, getValues, handleSubmit, mutate]);

  useEffect(() => {
    if (!changed || isPending || failedDraft) return;
    const timer = setTimeout(submit, 800);
    return () => clearTimeout(timer);
  }, [changed, draft, failedDraft, isPending, submit]);
  const notesField = register("notes");

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="target-notes">Notes</Label>
      <Textarea
        id="target-notes"
        rows={4}
        aria-describedby="target-notes-help"
        aria-invalid={Boolean(errors.notes)}
        {...notesField}
        onBlur={(event) => { void notesField.onBlur(event); submit(); }}
      />
      <p id="target-notes-help" className="text-xs text-muted-foreground">Notes save automatically.</p>
      {errors.notes ? <p role="alert" className="text-sm text-destructive">{errors.notes.message}</p> : null}
      {failedDraft ? <div className="flex items-center gap-3">
        <p role="alert" className="min-w-0 break-words text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to save notes"}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={submit}>Retry</Button>
      </div> : null}
    </div>
  );
}
