// The compose dialog and the templates list both need the full list, not a
// page of it: the dialog puts every template in a <Select> and resolves the
// chosen name from the same array. Two copies of this fetch had to agree.
import { getJson } from "@/lib/api";
import { TemplateListSchema, type ApiTemplate } from "./validation";

export function fetchTemplates(): Promise<ApiTemplate[]> {
  return getJson("/api/templates", TemplateListSchema, "templates").then((page) => page.templates);
}
