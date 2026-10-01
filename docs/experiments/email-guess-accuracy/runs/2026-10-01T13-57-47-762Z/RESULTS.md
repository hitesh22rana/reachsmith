# Email guess accuracy results

Completed: 2026-10-01T14:07:57.915Z

Evaluated revision: `cb0c48df24344d8490a3d2fc342dcd27e819acba`

This report retains the deterministic baseline from the original execution. Inference artifacts were removed during cleanup; the original timestamps and revision describe that execution, not a new run. Dataset totals and percentages describe this run only.

## Findings from this run

- The correct published address entered the candidate set in 47.75% of cases. Ranking alone cannot raise top-10 accuracy above that candidate coverage on these inputs.
- Missing or rejected domain inputs prevented suggestions in 56 cases. In another 9 cases, the resolved website domain differed from the published email domain. These remain in the overall denominator.
- With a matching domain, 86 published addresses were still absent from the candidate set. Of these, 29 matched first-initial plus surname without a separator, 6 were surname-only, and 1 matched first-name plus surname without a separator. The remaining addresses require further examination of aliases or name handling. These categories are scoring diagnostics only; no candidate patterns were changed.
- Among cases where the correct address was generated, top-1 accuracy was 5.80%. Both candidate generation and ranking need attention. Adding missing domains to seeds would create a separate input condition; it would not be an improvement to this measured pipeline.

The aggregate scores and domain macro averages were independently recomputed and verified before the report was finalized. This analysis concerns this completed run; future runs calculate their own sizes and metrics.

## Overall

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 2.77% (8/289) | 2.77% (8/289) |
| Top-3 | 37.37% (108/289) | 37.37% (108/289) |
| Top-5 | 47.75% (138/289) | 47.75% (138/289) |
| Top-10 | 47.75% (138/289) | 47.75% (138/289) |
| Candidate coverage | 47.75% (138/289) | 47.75% (138/289) |
| Suggestion coverage | 80.62% (233/289) | 80.62% (233/289) |



## Input cohorts

### explicit_domain

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 5.30% (7/132) | 5.30% (7/132) |
| Top-3 | 46.21% (61/132) | 46.21% (61/132) |
| Top-5 | 67.42% (89/132) | 67.42% (89/132) |
| Top-10 | 67.42% (89/132) | 67.42% (89/132) |
| Candidate coverage | 67.42% (89/132) | 67.42% (89/132) |
| Suggestion coverage | 100.00% (132/132) | 100.00% (132/132) |

### missing_domain_input

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/54) | 0.00% (0/54) |
| Top-3 | 0.00% (0/54) | 0.00% (0/54) |
| Top-5 | 0.00% (0/54) | 0.00% (0/54) |
| Top-10 | 0.00% (0/54) | 0.00% (0/54) |
| Candidate coverage | 0.00% (0/54) | 0.00% (0/54) |
| Suggestion coverage | 0.00% (0/54) | 0.00% (0/54) |

### website_only

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.97% (1/103) | 0.97% (1/103) |
| Top-3 | 45.63% (47/103) | 45.63% (47/103) |
| Top-5 | 47.57% (49/103) | 47.57% (49/103) |
| Top-10 | 47.57% (49/103) | 47.57% (49/103) |
| Candidate coverage | 47.57% (49/103) | 47.57% (49/103) |
| Suggestion coverage | 98.06% (101/103) | 98.06% (101/103) |

## Conditional ranking accuracy

Denominator: cases where the expected email was generated.

- Top-1: deterministic 5.80% (8/138); pipeline 5.80% (8/138).

- Top-3: deterministic 78.26% (108/138); pipeline 78.26% (108/138).

- Top-5: deterministic 100.00% (138/138); pipeline 100.00% (138/138).

- Top-10: deterministic 100.00% (138/138); pipeline 100.00% (138/138).

## Macro average across published email domains

Each answer domain receives equal weight. Domains are used for scoring groups only.

- Top-1: deterministic 0.56%; pipeline 0.56%.

- Top-3: deterministic 33.45%; pipeline 33.45%.

- Top-5: deterministic 35.43%; pipeline 35.43%.

- Top-10: deterministic 35.43%; pipeline 35.43%.

## Source breakdown

### afp

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/2) | 0.00% (0/2) |
| Top-3 | 0.00% (0/2) | 0.00% (0/2) |
| Top-5 | 50.00% (1/2) | 50.00% (1/2) |
| Top-10 | 50.00% (1/2) | 50.00% (1/2) |
| Candidate coverage | 50.00% (1/2) | 50.00% (1/2) |
| Suggestion coverage | 100.00% (2/2) | 100.00% (2/2) |

### alliance

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/10) | 0.00% (0/10) |
| Top-3 | 20.00% (2/10) | 20.00% (2/10) |
| Top-5 | 20.00% (2/10) | 20.00% (2/10) |
| Top-10 | 20.00% (2/10) | 20.00% (2/10) |
| Candidate coverage | 20.00% (2/10) | 20.00% (2/10) |
| Suggestion coverage | 60.00% (6/10) | 60.00% (6/10) |

### boardsource

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/70) | 0.00% (0/70) |
| Top-3 | 57.14% (40/70) | 57.14% (40/70) |
| Top-5 | 58.57% (41/70) | 58.57% (41/70) |
| Top-10 | 58.57% (41/70) | 58.57% (41/70) |
| Candidate coverage | 58.57% (41/70) | 58.57% (41/70) |
| Suggestion coverage | 92.86% (65/70) | 92.86% (65/70) |

### cooley

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/9) | 0.00% (0/9) |
| Top-3 | 0.00% (0/9) | 0.00% (0/9) |
| Top-5 | 0.00% (0/9) | 0.00% (0/9) |
| Top-10 | 0.00% (0/9) | 0.00% (0/9) |
| Candidate coverage | 0.00% (0/9) | 0.00% (0/9) |
| Suggestion coverage | 100.00% (9/9) | 100.00% (9/9) |

### ct

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/5) | 0.00% (0/5) |
| Top-3 | 80.00% (4/5) | 80.00% (4/5) |
| Top-5 | 80.00% (4/5) | 80.00% (4/5) |
| Top-10 | 80.00% (4/5) | 80.00% (4/5) |
| Candidate coverage | 80.00% (4/5) | 80.00% (4/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### eff

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 6.06% (4/66) | 6.06% (4/66) |
| Top-3 | 72.73% (48/66) | 72.73% (48/66) |
| Top-5 | 72.73% (48/66) | 72.73% (48/66) |
| Top-10 | 72.73% (48/66) | 72.73% (48/66) |
| Candidate coverage | 72.73% (48/66) | 72.73% (48/66) |
| Suggestion coverage | 100.00% (66/66) | 100.00% (66/66) |

### fenwick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/5) | 0.00% (0/5) |
| Top-3 | 0.00% (0/5) | 0.00% (0/5) |
| Top-5 | 0.00% (0/5) | 0.00% (0/5) |
| Top-10 | 0.00% (0/5) | 0.00% (0/5) |
| Candidate coverage | 0.00% (0/5) | 0.00% (0/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### fsfe

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 18.75% (3/16) | 18.75% (3/16) |
| Top-3 | 50.00% (8/16) | 50.00% (8/16) |
| Top-5 | 62.50% (10/16) | 62.50% (10/16) |
| Top-10 | 62.50% (10/16) | 62.50% (10/16) |
| Candidate coverage | 62.50% (10/16) | 62.50% (10/16) |
| Suggestion coverage | 100.00% (16/16) | 100.00% (16/16) |

### ibm

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 100.00% (1/1) | 100.00% (1/1) |
| Top-3 | 100.00% (1/1) | 100.00% (1/1) |
| Top-5 | 100.00% (1/1) | 100.00% (1/1) |
| Top-10 | 100.00% (1/1) | 100.00% (1/1) |
| Candidate coverage | 100.00% (1/1) | 100.00% (1/1) |
| Suggestion coverage | 100.00% (1/1) | 100.00% (1/1) |

### ieee

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/47) | 0.00% (0/47) |
| Top-3 | 0.00% (0/47) | 0.00% (0/47) |
| Top-5 | 0.00% (0/47) | 0.00% (0/47) |
| Top-10 | 0.00% (0/47) | 0.00% (0/47) |
| Candidate coverage | 0.00% (0/47) | 0.00% (0/47) |
| Suggestion coverage | 0.00% (0/47) | 0.00% (0/47) |

### orrick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/8) | 0.00% (0/8) |
| Top-3 | 0.00% (0/8) | 0.00% (0/8) |
| Top-5 | 0.00% (0/8) | 0.00% (0/8) |
| Top-10 | 0.00% (0/8) | 0.00% (0/8) |
| Candidate coverage | 0.00% (0/8) | 0.00% (0/8) |
| Suggestion coverage | 100.00% (8/8) | 100.00% (8/8) |

### w3c

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/50) | 0.00% (0/50) |
| Top-3 | 10.00% (5/50) | 10.00% (5/50) |
| Top-5 | 62.00% (31/50) | 62.00% (31/50) |
| Top-10 | 62.00% (31/50) | 62.00% (31/50) |
| Candidate coverage | 62.00% (31/50) | 62.00% (31/50) |
| Suggestion coverage | 100.00% (50/50) | 100.00% (50/50) |

## Domain diagnostics

- matched: 224.

- mismatch: 9.

- missing_input: 54.

- rejected_website: 2.

## Short biographies

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/4) | 0.00% (0/4) |
| Top-3 | 25.00% (1/4) | 25.00% (1/4) |
| Top-5 | 75.00% (3/4) | 75.00% (3/4) |
| Top-10 | 75.00% (3/4) | 75.00% (3/4) |
| Candidate coverage | 75.00% (3/4) | 75.00% (3/4) |
| Suggestion coverage | 100.00% (4/4) | 100.00% (4/4) |

## Reproduction

Re-run the evaluated Git revision with the recorded input checksums. Only this final report is retained.

```json
{
  "started_at": "2026-10-01T13:57:47.762Z",
  "git_revision": "cb0c48df24344d8490a3d2fc342dcd27e819acba",
  "tracked_changes_at_start": "",
  "seeds_sha256": "303185feb88e6c0957db9813694ac0731c3d70e6b51dc7d5a8a384dcb5f12066",
  "schema_sha256": "8718cce220a332740fdb9e6e7dc171e167a67a0fd240565374406766401a4002",
  "source_sha256": {
    "lib/email-patterns.ts": "54a3d3cbf7e735fbd66382b5fd5ddeb7aa009593a56b8a79963fb29910434c71",
    "lib/email-rank.ts": "2a6fddb4458d7037f71562d303565d3242375cfa63bd376838dd4fed990be576",
    "lib/target-name.ts": "e293553a6e911bd623122c215750b2340fbbfe435dc5a792ec9bcccbf7e43106",
    "workers/email-guess.ts": "7c24ea4b24efbb0010332dbc30588fdec150a56c9dbfc6cae66804c12a0b27f7",
    "features/targets/validation.ts": "bfc88d1b9be294440f86375b1f52ef6b67e0d434534df3b72d94ea498f7f1f53",
    "package.json": "9c9c0965f060723925d67a9e27b6010bbfde65056807c4a89819212df0713b0e",
    "pnpm-lock.yaml": "676e04fd881c4be700f81242c61a7ce70538c0894066b376b7fe2a9d395e5695",
    "docs/experiments/email-guess-accuracy/run.ts": "d43345b7c78efefb3b089b429bdcf400e84f64ef979a3701d29953a30949d738"
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
  "suggestion_limit": 10,
  "completed_at": "2026-10-01T14:07:57.915Z",
  "elapsed_ms": 610153
}
```

## Limits

This is a diagnostic baseline on published contact directories, not a representative production benchmark or a deliverability check. Website/domain mismatches and missing candidate patterns require domain or candidate-generation changes. Use an independent holdout after tuning.
