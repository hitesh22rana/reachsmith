import type { NewTemplate, Template } from "@/db/schema";
import type { TemplateCreateInput, TemplatePatchInput } from "./validation";

// JSON-safe template, trimmed to what the client renders: no user_id.
export type TemplateJson = Omit<Template, "userId" | "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function toTemplateJson(template: Template): TemplateJson {
  const { userId: _userId, ...rest } = template;
  return {
    ...rest,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function cleanText(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

export function toTemplateInsert(userId: string, data: TemplateCreateInput): NewTemplate {
  return {
    userId,
    name: data.name,
    channel: data.channel ?? "email",
    audienceType: data.audience_type ?? "generic",
    purpose: cleanText(data.purpose),
    body: data.body,
  };
}

// PATCH: only provided keys change. Empty purpose clears the field to null,
// except name/body which the schema keeps required when present.
export function toTemplatePatch(data: TemplatePatchInput): Partial<NewTemplate> {
  const patch: Partial<NewTemplate> = {};
  if (data.name !== undefined) {
    patch.name = data.name;
  }
  if (data.channel !== undefined) {
    patch.channel = data.channel;
  }
  if (data.audience_type !== undefined) {
    patch.audienceType = data.audience_type;
  }
  if (data.purpose !== undefined) {
    patch.purpose = cleanText(data.purpose);
  }
  if (data.body !== undefined) {
    patch.body = data.body;
  }
  return patch;
}
