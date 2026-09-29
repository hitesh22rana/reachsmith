import type { NewTarget, Target } from "@/db/schema";
import type { TargetCreateInput, TargetPatchInput } from "./validation";

// JSON-safe target, trimmed to what the client renders: no user_id,
// which the session already implies and no UI reads.
export type TargetJson = Omit<
  Target,
  "userId" | "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export function toTargetJson(target: Target): TargetJson {
  const { userId: _userId, ...rest } = target;
  return {
    ...rest,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

function cleanText(value: string | undefined): string | null {
  return value || null;
}

function cleanUrls(value: string | undefined): string[] | null {
  if (value === undefined) {
    return null;
  }
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return lines.length > 0 ? lines : null;
}

export function toTargetInsert(userId: string, data: TargetCreateInput): NewTarget {
  return {
    userId,
    fullName: data.full_name,
    firstName: cleanText(data.first_name),
    lastName: cleanText(data.last_name),
    company: cleanText(data.company),
    roleTitle: cleanText(data.role_title),
    primaryEmail: cleanText(data.primary_email),
    primaryEmailSource: cleanText(data.primary_email) ? "manual" : null,
    sourceType: data.source_type ?? "manual",
    notes: cleanText(data.notes),
    location: cleanText(data.location),
    companyWebsite: cleanText(data.company_website),
    domain: cleanText(data.domain),
    socialUrls: cleanUrls(data.social_urls),
  };
}

// PATCH: only provided keys change. Empty text clears the field to null,
// except full_name which the schema keeps required when present.
export function toTargetPatch(data: TargetPatchInput): Partial<NewTarget> {
  const patch: Partial<NewTarget> = {};
  if (data.full_name !== undefined) {
    patch.fullName = data.full_name;
  }
  if (data.first_name !== undefined) {
    patch.firstName = cleanText(data.first_name);
  }
  if (data.last_name !== undefined) {
    patch.lastName = cleanText(data.last_name);
  }
  if (data.company !== undefined) {
    patch.company = cleanText(data.company);
  }
  if (data.role_title !== undefined) {
    patch.roleTitle = cleanText(data.role_title);
  }
  if (data.primary_email !== undefined) {
    patch.primaryEmail = cleanText(data.primary_email);
    // Any owner-side write claims the column; clearing it drops the marker
    // so the pipeline can propose a value again.
    patch.primaryEmailSource = cleanText(data.primary_email) ? "manual" : null;
  }
  if (data.source_type !== undefined) {
    patch.sourceType = data.source_type;
  }
  if (data.notes !== undefined) {
    patch.notes = cleanText(data.notes);
  }
  if (data.location !== undefined) {
    patch.location = cleanText(data.location);
  }
  if (data.company_website !== undefined) {
    patch.companyWebsite = cleanText(data.company_website);
  }
  if (data.domain !== undefined) {
    patch.domain = cleanText(data.domain);
  }
  if (data.social_urls !== undefined) {
    patch.socialUrls = cleanUrls(data.social_urls);
  }
  return patch;
}
