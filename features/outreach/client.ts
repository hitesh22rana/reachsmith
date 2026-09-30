// Client calls for the outreach feature, shared by the pipeline view, the
// per-target history and the compose dialog. Two of these had a second copy
// in a component; a status change routed through both had to be kept in sync
// by hand.
import * as v from "valibot";
import { getJson, sendJson } from "@/lib/api";
import {
  OutreachCreateSchema,
  OutreachEnvelopeSchema,
  OutreachListSchema,
  type OutreachStatus,
  type ApiOutreach,
  type OutreachPage,
} from "./validation";

export type StatusFilter = "all" | OutreachStatus;

export function fetchOutreachPage(
  status: StatusFilter,
  cursor: string | undefined,
): Promise<OutreachPage> {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return getJson(`/api/outreach${query ? `?${query}` : ""}`, OutreachListSchema, "outreach");
}

// A handful of messages for one target, so this reads the first page only.
// nextCursor is in the payload if that ever stops being true.
export function fetchTargetOutreach(targetId: string): Promise<ApiOutreach[]> {
  return getJson(
    `/api/outreach?targetId=${encodeURIComponent(targetId)}`,
    OutreachListSchema,
    "outreach",
  ).then((page) => page.outreach);
}

export function setOutreachStatus(
  id: string,
  status: OutreachStatus,
): Promise<v.InferOutput<typeof OutreachEnvelopeSchema>> {
  return sendJson(
    "PATCH",
    `/api/outreach/${id}`,
    { status },
    OutreachEnvelopeSchema,
    "update status",
  );
}

export function createOutreach(
  data: v.InferOutput<typeof OutreachCreateSchema>,
): Promise<v.InferOutput<typeof OutreachEnvelopeSchema>> {
  return sendJson("POST", "/api/outreach", data, OutreachEnvelopeSchema, "save outreach");
}

// Marks a saved draft as sent, the second half of compose's save-and-send.
export function markOutreachSent(id: string): Promise<v.InferOutput<typeof OutreachEnvelopeSchema>> {
  return sendJson(
    "PATCH",
    `/api/outreach/${id}`,
    { status: "sent" },
    OutreachEnvelopeSchema,
    "mark sent",
  );
}
