# The 3rd Academy Inc.

# Start Here: Day 1 Data Capture Package for Implementation

**Table 0.1. Package control**

| No. | Item | Value |
|---|---|---|
| 0.1.1 | Package | T3A-DEV-DAY1-001 Hans Package, Version 1.3 |
| 0.1.2 | Date | 18 October 2026 |
| 0.1.3 | To | Hans Ade, Lead Platform Developer, Pixelways Solutions Inc. |
| 0.1.4 | From | Dr. Tony Mofoke, Founder and Chief Executive Officer |
| 0.1.5 | Instruction status | IMPLEMENT AS SPECIFIED |
| 0.1.6 | Classification | Trade secret. Founder and developer only |


## 1. What This Package Is

1.1. This folder is one complete implementation package. It instructs you to build Day 1 data capture across the whole platform: the field dictionary, data separation, event logging, privacy and security controls, reconciliation against your existing database, and the acceptance tests.

1.2. No reply from The 3rd Academy is required or will be sent during execution. Where something cannot be decided from the package, fail the affected route closed, record it in the conflict register with the default applied, and continue every other part of the build.


## 2. Files in This Package


**Table 2.1. Contents and role of each file**

| No. | File | Role |
|---|---|---|
| 2.1.1 | 00_START_HERE.md and 00_START_HERE.docx | This note |
| 2.1.2 | T3A-DEV-DAY1-001_Day1_Data_Capture_Build_Package_v1.3.md | The governing instruction. Read this one when executing |
| 2.1.3 | T3A-DEV-DAY1-001_Day1_Data_Capture_Build_Package_v1.3.docx | Identical content formatted for people. Not an execution input |
| 2.1.4 | T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json | Machine readable dictionary: fields, prohibited items, events, acceptance tests. Load it into the field registry (paragraph 6.3 of the instruction) |
| 2.1.5 | T3A-DEV-DAY1-001_Field_Dictionary_v1.3.md and .docx | The same dictionary for people: all 600 fields and 122 events. Not an execution input |
| 2.1.6 | tools/check_dictionary.py | Structural and semantic check of the JSON plus pinned definitions (reference/field_definition_pins_v1.3.json); a failure blocks the registry load |
| 2.1.7 | tools/check_forbidden_identifiers.py | The continuous integration check for DT-02, with exact exclusions and a scanned file manifest |
| 2.1.8 | tools/check_records.py | Validates one event or one dormant sidecar row: formats, required, optional and conditional keys (DT-23, DT-49, DT-65) |
| 2.1.9 | tools/verify_manifest.py | Ed25519 signature check (DT-41); malformed input is refused, never a crash |
| 2.1.10 | tools/acceptance_report.py | Checks the acceptance results file: evidence must be specific to each test and name the build; UNRUN is never counted as PASS |
| 2.1.11 | tools/test_tools.py | Regression tests for every tool |
| 2.1.12 | tests/acceptance_manifest.json | Every test with the repository material it needs, and the results file format |
| 2.1.13 | test/keys and test/fixtures | Synthetic test key pair, signed fixtures, and a full and a minimal valid example of every event, test only |
| 2.1.14 | mapping/T3A-DEV-DAY1-001_Reconciliation_Mapping_Template_v1.3.csv | One row per dictionary field; fill it during reconciliation steps R1 to R6 (Section 9) |
| 2.1.15 | reference/000_inventory_read_only_postgresql.sql | Read only structural inventory for step R1 where the database is PostgreSQL |
| 2.1.16 | reference/001_reference_patterns_postgresql.sql | Reference patterns: append only trigger, idempotency registry, optional dormant lsa sidecar. Adapt; not a mandatory schema |
| 2.1.17 | reference/jsonschema/ | Event envelope schema, the per event payload registry, and the allowlisted lsa sidecar schema |
| 2.1.18 | package_manifest.json and sha256sums.txt | File list and integrity hashes |


## 3. Precedence

3.1. The Markdown instruction governs. The Word file carries the same content for reading. The JSON is generated from the same source; where it differs from the Markdown, build to the Markdown and record the difference in the conflict register as a documentation defect.

3.2. The tools, the mapping template, the reference scripts and the schemas are aids. They add no rule. Where any of them differs from the instruction, the instruction governs.


## 4. How to Run


**Table 4.1. Run order**

| No. | Step | Command or action |
|---|---|---|
| 4.1.1 | Verify integrity | sha256sum -c sha256sums.txt |
| 4.1.2 | Check the dictionary | python3 tools/check_dictionary.py T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json |
| 4.1.3 | Check the tools | python3 tools/test_tools.py (every test should pass) |
| 4.1.4 | Read the instruction | Sections 0 to 3 first, then follow the build order in Section 11 |
| 4.1.5 | Reconcile first | Run Section 9 steps R1 and R2 against the existing database (both read only), using reference/000 where the database is PostgreSQL, and fill the mapping template |
| 4.1.6 | Add the CI check | python3 tools/check_forbidden_identifiers.py <repo_root> --exclude <exact paths> --manifest scan_manifest.json |
| 4.1.7 | Build and test | Section 11 order; Section 13 tests against the running non production system |
| 4.1.8 | Report results | python3 tools/acceptance_report.py results.json |
| 4.1.9 | Deliver | Everything in Section 14 at once |

4.2. Exclusions for the CI check. Pass as --exclude the exact paths of authored situation content, the retirement register, the tools/ folder, the reference/ folder, the test/ folder, this package's JSON dictionary file, and migration files already applied to any environment before this package. List every allowed path in the reconciliation report. A directory path ends with a slash; a file path excludes that file only. Approved participant facing wording that must contain a listed word (for example the locked sentence The 3rd Academy does not validate people) carries the marker t3a-allow:<rule> on the same line instead of being excluded; each use appears in the scan manifest. Every new file must pass with zero hits.

4.3. Where a hit is a legitimate English word in a system identifier that carries no retired meaning, rename the identifier. Do not widen the exclusions for new code.


## 5. What Not to Do

5.1. Do not change any pathway rule, gate, sufficiency rule, release rule or issuance rule. This package governs data capture only.

5.2. Do not drop a column that holds data, and do not rewrite historical rows.

5.3. Do not enable any DORMANT or SOCKET item. Building it is not enabling it.


Prepared by Dr. Tony Mofoke, Founder and Chief Executive Officer, 18 October 2026.

AI acknowledgement: artificial intelligence tools supported research, synthesis, drafting, structuring and language refinement.

END OF DOCUMENT
