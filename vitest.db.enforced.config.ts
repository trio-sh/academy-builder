import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.db.config";

// The database tests again, with enforce_required on (see vitest.db.enforced.setup.ts). `npm run test:db:enforced`.
export default mergeConfig(base, defineConfig({ test: { globalSetup: ["./vitest.db.enforced.setup.ts"], setupFiles: ["./vitest.db.enforced.each.ts"] } }));
