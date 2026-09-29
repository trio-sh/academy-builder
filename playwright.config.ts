import { defineConfig, devices } from "@playwright/test";

// Extract proxy from environment for Chromium to reach Supabase
const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy || undefined;
let proxyConfig: { server: string; username?: string; password?: string } | undefined;

if (proxyServer) {
  try {
    const url = new URL(proxyServer);
    proxyConfig = {
      server: `${url.protocol}//${url.hostname}:${url.port}`,
      username: decodeURIComponent(url.username) || undefined,
      password: decodeURIComponent(url.password) || undefined,
      bypass: "localhost,127.0.0.1",
    };
  } catch {
    // fallback: just use the raw proxy string
    proxyConfig = { server: proxyServer };
  }
}

// The agent proxy re-terminates TLS, so the browser sees certificates
// signed by the proxy CAs rather than the real ones. Those CAs are in the
// system trust store, but Playwright's bundled Chromium does not read it,
// and every Supabase call from the page failed with
// ERR_CERT_AUTHORITY_INVALID — which looks like a broken login form
// rather than a trust problem, because the app simply never got a reply.
//
// These are the public-key hashes of exactly those CAs, taken from
// /usr/local/share/ca-certificates. Chromium then trusts certificates
// chaining to them and nothing else. This is narrower than
// ignoreHTTPSErrors, which would switch verification off altogether and
// is never the right answer to a proxy trust problem.
const PROXY_CA_SPKI = [
  "KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=", // ccr-agent-proxy
  "gBdItbWylHhTkoJDRwIiMuweY/qX4F0bJmLNs5wosUQ=", // egress-gateway-ca-production
  "4FUmu5xjLNSCwT6mnoJy7LpsouczK4qrlGg3VquK6ZE=", // egress-gateway-ca-staging
  "L+/CZomxifpzjiAVG11S0bTbaTopj+c49s0rBjjSC6A=", // swp-ca-production
  "0KMCVL0z7YGtHqARRnTAzBN88j1iAyUWpWormDdohIY=", // swp-ca-staging
].join(",");

const sharedUse = {
  ...devices["Desktop Chrome"],
  ...(proxyConfig ? { proxy: proxyConfig } : {}),
  launchOptions: {
    args: [`--ignore-certificate-errors-spki-list=${PROXY_CA_SPKI}`],
  },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // The Stage 2 cockpit suite has its own sign-in because its subject is
    // what a mentor sees, and the sign-in path is part of that. It also
    // needs the specific mentor assigned to the fixture Stage entry, which
    // the generic role account in auth.setup.ts is not.
    //
    // (This comment used to say auth.setup.ts pointed at a Supabase project
    // that no longer exists and wrote a localStorage key the client does not
    // read. It did, and both are fixed — the note is kept only so a reader
    // of the history does not go looking for a bug that has been repaired.)
    {
      name: "cockpit-setup",
      testMatch: /cockpit\.setup\.ts/,
      use: sharedUse,
    },
    {
      name: "cockpit-tests",
      testMatch: /mentor-cockpit\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/cockpit-mentor.json",
      },
      dependencies: ["cockpit-setup"],
    },
    {
      name: "candidate-tests",
      testMatch: /candidate.*\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/candidate.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mentor-tests",
      // mentor-cockpit.spec.ts is EXCLUDED. /mentor.*\.spec\.ts/ matched it
      // too, so it ran twice: once under cockpit-tests with the fixture
      // mentor's session, where it passes, and again here with the generic
      // mentor account, where every test fails because that account is not
      // the mentor assigned to the fixture Stage entry. Thirteen failures
      // that said nothing about the cockpit and everything about this
      // pattern. The cockpit suite has its own project and its own sign-in
      // by design; this one must not claim it.
      testMatch: /mentor(?!-cockpit).*\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/mentor.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "employer-tests",
      testMatch: /employer.*\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/employer.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "school-tests",
      testMatch: /school.*\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/school.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "admin-tests",
      testMatch: /admin.*\.spec\.ts/,
      use: {
        ...sharedUse,
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Bound to loopback explicitly. vite.config sets host "::", which
    // fails with EAFNOSUPPORT in containers without IPv6, and the only
    // address Playwright reaches it on is the loopback baseURL anyway.
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
