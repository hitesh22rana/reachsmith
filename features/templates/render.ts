// Placeholder vocabulary for outreach templates. Pure and dependency-free
// on purpose: the seed script and the compose dialog both import it, and
// the compose dialog is a client component, so nothing here may reach for
// the database or a path alias.

export type PlaceholderSource = "target" | "input";

export interface Placeholder {
  name: string;
  label: string;
  source: PlaceholderSource;
}

export type TemplateVars = Record<string, string | undefined>;

export const PLACEHOLDER_MAX = 50;
export const PLACEHOLDER_MAX_LENGTH = 40;

// Strict lowercase snake_case. Anything looser and {{First Name}} would
// render as a literal while looking like a variable, which is the one
// outcome that cannot be diagnosed from the finished message.
const PLACEHOLDER_NAME = /^[a-z][a-z0-9_]*$/;

// Matches any double-brace token, including ones that fail the name rule,
// so a typo surfaces as a named error instead of silently rendering as text.
const TOKEN = /\{\{\s*([^{}]*?)\s*\}\}/g;

// Narrows to token-shaped names only. renderTemplate leaves anything else
// (an invalid name, an empty {{}}) untouched.
const SUBSTITUTABLE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

// Names the compose form can prefill from the target row. Everything else
// is a free input the caller fills per message. job_title keeps its legacy
// fallback onto the target's role title, applied by the outreach mapper.
export const TARGET_VAR_NAMES = [
  "first_name",
  "last_name",
  "company",
  "role_title",
  "job_title",
  "location",
  "company_website",
  "domain",
  "primary_email",
] as const;

export interface PlaceholderIssue {
  name: string;
  message: string;
}

const LABEL_MAX_LENGTH = 28;

// first_name reads as "First name", resume_link as "Resume link". Long
// custom names truncate so one 40-character placeholder cannot stretch the
// label column out of a two-column grid.
function humanize(name: string): string {
  const label = name
    .split("_")
    .filter((word) => word !== "")
    .map((word, index) => (index === 0 ? word[0]?.toUpperCase() + word.slice(1) : word))
    .join(" ");
  return label.length > LABEL_MAX_LENGTH
    ? `${label.slice(0, LABEL_MAX_LENGTH - 1).trimEnd()}…`
    : label;
}

export function parsePlaceholders(body: string): {
  placeholders: Placeholder[];
  issues: PlaceholderIssue[];
} {
  const placeholders: Placeholder[] = [];
  const issues: PlaceholderIssue[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(TOKEN)) {
    const name = (match[1] ?? "").trim();
    if (name === "") {
      issues.push({ name, message: "Empty {{}} is not a placeholder" });
      continue;
    }
    if (name.length > PLACEHOLDER_MAX_LENGTH) {
      issues.push({
        name,
        message: `{{${name}}} is longer than ${PLACEHOLDER_MAX_LENGTH} characters`,
      });
      continue;
    }
    if (!PLACEHOLDER_NAME.test(name)) {
      issues.push({
        name,
        message: `{{${name}}} must be lowercase snake_case, like {{first_name}}`,
      });
      continue;
    }
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    placeholders.push({
      name,
      label: humanize(name),
      source: (TARGET_VAR_NAMES as readonly string[]).includes(name) ? "target" : "input",
    });
  }
  if (placeholders.length > PLACEHOLDER_MAX) {
    issues.push({
      name: "",
      message: `A template can use at most ${PLACEHOLDER_MAX} placeholders, this one has ${placeholders.length}`,
    });
  }
  return { placeholders, issues };
}

// First problem with a body, or null when the placeholders are all valid.
// Shared by the schema's static check and the route's exact 400 message, so
// the form and the API can never disagree about what is acceptable.
export function placeholderError(body: string): string | null {
  return parsePlaceholders(body).issues[0]?.message ?? null;
}

// Substitutes any supplied name and leaves every other token intact, so a
// partially filled message still shows the placeholders it is missing
// rather than dropping them silently.
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(SUBSTITUTABLE, (match, name: string) => {
    const value = vars[name]?.trim();
    return value ? value : match;
  });
}
