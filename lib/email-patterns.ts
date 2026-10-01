// Deterministic priority order; new patterns follow the existing baseline.
const PATTERNS = [
  "first.last",
  "f.last",
  "first",
  "first_last",
  "last.first",
  "f_last",
  "flast",
  "last",
  "firstlast",
] as const;

export type EmailPattern = (typeof PATTERNS)[number];

export interface EmailCandidate {
  email: string;
  pattern: EmailPattern;
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function cleanPart(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Supported name patterns from {first_name, last_name, domain}. Parts needing a
// missing name are skipped; every emitted address is syntax-checked.
export function generateCandidates(input: {
  first_name?: string | undefined;
  last_name?: string | undefined;
  domain?: string | undefined;
}): EmailCandidate[] {
  const first = cleanPart(input.first_name);
  const last = cleanPart(input.last_name);
  const domain = (input.domain ?? "").toLowerCase().trim();
  if (!first || !domain) {
    return [];
  }
  const local: Record<EmailPattern, string | null> = {
    "first.last": last ? `${first}.${last}` : null,
    "f.last": last ? `${first[0]}.${last}` : null,
    first,
    first_last: last ? `${first}_${last}` : null,
    "last.first": last ? `${last}.${first}` : null,
    f_last: last ? `${first[0]}_${last}` : null,
    flast: last ? `${first[0]}${last}` : null,
    last: last || null,
    firstlast: last ? `${first}${last}` : null,
  };
  return PATTERNS.flatMap((pattern) => {
    const part = local[pattern];
    if (!part) {
      return [];
    }
    const email = `${part}@${domain}`;
    return EMAIL_RE.test(email) ? [{ email, pattern }] : [];
  });
}
