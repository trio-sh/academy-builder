import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { sealPendingBeforeIssue } from "../lib/t3aSeal";

describe("sealPendingBeforeIssue", () => {
  it("asks the commit service to sign, with the staff member's token, and says so", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await sealPendingBeforeIssue(async () => "tok", f as unknown as typeof fetch)).toBe("requested");
    expect(f).toHaveBeenCalledWith("/api/t3a/seal", { method: "POST", headers: { Authorization: "Bearer tok" } });
  });
  it("does not call without a sign-in, and never throws when the call fails or is refused", async () => {
    const f = vi.fn();
    expect(await sealPendingBeforeIssue(async () => null, f as unknown as typeof fetch)).toBe("skipped"); expect(f).not.toHaveBeenCalled();
    expect(await sealPendingBeforeIssue(async () => "tok", (async () => { throw new Error("down"); }) as unknown as typeof fetch)).toBe("skipped");
    expect(await sealPendingBeforeIssue(async () => "tok", (async () => new Response("no", { status: 401 })) as unknown as typeof fetch)).toBe("skipped");
    expect(await sealPendingBeforeIssue(async () => { throw new Error("no session"); }, f as unknown as typeof fetch)).toBe("skipped");
  });
  it("the issue button asks for the seals to be signed before it asks the database to issue", () => {
    const src = readFileSync("src/pages/dashboard/admin/EvidenceReview.tsx", "utf8");
    const a = src.indexOf("sealPendingBeforeIssue("); const b = src.indexOf('supabase.rpc("t3a_issue_report"');
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
  });
});
