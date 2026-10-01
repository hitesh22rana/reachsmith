# Email guess accuracy experiment

## Status

Production and the offline runner use deterministic ranking. Each completed run saves its results and reproducibility metadata under `runs/`.

## Objective

Measure how often the current email guesser returns a person's published work or institutional email at ranks 1, 3, 5 and 10. Separate failures to generate the correct candidate from failures to rank an available candidate highly enough.

Use real people with independently published answers. Synthetic people cannot establish guessing accuracy because they have no real address to compare against. Published addresses establish person-address association, not current deliverability or employment.

## Files and seed data

| File | Purpose |
| --- | --- |
| [seeds.json](seeds.json) | Curated evaluation cases from published sources |
| [schema.json](schema.json) | JSON Schema for the form-shaped target and withheld evidence |
| [EXPERIMENT.md](EXPERIMENT.md) | Objective, evaluation plan, source coverage and collection provenance |
| [run.ts](run.ts) | Offline runner and metric/answer-isolation self-check |
| `runs/<timestamp>/` | Generated results, frozen seeds and per-case diagnostics for each execution |

This folder keeps the seed data and schema alongside the experiment plan. Source provenance and collection methods are documented below.

The seed list can grow as more qualifying people are found. Calculate dataset sizes, cohort sizes and SHA-256 checksums from the actual files at execution time, and store them in the run results. Freeze the evaluated files for each run so later additions do not change its reported denominator.

Completed reports are stored in [runs/](runs/). Each report describes its own evaluated snapshot; results are not duplicated here.

## Sources

Each record retains its source URL and inspection date in `evidence`. Coverage below describes the collection approach, not a live inventory or an exhaustive list of people on each website.

| Source | Collection approach |
| --- | --- |
| [W3C](https://www.w3.org/staff/) | Staff cards with published contact details and biographies |
| [EFF](https://www.eff.org/about/staff) | Staff directory profiles with individual emails and qualifying bios |
| [FSFE](https://fsfe.org/about/people/index.en.html) | Published directory addresses paired with linked biographies |
| [Connecticut Garden Clubs](https://ctgardenclubs.org/club-corner/speakers-directory/) | Speaker directory contacts paired with linked personal biographies |
| [AFP Golden Gate](https://afpgoldengate.org/consultant-directory/) | Business-domain consultant contacts with personal biographies |
| [IBM Research](https://research.ibm.com/people) | Sampled research profiles with published emails and biographies |
| [IEEE EDS](https://eds.ieee.org/education/distinguished-lecturer-mini-colloquia-program/distinguished-lecturer-listing) | Lecturer cards, including their embedded biography modals |
| [BoardSource](https://boardsource.org/board-support/coaching-consulting/consultant-directory/) | Directory-linked consultant profiles with individual emails and biographies |
| [Alliance](https://www.acehp.org/Your-Community/Consultants-Directory/Consultants-Directory) | Sampled visible consultant entries and known profiles; later pages were not collected |
| [Cooley](https://www.cooley.com/people) | Sampled lawyer profiles with published emails and practice biographies |
| [Fenwick](https://www.fenwick.com/people) | Sampled lawyer profiles, including contact sidebars and practice biographies |
| [Orrick](https://www.orrick.com/en/People) | Sampled people-directory profiles with emails and professional biographies |

The sampled sources are not exhaustive. AAF and the San Diego Regional Chamber were also investigated but yielded no qualifying cases in the checked pages.

## Dataset contract and answer isolation

Each seed has three fields:

- `id`: stable evaluation case ID, never pipeline input.
- `target`: fields matching the current add/edit target form. `full_name` is the name input; `first_name` and `last_name` are optional edit-only overrides. `social_urls` is newline-separated text, not an array.
- `evidence`: source URL, evidence type, inspection date and optional collection notes. `official_directory` describes where the answer was published; it is not a value the guesser is expected to return.

`target.primary_email` is the expected answer. Before generating anything, remove `primary_email` and exclude the entire `evidence` object and case ID. Pass only the normal pipeline inputs. Never infer input domains, websites or name overrides from the withheld answer. Do not fetch source pages during evaluation, since they contain the answers.

Biographies contain no email addresses. Real social usernames and company website links remain legitimate form inputs. A username that resembles the answer is an observed signal, not a reason to manufacture or remove that input.

Unknown optional fields are omitted. Later batches require at least 40 words of actual biography or professional practice description. Some original W3C cards have shorter bios and remain in the seed list; report their results as short-bio cases rather than silently dropping them. Some FSFE profiles describe volunteers or contractors, so organization affiliation must not be reported as confirmed employment.

## Current pipeline to reuse

The implementation and [email accuracy feature contract](../../features/email-accuracy/SPEC.md) define the behavior being measured:

1. Map form fields to the worker's inputs. Split `social_urls` on newlines, trim entries and discard blank lines. Use [`nameParts()`](../../../lib/target-name.ts) with the full name and any published overrides.
2. Use [`resolveDomain()` and `rankCandidates()`](../../../lib/email-rank.ts). The explicit domain wins; otherwise only an eligible company website hostname supplies a provisional domain. The current resolver accepts only a two-label hostname after stripping `www`, with blocked hosts excluded. A company name or a social profile alone does not supply a domain.
3. Generate the supported name patterns and eligible handle candidates. Notes addresses can also be candidates in production, but the seed bios intentionally contain no answer addresses.
4. Keep the deterministic order.
5. Follow the [`email-guess` worker](../../../workers/email-guess.ts) selection order and top-10 limit. Evaluate fresh cases with no previously stored guesses.

The offline runner evaluates these existing functions. Database import, queue processing and application UI behavior are outside this first accuracy experiment. No SMTP probing or outreach is performed.

## Evaluation plan

### Input cohorts

| Cohort | Input behavior to measure |
| --- | --- |
| Explicit domain | Supplied domain, with no answer-derived changes |
| Website only | Existing website-domain resolution |
| Neither domain nor website | Current no-domain behavior, including no suggestions |

Derive cohort membership and counts from each run's seed file. Field presence does not establish successful domain resolution: the resolver may reject a supplied website, or accept a website domain that differs from the person's published email domain. Record rejected/missing domains and resolved-domain mismatches separately after execution. Preserve those cases in the overall denominator.

### Selected order

Evaluate the full deterministically ranked candidate set, then apply the worker's top-10 truncation. Keep the saved baseline as the comparison for later candidate-generation and ranking changes. The existing result format retains deterministic and pipeline columns, which currently use the same order.

### Metrics

Compare trimmed, case-insensitive email strings. Do not merge dots, plus tags, aliases or different domains. The seed's selected published address is the only accepted label, so an alternative valid alias can still count as a miss.

- **Top-k accuracy**, for `k = 1, 3, 5, 10`: cases with the expected address in the first `k` unique suggestions divided by cases in the reported cohort. Short lists are used as-is; empty lists are misses.
- **Candidate coverage**: cases whose expected address appears anywhere in the full generated set before truncation, divided by cases in the reported cohort. This is the accuracy ceiling achievable by ranking that set.
- **Suggestion coverage**: cases producing at least one suggestion divided by cases in the reported cohort.
- **Ranking accuracy conditional on candidate coverage**: top-k hits divided by cases where the expected address was generated. Report this alongside overall accuracy, not in place of it.
- **Execution errors**: counts and reasons. Never silently remove failed cases or treat a crashed case as successful abstention; report failures explicitly and retain them as non-hits in overall counts.

Report each metric as a numerator, denominator and percentage. Include overall results, each input cohort and each source. Also report a macro average across published email domains to reduce domination by large organizations; this uses answer domains only for scoring groups, never as guesser inputs, and is a proxy for organization balance rather than an exact company count. Known company labels can support additional breakdowns, with missing labels reported explicitly.

### Reproducibility and result records

At execution time, record the evaluated Git revision, seed and schema checksums, dataset and cohort sizes, source checksums, Node version and runtime/hardware details.

Save per-case resolved domain and its source, generated candidates, selected top ten, expected-answer ranks and any execution error. Expected answers remain scoring data, never pipeline input. Result artifacts make aggregate metrics reproducible from these records.

The first run is a diagnostic baseline, not a tuning set with a claimed independent test result. If its outcomes guide changes to patterns or ranking, collect a separate holdout from additional organizations before claiming generalization.

## Accuracy improvements to evaluate next

1. **Candidate coverage:** the first expansion adds first-initial plus surname without a separator (`flast`, such as `jdoe`), surname-only (`last`, such as `doe`), and first plus surname without a separator (`firstlast`, such as `janedoe`). These are observed omissions in the baseline. That expansion kept existing scores fixed. A later experiment adds initials, given-name-plus-initial, and reversed initial patterns, folds accents, and handles observed aliases and compound names. It also tunes global pattern priorities using the diagnostic seeds. Compare full-set coverage and top-10 accuracy separately so adding candidates does not hide truncation losses.
2. **Domain inputs:** collect independently supported company email domains where a website is absent or differs from the email domain. Keep the original baseline inputs frozen; never fill an evaluation input from its withheld answer.
3. **Name handling:** review misses involving accents, multiple surnames, initials and published aliases. Use independently observed name overrides; do not guess nicknames from the answer.
4. **Ranking:** evaluate organization-specific pattern evidence collected independently of the target answer. A larger candidate set alone cannot improve first-choice accuracy. Keep pattern-learning examples separate from scored targets, and test on additional organizations before claiming generalization.

Record candidate-generation and ranking changes explicitly and compare against the saved baseline. Keep the original baseline and seed inputs frozen when evaluating the pattern expansion.

## Limitations

- Some organizations contribute a larger share of the seed list than others. The sample favors people who publish both contact details and biographies; it does not represent all prospective outreach contacts.
- University departmental domains, consultants' personal business sites, aliases and website/email-domain differences may reveal failures outside ranking itself.
- Retrieval failures and short or missing biographies limit coverage of the sampled sources. Missing company labels prevent an exact organization count.
- `checked_on` is the inspection date. Some Firecrawl retries may serve recently cached content, and some biographies contain historical statements.
- Published addresses can be stale. This experiment measures agreement with published labels, not mailbox existence or delivery success.

## Preparation checks and handoff

Before execution, calculate and record the current file checksums and cohort counts, verify that all targets pass the existing form validation, IDs and case-insensitive expected addresses are unique, and input Notes contain no email addresses. These checks validate the seed package; they do not measure pipeline accuracy.

Run from the repository root using the installed dependencies:

```sh
node --experimental-strip-types --no-warnings docs/experiments/email-guess-accuracy/run.ts --selfcheck
node --experimental-strip-types --no-warnings docs/experiments/email-guess-accuracy/run.ts
```

The self-check exercises answer isolation, exact matching, denominator handling and macro averaging. The full run evaluates the deterministic production order and creates a new timestamped output directory. Postgres and Redis are not required for this offline experiment.

Each output directory contains a tracked `RESULTS.md` and a local-only `results.json`. Detailed JSON snapshots are ignored by Git to keep pull requests small. The JSON includes the frozen input snapshot, generated candidates, selected orders, answer ranks, execution errors and runtime/source checksums. Source breakdowns use the case-ID prefix before the underscore; use the source prefix consistently when adding seeds. Execution errors are retained in the report.


## Collection methods and provenance

Public directory pages and linked profiles were retrieved using Firecrawl and direct HTTPS fetching. Full-page collection was needed to retain email sidebars and hidden biography modals. The installed Firecrawl connector exposed no native batch scrape endpoint, so independent requests were run concurrently. Direct fetching and sequential retries recovered some connector failures; unavailable profiles were excluded from the sampled batches.

Structured extraction was checked against actual source HTML and links. An email returned by extraction but absent from the retrieved source was rejected. Published BoardSource email-protection values were decoded from the public HTML. No LinkedIn pages were fetched; explicitly published personal LinkedIn URLs are retained as references only.

Later batches exclude common personal email providers, generic/shared inboxes, association aliases, lecture descriptions and education sidebars presented as biographies. Empty or insufficient biographies are excluded. Conflicting affiliation and biography details were excluded where found. If a card lists multiple qualifying addresses, the seed retains a selected published address rather than duplicating the person.

Names, companies, websites and biographies come from explicit source content. Unknown fields are omitted. Partial affiliation labels are completed only from the person's own biography. Contact-office addresses are not assumed to be personal locations. Source wording and spelling are retained; whitespace and dash typography are normalized. Long biographies are excerpted to fit the form, and answer-bearing sentences are removed. Source-specific corrections and secondary biography links are retained in per-case evidence where recorded.

## Attribution and source licenses

Each `evidence.source_url` identifies the directory or profile used for that record. Secondary profile URLs, where applicable, are retained in `evidence_notes`. Biographies are copied or excerpted from the named publishers and individual profile authors; no blanket license is assumed for the combined dataset.

- **W3C:** material copied from or derived from the Staff page. Copyright © 2026 World Wide Web Consortium. See the [W3C document license](https://www.w3.org/copyright/document-license-2023/).
- **EFF:** attributed to the Electronic Frontier Foundation, Staff and Contributors. See the [copyright policy](https://www.eff.org/copyright) and [Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/).
- **FSFE:** attributed to the Free Software Foundation Europe and individual authors of linked biographies. Directory material is under [Creative Commons Attribution Share-Alike 4.0](https://creativecommons.org/licenses/by-sa/4.0/); see the [FSFE license policy](https://fsfe.org/about/license-policy.en.html). FSFE-derived material retains that license. External biographies are attributed to their own URLs; the directory license is not assumed to cover external sites.
- **Other sources:** attributed to Federated Garden Clubs of Connecticut, AFP Golden Gate, IBM Research, IEEE Electron Devices Society, BoardSource, Alliance for Continuing Education in the Health Professions, Cooley, Fenwick & West, Orrick, and the individual profile authors. Their source URLs appear above and in the corresponding evidence. No additional reuse license is inferred.

## Adding or correcting seeds

Use the existing schema and form fields. Require a published individual work or institutional email and enough actual biography to provide useful context. Keep the expected email and collection evidence out of input Notes. Preserve stable IDs and omit fields that cannot be established independently of the answer.

Keep source links and inspection dates with each case. When a new publisher is introduced, add its source and attribution here. Dataset and cohort totals belong in generated run results, so ordinary seed additions do not require updating this document.
