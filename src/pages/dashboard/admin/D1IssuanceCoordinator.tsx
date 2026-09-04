import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DashSection,
  DashboardPageHeader,
  LedgerCard,
  EmptyState,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";

/**
 * D1 Observation Pathway — Coordinator Issuance surface.
 *
 * Surfaces the authority register (INS-010) so a coordinator can see,
 * at a glance, which author-locked decisions are still UNSET and why
 * issuance of a Behavioral Evidence Report is being refused.
 *
 * Under the current state (every FD-D1-* / REC-* row UNSET), the
 * `t3a_d1_issue_report` service refuses with
 * `EVIDENCE_REVIEW_AUTHORITY_UNSET`; the coordinator can't override
 * that here. What this page does is make the refusal legible and
 * traceable to the specific missing decisions.
 *
 * When FD-D1-04 lands and an activation_governance wrapper is
 * stood up, the "Issue report" action becomes clickable and calls
 * that wrapper (not the service_role-only primitive).
 */

type AuthorityRow = {
  key: string;
  category: string;
  state: "UNSET" | "SET" | "DEPRECATED";
  note: string | null;
  set_at: string | null;
};

type GateResult =
  | { ok: false; reason?: string; blockers?: Array<Record<string, unknown>> }
  | null; // NULL = go

const CATEGORY_LABEL: Record<string, string> = {
  founder_decision: "Founder decision",
  unresolved_rule: "Unresolved rule",
};

export default function D1IssuanceCoordinator() {
  const [rows, setRows] = useState<AuthorityRow[]>([]);
  const [gate, setGate] = useState<GateResult | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("t3a_d1_authority_register")
      .select("key, category, state, note, set_at")
      .order("category")
      .order("key");
    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AuthorityRow[]);
    }
    const { data: gateData, error: gateErr } = await supabase.rpc(
      "t3a_d1_production_release_gate"
    );
    if (gateErr) {
      setGate({ ok: false, reason: `RPC_ERROR: ${gateErr.message}` });
    } else {
      setGate(gateData as GateResult);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const unsetKeys = rows.filter((r) => r.state === "UNSET").map((r) => r.key);
  const canIssue =
    gate === null && !unsetKeys.includes("FD-D1-04") && rows.length > 0;

  return (
    <DashSection>
      <DashboardPageHeader
        eyebrow="§ D1 · Issuance coordinator"
        title="Coordinator issuance"
        meta="Every author-locked decision the D1 Observation Pathway depends on. Issuance refuses until the ones marked UNSET are set."
        actions={
          <Button
            variant="outline"
            className="rounded-none border-2 border-foreground text-foreground"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        }
      />

      {err && (
        <LedgerCard>
          <div className="p-4 border-2 border-vermilion bg-vermilion/10">
            <div className="mono-label ink-vermilion mb-1">§ Load error</div>
            <p className="text-sm">{err}</p>
          </div>
        </LedgerCard>
      )}

      <LedgerCard>
        <div className="p-5">
          <div className="mono-label text-foreground/60 mb-2">§ Gate</div>
          {loading ? (
            <div className="flex items-center text-foreground/70">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> checking…
            </div>
          ) : gate === null ? (
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-foreground mt-1" />
              <div>
                <h3 className="display-serif text-2xl">Gate is clear</h3>
                <p className="text-sm text-foreground/75 mt-2">
                  Every author-locked decision is SET and the pilot +
                  assurance conditions have cleared. Production release can be
                  proposed via <code>t3a_d1_promote_to_production</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 ink-vermilion mt-1" />
              <div className="flex-1">
                <h3 className="display-serif text-2xl ink-vermilion">
                  Issuance refused
                </h3>
                <p className="text-sm text-foreground/75 mt-2">
                  {gate?.reason === "NOT_ADMIN"
                    ? "Only administrators can read the gate. Sign in as an administrator to see the full blocker list."
                    : "The production-release gate returned blockers. Rows below name each one; issuance stays refused until every UNSET decision is set."}
                </p>
                {gate?.blockers && gate.blockers.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {gate.blockers.map((b, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-vermilion pl-3 font-mono text-[13px] text-foreground/90"
                      >
                        {JSON.stringify(b)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </LedgerCard>

      <LedgerCard>
        <div className="p-5">
          <div className="mono-label text-foreground/60 mb-3">
            § Authority register
          </div>
          {loading ? (
            <div className="flex items-center text-foreground/70">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No rows"
              body="The authority register is empty. This is unexpected — INS-010 seeds 11 rows on migration."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/30">
                    <th className="text-left py-2 pr-4 mono-label text-foreground/60">
                      Key
                    </th>
                    <th className="text-left py-2 pr-4 mono-label text-foreground/60">
                      Category
                    </th>
                    <th className="text-left py-2 pr-4 mono-label text-foreground/60">
                      State
                    </th>
                    <th className="text-left py-2 pr-4 mono-label text-foreground/60">
                      Set at
                    </th>
                    <th className="text-left py-2 mono-label text-foreground/60">
                      What it decides
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.key}
                      className="border-b border-foreground/10 align-top"
                    >
                      <td className="py-3 pr-4 font-mono text-foreground">
                        {r.key}
                      </td>
                      <td className="py-3 pr-4 text-foreground/75">
                        {CATEGORY_LABEL[r.category] ?? r.category}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            r.state === "SET"
                              ? "mono-label text-foreground bg-foreground/10 px-2 py-1 border border-foreground"
                              : r.state === "DEPRECATED"
                              ? "mono-label text-foreground/60 bg-foreground/[0.03] px-2 py-1 border border-foreground/40"
                              : "mono-label ink-vermilion bg-vermilion/10 px-2 py-1 border border-vermilion"
                          }
                        >
                          {r.state}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-foreground/70">
                        {r.set_at
                          ? new Date(r.set_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 text-foreground/85">
                        {r.note ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </LedgerCard>

      <LedgerCard>
        <div className="p-5">
          <div className="mono-label text-foreground/60 mb-2">
            § Issue a report
          </div>
          {canIssue ? (
            <>
              <p className="text-sm text-foreground/75 mb-3">
                Gate is clear and FD-D1-04 is set. The activation_governance
                wrapper for issuance can be invoked from here. (Wrapper not
                yet stood up in this build.)
              </p>
              <Button
                className="bg-foreground text-background rounded-none"
                disabled
                title="Activation_governance wrapper not yet stood up"
              >
                Issue report — wrapper pending
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground/75">
                Issuance is refused until the authority register clears every
                blocker above. In particular <code>FD-D1-04</code> (evidence-review
                authority) must be set before any coordinator surface can
                invoke the amendment or issuance service.
              </p>
              <p className="marginalia text-xs mt-3">
                The direct <code>t3a_d1_issue_report</code> primitive is
                service_role only and cannot be called from this surface;
                coordinators call the activation_governance wrapper (not yet
                stood up) which itself runs the gate first.
              </p>
            </>
          )}
        </div>
      </LedgerCard>
    </DashSection>
  );
}
