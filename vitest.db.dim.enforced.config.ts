import { defineConfig, mergeConfig } from "vitest/config";
import dim from "./vitest.db.dim.config";

// The case review run in the sandbox state: the per dimension run of vitest.db.dim.config.ts with the enforced setup of vitest.db.enforced.setup.ts on top
// (required fields; sequence and gate when T3A_ENFORCE_ALSO names them). tools/day1/case_review/run_matrix.sh uses it when SANDBOX=1.
export default mergeConfig(dim, defineConfig({ test: { globalSetup: ["./vitest.db.enforced.setup.ts"], setupFiles: ["./vitest.db.enforced.each.ts"] } }));
