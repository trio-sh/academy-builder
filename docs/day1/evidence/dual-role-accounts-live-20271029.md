# Dual-role test accounts on the live project (CR-340, CR-342)

Created by `tools/day1/live_data/dual_role_accounts.mjs` (environment `pilot_active`; `.test` addresses that cannot receive mail; passwords generated and held outside the repository). Remove with the same script and `--rollback`.

| Account | Profile role (desk the screens open) | Second role (administrator-granted) |
|---|---|---|
| dual-mentor-participant@t3a.test | mentor | participant |
| dual-mentor-employer@t3a.test | mentor | verified employer |
| dual-participant-employer@t3a.test | candidate | verified employer |
| dual-admin-mentor@t3a.test | mentor | oversight administrator |
| dual-mentee@t3a.test | candidate | participant (mentored by the three mentor accounts) |
| dual-stranger-mentee@t3a.test | candidate | participant (mentored by testmentor only) |

Screen and data-layer test `e2e/dual-role-desks.spec.ts` (`DUAL_CREDS=<file> npx playwright test --project=dual-role-tests`), 19 checks:

- Before migration 20270254: 16 passed, 3 failed. A mentor could attach a dimension to another mentor's assignment (the rows were removed afterwards).
- After migration 20270254: 19 passed.

Each account opens its profile-role desk and none of the others. A mentor reads their own mentee and not a stranger's, and never the mentee's private note. Only the mentor + employer and participant + employer accounts reach the employer pool. The mentor + oversight administrator account is refused an observation write (OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE) and reads every profile by design.
