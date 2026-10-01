# Email guess accuracy experiment

## Status

Prepared for review on 2026-10-01. No experiment has been run, no accuracy results exist, and no evaluation runner is included yet. Execution starts only after the user reviews this setup and asks to proceed.

## Objective

Measure how often the current email guesser returns a person's published work or institutional email at ranks 1, 3, 5 and 10. Separate failures to generate the correct candidate from failures to rank an available candidate highly enough.

Use real people with independently published answers. Synthetic people cannot establish guessing accuracy because they have no real address to compare against. Published addresses establish person-address association, not current deliverability or employment.

## Files and snapshot

| File | Purpose |
| --- | --- |
| [seeds.json](seeds.json) | 289 evaluation cases copied unchanged from the local seed database |
| [schema.json](schema.json) | JSON Schema for the form-shaped target and withheld evidence |
| [EXPERIMENT.md](EXPERIMENT.md) | Objective, evaluation plan, source coverage and collection provenance |

This folder is the repository snapshot for the experiment. The original `.local/email-evals/` files remain unchanged and Git-ignored. This snapshot is tracked in Git as requested; it is not an import into the application database. Collection history below describes the earlier local collection, including its historical counts and local-only storage statements.

Snapshot checksums, SHA-256:

- `seeds.json`: `303185feb88e6c0957db9813694ac0731c3d70e6b51dc7d5a8a384dcb5f12066`
- `schema.json`: `8718cce220a332740fdb9e6e7dc171e167a67a0fd240565374406766401a4002`

Keep the initial snapshot fixed for the first run. Record a new checksum if later seed corrections or additions are made.

## Sources

Collected and inspected on 2026-10-01. Counts describe retained cases, not every person available on a source website.

| Source | Cases | Collection coverage |
| --- | ---: | --- |
| [W3C](https://www.w3.org/staff/) | 50 | All staff cards |
| [EFF](https://www.eff.org/about/staff) | 66 | 90 profiles inspected; published individual email and qualifying bio required |
| [FSFE](https://fsfe.org/about/people/index.en.html) | 16 | 52 published addresses; all 22 linked profile pages followed |
| [Connecticut Garden Clubs](https://ctgardenclubs.org/club-corner/speakers-directory/) | 5 | 52 cards inspected; 16 eligible linked profiles followed |
| [AFP Golden Gate](https://afpgoldengate.org/consultant-directory/) | 2 | 11 cards inspected; 9 eligible profiles followed |
| [IBM Research](https://research.ibm.com/people) | 1 | 11 profiles sampled |
| [IEEE EDS](https://eds.ieee.org/education/distinguished-lecturer-mini-colloquia-program/distinguished-lecturer-listing) | 47 | All 111 lecturer modals inspected |
| [BoardSource](https://boardsource.org/board-support/coaching-consulting/consultant-directory/) | 70 | All 108 directory profile links checked, plus two previously checked URL variants |
| [Alliance](https://www.acehp.org/Your-Community/Consultants-Directory/Consultants-Directory) | 10 | First 10 visible entries plus two known profiles; later pages not collected |
| [Cooley](https://www.cooley.com/people) | 9 | 17 profiles attempted; 15 retrieved |
| [Fenwick](https://www.fenwick.com/people) | 5 | 13 profiles attempted; 5 retrieved |
| [Orrick](https://www.orrick.com/en/People) | 8 | 13 profiles attempted; 10 retrieved |
| **Total** | **289** | **12 sources** |

AAF and the San Diego Regional Chamber were also investigated but contributed no qualifying cases. Detailed exclusions, attribution and source licenses are preserved in the collection history.

## Dataset contract and answer isolation

Each seed has three fields:

- `id`: stable evaluation case ID, never model context.
- `target`: fields matching the current add/edit target form. `full_name` is the name input; `first_name` and `last_name` are optional edit-only overrides. `social_urls` is newline-separated text, not an array.
- `evidence`: source URL, evidence type, inspection date and optional collection notes. `official_directory` describes where the answer was published; it is not a value the guesser is expected to return.

`target.primary_email` is the expected answer. Before generating or reranking anything, remove `primary_email` and exclude the entire `evidence` object and case ID. Pass only the normal pipeline inputs. Never infer input domains, websites or name overrides from the withheld answer. Do not fetch source pages during evaluation, since they contain the answers.

Biographies contain no email addresses. Real social usernames and company website links remain legitimate form inputs. A username that resembles the answer is an observed signal, not a reason to manufacture or remove that input.

Unknown optional fields are omitted. Later batches require at least 40 words of actual biography or professional practice description. Four original W3C cards have shorter bios and remain in the unchanged snapshot; report their results as short-bio cases rather than silently dropping them. Some FSFE profiles describe volunteers or contractors, so organization affiliation must not be reported as confirmed employment.

## Current pipeline to reuse

The implementation and [email accuracy feature contract](../../features/email-accuracy/SPEC.md) define the behavior being measured:

1. Map form fields to the worker's inputs. Split `social_urls` on newlines, trim entries and discard blank lines. Use [`nameParts()`](../../../lib/target-name.ts) with the full name and any published overrides.
2. Use [`resolveDomain()` and `rankCandidates()`](../../../lib/email-rank.ts). The explicit domain wins; otherwise only an eligible company website hostname supplies a provisional domain. The current resolver accepts only a two-label hostname after stripping `www`, with blocked hosts excluded. A company name or a social profile alone does not supply a domain.
3. Generate the six existing name patterns and eligible handle candidates. Notes addresses can also be candidates in production, but the seed bios intentionally contain no answer addresses.
4. The [`rankWithModel()`](../../../workers/email-rank-model.ts) stage may reorder the generated set. It cannot add missing candidates or repair a wrong domain. A null result uses the deterministic order.
5. Follow the [`email-guess` worker](../../../workers/email-guess.ts) selection order and top-10 limit. Evaluate fresh cases with no previously stored guesses.

Plan an offline evaluation of these existing functions. Database import, queue processing and application UI behavior are outside this first accuracy experiment. No runner, model loading, candidate generation, SMTP probing or outreach is performed in this preparation step.

## Evaluation plan, pending execution

### Input cohorts

| Cohort | Cases | Input behavior to measure |
| --- | ---: | --- |
| Explicit domain | 132 | Supplied domain, with no answer-derived changes |
| Website only | 103 | Existing website-domain resolution |
| Neither domain nor website | 54 | Current no-domain behavior, including no suggestions |

These are field-presence counts, not successful domain-resolution counts. The resolver may reject a supplied website, or accept a website domain that differs from the person's published email domain. Record rejected/missing domains and resolved-domain mismatches separately after execution. Preserve those cases in the overall denominator.

### Compared orders

- Deterministic baseline: the full existing ranked set, then the worker's top-10 truncation.
- Current pipeline: the same set reranked with the pinned Qwen model, using the current deterministic fallback behavior, then truncated to ten.

Use identical inputs in both paths. Record when reranking succeeds, falls back or is skipped because no candidates exist. Do not report an all-fallback run as measured model accuracy. If the model cannot be run, report only the deterministic baseline and mark the model comparison unavailable.

### Metrics

Compare trimmed, case-insensitive email strings. Do not merge dots, plus tags, aliases or different domains. The seed's selected published address is the only accepted label, so an alternative valid alias can still count as a miss.

- **Top-k accuracy**, for `k = 1, 3, 5, 10`: cases with the expected address in the first `k` unique suggestions divided by cases in the reported cohort. Short lists are used as-is; empty lists are misses.
- **Candidate coverage**: cases whose expected address appears anywhere in the full generated set before reranking or truncation, divided by cases in the reported cohort. This is the ceiling a reranker can achieve on that set.
- **Suggestion coverage**: cases producing at least one suggestion divided by cases in the reported cohort.
- **Ranking accuracy conditional on candidate coverage**: top-k hits divided by cases where the expected address was generated. Report this alongside overall accuracy, not in place of it.
- **Model fallback and execution errors**: counts and reasons. Never silently remove failed cases or treat a crashed case as successful abstention; report failures explicitly and retain them as non-hits in overall counts.

Report each metric as a numerator, denominator and percentage. Include overall results, each input cohort and each source. Also report a macro average across published email domains to reduce domination by large organizations; this uses answer domains only for scoring groups, never as guesser inputs, and is a proxy for organization balance rather than an exact company count. Known company labels can support additional breakdowns, with missing labels reported explicitly.

### Reproducibility and result records

At execution time, record the evaluated Git revision, seed checksum, Node version, model revision and quantization, model-file checksum and runtime/hardware details. The current model is `Qwen/Qwen2.5-0.5B-Instruct-GGUF`, `qwen2.5-0.5b-instruct-q4_k_m.gguf`, revision `9217f5db79a29953eb74d5343926648285ec7e67`, with temperature `0` and a `200`-token output limit. The preparation code revision is `4add704d7808e5f1c8e7b39be03507846b165139`; record the actual revision when the run starts.

Save per-case resolved domain and its source, generated candidates, deterministic and pipeline orders, selected top ten, expected-answer ranks, model outcome and any execution error. Expected answers remain scoring data, never prompt data. Future result artifacts should make aggregate metrics reproducible from these records.

The first run is a diagnostic baseline, not a tuning set with a claimed independent test result. If its outcomes guide changes to patterns or ranking, collect a separate holdout from additional organizations before claiming generalization.

## Limitations

- W3C, EFF and FSFE contribute 132 of 289 cases. The sample favors people who publish both contact details and biographies; it does not represent all prospective outreach contacts.
- University departmental domains, consultants' personal business sites, aliases and website/email-domain differences may reveal failures outside ranking itself.
- Retrieval failures and short or missing biographies limit coverage of the sampled sources. Missing company labels prevent an exact organization count.
- `checked_on` is the inspection date. Some Firecrawl retries may serve recently cached content, and some biographies contain historical statements.
- Published addresses can be stale. This experiment measures agreement with published labels, not mailbox existence or delivery success.

## Preparation checks and handoff

Before execution, verify that both JSON files still match the snapshot checksums, all targets pass the existing form validation, IDs and case-insensitive expected addresses are unique, and input Notes contain no email addresses. These checks validate the seed package; they do not measure pipeline accuracy.

Preparation is complete when this document and the unchanged 289-case snapshot are reviewable. The next step, after the user asks to proceed, is to implement the offline runner and execute the defined baseline and model comparison. Results remain **not run** until then.

## Collection history and attribution

The following notes are preserved from the local collection log. Earlier totals refer to intermediate snapshots. The dataset and cohort counts above describe this experiment's frozen snapshot.

### Archived seed-source log

#### W3C

Source: https://www.w3.org/staff/
Collected: 2026-10-01

Copyright © 2026 World Wide Web Consortium.
https://www.w3.org/copyright/document-license-2023/

This local dataset includes material copied from or derived from the W3C Staff page.

All 50 staff cards are included. Biographies are stored in target.notes with their inline links preserved. Social profile links are stored in target.social_urls as newline-separated form values. Company is W3C and the explicit-domain baseline uses w3.org. Name overrides are omitted so the normal full-name split is evaluated. Location is included only when the biography explicitly says where the person is based.

One role title was shortened to fit the form's 100-character limit; its complete text is retained in Notes. Example Person 14's role comes from an explicit statement in his biography.

The published address in target.primary_email is the expected answer. An evaluator must withhold primary_email and evidence from the guesser. Notes contain no email addresses. Published addresses establish association, not mailbox deliverability. These seeds cover one organization and are not a general accuracy benchmark. Website-domain accuracy should be measured separately with the explicit domain omitted.

#### Electronic Frontier Foundation

Source: https://www.eff.org/about/staff
Collected: 2026-10-01 through Firecrawl with maxAge: 0 (live fetch).

Attribution: Electronic Frontier Foundation, EFF's Staff and Contributors.
Copyright policy: https://www.eff.org/copyright
License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/

Inspected 90 directory profiles. Added 66 with a published individual email and at least 40 words of biography. Excluded 16 without published individual emails, 2 sharing majorgifts@eff.org, and 6 with biographies shorter than 40 words. The minimum is an inclusion rule for this batch, not a rule for the guesser.

Name, role, and biography come from each directory card; primary_email is the published address in that card's dedicated email field. The company domain is explicitly set to eff.org for this baseline. No profile URLs suitable for social_urls were found in the included directory bios, so this optional field is omitted for EFF. Each person's EFF profile URL is retained in evidence_notes; source_url points to the directory actually scraped. Locations and name overrides are omitted.

Biography links are preserved where they fit. Five long biographies required plain text; three of these also use only complete opening paragraphs to meet the form's 2,000-character limit. One biography contained an email-bearing sentence, which was removed to avoid answer leakage. Dash typography is normalized.

Validation: all 116 seed targets pass the existing target form validation; IDs and answer emails are unique. Every included EFF bio retains at least 40 words, and Notes contain no email addresses. The schema and existing W3C entries are preserved. No accuracy evaluation has been run.

#### Free Software Foundation Europe

Source: https://fsfe.org/about/people/index.en.html
Collected: 2026-10-01 through Firecrawl with maxAge: 0.
Attribution: Free Software Foundation Europe and the individual profile authors linked in each entry's evidence_notes.
Directory copyright: Copyright © 2001-2026 Free Software Foundation Europe.
Directory license: Creative Commons Attribution Share-Alike 4.0, https://creativecommons.org/licenses/by-sa/4.0/
Policy: https://fsfe.org/about/license-policy.en.html
External biographies are attributed to their individual source URLs; no FSFE license is assumed for external sites. FSFE-derived material remains under its source license.

Inspected 52 directory people with published individual addresses. Followed all 22 linked profile pages. Added 16 with at least 40 words of actual biography. Excluded 30 without a linked biography, 3 linked blog pages without a usable biography, and 3 profile links returning 404. This is a directory-linked batch; unlinked biographies were not searched for elsewhere. The team includes volunteers and contractors as well as employees; directory affiliation is retained in evidence_notes without inferring employment.

Firecrawl returned prompt-based JSON for the directory and profiles. The connector rejected a populated jsonOptions.schema at parameter validation, so extraction was audited against source HTML and links and mapped locally into the existing seed schema. Alexandria provider discovery also rejected valid URLs at connector validation. No whole Markdown extraction was needed.

Name, email and role use the audited directory fields. Notes use source biography excerpts of 40 to 150 words, with paragraph spacing and dash typography normalized. Gabriel Ku's email-bearing sentence was omitted. Example Person 1's original wording was restored after extraction changed it. Example Person 8 uses the opening paragraph; Example Person 3's excerpt omits the final sentence. Social URLs are verified personal account links, with share buttons and personal websites excluded. Location is included only for Example Person 9's explicit statement about living in Paris; the FSFE office address is not treated as Example Person 12's personal location. Name overrides are omitted. The baseline explicit domain is fsfe.org, and primary_email remains withheld evaluation evidence.

Validation: all 132 targets pass existing target form validation. IDs and expected emails are unique; FSFE Notes contain no email addresses. All previous 116 entries and schema.json are unchanged. No accuracy evaluation has been run. All files remain local and ignored by Git.

#### Parallel multi-source collection

Collected: 2026-10-01 using live Firecrawl fetches (maxAge: 0).
The installed connector exposes no batch scrape endpoint. All five directory pages were fetched concurrently; linked profiles were checked using concurrent scrape requests in groups of eight. This used the available scrape connector, rather than the native batch API. Structured JSON was checked against published HTML and actual links. One IBM email returned by extraction was absent from the source and was rejected.

Sources and coverage:

- AFP Golden Gate: https://afpgoldengate.org/consultant-directory/. Inspected 11 cards and followed 9 profiles with business-domain emails. Added Example Person 16 (Donor Boom) and Example Person 13 (Laguna Creek Consulting). Other checked entries described services rather than a usable personal biography, or did not publish a full individual name. Personal email providers were excluded before profile collection.
- Federated Garden Clubs of Connecticut: https://ctgardenclubs.org/club-corner/speakers-directory/. Inspected 52 cards and followed 16 profiles with non-generic addresses outside personal email providers. Added Example Person 11, Example Person 4, Example Person 10, Example Person 19 and Example Person 18. Other checked profiles had no qualifying 40-word biography. Personal-provider and shared addresses were excluded. Margery Winters' published business address was selected for checking instead of her personal address, but the linked page had no qualifying bio.
- AAF: https://www.aaf.org/Public/Public/Education-and-Resources/Club-Chapter-Management/Speaker_Directory_COM.aspx. Checked eight linked biography PDFs; all returned 404. Added zero. Other AAF company sites were not exhaustively searched.
- San Diego Regional Chamber: https://sdchamber.org/membership/speakers-bureau/. Followed websites for all three listed speakers. Added zero: presentation descriptions were not used as biographies, and the university biography link redirected to a profile-not-found page. Company websites were not exhaustively searched for deeper bios.
- IBM Research: https://research.ibm.com/people. Sampled the first ten directory-linked profiles plus the previously verified Example Person 17 example. Only Sikhar's checked profile had both a source-published individual email and qualifying biography. Added one; this is a sample, not a full IBM crawl.

Attribution: the directory publishers above and the individual profile authors listed in each seed's source_url. Each new biography is a short source excerpt of 40 to 150 words. Source wording and spelling are preserved; whitespace and dash typography are normalized. Sari's excerpt starts with her personal biography after the company introduction. JSON extraction missed some biographies or altered wording; the accepted text was taken directly from the matching source paragraphs.

These eight additions represent eight new company labels. Company websites come from explicit source links. The domain field is omitted for this batch so the evaluator can measure website-derived domain behavior; expected email domains were not copied into guesser inputs. Personal location is included only for Sikhar's explicit statement about being based in Bangalore; contact office addresses are omitted. Personal LinkedIn links were recorded where published; LinkedIn pages were not scraped. primary_email and evidence remain withheld evaluation labels.

Validation: all 140 targets pass existing target form validation. IDs and expected emails are unique, Notes contain no email addresses, and every addition has at least 40 bio words. The previous 132 records and schema.json are unchanged. No evals were run. Only seeds.json, schema.json and SOURCE.md are retained in this Git-ignored local directory.

#### Six additional sources

Collected: 2026-10-01. Added 149 records, bringing the local seed list to 289.

| Source | Coverage | Added |
| --- | --- | ---: |
| IEEE Electron Devices Society | All 111 lecturer biography modals in https://eds.ieee.org/education/distinguished-lecturer-mini-colloquia-program/distinguished-lecturer-listing | 47 |
| BoardSource | All 108 directory profile links in https://boardsource.org/board-support/coaching-consulting/consultant-directory/, plus two previously checked URL variants | 70 |
| Alliance for Continuing Education in the Health Professions | First 10 visible entries in https://www.acehp.org/Your-Community/Consultants-Directory/Consultants-Directory, plus Example Person 5 and Example Person 15 | 10 |
| Cooley | 15 initially visible directory links in https://www.cooley.com/people, plus Jamie Leigh and Albert Y. Kim; 15 of these 17 pages retrieved | 9 |
| Fenwick | 12 initially visible directory links in https://www.fenwick.com/people, plus Molly Melcher; 5 of these 13 pages retrieved | 5 |
| Orrick | 12 links under the directory's A filter, https://www.orrick.com/People?t=personnel&l=a, plus Victoria Boyne; 10 of these 13 pages retrieved | 8 |

This is complete directory-linked collection for BoardSource and IEEE, and an initial sample for the other four sources. Retrieval failures in the law-firm samples were excluded. The Alliance directory is paginated; later result pages were not collected. The law-firm directories contain many more people than this sample.

Method: directory pages were fetched concurrently through Firecrawl with onlyMainContent: false and maxAge: 0, including contact sidebars and hidden biography modals. Initial concurrent profile fetches returned many connector INVALID_ARGUMENT errors. Direct HTTPS fetching recovered BoardSource and Alliance profiles; sequential Firecrawl retries recovered additional law-firm pages. Retries omitted maxAge and may return recently cached content. Consequently checked_on is the date source content was inspected, not a guarantee of a fresh origin fetch for every profile. No native batch API was exposed by the installed connector. No LinkedIn pages were fetched.

Every addition has a published individual address outside common personal email providers and at least 40 words of actual biography or professional practice description. Lecture descriptions, education sidebars, empty or short biographies, generic/shared inboxes, and personal or IEEE alias addresses were excluded. Where an IEEE card publishes several addresses, only the first qualifying business or institutional address is included, so one person does not become multiple evaluation cases. Two IEEE cards with conflicting affiliation and biography information were excluded. BoardSource email protection values were decoded from the public HTML, not inferred. Duplicate profiles were deduplicated by case ID and expected address.

Attribution: IEEE Electron Devices Society, BoardSource, Alliance for Continuing Education in the Health Professions, Cooley, Fenwick & West, Orrick, and the individual profile authors. Each evidence.source_url identifies the retrieved directory or profile containing the email and biography. Notes contain short source excerpts, up to 150 words and within the form's 2,000-character limit. Whitespace and dash typography are normalized; source spelling is retained. Lecture text preceding Example Person 7's biography and an incomplete trailing sentence in Example Person 2's biography were omitted. Example Person 6's person name comes from her biography rather than the DMGroupConsulting profile heading. Credentials were removed from three name headings. No license is inferred for these sources.

Company names are populated only where explicitly published in the affiliation or biography; partial IEEE affiliations are completed from that person's biography. Unknown roles, personal locations and name overrides are omitted. Company websites use explicitly published links, with the law firms' own sites used for their employees. A malformed Alliance link containing two public URLs was split into its website and LinkedIn references. No domain is copied from an expected address into guesser inputs.

Of these 149 additions, 95 have a published website and 54 lack both a company website and explicit domain. Evaluate these groups separately: the current deterministic guesser cannot generate company-domain patterns without a usable domain input. Website domains can differ from email domains, including departmental university domains and Microsoft tenant domains. IEEE biographies may retain historical statements; published association is not proof of current employment or deliverability.

Validation: all 289 targets pass existing target form validation and the local JSON schema constraints. Case IDs and expected emails are unique, and every addition has at least 40 biography words with no email addresses in Notes. All previous 140 records and schema.json are unchanged. primary_email and evidence must be withheld from the guesser. No accuracy evals were run. Only seeds.json, schema.json and SOURCE.md are retained locally and ignored by Git.
