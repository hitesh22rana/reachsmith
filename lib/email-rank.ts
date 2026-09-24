import { generateCandidates, type EmailPattern } from "./email-patterns.ts";

export type CandidateSource = "notes" | "pattern";

export interface RankedCandidate {
  email: string;
  pattern: EmailPattern | "from_notes" | "handle";
  source: CandidateSource;
  context: string | null;
  score: number;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Frequency order doubles as base score: first.last wins ties.
const PATTERN_BASE: Record<EmailPattern, number> = {
  "first.last": 60,
  "f.last": 50,
  first: 40,
  first_last: 30,
  "last.first": 20,
  f_last: 10,
};

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

function cleanPart(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
  const first = cleanPart(firstName);
  const last = cleanPart(lastName);
  if (!first) {
    return null;
  }
  const local = email.split("@")[0] ?? "";
  if (last && local === `${first}.${last}`) {
    return "first.last";
  }
  if (last && local === `${first[0]}.${last}`) {
    return "f.last";
  }
  if (local === first) {
    return "first";
  }
  if (last && local === `${first}_${last}`) {
    return "first_last";
  }
  if (last && local === `${last}.${first}`) {
    return "last.first";
  }
  if (last && local === `${first[0]}_${last}`) {
    return "f_last";
  }
  return null;
}

function cueScore(context: string): number {
  let score = 0;
  for (const cue of POSITIVE_CUES) {
    if (context.includes(cue)) {
      score += 25;
    }
  }
  for (const cue of NEGATIVE_CUES) {
    if (context.includes(cue)) {
      score -= 50;
    }
  }
  return score;
}

// Explicit domain wins; otherwise the first notes address donates its
// domain; otherwise there is nothing to generate from.
export function resolveDomain(
  explicit: string | null | undefined,
  noteEmails: { domain: string }[],
): string | null {
  if (explicit?.trim()) {
    return explicit.trim().toLowerCase();
  }
  return noteEmails[0]?.domain ?? null;
}

// Full ranked set: notes addresses first by evidence, then name patterns.
// Name-in-address is a plus, never a gate: personal addresses often break
// the work pattern.
export function rankCandidates(input: {
  first_name?: string | undefined;
  last_name?: string | undefined;
  domain?: string | null | undefined;
  notes?: string | null | undefined;
  social_urls?: string[] | null | undefined;
}): RankedCandidate[] {
  const noteEmails = extractNoteEmails(input.notes);
  const domain = resolveDomain(input.domain, noteEmails);
  const ranked: RankedCandidate[] = [];

  for (const note of noteEmails) {
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

  if (domain) {
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
        .map((note) => inferPattern(note.email, input.first_name, input.last_name))
        .filter((pattern): pattern is EmailPattern => pattern !== null),
    );
    for (const candidate of generateCandidates({
      first_name: input.first_name,
      last_name: input.last_name,
      domain,
    })) {
      ranked.push({
        email: candidate.email,
        pattern: candidate.pattern,
        source: "pattern",
        context: null,
        score: PATTERN_BASE[candidate.pattern] + (inferred.has(candidate.pattern) ? 20 : 0),
      });
    }
  }

  const seen = new Set<string>();
  return ranked
    .filter((candidate) => {
      if (seen.has(candidate.email)) {
        return false;
      }
      seen.add(candidate.email);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}
