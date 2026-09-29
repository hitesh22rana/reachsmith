import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { resolveAudienceId } from "@/features/audiences/server";
import type { NewTemplate, Template } from "@/db/schema";
import { parsePlaceholders } from "./render";
import type { TemplateCreateInput, TemplatePatchInput } from "./validation";

type Db = PostgresJsDatabase<typeof schema>;

// JSON-safe template, trimmed to what the client renders: no user_id, and
// the audience arrives as its name rather than an id.
export type TemplateJson = Omit<
  Template,
  "userId" | "audienceId" | "createdAt" | "updatedAt"
> & {
  audience: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTemplateJson(template: Template, audienceName: string | null): TemplateJson {
  return {
    id: template.id,
    name: template.name,
    channel: template.channel,
    audience: audienceName,
    purpose: template.purpose,
    body: template.body,
    placeholders: template.placeholders,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function cleanText(value: string | undefined): string | null {
  return value || null;
}

export async function toTemplateInsert(
  db: Db,
  userId: string,
  data: TemplateCreateInput,
): Promise<NewTemplate> {
  return {
    userId,
    name: data.name,
    channel: data.channel ?? "email",
    audienceId: await resolveAudienceId(db, userId, data.audience ?? ""),
    purpose: cleanText(data.purpose),
    body: data.body,
    // Derived from the body, never from the client: a submitted
    // placeholders array is not a thing the wire format has.
    placeholders: parsePlaceholders(data.body).placeholders,
  };
}

// PATCH: only provided keys change. Empty purpose clears the field to null,
// except name/body which the schema keeps required when present. A provided
// body re-derives the placeholder list; a body left alone keeps the stored
// one, since the two cannot disagree.
export async function toTemplatePatch(
  db: Db,
  userId: string,
  data: TemplatePatchInput,
): Promise<Partial<NewTemplate>> {
  const patch: Partial<NewTemplate> = {};
  if (data.name !== undefined) {
    patch.name = data.name;
  }
  if (data.channel !== undefined) {
    patch.channel = data.channel;
  }
  if (data.audience !== undefined) {
    patch.audienceId = await resolveAudienceId(db, userId, data.audience);
  }
  if (data.purpose !== undefined) {
    patch.purpose = cleanText(data.purpose);
  }
  if (data.body !== undefined) {
    patch.body = data.body;
    patch.placeholders = parsePlaceholders(data.body).placeholders;
  }
  return patch;
}
