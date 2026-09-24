export type TemplateVars = Partial<
  Record<"first_name" | "company" | "job_title" | "job_link", string>
>;

const VAR_PATTERN = /\{\{(first_name|company|job_title|job_link)\}\}/g;

// Only the four supported vars substitute; unknown or missing
// placeholders stay intact so a half-filled preview still shows them.
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(VAR_PATTERN, (match, name: string) => {
    const value = vars[name as keyof TemplateVars]?.trim();
    return value ? value : match;
  });
}
