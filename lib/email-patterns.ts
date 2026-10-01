// Fixed pattern priority is defined by the ranker, not generation order.
const PATTERNS = [
  "first.last", "f.last", "first", "first_last", "last.first", "f_last",
  "flast", "last", "firstlast", "firstl", "fl", "initials", "fmlast", "first.l", "lastf", "initialslast",
] as const;

export type EmailPattern = (typeof PATTERNS)[number];

export interface EmailCandidate {
  email: string;
  pattern: EmailPattern;
  nameVariant: boolean;
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function cleanPart(value: string | undefined): string {
  return (value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Email-only variants: keep the shared nameParts() and greeting unchanged.
export function generateCandidates(input: {
  first_name?: string | undefined;
  last_name?: string | undefined;
  domain?: string | undefined;
}): EmailCandidate[] {
  const rawFirst = input.first_name ?? "";
  const rawLast = input.last_name ?? "";
  const stripAnnotations = (value: string) => value.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").trim();
  const firstText = stripAnnotations(rawFirst);
  const lastTokens = stripAnnotations(rawLast).split(/\s+/).filter(Boolean);
  // A leading middle initial belongs to the given name, not the surname.
  const surnameTokens = lastTokens.filter((token, index) => index === lastTokens.length - 1 || !/^[\p{L}]\.?$/u.test(token));
  const first = cleanPart(firstText);
  const last = cleanPart(surnameTokens.join(" "));
  const domain = (input.domain ?? "").toLowerCase().trim();
  if (!first || !domain) return [];

  const names = [{ first, last, nameVariant: false }];
  const addName = (given: string, family: string) => {
    if (given && !names.some((name) => name.first === given && name.last === family)) {
      names.push({ first: given, last: family, nameVariant: true });
    }
  };
  if (surnameTokens.length > 1) {
    addName(first, cleanPart(surnameTokens.at(-1)));
    addName(first, cleanPart(surnameTokens[0]));
    // The second full token may be part of a compound given name.
    if (!/^[\p{L}]\.?$/u.test(surnameTokens[0] ?? "")) {
      addName(first + cleanPart(surnameTokens[0]), cleanPart(surnameTokens.slice(1).join(" ")));
    }
    if (first.length === 1) addName(cleanPart(surnameTokens[0]), cleanPart(surnameTokens.slice(1).join(" ")));
  }
  for (const match of `${rawFirst} ${rawLast}`.matchAll(/\(([\p{L}]+)\)/gu)) {
    addName(cleanPart(match[1]), last);
  }
  // Keep the former ASCII spelling available for addresses that omit accents.
  const legacy = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  addName(legacy(rawFirst), legacy(rawLast));

  const candidates: EmailCandidate[] = [];
  for (const name of names) {
    const f = name.first;
    const l = name.last;
    const local: Record<EmailPattern, string | null> = {
      "first.last": l ? `${f}.${l}` : null,
      "f.last": l ? `${f[0]}.${l}` : null,
      first: f,
      first_last: l ? `${f}_${l}` : null,
      "last.first": l ? `${l}.${f}` : null,
      f_last: l ? `${f[0]}_${l}` : null,
      flast: l ? `${f[0]}${l}` : null,
      last: l || null,
      firstlast: l ? `${f}${l}` : null,
      firstl: l ? `${f}${l[0]}` : null,
      fl: l ? `${f[0]}${l[0]}` : null,
      initials: name.nameVariant || !l ? null : `${firstText} ${stripAnnotations(rawLast)}`.split(/[\s-]+/).filter(Boolean).map((part) => cleanPart(part)[0] ?? "").join(""),
      fmlast: name.nameVariant || lastTokens.length < 2 ? null : `${f[0]}${cleanPart(lastTokens[0])[0] ?? ""}${cleanPart(lastTokens.slice(1).join(" "))}`,
      "first.l": l ? `${f}.${l[0]}` : null,
      lastf: l ? `${l}${f[0]}` : null,
      initialslast: !name.nameVariant && !!l && firstText.split(/[\s-]+/).length > 1
        ? firstText.split(/[\s-]+/).filter(Boolean).map((part) => cleanPart(part)[0] ?? "").join("") + cleanPart(stripAnnotations(rawLast))
        : null,
    };
    for (const pattern of PATTERNS) {
      const part = local[pattern];
      if (part && EMAIL_RE.test(`${part}@${domain}`)) candidates.push({ email: `${part}@${domain}`, pattern, nameVariant: name.nameVariant });
    }
  }
  // Preserve a hyphenated given-name spelling in addition to its compact form.
  const hyphenated = firstText.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (hyphenated.includes("-") && EMAIL_RE.test(`${hyphenated}@${domain}`)) {
    candidates.push({ email: `${hyphenated}@${domain}`, pattern: "first", nameVariant: true });
  }
  return candidates;
}
