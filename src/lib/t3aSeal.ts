/**
 * Before a report is issued the commit seals of its statements must be signed (CORR-007 CR-29). Signing is done by the commit service, which holds the private key;
 * this asks it to run now, with the signed-in staff member's token. It never fails the caller: if it cannot run, issuing reports what is still unsealed.
 */
export async function sealPendingBeforeIssue(getToken: () => Promise<string | null>, doFetch: typeof fetch = fetch): Promise<"requested" | "skipped"> {
  try {
    const token = await getToken();
    if (!token) return "skipped";
    const res = await doFetch("/api/t3a/seal", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? "requested" : "skipped";
  } catch {
    return "skipped";
  }
}
