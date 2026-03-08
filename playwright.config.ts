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

const sharedUse = {
  ...devices["Desktop Chrome"],
  ...(proxyConfig ? { proxy: proxyConfig } : {}),
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
      testMatch: /mentor.*\.spec\.ts/,
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
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
