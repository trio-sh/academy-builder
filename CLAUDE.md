# Working rules for this repository

1. **Nothing ships untested.** Every feature, flow and section is tested end to end by the builder, with automated tests, before it is merged or applied anywhere. The founder does not test by hand to find bugs. A feature is done when its tests pass; only then does work move on.
2. **Use only vitest and Playwright.**
   - `npm test` runs unit and component tests (vitest, jsdom).
   - `npm run test:db` runs database integration tests (vitest) against a throwaway Postgres built from `supabase/migrations` with `tools/nonprod-replay/local_pg/build.sh`; set `T3A_TEST_DB_URL`. A missing URL fails the run; it never skips.
   - `npm run test:e2e` runs Playwright for screens and flows.
   - New tests go in `src/test/` (vitest), `src/test/db/*.db.test.ts` (database) or `e2e/` (Playwright). Do not add new standalone node test scripts.
3. **Test the test.** Before relying on a new test, break the thing it guards and see it fail.
4. **Throwaway database first.** Build and test migrations on a throwaway database. The live Supabase project is changed only after the tests pass, with a rollback script and a verification record in `docs/day1/evidence/`.
5. Production enforcement switches stay off and `lsa_activation` stays off until the founder's activation decision. See `docs/day1/conflict-register.md`.
