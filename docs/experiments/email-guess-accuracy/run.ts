import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import * as v from "valibot";
import { TargetCreateSchema } from "../../../features/targets/validation.ts";
import { nameParts } from "../../../lib/target-name.ts";
import { extractNoteEmails, rankCandidates, resolveDomain } from "../../../lib/email-rank.ts";

const directory = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const ks = [1, 3, 5, 10];
const SeedSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]+$/)),
  target: v.strictObject({
    ...TargetCreateSchema.entries,
    primary_email: v.pipe(v.string(), v.trim(), v.maxLength(254), v.email()),
  }),
  evidence: v.strictObject({
    evidence_type: v.picklist(["official_directory", "self_published", "direct_confirmation", "received_reply"]),
    source_url: v.optional(v.pipe(v.string(), v.url(), v.regex(/^https?:\/\//), v.maxLength(2048))),
    checked_on: v.pipe(v.string(), v.isoDate()),
    evidence_notes: v.optional(v.pipe(v.string(), v.maxLength(2000))),
  }),
});
type Seed = v.InferOutput<typeof SeedSchema>;
type Case = {
  id: string; source: string; company: string | null; expected: string; expected_domain: string;
  cohort: string; short_bio: boolean; resolved_domain: string | null; domain_status: string;
  generated: ReturnType<typeof rankCandidates>; baseline_order: string[]; pipeline_order: string[];
  baseline_rank: number | null; pipeline_rank: number | null; candidate_rank: number | null;
  baseline_error: string | null; pipeline_error: string | null;
};
const normalize = (email: string) => email.trim().toLowerCase();
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const position = (emails: string[], answer: string) => {
  const index = emails.findIndex((email) => normalize(email) === normalize(answer));
  return index < 0 ? null : index + 1;
};

function guessInput(target: Seed["target"]) {
  const parts = nameParts({ fullName: target.full_name, firstName: target.first_name ?? null, lastName: target.last_name ?? null });
  return {
    first_name: parts.firstName, last_name: parts.lastName, domain: target.domain,
    company_website: target.company_website, notes: target.notes,
    social_urls: (target.social_urls ?? "").split("\n").map((url) => url.trim()).filter(Boolean),
  };
}

function metrics(cases: Case[], order: "baseline" | "pipeline") {
  const covered = cases.filter((row) => row.candidate_rank !== null);
  return {
    total: cases.length,
    candidate_coverage: cases.filter((row) => row.candidate_rank !== null).length,
    suggestion_coverage: cases.filter((row) => row[`${order}_order`].length > 0).length,
    execution_errors: cases.filter((row) => row[`${order}_error`] !== null).length,
    top_k: Object.fromEntries(ks.map((k) => [k, {
      hits: cases.filter((row) => row[`${order}_rank`] !== null && row[`${order}_rank`]! <= k && row[`${order}_error`] === null).length,
      denominator: cases.length,
    }])),
    conditional_top_k: Object.fromEntries(ks.map((k) => [k, {
      hits: covered.filter((row) => row[`${order}_rank`] !== null && row[`${order}_rank`]! <= k && row[`${order}_error`] === null).length,
      denominator: covered.length,
    }])),
  };
}

function summary(cases: Case[]) {
  const groups = (key: "cohort" | "source" | "domain_status") => Object.fromEntries(
    [...new Set(cases.map((row) => row[key]))].sort().map((value) => {
      const subset = cases.filter((row) => row[key] === value);
      return [value, { baseline: metrics(subset, "baseline"), pipeline: metrics(subset, "pipeline") }];
    }),
  );
  const domains = [...new Set(cases.map((row) => row.expected_domain))];
  const macro = (order: "baseline" | "pipeline") => Object.fromEntries(ks.map((k) => [k,
    domains.length ? domains.reduce((sum, domain) => {
      const group = metrics(cases.filter((row) => row.expected_domain === domain), order);
      const metric = group.top_k[k]!;
      return sum + metric.hits / metric.denominator;
    }, 0) / domains.length : null,
  ]));
  return {
    baseline: metrics(cases, "baseline"), pipeline: metrics(cases, "pipeline"),
    by_cohort: groups("cohort"), by_source: groups("source"), by_domain_status: groups("domain_status"),
    short_bios: {
      baseline: metrics(cases.filter((row) => row.short_bio), "baseline"),
      pipeline: metrics(cases.filter((row) => row.short_bio), "pipeline"),
    },
    expected_domains: domains.length, macro_top_k: { baseline: macro("baseline"), pipeline: macro("pipeline") },
  };
}

function selfcheck() {
  const target = v.parse(SeedSchema.entries.target, {
    full_name: "Ada Lovelace", primary_email: "secret@withheld.example", company: "Example",
    domain: "example.com", social_urls: " https://github.com/ada \n\n", notes: "Published biography.",
  });
  const input = guessInput(target);
  assert(!JSON.stringify(input).includes("secret@withheld.example"));
  assert.deepEqual(input.social_urls, ["https://github.com/ada"]);
  assert.equal(position([" ADA@EXAMPLE.COM "], "ada@example.com"), 1);
  assert.equal(position(["a.da@example.com"], "ada@example.com"), null);
  const rows: Case[] = [1, 3, null].map((rank, index) => ({
    id: `fixture_${index}`, source: "fixture", company: null, expected: "answer@example.com", expected_domain: index === 0 ? "other.example" : "example.com",
    cohort: "explicit_domain", short_bio: false, resolved_domain: "example.com", domain_status: "matched", generated: [],
    candidate_rank: rank, baseline_rank: rank, pipeline_rank: rank,
    baseline_order: index === 2 ? [] : ["candidate"], pipeline_order: index === 2 ? [] : ["candidate"],
    baseline_error: null, pipeline_error: null,
  }));
  const measured = metrics(rows, "baseline");
  assert.deepEqual(measured.top_k[1], { hits: 1, denominator: 3 });
  assert.deepEqual(measured.top_k[3], { hits: 2, denominator: 3 });
  assert.deepEqual(measured.conditional_top_k[3], { hits: 2, denominator: 2 });
  assert.equal(summary(rows).macro_top_k.baseline[3], 0.75);
  rows[1]!.baseline_error = "execution failed";
  assert.deepEqual(metrics(rows, "baseline").top_k[3], { hits: 1, denominator: 3 });
  console.log("eval selfcheck: answer isolation, matching and metric denominators passed");
}

async function main() {
  const started = new Date();
  const output = `${directory}runs/${started.toISOString().replace(/[:.]/g, "-")}`;
  const seedText = await readFile(`${directory}seeds.json`, "utf8");
  const snapshot: unknown = JSON.parse(seedText);
  const seeds = v.parse(v.pipe(v.array(SeedSchema), v.minLength(1)), snapshot);
  assert.equal(new Set(seeds.map((seed) => seed.id)).size, seeds.length, "Duplicate case ID");
  assert.equal(new Set(seeds.map((seed) => normalize(seed.target.primary_email))).size, seeds.length, "Duplicate answer");
  for (const seed of seeds) {
    assert.equal(extractNoteEmails(seed.target.notes).length, 0, `Answer-bearing Notes: ${seed.id}`);
    if (["official_directory", "self_published"].includes(seed.evidence.evidence_type)) assert(seed.evidence.source_url);
    else assert(seed.evidence.evidence_notes?.trim());
  }
  const paths = [
    "lib/email-patterns.ts", "lib/email-rank.ts", "lib/target-name.ts", "workers/email-guess.ts",
    "features/targets/validation.ts", "package.json", "pnpm-lock.yaml",
    "docs/experiments/email-guess-accuracy/run.ts",
  ];
  const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, digest(await readFile(`${root}${path}`))])));
  const metadata = {
    started_at: started.toISOString(), git_revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    tracked_changes_at_start: execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8" }).trim(),
    seeds_sha256: digest(seedText), schema_sha256: digest(await readFile(`${directory}schema.json`)), source_sha256: sourceHashes,
    runtime: { node: process.version, platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, cpu_count: os.cpus().length, memory_bytes: os.totalmem() },
    source_grouping: "case ID prefix before underscore", matching: "trimmed, case-insensitive, exact address", suggestion_limit: 10,
  };
  await mkdir(output, { recursive: true });
  const cases: Case[] = [];
  for (const seed of seeds) {
    const target = seed.target;
    const expected = normalize(target.primary_email);
    const resolved = resolveDomain(target.domain, target.company_website);
    const row: Case = {
      id: seed.id, source: seed.id.split("_")[0]!, company: target.company || null, expected, expected_domain: expected.split("@")[1]!,
      cohort: target.domain ? "explicit_domain" : target.company_website ? "website_only" : "missing_domain_input",
      short_bio: (target.notes ?? "").split(/\s+/).filter(Boolean).length < 40,
      resolved_domain: resolved, domain_status: resolved ? (resolved === expected.split("@")[1] ? "matched" : "mismatch") : target.company_website ? "rejected_website" : "missing_input",
      generated: [], baseline_order: [], pipeline_order: [], baseline_rank: null, pipeline_rank: null, candidate_rank: null, baseline_error: null, pipeline_error: null,
    };
    try {
      const input = guessInput(target);
      row.generated = rankCandidates(input);
      row.candidate_rank = position(row.generated.map((candidate) => candidate.email), expected);
      row.baseline_order = row.generated.slice(0, 10).map((candidate) => candidate.email);
      row.baseline_rank = position(row.baseline_order, expected);
      row.pipeline_order = [...row.baseline_order];
      row.pipeline_rank = row.baseline_rank;
    } catch (error) {
      if (row.generated.length) row.pipeline_error = errorMessage(error);
      else row.baseline_error = row.pipeline_error = errorMessage(error);
    }
    cases.push(row);
    if (cases.length % 25 === 0 || cases.length === seeds.length) console.log(`Evaluated ${cases.length}/${seeds.length}`);
  }
  const totals = summary(cases);
  const completed = new Date();
  const rate = (hit: number, denominator: number) => denominator ? `${(100 * hit / denominator).toFixed(2)}% (${hit}/${denominator})` : "n/a (empty cohort)";
  const table = (base: ReturnType<typeof metrics>, pipeline: ReturnType<typeof metrics>) => [
    "| Metric | Deterministic | Current pipeline |", "| --- | --- | --- |",
    ...ks.map((k) => `| Top-${k} | ${rate(base.top_k[k]!.hits, base.total)} | ${rate(pipeline.top_k[k]!.hits, pipeline.total)} |`),
    `| Candidate coverage | ${rate(base.candidate_coverage, base.total)} | ${rate(pipeline.candidate_coverage, pipeline.total)} |`,
    `| Suggestion coverage | ${rate(base.suggestion_coverage, base.total)} | ${rate(pipeline.suggestion_coverage, pipeline.total)} |`,
  ].join("\n");
  const sections = Object.entries(totals.by_cohort).map(([cohort, value]) => `### ${cohort}\n\n${table(value.baseline, value.pipeline)}`);
  const report = [
    "# Email guess accuracy results", `Completed: ${completed.toISOString()}`, `Evaluated revision: \`${metadata.git_revision}\``,
    "This is a generated run report. Dataset totals and percentages describe this run only.",
    "## Overall", table(totals.baseline, totals.pipeline),
    `Baseline errors: ${totals.baseline.execution_errors}; pipeline errors: ${totals.pipeline.execution_errors}.`,
    "## Input cohorts", ...sections,
    "## Conditional ranking accuracy", "Denominator: cases where the expected email was generated.",
    ...ks.map((k) => `- Top-${k}: deterministic ${rate(totals.baseline.conditional_top_k[k]!.hits, totals.baseline.candidate_coverage)}; pipeline ${rate(totals.pipeline.conditional_top_k[k]!.hits, totals.pipeline.candidate_coverage)}.`),
    "## Macro average across published email domains",
    "Each answer domain receives equal weight. Domains are used for scoring groups only.",
    ...ks.map((k) => `- Top-${k}: deterministic ${(100 * totals.macro_top_k.baseline[k]!).toFixed(2)}%; pipeline ${(100 * totals.macro_top_k.pipeline[k]!).toFixed(2)}%.`),
    "## Source breakdown", ...Object.entries(totals.by_source).map(([source, value]) => `### ${source}\n\n${table(value.baseline, value.pipeline)}`),
    "## Domain diagnostics", ...Object.entries(totals.by_domain_status).map(([status, value]) => `- ${status}: ${value.baseline.total}.`),
    "## Short biographies", table(totals.short_bios.baseline, totals.short_bios.pipeline),
    "## Reproduction", "Re-run the evaluated Git revision with the recorded input checksums. Only this final report is retained; per-case working data stays in memory.",
    "```json\n" + JSON.stringify({ ...metadata, completed_at: completed.toISOString(), elapsed_ms: completed.getTime() - started.getTime() }, null, 2) + "\n```",
    "## Execution errors", ...cases.filter((row) => row.pipeline_error || row.baseline_error).map((row) => `- ${row.id}: ${row.pipeline_error ?? row.baseline_error}`),
    "## Limits", "This is a diagnostic baseline on published contact directories, not a representative production benchmark or a deliverability check. Website/domain mismatches and missing candidate patterns require domain or candidate-generation changes. Use an independent holdout after tuning.",
  ].join("\n\n") + "\n";
  await writeFile(`${output}/RESULTS.md`, report, { flag: "wx" });
  console.log(`Saved ${output}`);
  console.log(table(totals.baseline, totals.pipeline));
}

if (process.argv.includes("--selfcheck")) selfcheck();
else {
  try { await main(); process.exit(0); }
  catch (error) { console.error(error); process.exit(1); }
}
