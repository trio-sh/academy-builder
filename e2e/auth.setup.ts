import { test as setup } from "@playwright/test";
import path from "path";
import { execSync } from "child_process";

const SUPABASE_URL = "https://bloujipdkyjsgzwxnoej.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsb3VqaXBka3lqc2d6d3hub2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzI0OTcsImV4cCI6MjA4NTI0ODQ5N30.-xd4VxsdR_c_Q5QZU0eiOcwJHC1v30zoxvGM1vC8v9M";
const STORAGE_KEY = "the3rdacademy-auth";

interface Account {
  email: string;
  password: string;
  storageState: string;
}

const ACCOUNTS: Record<string, Account> = {
  candidate: {
    email: "testcandidate@t3a.test",
    password: "TestPassword123!",
    storageState: path.resolve("e2e/.auth/candidate.json"),
  },
  mentor: {
    email: "testmentor@t3a.test",
    password: "TestPassword123!",
    storageState: path.resolve("e2e/.auth/mentor.json"),
  },
  employer: {
    email: "testemployer@t3a.test",
    password: "TestPassword123!",
    storageState: path.resolve("e2e/.auth/employer.json"),
  },
  school: {
    email: "testschool@t3a.test",
    password: "TestPassword123!",
    storageState: path.resolve("e2e/.auth/school.json"),
  },
  admin: {
    email: "testadmin@t3a.test",
    password: "TestPassword123!",
    storageState: path.resolve("e2e/.auth/admin.json"),
  },
};

/**
 * Get a Supabase session token server-side (bypassing browser proxy issues).
 * Uses Python's urllib which respects the container proxy properly.
 */
function getSessionToken(email: string, password: string): string {
  const script = `
import urllib.request, json, sys
data = json.dumps({"email": "${email}", "password": "${password}"}).encode()
req = urllib.request.Request(
    "${SUPABASE_URL}/auth/v1/token?grant_type=password",
    data=data,
    headers={"apikey": "${ANON_KEY}", "Content-Type": "application/json"}
)
try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(json.dumps({"error": e.read().decode()}), file=sys.stderr)
    sys.exit(1)
`;
  const result = execSync(`python3 -c '${script}'`, { encoding: "utf-8" });
  return result.trim();
}

for (const [role, account] of Object.entries(ACCOUNTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    // Get session token server-side
    const sessionJson = getSessionToken(account.email, account.password);
    const session = JSON.parse(sessionJson);

    if (session.error || !session.access_token) {
      throw new Error(`Failed to get token for ${role}: ${JSON.stringify(session)}`);
    }

    // Navigate to the app first (needed to set localStorage on the correct origin)
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // Inject the Supabase session into localStorage
    // The key format matches what @supabase/supabase-js uses
    const storageValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: session.token_type,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      user: session.user,
    });

    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: STORAGE_KEY, value: storageValue }
    );

    // Reload to pick up the session
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Wait a moment for auth state to initialize
    await page.waitForTimeout(3000);

    // Save storage state (includes localStorage and cookies)
    await page.context().storageState({ path: account.storageState });

    console.log(`Authenticated ${role} (${account.email}) successfully`);
  });
}

export { ACCOUNTS };
