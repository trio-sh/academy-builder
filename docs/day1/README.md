# Day 1 Data Capture (T3A-DEV-DAY1-001 v1.3)

Interim deliverables from the reconciliation stage. Nothing here changes the running system.

| File | What it is |
|---|---|
| `reconciliation-report.md` | R1 inventory facts, R2 first pass mapping, prohibited items present (M6), security findings, baseline for DT-02, Growth Log findings |
| `reconciliation-mapping.csv` | One row per dictionary field (600). Mapping class is an automated name and type first pass, not a confirmed mapping |
| `conflict-register.md` | Running register. Each entry states the default applied |
| `test-environment.md` | How the non production database was built, how faithful it is, and its first use |
| `package/` | Working copy of the package (dictionary, tools, schemas, fixtures) so CI can re-run its checks |
| `BUILD-PLAN.md` | Order of work for this week's packages and the decisions needed |
| `evidence/` | Raw outputs: `inventory.min.json` (catalog only), `row-counts.json` (aggregates), `m6-scan.json`, `open-write-policies.json`, `forbidden-identifiers-baseline.json`, `r2-summary.json`, `nonprod-replay-fidelity.json`, `policy-test-results.json`, `field-registry-test.json`, `event-registry-test.json`, `event-reference-gaps.json`, `production-apply-registries-verification.json`, `rollback_day1_registries.sql`, `event-log-snapshot-before-prod.json`, `rollback_close_open_access_policies.sql`, `production-apply-verification.json` |

No participant row content is stored in these files.
