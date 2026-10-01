# Email guess accuracy results

Completed: 2026-10-01T16:41:31.348Z

Evaluated revision: `1abc539781e378817a38b044318681563bd99956`

This is a generated run report. Dataset totals and percentages describe this run only.

## Comparison with the previous complete-list run

Compared with [the prior run](../2026-10-01T15-54-16-773Z/RESULTS.md), evaluated at `7ea9cdae07ce273a61a510be5510250c5e1dbe08`. Both use seed SHA-256 `303185feb88e6c0957db9813694ac0731c3d70e6b51dc7d5a8a384dcb5f12066` and schema SHA-256 `8718cce220a332740fdb9e6e7dc171e167a67a0fd240565374406766401a4002`. Seeds, expected addresses, name overrides, biographies, and source evidence are unchanged. All targets remain in the denominator. This is a tuning-set comparison, not an independent holdout.

| Metric | Before | After | Change (percentage points) |
| --- | --- | --- | --- |
| Top-1 | 43.25% (125/289) | 45.33% (131/289) | +2.08 |
| Top-3 | 59.17% (171/289) | 61.25% (177/289) | +2.08 |
| Top-5 | 62.98% (182/289) | 65.05% (188/289) | +2.08 |
| Top-10 | 70.59% (204/289) | 73.01% (211/289) | +2.42 |
| Full-list accuracy | 70.93% (205/289) | 73.70% (213/289) | +2.77 |

### Changes evaluated

- Extract constrained observed biography names from Notes: quoted/parenthetical aliases linked to the supplied given name, opening subjects with the same surname, and short-name subjects sharing at least three opening letters. Reject a quoted name with a conflicting stated surname. These remain heuristic English text interpretations and do not change stored names or greetings.
- Rank an observed short given-name guess above the original given-name-only guess. Other biography interpretations remain penalized alternatives; direct same-domain address evidence remains strongest.
- Add `initialslast`: compound given-name initials followed by the full supplied surname, including surname particles.
- Resolve company website subdomains and multi-label suffixes to provisional registrable domains through `tldts` and the Public Suffix List, rejecting private/hosted suffixes, blocked providers/social hosts and their subdomains, unknown/reserved suffixes, and IPs. Explicit domains still win. No network retrieval is performed by the pipeline.

### In-memory ablation

Each variant used the same inputs and exact matching. Domain-only uses the previous ranker with the new resolved domain; name-only uses the new ranker with the previous resolved domain and website fallback disabled. No case answer was supplied to either resolver or ranker.

| Variant | Top-1 | Top-3 | Top-5 | Top-10 | Full-list accuracy |
| --- | --- | --- | --- | --- | --- |
| Previous pipeline | 43.25% (125/289) | 59.17% (171/289) | 62.98% (182/289) | 70.59% (204/289) | 70.93% (205/289) |
| Domain resolution only | 43.60% (126/289) | 59.52% (172/289) | 63.32% (183/289) | 70.93% (205/289) | 71.28% (206/289) |
| Biography names and new pattern only | 44.98% (130/289) | 60.90% (176/289) | 64.71% (187/289) | 72.66% (210/289) | 73.36% (212/289) |
| Combined pipeline | 45.33% (131/289) | 61.25% (177/289) | 65.05% (188/289) | 73.01% (211/289) | 73.70% (213/289) |

### Every newly recovered address

| Target / source | Name | Published address | New rank | Recovery |
| --- | --- | --- | --- | --- |
| [eff_rindala_alajaji](https://www.eff.org/about/staff) | Rindala Alajaji | rin@eff.org | 1 | Observed short name in biography |
| [eff_william_budington](https://www.eff.org/about/staff) | William Budington | bill@eff.org | 1 | Observed short name in biography |
| [eff_maggie_kazmierczak](https://www.eff.org/about/staff) | Magdalena Kazmierczak | maggie@eff.org | 1 | Observed short name in biography |
| [boardsource_aaron_stroman](https://boardsource.org/user-profile/1f39e826990e3b49725079e994446ca2040a26dc) | Aaron Stroman | aaron@stromanconsulting.com | 1 | Company subdomain now supplies stromanconsulting.com |
| [boardsource_erin_gordon](https://boardsource.org/user-profile/72604d32e953f05ed9e1a7ced3e28113b202a5ae) | Erin Gordon | eng@thewayfind.com | 10 | Observed Erin Nicole Gordon plus initials |
| [boardsource_patricia_mccowan](https://boardsource.org/user-profile/pmccowan-sprynet.com) | Patricia McCowan | pat@xanthusconsulting.com | 1 | Observed short name in biography |
| [alliance_alexandra_howson](https://apps.acehp.org/consultantdirectory/details.cfm?localID=8340) | Alexandra Howson | alex@alexhowson.com | 1 | Observed short name in biography |
| [cooley_mischi_a_marca](https://www.cooley.com/people/mischi-a-marca) | Mischi a Marca | gmamarca@cooley.com | 21 | Observed Gian-Michele plus initialslast |

### Ranking regressions and candidate cost

No previous full-list hit was lost, and no existing hit crossed outside top-1, top-3, top-5, or top-10. Two existing answers worsened from rank 2 to rank 3 because an observed short-name guess moved ahead:

| Target / source | Published address | Previous rank | New rank | New first guess |
| --- | --- | --- | --- | --- |
| [fenwick_gregory_p_adams](https://www.fenwick.com/people/gregory-p-adams) | gadams@fenwick.com | 2 | 3 | greg@fenwick.com |
| [fenwick_andrew_t_albertson](https://www.fenwick.com/people/andrew-t-albertson) | aalbertson@fenwick.com | 2 | 3 | andy@fenwick.com |

Across all targets, candidate count increased from 3848 to 3973. 14 targets have larger lists; the rest are unchanged. Every candidate is still deduplicated and retained. Seven recoveries enter the top ten; Mischi a Marca is generated at rank 21 and remains a ranking opportunity.

### Remaining misses

There are 76 full-list misses: 54 with no domain/website, nine resolved-domain mismatches, one rejected social website, and 12 missing local parts at the correct domain. Domain input/resolution remains the primary cause for 64 cases. Correct-domain full-list agreement is 213/225 (94.67%), a scoped diagnostic rather than the overall score. The missing inputs and mismatches require independently supported domain information, not domains copied from the withheld labels. Opaque aliases remain in evaluation.

The 12 remaining matching-domain misses are:

| Target / source | Name | Published address |
| --- | --- | --- |
| [w3c_dom](https://www.w3.org/staff/#dom) | Dominique Hazaël-Massieux | dom@w3.org |
| [w3c_chu](https://www.w3.org/staff/#chu) | Chunming Hu | hucm@w3.org |
| [w3c_alex](https://www.w3.org/staff/#alex) | Alexandra Lacourba | alex@w3.org |
| [w3c_dsr](https://www.w3.org/staff/#dsr) | Dave Raggett | dsr@w3.org |
| [w3c_mike](https://www.w3.org/staff/#mike) | Michael[tm] Smith (sideshowbarker) | mike@w3.org |
| [eff_sarah_hamid](https://www.eff.org/about/staff) | Sarah Hamid | stsnv@eff.org |
| [eff_jacob_hoffman_andrews](https://www.eff.org/about/staff) | Jacob Hoffman-Andrews | jsha@eff.org |
| [fsfe_lohmus](https://fsfe.org/about/people/index.en.html#lohmus) | Heiki Lõhmus | repentinus@fsfe.org |
| [fsfe_albers](https://fsfe.org/about/people/index.en.html#albers) | Erik Albers | eal@fsfe.org |
| [fsfe_sander](https://fsfe.org/about/people/index.en.html#sander) | Alexander Sander | alex.sander@fsfe.org |
| [boardsource_david_sternberg](https://boardsource.org/user-profile/dave-loringsternberg.com) | David Sternberg | dave@loringsternberg.com |
| [cooley_vanessa_agudelo](https://www.cooley.com/people/vanessa-agudelo) | Vanessa Agudelo | vagudelogomez@cooley.com |

The [prior diagnosis](../2026-10-01T15-54-16-773Z/RESULTS.md#per-target-miss-analysis) lists domain failures and name hypotheses. Aaron Stroman is the sole recovered domain failure; the missing-domain and mismatched-domain cases remain unchanged, and Anita Misra-Press's Instagram website is still rejected. No organization-specific pattern training or speculative nickname dictionary was added.

### Validation

- `pnpm selfcheck` and the runner's `--selfcheck` passed. The new biography regression check failed against the prior code before implementation. The expanded self-check covers observed names, unrelated people, direct-evidence precedence, deduplication, and domain isolation.
- `pnpm typecheck`, `pnpm build`, and `pnpm lint` passed. Lint reports three existing warnings in unrelated files, with no errors.
- `npx react-doctor@latest`: 100/100, no issues.
- Verified recorded source/input checksums and a clean tracked working tree for this run. In-memory replay reproduced both reports' hit counts and asserted all recoveries and rank regressions above. No per-case intermediate outputs were retained.

## Overall

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 45.33% (131/289) | 45.33% (131/289) |
| Top-3 | 61.25% (177/289) | 61.25% (177/289) |
| Top-5 | 65.05% (188/289) | 65.05% (188/289) |
| Top-10 | 73.01% (211/289) | 73.01% (211/289) |
| Full-list accuracy | 73.70% (213/289) | 73.70% (213/289) |
| Candidate coverage | 73.70% (213/289) | 73.70% (213/289) |
| Suggestion coverage | 80.97% (234/289) | 80.97% (234/289) |

Baseline errors: 0; pipeline errors: 0.

## Input cohorts

### explicit_domain

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 60.61% (80/132) | 60.61% (80/132) |
| Top-3 | 73.48% (97/132) | 73.48% (97/132) |
| Top-5 | 80.30% (106/132) | 80.30% (106/132) |
| Top-10 | 91.67% (121/132) | 91.67% (121/132) |
| Full-list accuracy | 92.42% (122/132) | 92.42% (122/132) |
| Candidate coverage | 92.42% (122/132) | 92.42% (122/132) |
| Suggestion coverage | 100.00% (132/132) | 100.00% (132/132) |

### missing_domain_input

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/54) | 0.00% (0/54) |
| Top-3 | 0.00% (0/54) | 0.00% (0/54) |
| Top-5 | 0.00% (0/54) | 0.00% (0/54) |
| Top-10 | 0.00% (0/54) | 0.00% (0/54) |
| Full-list accuracy | 0.00% (0/54) | 0.00% (0/54) |
| Candidate coverage | 0.00% (0/54) | 0.00% (0/54) |
| Suggestion coverage | 0.00% (0/54) | 0.00% (0/54) |

### website_only

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 49.51% (51/103) | 49.51% (51/103) |
| Top-3 | 77.67% (80/103) | 77.67% (80/103) |
| Top-5 | 79.61% (82/103) | 79.61% (82/103) |
| Top-10 | 87.38% (90/103) | 87.38% (90/103) |
| Full-list accuracy | 88.35% (91/103) | 88.35% (91/103) |
| Candidate coverage | 88.35% (91/103) | 88.35% (91/103) |
| Suggestion coverage | 99.03% (102/103) | 99.03% (102/103) |

## Conditional ranking accuracy

Denominator: cases where the expected email was generated.

- Top-1: deterministic 61.50% (131/213); pipeline 61.50% (131/213).

- Top-3: deterministic 83.10% (177/213); pipeline 83.10% (177/213).

- Top-5: deterministic 88.26% (188/213); pipeline 88.26% (188/213).

- Top-10: deterministic 99.06% (211/213); pipeline 99.06% (211/213).

## Macro average across published email domains

Each answer domain receives equal weight. Domains are used for scoring groups only.

- Top-1: deterministic 36.97%; pipeline 36.97%.

- Top-3: deterministic 47.06%; pipeline 47.06%.

- Top-5: deterministic 48.77%; pipeline 48.77%.

- Top-10: deterministic 53.65%; pipeline 53.65%.

## Source breakdown

### afp

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 50.00% (1/2) | 50.00% (1/2) |
| Top-3 | 50.00% (1/2) | 50.00% (1/2) |
| Top-5 | 100.00% (2/2) | 100.00% (2/2) |
| Top-10 | 100.00% (2/2) | 100.00% (2/2) |
| Full-list accuracy | 100.00% (2/2) | 100.00% (2/2) |
| Candidate coverage | 100.00% (2/2) | 100.00% (2/2) |
| Suggestion coverage | 100.00% (2/2) | 100.00% (2/2) |

### alliance

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 30.00% (3/10) | 30.00% (3/10) |
| Top-3 | 50.00% (5/10) | 50.00% (5/10) |
| Top-5 | 50.00% (5/10) | 50.00% (5/10) |
| Top-10 | 50.00% (5/10) | 50.00% (5/10) |
| Full-list accuracy | 50.00% (5/10) | 50.00% (5/10) |
| Candidate coverage | 50.00% (5/10) | 50.00% (5/10) |
| Suggestion coverage | 60.00% (6/10) | 60.00% (6/10) |

### boardsource

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 61.43% (43/70) | 61.43% (43/70) |
| Top-3 | 72.86% (51/70) | 72.86% (51/70) |
| Top-5 | 74.29% (52/70) | 74.29% (52/70) |
| Top-10 | 82.86% (58/70) | 82.86% (58/70) |
| Full-list accuracy | 82.86% (58/70) | 82.86% (58/70) |
| Candidate coverage | 82.86% (58/70) | 82.86% (58/70) |
| Suggestion coverage | 94.29% (66/70) | 94.29% (66/70) |

### cooley

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/9) | 0.00% (0/9) |
| Top-3 | 66.67% (6/9) | 66.67% (6/9) |
| Top-5 | 66.67% (6/9) | 66.67% (6/9) |
| Top-10 | 77.78% (7/9) | 77.78% (7/9) |
| Full-list accuracy | 88.89% (8/9) | 88.89% (8/9) |
| Candidate coverage | 88.89% (8/9) | 88.89% (8/9) |
| Suggestion coverage | 100.00% (9/9) | 100.00% (9/9) |

### ct

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 80.00% (4/5) | 80.00% (4/5) |
| Top-3 | 80.00% (4/5) | 80.00% (4/5) |
| Top-5 | 80.00% (4/5) | 80.00% (4/5) |
| Top-10 | 80.00% (4/5) | 80.00% (4/5) |
| Full-list accuracy | 80.00% (4/5) | 80.00% (4/5) |
| Candidate coverage | 80.00% (4/5) | 80.00% (4/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### eff

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 72.73% (48/66) | 72.73% (48/66) |
| Top-3 | 83.33% (55/66) | 83.33% (55/66) |
| Top-5 | 86.36% (57/66) | 86.36% (57/66) |
| Top-10 | 96.97% (64/66) | 96.97% (64/66) |
| Full-list accuracy | 96.97% (64/66) | 96.97% (64/66) |
| Candidate coverage | 96.97% (64/66) | 96.97% (64/66) |
| Suggestion coverage | 100.00% (66/66) | 100.00% (66/66) |

### fenwick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/5) | 0.00% (0/5) |
| Top-3 | 100.00% (5/5) | 100.00% (5/5) |
| Top-5 | 100.00% (5/5) | 100.00% (5/5) |
| Top-10 | 100.00% (5/5) | 100.00% (5/5) |
| Full-list accuracy | 100.00% (5/5) | 100.00% (5/5) |
| Candidate coverage | 100.00% (5/5) | 100.00% (5/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### fsfe

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 25.00% (4/16) | 25.00% (4/16) |
| Top-3 | 50.00% (8/16) | 50.00% (8/16) |
| Top-5 | 68.75% (11/16) | 68.75% (11/16) |
| Top-10 | 75.00% (12/16) | 75.00% (12/16) |
| Full-list accuracy | 81.25% (13/16) | 81.25% (13/16) |
| Candidate coverage | 81.25% (13/16) | 81.25% (13/16) |
| Suggestion coverage | 100.00% (16/16) | 100.00% (16/16) |

### ibm

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/1) | 0.00% (0/1) |
| Top-3 | 100.00% (1/1) | 100.00% (1/1) |
| Top-5 | 100.00% (1/1) | 100.00% (1/1) |
| Top-10 | 100.00% (1/1) | 100.00% (1/1) |
| Full-list accuracy | 100.00% (1/1) | 100.00% (1/1) |
| Candidate coverage | 100.00% (1/1) | 100.00% (1/1) |
| Suggestion coverage | 100.00% (1/1) | 100.00% (1/1) |

### ieee

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/47) | 0.00% (0/47) |
| Top-3 | 0.00% (0/47) | 0.00% (0/47) |
| Top-5 | 0.00% (0/47) | 0.00% (0/47) |
| Top-10 | 0.00% (0/47) | 0.00% (0/47) |
| Full-list accuracy | 0.00% (0/47) | 0.00% (0/47) |
| Candidate coverage | 0.00% (0/47) | 0.00% (0/47) |
| Suggestion coverage | 0.00% (0/47) | 0.00% (0/47) |

### orrick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/8) | 0.00% (0/8) |
| Top-3 | 87.50% (7/8) | 87.50% (7/8) |
| Top-5 | 87.50% (7/8) | 87.50% (7/8) |
| Top-10 | 100.00% (8/8) | 100.00% (8/8) |
| Full-list accuracy | 100.00% (8/8) | 100.00% (8/8) |
| Candidate coverage | 100.00% (8/8) | 100.00% (8/8) |
| Suggestion coverage | 100.00% (8/8) | 100.00% (8/8) |

### w3c

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 56.00% (28/50) | 56.00% (28/50) |
| Top-3 | 68.00% (34/50) | 68.00% (34/50) |
| Top-5 | 76.00% (38/50) | 76.00% (38/50) |
| Top-10 | 90.00% (45/50) | 90.00% (45/50) |
| Full-list accuracy | 90.00% (45/50) | 90.00% (45/50) |
| Candidate coverage | 90.00% (45/50) | 90.00% (45/50) |
| Suggestion coverage | 100.00% (50/50) | 100.00% (50/50) |

## Domain diagnostics

- matched: 225.

- mismatch: 9.

- missing_input: 54.

- rejected_website: 1.

## Short biographies

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 75.00% (3/4) | 75.00% (3/4) |
| Top-3 | 75.00% (3/4) | 75.00% (3/4) |
| Top-5 | 75.00% (3/4) | 75.00% (3/4) |
| Top-10 | 75.00% (3/4) | 75.00% (3/4) |
| Full-list accuracy | 75.00% (3/4) | 75.00% (3/4) |
| Candidate coverage | 75.00% (3/4) | 75.00% (3/4) |
| Suggestion coverage | 100.00% (4/4) | 100.00% (4/4) |

## Reproduction

Re-run the evaluated Git revision with the recorded input checksums. Only this final report is retained; per-case working data stays in memory.

```json
{
  "started_at": "2026-10-01T16:41:31.291Z",
  "git_revision": "1abc539781e378817a38b044318681563bd99956",
  "tracked_changes_at_start": "",
  "seeds_sha256": "303185feb88e6c0957db9813694ac0731c3d70e6b51dc7d5a8a384dcb5f12066",
  "schema_sha256": "8718cce220a332740fdb9e6e7dc171e167a67a0fd240565374406766401a4002",
  "source_sha256": {
    "lib/email-patterns.ts": "7a70c37c893354b86ee858073c4fda8debcd25a44d36fc39480f68ed7d05c58a",
    "lib/email-rank.ts": "6b01b52bb95bdcc03603ef1c56f0a4e19e9a4cc9c500de9e410b0d706fe89886",
    "lib/target-name.ts": "e293553a6e911bd623122c215750b2340fbbfe435dc5a792ec9bcccbf7e43106",
    "workers/email-guess.ts": "5e96d03316c9c9475084ca176bd6b46d9ba2a62269a6a5afac288d278aaa3880",
    "features/targets/validation.ts": "bfc88d1b9be294440f86375b1f52ef6b67e0d434534df3b72d94ea498f7f1f53",
    "package.json": "77c91955cc1597da932eb70cd4ef16c0fba30041c131ae52b2c5e5fc59cee7b1",
    "pnpm-lock.yaml": "9002828b32ecfdb457344d6cca2a2edf064d30a65b2ba5104cf15ad58d3e0cc5",
    "docs/experiments/email-guess-accuracy/run.ts": "f86acd72bf380d46434b388d2ff36d655fde4f8e4d0b569dbbb183f3047d9dbb"
  },
  "runtime": {
    "node": "v25.2.1",
    "platform": "darwin",
    "arch": "arm64",
    "cpu": "Apple M3",
    "cpu_count": 8,
    "memory_bytes": 17179869184
  },
  "source_grouping": "case ID prefix before underscore",
  "matching": "trimmed, case-insensitive, exact address",
  "suggestion_limit": null,
  "completed_at": "2026-10-01T16:41:31.348Z",
  "elapsed_ms": 57
}
```

## Execution errors

## Limits

This is a diagnostic baseline on published contact directories, not a representative production benchmark or a deliverability check. Website/domain mismatches and missing candidate patterns require domain or candidate-generation changes. Use an independent holdout after tuning.
