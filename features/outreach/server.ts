// Relative and with the extension so scripts/selfcheck.ts can import this
// file under node --experimental-strip-types, which resolves no path aliases.
import {
  renderTemplate,
  TARGET_VAR_NAMES,
  type TemplateVars,
} from "../templates/render.ts";
import type { NewOutreach, Outreach } from "@/db/schema";
import type { OutreachCreateInput } from "./validation";

// Which names a placeholder can prefill is decided by TARGET_VAR_NAMES, so
// the compose form and the renderer agree on what a `source: "target"`
// placeholder means.
export interface OutreachTarget {
  firstName: string | null;
  lastName?: string | null;
  company: string | null;
  roleTitle: string | null;
  location?: string | null;
  companyWebsite?: string | null;
  domain?: string | null;
  primaryEmail?: string | null;
}

const TARGET_VAR_VALUES: Record<
  (typeof TARGET_VAR_NAMES)[number],
  (target: OutreachTarget) => string | null | undefined
> = {
  first_name: (target) => target.firstName,
  last_name: (target) => target.lastName,
  company: (target) => target.company,
  role_title: (target) => target.roleTitle,
  // Not the target's role: templates have always fallen back to it when the
  // caller left the job title blank, and the field is per-message editable.
  job_title: (target) => target.roleTitle,
  location: (target) => target.location,
  company_website: (target) => target.companyWebsite,
  domain: (target) => target.domain,
  primary_email: (target) => target.primaryEmail,
};

export function targetVariables(target: OutreachTarget): TemplateVars {
  const vars: TemplateVars = {};
  for (const name of TARGET_VAR_NAMES) {
    vars[name] = TARGET_VAR_VALUES[name](target) ?? undefined;
  }
  return vars;
}

// Entered values win over prefilled ones, so a prefilled field can be
// corrected per message. Unknown or missing placeholders stay intact; an
// empty template renders "".
export function buildOutreachBody(
  templateBody: string | undefined,
  target: OutreachTarget,
  variables: Record<string, string>,
): string {
  if (!templateBody) {
    return "";
  }
  return renderTemplate(templateBody, { ...targetVariables(target), ...variables });
}

// The template's stored placeholder list is the allowlist for what may be
// written to metadata. submitted is fully client-controlled, so a key the
// template never asked for is dropped rather than stored; with no template
// the caller chose the body, so every key is theirs to write.
export function pickDeclaredVariables(
  submitted: Record<string, string>,
  declared: readonly string[],
  hasTemplate: boolean,
): Record<string, string> {
  const allowed = new Set(declared);
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(submitted)) {
    if (value !== "" && (!hasTemplate || allowed.has(name))) {
      variables[name] = value;
    }
  }
  return variables;
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
  return value || null;
}

export function toOutreachInsert(
  userId: string,
  targetId: string,
  templateId: string | null,
  data: OutreachCreateInput,
  bodyFinal: string,
  // Already intersected with the template's declared placeholders by the
  // route, which is the only place that knows the allowlist.
  variables: Record<string, string>,
): NewOutreach {
  return {
    userId,
    targetId,
    templateId,
    channel: data.channel ?? "email",
    subject: cleanText(data.subject),
    bodyFinal,
    metadata: Object.keys(variables).length > 0 ? variables : null,
  };
}
