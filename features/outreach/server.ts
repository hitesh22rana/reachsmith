import { renderTemplate } from "@/features/templates/render";
import type { NewOutreach, Outreach } from "@/db/schema";
import type { OutreachCreateInput } from "./validation";

export interface OutreachTarget {
  firstName: string | null;
  company: string | null;
  roleTitle: string | null;
}

// Fill a template body from target contact data plus optional job context.
// Unknown or missing placeholders stay intact; empty template renders "".
export function buildOutreachBody(
  templateBody: string | undefined,
  target: OutreachTarget,
  opts: { job_title?: string | undefined; job_link?: string | undefined },
): string {
  if (!templateBody) {
    return "";
  }
  return renderTemplate(templateBody, {
    first_name: target.firstName ?? undefined,
    company: target.company ?? undefined,
    job_title: opts.job_title || target.roleTitle || undefined,
    job_link: opts.job_link || undefined,
  });
}

// JSON-safe outreach, trimmed to what the client renders: dates leave
// the server as ISO strings; ownership and relation IDs stay server-side.
export type OutreachJson = Omit<
  Outreach,
  | "userId"
  | "targetId"
  | "templateId"
  | "metadata"
  | "createdAt"
  | "updatedAt"
  | "sentAt"
  | "lastStatusChangeAt"
> & {
  sentAt: string | null;
  lastStatusChangeAt: string;
  targetName: string;
  targetCompany: string | null;
};

export function toOutreachJson(
  outreach: Outreach,
  target: { fullName: string; company: string | null },
): OutreachJson {
  return {
    id: outreach.id,
    channel: outreach.channel,
    subject: outreach.subject,
    bodyFinal: outreach.bodyFinal,
    status: outreach.status,
    sentAt: outreach.sentAt ? outreach.sentAt.toISOString() : null,
    lastStatusChangeAt: outreach.lastStatusChangeAt.toISOString(),
    targetName: target.fullName,
    targetCompany: target.company,
  };
}

function cleanText(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

export function toOutreachInsert(
  userId: string,
  targetId: string,
  templateId: string | null,
  data: OutreachCreateInput,
  bodyFinal: string,
): NewOutreach {
  const metadata =
    data.job_title || data.job_link
      ? { job_title: data.job_title ?? null, job_link: data.job_link ?? null }
      : null;
  return {
    userId,
    targetId,
    templateId,
    channel: data.channel ?? "email",
    subject: cleanText(data.subject),
    bodyFinal,
    metadata,
  };
}
