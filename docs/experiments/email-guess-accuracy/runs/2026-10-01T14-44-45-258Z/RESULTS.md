# Email guess accuracy results

Completed: 2026-10-01T14:44:45.297Z

Evaluated revision: `52109471401eb338f4cb24212dc81442accf5733`

This is a generated run report. Dataset totals and percentages describe this run only.

## Comparison with the original baseline
Compared with the [retained baseline](../2026-10-01T13-57-47-762Z/RESULTS.md) on the identical seed snapshot. The three new patterns were appended after the existing pattern scores; domain inputs, name handling, notes, handles, and the top-10 limit were unchanged.
| Metric | Original baseline | Expanded patterns | Change |
| --- | --- | --- | --- |
| Top-1 | 2.77% (8/289) | 2.77% (8/289) | +0.00 percentage points |
| Top-3 | 37.37% (108/289) | 37.37% (108/289) | +0.00 percentage points |
| Top-5 | 47.75% (138/289) | 47.75% (138/289) | +0.00 percentage points |
| Top-10 | 47.75% (138/289) | 60.21% (174/289) | +12.46 percentage points |
| Candidate coverage | 47.75% (138/289) | 60.21% (174/289) | +12.46 percentage points |

### Findings

- Newly covered addresses: 36, comprising 29 `flast`, 6 `last`, and 1 `firstlast` cases. Their selected ranks were 7 through 9.
- No previously matched address received a worse selected rank. No generated correct address was lost to top-10 truncation. Execution errors remained zero.
- Top-1, top-3 and top-5 remained unchanged. This expansion improves the candidate set; choosing the best address still needs a separate ranking experiment.
- With a matching input domain, candidate coverage reached 77.68% (174/224), leaving 50 missing addresses to inspect for name handling or other patterns. Missing/rejected domains and domain mismatches remained unchanged.
- Domain-macro top-10 accuracy rose from 35.43% to 46.53%. Website-only top-10 rose from 47.57% to 72.82%; explicit-domain top-10 rose from 67.42% to 75.00%.
- These patterns were selected after inspecting the original baseline. The improvement is measured on that diagnostic dataset; an independent organizational holdout is needed before claiming accuracy on new contacts.


## Overall

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 2.77% (8/289) | 2.77% (8/289) |
| Top-3 | 37.37% (108/289) | 37.37% (108/289) |
| Top-5 | 47.75% (138/289) | 47.75% (138/289) |
| Top-10 | 60.21% (174/289) | 60.21% (174/289) |
| Candidate coverage | 60.21% (174/289) | 60.21% (174/289) |
| Suggestion coverage | 80.62% (233/289) | 80.62% (233/289) |

Baseline errors: 0; pipeline errors: 0.

## Input cohorts

### explicit_domain

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 5.30% (7/132) | 5.30% (7/132) |
| Top-3 | 46.21% (61/132) | 46.21% (61/132) |
| Top-5 | 67.42% (89/132) | 67.42% (89/132) |
| Top-10 | 75.00% (99/132) | 75.00% (99/132) |
| Candidate coverage | 75.00% (99/132) | 75.00% (99/132) |
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
| Top-10 | 72.82% (75/103) | 72.82% (75/103) |
| Candidate coverage | 72.82% (75/103) | 72.82% (75/103) |
| Suggestion coverage | 98.06% (101/103) | 98.06% (101/103) |

## Conditional ranking accuracy

Denominator: cases where the expected email was generated.

- Top-1: deterministic 4.60% (8/174); pipeline 4.60% (8/174).

- Top-3: deterministic 62.07% (108/174); pipeline 62.07% (108/174).

- Top-5: deterministic 79.31% (138/174); pipeline 79.31% (138/174).

- Top-10: deterministic 100.00% (174/174); pipeline 100.00% (174/174).

## Macro average across published email domains

Each answer domain receives equal weight. Domains are used for scoring groups only.

- Top-1: deterministic 0.56%; pipeline 0.56%.

- Top-3: deterministic 33.45%; pipeline 33.45%.

- Top-5: deterministic 35.43%; pipeline 35.43%.

- Top-10: deterministic 46.53%; pipeline 46.53%.

## Source breakdown

### afp

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/2) | 0.00% (0/2) |
| Top-3 | 0.00% (0/2) | 0.00% (0/2) |
| Top-5 | 50.00% (1/2) | 50.00% (1/2) |
| Top-10 | 100.00% (2/2) | 100.00% (2/2) |
| Candidate coverage | 100.00% (2/2) | 100.00% (2/2) |
| Suggestion coverage | 100.00% (2/2) | 100.00% (2/2) |

### alliance

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/10) | 0.00% (0/10) |
| Top-3 | 20.00% (2/10) | 20.00% (2/10) |
| Top-5 | 20.00% (2/10) | 20.00% (2/10) |
| Top-10 | 40.00% (4/10) | 40.00% (4/10) |
| Candidate coverage | 40.00% (4/10) | 40.00% (4/10) |
| Suggestion coverage | 60.00% (6/10) | 60.00% (6/10) |

### boardsource

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/70) | 0.00% (0/70) |
| Top-3 | 57.14% (40/70) | 57.14% (40/70) |
| Top-5 | 58.57% (41/70) | 58.57% (41/70) |
| Top-10 | 72.86% (51/70) | 72.86% (51/70) |
| Candidate coverage | 72.86% (51/70) | 72.86% (51/70) |
| Suggestion coverage | 92.86% (65/70) | 92.86% (65/70) |

### cooley

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/9) | 0.00% (0/9) |
| Top-3 | 0.00% (0/9) | 0.00% (0/9) |
| Top-5 | 0.00% (0/9) | 0.00% (0/9) |
| Top-10 | 55.56% (5/9) | 55.56% (5/9) |
| Candidate coverage | 55.56% (5/9) | 55.56% (5/9) |
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
| Top-10 | 81.82% (54/66) | 81.82% (54/66) |
| Candidate coverage | 81.82% (54/66) | 81.82% (54/66) |
| Suggestion coverage | 100.00% (66/66) | 100.00% (66/66) |

### fenwick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/5) | 0.00% (0/5) |
| Top-3 | 0.00% (0/5) | 0.00% (0/5) |
| Top-5 | 0.00% (0/5) | 0.00% (0/5) |
| Top-10 | 40.00% (2/5) | 40.00% (2/5) |
| Candidate coverage | 40.00% (2/5) | 40.00% (2/5) |
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
| Top-10 | 75.00% (6/8) | 75.00% (6/8) |
| Candidate coverage | 75.00% (6/8) | 75.00% (6/8) |
| Suggestion coverage | 100.00% (8/8) | 100.00% (8/8) |

### w3c

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/50) | 0.00% (0/50) |
| Top-3 | 10.00% (5/50) | 10.00% (5/50) |
| Top-5 | 62.00% (31/50) | 62.00% (31/50) |
| Top-10 | 70.00% (35/50) | 70.00% (35/50) |
| Candidate coverage | 70.00% (35/50) | 70.00% (35/50) |
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
  "started_at": "2026-10-01T14:44:45.258Z",
  "git_revision": "52109471401eb338f4cb24212dc81442accf5733",
  "tracked_changes_at_start": "",
  "seeds_sha256": "303185feb88e6c0957db9813694ac0731c3d70e6b51dc7d5a8a384dcb5f12066",
  "schema_sha256": "8718cce220a332740fdb9e6e7dc171e167a67a0fd240565374406766401a4002",
  "source_sha256": {
    "lib/email-patterns.ts": "54cc863c1f489738269dc8805c1cfeae33a0f9cca90334a3d38e87db289dc2b8",
    "lib/email-rank.ts": "de09d476d521cea9c1c6ceefcc1300be49cd88b7e870787dffec8238579ebe6e",
    "lib/target-name.ts": "e293553a6e911bd623122c215750b2340fbbfe435dc5a792ec9bcccbf7e43106",
    "workers/email-guess.ts": "483b27a136e9eb452cf288e6ca0330af390947ef7e0ab36b94be48b0e8b435e1",
    "features/targets/validation.ts": "bfc88d1b9be294440f86375b1f52ef6b67e0d434534df3b72d94ea498f7f1f53",
    "package.json": "a33c69acd487957b33367f1ce103ad7e03ad867c1fbc1be11d75a83b7b5e9235",
    "pnpm-lock.yaml": "7958dba45da0c221e4d14eef76e8107f4a90257d64e3124a58c762d0b1b156a8",
    "docs/experiments/email-guess-accuracy/run.ts": "516c44ef05945e7c939726e2e7ed3ba41fc1fc1e00e2e3ea40f4498342fc25b1"
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
  "completed_at": "2026-10-01T14:44:45.297Z",
  "elapsed_ms": 39
}
```

## Limits

This is a diagnostic baseline on published contact directories, not a representative production benchmark or a deliverability check. Website/domain mismatches and missing candidate patterns require domain or candidate-generation changes. Use an independent holdout after tuning.
