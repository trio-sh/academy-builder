import { defineConfig } from "vitest/config";
import DbSequencer from "./vitest.db.sequencer";

// Database integration tests: run against a throwaway Postgres built from supabase/migrations
// (tools/nonprod-replay/local_pg/build.sh), never against a real project. Set T3A_TEST_DB_URL.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/db/**/*.db.test.ts"],
    fileParallelism: false,
    sequence: { sequencer: DbSequencer },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
