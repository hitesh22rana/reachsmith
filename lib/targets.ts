import type { NewTarget, Target } from "@/db/schema";
import type { TargetCreateInput, TargetPatchInput } from "@/lib/validators";

// JSON-safe target: dates leave the server as ISO strings.
export type TargetJson = Omit<Target, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function toTargetJson(target: Target): TargetJson {
  return {
    ...target,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

function cleanText(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
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
    profileUrl: cleanText(data.profile_url),
    sourceType: data.source_type ?? "manual",
    notes: cleanText(data.notes),
    location: cleanText(data.location),
    companyWebsite: cleanText(data.company_website),
    githubUrl: cleanText(data.github_url),
    linkedinUrl: cleanText(data.linkedin_url),
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
  }
  if (data.profile_url !== undefined) {
    patch.profileUrl = cleanText(data.profile_url);
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
  if (data.github_url !== undefined) {
    patch.githubUrl = cleanText(data.github_url);
  }
  if (data.linkedin_url !== undefined) {
    patch.linkedinUrl = cleanText(data.linkedin_url);
  }
  return patch;
}
