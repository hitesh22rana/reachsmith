import { parse as parseDomain } from "tldts";
import { cleanPart, generateCandidates, type EmailPattern, type EmailCandidate } from "./email-patterns.ts";

export type CandidateSource = "notes" | "pattern";

export interface RankedCandidate {
  email: string;
  pattern: EmailPattern | "from_notes" | "handle";
  source: CandidateSource;
  context: string | null;
  score: number;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Globally tuned on the diagnostic seed set. This favors given-name-only
// and initial/surname patterns; an independent holdout is still required.
const PATTERN_BASE: Record<EmailPattern, number> = {
  first: 60,
  flast: 50,
  "first.last": 45,
  "f.last": 35,
  firstlast: 32,
  fmlast: 31,
  firstl: 30,
  fl: 25,
  initials: 37,
  last: 22,
  first_last: 18,
  "last.first": 15,
  f_last: 12,
  "first.l": 10,
  lastf: 8,
  initialslast: 29,
};

function patternScore(candidate: EmailCandidate): number {
  return PATTERN_BASE[candidate.pattern] - (candidate.nameVariant ? 20 : 0);
}

const POSITIVE_CUES = [
  "personal",
  "correct",
  "new",
  "updated",
  "reach me at",
  "reach him at",
  "reach her at",
  "contact me at",
  "his email",
  "her email",
  "my email",
  "email is",
];

const NEGATIVE_CUES = [
  "example",
  "e.g.",
  "like ",
  "don't use",
  "do not use",
  "old",
  "wrong",
  "former",
  "sample",
  "fake",
];

// Every address mentioned in free-text notes, with a ±40-char window for
// context cues. The prose around the address is never trusted directly.
export function extractNoteEmails(notes: string | null | undefined): {
  email: string;
  context: string;
  domain: string;
}[] {
  if (!notes) {
    return [];
  }
  const found: { email: string; context: string; domain: string }[] = [];
  const seen = new Set<string>();
  for (const match of notes.matchAll(EMAIL_RE)) {
    const email = (match[0] ?? "").toLowerCase();
    if (seen.has(email)) {
      continue;
    }
    seen.add(email);
    const start = Math.max(0, (match.index ?? 0) - 40);
    const end = Math.min(notes.length, (match.index ?? 0) + email.length + 40);
    found.push({
      email,
      context: notes.slice(start, end).toLowerCase(),
      domain: email.split("@")[1] ?? "",
    });
  }
  return found;
}

// Handles people reuse across sites (github.com/foo → foo): observed
// usernames make strong local parts. Generic path segments are skipped.
export function extractHandles(urls: string[] | null | undefined): {
  handle: string;
  url: string;
}[] {
  if (!urls) {
    return [];
  }
  const found: { handle: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    try {
      const segments = new URL(raw).pathname.split("/").filter((part) => part !== "");
      const last = (segments[segments.length - 1] ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
      if (!last || seen.has(last)) {
        continue;
      }
      seen.add(last);
      found.push({ handle: last, url: raw });
    } catch {
      continue;
    }
  }
  return found;
}
export function inferPattern(
  email: string,
  firstName: string | undefined,
  lastName: string | undefined,
): EmailPattern | null {
  return generateCandidates({
    first_name: firstName,
    last_name: lastName,
    domain: email.split("@")[1],
  }).sort((a, b) => patternScore(b) - patternScore(a)).find((candidate) => candidate.email === email)?.pattern ?? null;
}

function cueScore(context: string): number {
  const hits = (cues: string[]): number =>
    cues.filter((cue) => context.includes(cue)).length;
  return hits(POSITIVE_CUES) * 25 - hits(NEGATIVE_CUES) * 50;
}

// First address wins a duplicate, then the set sorts by score.
function bestFirst(candidates: RankedCandidate[]): RankedCandidate[] {
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.email)) {
        return false;
      }
      seen.add(candidate.email);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

// Only an explicit domain or an eligible HTTP(S) company website can supply
// the provisional registrable company domain. Notes addresses never determine where we guess.
export function resolveDomain(
  explicit: string | null | undefined,
  website: string | null | undefined,
): string | null {
  if (explicit?.trim()) {
    return explicit.trim().toLowerCase();
  }
  if (!website) return null;
  try {
    const url = new URL(website);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const parsed = parseDomain(url.hostname, { allowPrivateDomains: true, detectSpecialUse: true });
    const host = parsed.domain;
    if (!host || !parsed.isIcann || parsed.isPrivate || parsed.isIp || parsed.isSpecialUse) return null;
    const blocked = new Set([
      "gmail.com", "outlook.com", "yahoo.com", "hotmail.com",
      "linkedin.com", "github.com", "facebook.com", "instagram.com",
      "x.com", "twitter.com", "linktr.ee", "bit.ly", "vercel.app",
      "netlify.app", "wordpress.com", "wixsite.com",
    ]);
    if (blocked.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

// Read only names tied to this target: an explicit quoted/parenthetical alias,
// the opening subject with the same surname, or a subject whose short given
// name shares at least three opening letters with the supplied one.
// No nickname dictionary or URL fetching.
function biographyNames(first: string | undefined, last: string | undefined, notes: string | null | undefined) {
  const names: { first: string; last: string; context: string }[] = [];
  if (!first || !notes) return names;
  const given = cleanPart(first);
  const familyTokens = (last ?? "").split(/\s+/).filter(Boolean);
  const family = cleanPart(last);
  const add = (observed: string, context: string) => {
    if (cleanPart(observed) !== given && !names.some((name) => cleanPart(name.first) === cleanPart(observed))) {
      names.push({ first: observed, last: last ?? "", context });
    }
  };
  for (const match of notes.matchAll(/([\p{L}][\p{L}'’-]*)\s+["“(]([\p{L}][\p{L}'’-]*)["”)](?:\s+([\p{Lu}][\p{L}'’-]*(?:\s+[\p{Lu}][\p{L}'’-]*){0,3}))?/gu)) {
    if (family && match[3] && cleanPart(match[3]) !== family) continue;
    if (cleanPart(match[1]) === given) add(match[2]!, match[0]);
    else if (cleanPart(match[2]) === given) add(match[1]!, match[0]);
  }
  const text = notes.replace(/^Abbreviated:\s*/i, "");
  for (const match of text.matchAll(/(?:^|[.!?]\s+|\n+)([\p{Lu}][\p{L}'’-]*(?:\s+[\p{Lu}][\p{L}'’-]*){0,4})\s+(?:is|works|hosts|joined|advises|has)\b/gu)) {
    const tokens = match[1]!.split(/\s+/);
    const observed = tokens[0]!;
    const observedGiven = cleanPart(observed);
    if (tokens.length === 1 && observedGiven.length >= 3 && given.length >= observedGiven.length && given.slice(0, 3) === observedGiven.slice(0, 3)) {
      add(observed, match[0].trim());
    } else if (family && tokens.length > familyTokens.length && cleanPart(tokens.slice(-familyTokens.length).join(" ")) === family) {
      const fullGiven = tokens.slice(0, -familyTokens.length).join(" ");
      // A different given name with the same surname must be the opening
      // subject; later mentions could describe a relative or colleague.
      if (match.index === 0 || cleanPart(observed) === given) add(fullGiven, match[0].trim());
    }
  }
  return names;
}

// Full ranked set: notes addresses first by evidence, then name patterns.
// Name-in-address is a plus, never a gate: personal addresses often break
// the work pattern.
export function rankCandidates(input: {
  first_name?: string | undefined;
  last_name?: string | undefined;
  domain?: string | null | undefined;
  company_website?: string | null | undefined;
  notes?: string | null | undefined;
  social_urls?: string[] | null | undefined;
}): RankedCandidate[] {
  const noteEmails = extractNoteEmails(input.notes);
  const domain = resolveDomain(input.domain, input.company_website);
  const ranked: RankedCandidate[] = [];

  for (const note of noteEmails) {
    if (note.domain !== domain) continue;
    const pattern = inferPattern(note.email, input.first_name, input.last_name);
    const local = note.email.split("@")[0] ?? "";
    const nameHit =
      local.includes(cleanPart(input.first_name)) ||
      (!!cleanPart(input.last_name) && local.includes(cleanPart(input.last_name)));
    ranked.push({
      email: note.email,
      pattern: pattern ?? "from_notes",
      source: "notes",
      context: note.context,
      score: 100 + cueScore(note.context) + (pattern ? 20 : 0) + (nameHit ? 15 : 0),
    });
  }

  // Without a company domain there are no work addresses to suggest.
  if (!domain) {
    return bestFirst(ranked);
  }

  for (const { handle, url } of extractHandles(input.social_urls)) {
    const email = `${handle}@${domain}`;
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
      continue;
    }
    ranked.push({
      email,
      pattern: "handle",
      source: "pattern",
      context: url,
      score: 55,
    });
  }
  const inferred = new Set(
    noteEmails
      .filter((note) => note.domain === domain)
      .map((note) => inferPattern(note.email, input.first_name, input.last_name))
      .filter((pattern): pattern is EmailPattern => pattern !== null),
  );
  const patterns: RankedCandidate[] = generateCandidates({
    first_name: input.first_name,
    last_name: input.last_name,
    domain,
  }).map((candidate) => ({
    email: candidate.email,
    pattern: candidate.pattern,
    source: "pattern",
    context: null,
    score: patternScore(candidate) + (inferred.has(candidate.pattern) ? 20 : 0),
  }));
  // A short name used in the biography is stronger than the form's given
  // name. Fuller-name interpretations remain alternatives, below direct names.
  // ponytail: deterministic English subject cues; explicit name overrides cover other biography styles.
  for (const name of biographyNames(input.first_name, input.last_name, input.notes)) {
    patterns.push(...generateCandidates({ first_name: name.first, last_name: name.last, domain }).map((candidate) => ({
      email: candidate.email,
      pattern: candidate.pattern,
      source: "pattern" as const,
      context: name.context,
      score: candidate.pattern === "first" && !candidate.nameVariant && cleanPart(name.first).length < cleanPart(input.first_name).length
        ? PATTERN_BASE.first + 5
        : patternScore(candidate) - 10,
    })));
  }
  // A name variant can spell an address in multiple ways. Keep the strongest
  // name-pattern explanation, while notes and observed handles retain priority.
  ranked.push(...patterns.sort((a, b) => b.score - a.score));
  return bestFirst(ranked);
}
