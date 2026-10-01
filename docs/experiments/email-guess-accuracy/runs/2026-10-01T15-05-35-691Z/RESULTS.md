# Email guess accuracy results

Completed: 2026-10-01T15:05:35.737Z

Evaluated revision: `6587b5097f715dc96e7cea4b23fce0769fe15746`

This is a generated run report. Dataset totals and percentages describe this run only.

## Comparison with the previous expansion
Compared with the [previous pattern expansion](../2026-10-01T14-44-45-258Z/RESULTS.md) on the identical seed snapshot. Name normalization, pattern generation, and global ranking priorities changed; domains, seed inputs, and the top-10 limit did not.
| Metric | Previous expansion | Current run | Change |
| --- | --- | --- | --- |
| Top-1 | 2.77% (8/289) | 43.25% (125/289) | +40.48 percentage points |
| Top-3 | 37.37% (108/289) | 59.17% (171/289) | +21.80 percentage points |
| Top-5 | 47.75% (138/289) | 62.98% (182/289) | +15.22 percentage points |
| Top-10 | 60.21% (174/289) | 70.59% (204/289) | +10.38 percentage points |
| Candidate coverage | 60.21% (174/289) | 70.93% (205/289) | +10.73 percentage points |

### Changes measured

- Added `firstl`, `fl`, `initials`, `fmlast`, `first.l`, and `lastf` patterns. Initials include hyphen-separated given names and multiword names.
- Folded Unicode accents while retaining the previous ASCII spelling as a lower-priority alternative. Added hyphenated given-name spellings, explicitly parenthesized aliases, compound given names, and surname alternatives. Removed middle initials from the primary surname interpretation. Name overrides and outreach greetings are unchanged.
- Tuned global pattern scores toward given-name-only and first-initial/surname addresses, which had the most observed matches in the diagnostic seeds. Alternative name interpretations receive a score penalty. Duplicate name-pattern candidates retain the strongest score; notes and observed handles keep their precedence.

### Findings and tradeoffs

- Candidate coverage gained 31 cases. Top-10 gained 30 cases. No previous top-10 hit was lost.
- Seven previous top-1 hits moved lower, and one previous top-5 hit moved outside the first five. Those cases remain within the top ten. Global improvements do not mean every target improved.
- One generated correct address remains outside the top ten: `fsfe_ku`, with an ambiguous multiword surname. A supported name override is preferable to changing that input from the withheld answer.
- Execution errors remained zero. Missing domains and website/email-domain mismatches were unchanged; more patterns cannot repair those failures.
- Domain-macro top-1 increased from 0.56% to 34.70%; domain-macro top-10 increased from 46.53% to 50.64%.
- This is a tuning result on the inspected diagnostic dataset. The global priorities and new patterns were informed by these same seeds. An independent holdout across additional organizations is required before claiming generalization.

Detailed snapshots, source checksums, candidate orders, and comparison diagnostics are in the adjacent local-only `results.json`, which is ignored by Git. Only this Markdown report is tracked.

## Overall

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 43.25% (125/289) | 43.25% (125/289) |
| Top-3 | 59.17% (171/289) | 59.17% (171/289) |
| Top-5 | 62.98% (182/289) | 62.98% (182/289) |
| Top-10 | 70.59% (204/289) | 70.59% (204/289) |
| Candidate coverage | 70.93% (205/289) | 70.93% (205/289) |
| Suggestion coverage | 80.62% (233/289) | 80.62% (233/289) |

Baseline errors: 0; pipeline errors: 0.

## Input cohorts

### explicit_domain

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 58.33% (77/132) | 58.33% (77/132) |
| Top-3 | 71.21% (94/132) | 71.21% (94/132) |
| Top-5 | 78.03% (103/132) | 78.03% (103/132) |
| Top-10 | 89.39% (118/132) | 89.39% (118/132) |
| Candidate coverage | 90.15% (119/132) | 90.15% (119/132) |
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
| Top-1 | 46.60% (48/103) | 46.60% (48/103) |
| Top-3 | 74.76% (77/103) | 74.76% (77/103) |
| Top-5 | 76.70% (79/103) | 76.70% (79/103) |
| Top-10 | 83.50% (86/103) | 83.50% (86/103) |
| Candidate coverage | 83.50% (86/103) | 83.50% (86/103) |
| Suggestion coverage | 98.06% (101/103) | 98.06% (101/103) |

## Conditional ranking accuracy

Denominator: cases where the expected email was generated.

- Top-1: deterministic 60.98% (125/205); pipeline 60.98% (125/205).

- Top-3: deterministic 83.41% (171/205); pipeline 83.41% (171/205).

- Top-5: deterministic 88.78% (182/205); pipeline 88.78% (182/205).

- Top-10: deterministic 99.51% (204/205); pipeline 99.51% (204/205).

## Macro average across published email domains

Each answer domain receives equal weight. Domains are used for scoring groups only.

- Top-1: deterministic 34.70%; pipeline 34.70%.

- Top-3: deterministic 44.78%; pipeline 44.78%.

- Top-5: deterministic 46.50%; pipeline 46.50%.

- Top-10: deterministic 50.64%; pipeline 50.64%.

## Source breakdown

### afp

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 50.00% (1/2) | 50.00% (1/2) |
| Top-3 | 50.00% (1/2) | 50.00% (1/2) |
| Top-5 | 100.00% (2/2) | 100.00% (2/2) |
| Top-10 | 100.00% (2/2) | 100.00% (2/2) |
| Candidate coverage | 100.00% (2/2) | 100.00% (2/2) |
| Suggestion coverage | 100.00% (2/2) | 100.00% (2/2) |

### alliance

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 20.00% (2/10) | 20.00% (2/10) |
| Top-3 | 40.00% (4/10) | 40.00% (4/10) |
| Top-5 | 40.00% (4/10) | 40.00% (4/10) |
| Top-10 | 40.00% (4/10) | 40.00% (4/10) |
| Candidate coverage | 40.00% (4/10) | 40.00% (4/10) |
| Suggestion coverage | 60.00% (6/10) | 60.00% (6/10) |

### boardsource

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 58.57% (41/70) | 58.57% (41/70) |
| Top-3 | 70.00% (49/70) | 70.00% (49/70) |
| Top-5 | 71.43% (50/70) | 71.43% (50/70) |
| Top-10 | 78.57% (55/70) | 78.57% (55/70) |
| Candidate coverage | 78.57% (55/70) | 78.57% (55/70) |
| Suggestion coverage | 92.86% (65/70) | 92.86% (65/70) |

### cooley

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/9) | 0.00% (0/9) |
| Top-3 | 66.67% (6/9) | 66.67% (6/9) |
| Top-5 | 66.67% (6/9) | 66.67% (6/9) |
| Top-10 | 77.78% (7/9) | 77.78% (7/9) |
| Candidate coverage | 77.78% (7/9) | 77.78% (7/9) |
| Suggestion coverage | 100.00% (9/9) | 100.00% (9/9) |

### ct

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 80.00% (4/5) | 80.00% (4/5) |
| Top-3 | 80.00% (4/5) | 80.00% (4/5) |
| Top-5 | 80.00% (4/5) | 80.00% (4/5) |
| Top-10 | 80.00% (4/5) | 80.00% (4/5) |
| Candidate coverage | 80.00% (4/5) | 80.00% (4/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### eff

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 68.18% (45/66) | 68.18% (45/66) |
| Top-3 | 78.79% (52/66) | 78.79% (52/66) |
| Top-5 | 81.82% (54/66) | 81.82% (54/66) |
| Top-10 | 92.42% (61/66) | 92.42% (61/66) |
| Candidate coverage | 92.42% (61/66) | 92.42% (61/66) |
| Suggestion coverage | 100.00% (66/66) | 100.00% (66/66) |

### fenwick

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/5) | 0.00% (0/5) |
| Top-3 | 100.00% (5/5) | 100.00% (5/5) |
| Top-5 | 100.00% (5/5) | 100.00% (5/5) |
| Top-10 | 100.00% (5/5) | 100.00% (5/5) |
| Candidate coverage | 100.00% (5/5) | 100.00% (5/5) |
| Suggestion coverage | 100.00% (5/5) | 100.00% (5/5) |

### fsfe

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 25.00% (4/16) | 25.00% (4/16) |
| Top-3 | 50.00% (8/16) | 50.00% (8/16) |
| Top-5 | 68.75% (11/16) | 68.75% (11/16) |
| Top-10 | 75.00% (12/16) | 75.00% (12/16) |
| Candidate coverage | 81.25% (13/16) | 81.25% (13/16) |
| Suggestion coverage | 100.00% (16/16) | 100.00% (16/16) |

### ibm

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 0.00% (0/1) | 0.00% (0/1) |
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
| Top-3 | 87.50% (7/8) | 87.50% (7/8) |
| Top-5 | 87.50% (7/8) | 87.50% (7/8) |
| Top-10 | 100.00% (8/8) | 100.00% (8/8) |
| Candidate coverage | 100.00% (8/8) | 100.00% (8/8) |
| Suggestion coverage | 100.00% (8/8) | 100.00% (8/8) |

### w3c

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 56.00% (28/50) | 56.00% (28/50) |
| Top-3 | 68.00% (34/50) | 68.00% (34/50) |
| Top-5 | 76.00% (38/50) | 76.00% (38/50) |
| Top-10 | 90.00% (45/50) | 90.00% (45/50) |
| Candidate coverage | 90.00% (45/50) | 90.00% (45/50) |
| Suggestion coverage | 100.00% (50/50) | 100.00% (50/50) |

## Domain diagnostics

- matched: 224.

- mismatch: 9.

- missing_input: 54.

- rejected_website: 2.

## Short biographies

| Metric | Deterministic | Current pipeline |
| --- | --- | --- |
| Top-1 | 75.00% (3/4) | 75.00% (3/4) |
| Top-3 | 75.00% (3/4) | 75.00% (3/4) |
| Top-5 | 75.00% (3/4) | 75.00% (3/4) |
| Top-10 | 75.00% (3/4) | 75.00% (3/4) |
| Candidate coverage | 75.00% (3/4) | 75.00% (3/4) |
| Suggestion coverage | 100.00% (4/4) | 100.00% (4/4) |

## Reproduction

The adjacent local-only `results.json` contains the frozen seed snapshot, source checksums, runtime metadata, full generated candidates and per-case orders/ranks. Results can be recomputed from these case records without rerunning the pipeline.

## Limits

This is a diagnostic baseline on published contact directories, not a representative production benchmark or a deliverability check. Website/domain mismatches and missing candidate patterns require domain or candidate-generation changes. Use an independent holdout after tuning.
