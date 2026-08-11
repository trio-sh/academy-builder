import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, ShieldAlert, EyeOff, Send, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

/**
 * §8 · T3X employer surface — closed field schedule, minimum floor,
 * count bands, TEER-shape hidden.
 *
 * The discovery query itself resolves through t3a_query_discovery. Per
 * §16.3 the socket is present but disabled — it refuses with a specific
 * governance-pending message until the closed field schedule, minimum
 * result floor, count-band boundaries, and TEER-shape monitor have
 * landed (Track A OD-05/06/07/08/09). We render the query surface with
 * a small set of representative bounded criteria as placeholders and
 * surface the RPC's refusal verbatim rather than fabricating results.
 *
 * The lower half of the page lists disclosures granted to this employer
 * — the only path today by which a report becomes readable to us.
 */

type DisclosureRow = {
  disclosure_id: string;
  ber_report_id: string;
  participant_id: string;
  recipient_email: string | null;
  access_scope: string;
  access_period_starts: string;
  access_period_ends: string;
  identity_released_at: string | null;
  report_released_at: string | null;
  revoked_at: string | null;
  status: string;
  created_at: string;
};

const DIMENSION_CODES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14"];

export default function T3XDiscovery() {
  const { user } = useAuth();
  const [dims, setDims] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [availability, setAvailability] = useState("");
  const [querying, setQuerying] = useState(false);
  const [queryOutcome, setQueryOutcome] = useState<
    | { kind: "refused"; reason: string }
    | { kind: "empty" }
    | { kind: "count_band"; label: string }
    | null
  >(null);
  const [disclosures, setDisclosures] = useState<DisclosureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [disclosureError, setDisclosureError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("t3a_disclosure")
        .select("*")
        .eq("recipient_org_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setDisclosureError(error.message);
      else setDisclosures((data ?? []) as DisclosureRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleDim = (d: string) => {
    setDims((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const runQuery = async () => {
    setQuerying(true);
    setQueryOutcome(null);
    try {
      const { data, error } = await supabase.rpc("t3a_query_discovery", {
        p_criteria: {
          dimensions: dims,
          region: region || null,
          availability: availability || null,
        },
      });
      if (error) {
        setQueryOutcome({ kind: "refused", reason: error.message });
      } else if (!data) {
        setQueryOutcome({ kind: "empty" });
      } else {
        setQueryOutcome({ kind: "count_band", label: String(data) });
      }
    } catch (e) {
      setQueryOutcome({ kind: "refused", reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setQuerying(false);
    }
  };

  if (loading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Register · T3X Discovery"
        title={
          <>
            Query the register on a <span className="italic display-serif-italic">closed</span> field schedule.
          </>
        }
        meta="Only names on the schedule may be queried. Results return a count band, never an exact count, and never below the minimum floor — §8."
      />

      <DashSection eyebrow="§ I · Bounded criteria" title="Nothing off the schedule">
        <div className="border-2 border-foreground/25 p-5 md:p-6 space-y-6">
          <div>
            <label className="mono-label text-foreground block mb-2">§ Dimensions in scope</label>
            <div className="flex flex-wrap gap-2">
              {DIMENSION_CODES.map((d) => {
                const selected = dims.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDim(d)}
                    className={`border-2 px-3 py-1.5 text-sm rounded-none transition-colors ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/30 text-foreground hover:border-foreground/60"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="marginalia text-[0.75rem] mt-2 text-foreground/60">
              Behavioral dimensions from the framework. Dimensions with no approved determination question set (Track B
              pending) will return no candidates even once the query engine is enabled.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="mono-label text-foreground block mb-2">§ Region (schedule value)</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="pending closed field schedule"
                disabled
                className="w-full bg-foreground/[0.02] border border-foreground/25 px-3 py-2 text-sm text-foreground/60 rounded-none disabled:cursor-not-allowed"
              />
              <p className="marginalia text-[0.7rem] mt-1 text-foreground/50">
                OD-09 · closed field schedule not yet approved.
              </p>
            </div>
            <div>
              <label className="mono-label text-foreground block mb-2">§ Availability (schedule value)</label>
              <input
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="pending closed field schedule"
                disabled
                className="w-full bg-foreground/[0.02] border border-foreground/25 px-3 py-2 text-sm text-foreground/60 rounded-none disabled:cursor-not-allowed"
              />
              <p className="marginalia text-[0.7rem] mt-1 text-foreground/50">
                Free-text fields will never be admitted — only enumerated schedule values.
              </p>
            </div>
          </div>

          <div className="border-t border-foreground/20 pt-4 grid md:grid-cols-3 gap-4 text-sm text-foreground/70">
            <div>
              <div className="mono-label text-foreground/60 mb-1">§ Minimum floor</div>
              <p>Queries whose count falls below the approved minimum floor return the floor label, not zero — a bounded response, not a signal.</p>
            </div>
            <div>
              <div className="mono-label text-foreground/60 mb-1">§ Count bands</div>
              <p>Results are reported in bands (e.g. "5–15"). Exact counts are never disclosed; probes cannot reconstruct them.</p>
            </div>
            <div>
              <div className="mono-label text-foreground/60 mb-1 flex items-center gap-1"><EyeOff className="w-3 h-3" /> § TEER hidden</div>
              <p>TEER shape — the distribution of talent across the query envelope — is never surfaced. Employers cannot rank, compare, or predict from the register.</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={runQuery}
              disabled={querying || dims.length === 0}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-2 text-sm font-medium tracking-wide"
            >
              {querying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Querying…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" /> Run query
                </>
              )}
            </Button>
          </div>
        </div>

        {queryOutcome?.kind === "refused" && (
          <div className="mt-6 border-2 border-vermilion bg-vermilion/[0.06] p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 ink-vermilion mt-0.5" />
              <div>
                <div className="mono-label ink-vermilion mb-1">§ Query refused</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{queryOutcome.reason}</p>
              </div>
            </div>
          </div>
        )}

        {queryOutcome?.kind === "empty" && (
          <div className="mt-6 border-2 border-foreground/40 bg-foreground/[0.02] p-4">
            <div className="mono-label text-foreground/60 mb-1">§ No result</div>
            <p className="text-sm text-foreground">The query returned no data. This is not a count of zero — it is the absence of a response.</p>
          </div>
        )}

        {queryOutcome?.kind === "count_band" && (
          <div className="mt-6 border-2 border-foreground bg-foreground/[0.04] p-4">
            <div className="mono-label text-foreground/60 mb-1">§ Count band</div>
            <p className="display-serif text-3xl text-foreground">{queryOutcome.label}</p>
            <p className="marginalia text-[0.75rem] text-foreground/60 mt-2">
              A band, not an exact count. Repeating the same query does not narrow the band.
            </p>
          </div>
        )}
      </DashSection>

      <DashSection eyebrow="§ II · Received disclosures" title="Reports released to you">
        {disclosureError && (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-4">
            <div className="mono-label ink-vermilion mb-1">§ Error</div>
            <p className="text-sm text-foreground">{disclosureError}</p>
          </div>
        )}
        {disclosures.length === 0 ? (
          <EmptyState
            eyebrow="§ Nothing released"
            title={
              <>
                No <span className="italic display-serif-italic">disclosures</span> currently addressed to your account.
              </>
            }
            body="Disclosures are granted by participants — never by an administrator on their behalf. When one is created for you, it will appear here."
          />
        ) : (
          <div className="border-t-2 border-foreground">
            {disclosures.map((d) => {
              const active =
                d.status === "granted" &&
                d.report_released_at &&
                !d.revoked_at &&
                new Date(d.access_period_starts) <= new Date() &&
                new Date(d.access_period_ends) >= new Date();
              return (
                <div
                  key={d.disclosure_id}
                  className="grid grid-cols-12 gap-4 py-5 px-2 md:px-4 border-b border-foreground/20 items-baseline"
                >
                  <div className="col-span-3">
                    <div className="mono-label text-foreground/60">§ Report</div>
                    <div className="font-mono text-xs text-foreground/70 truncate" title={d.ber_report_id}>
                      {d.ber_report_id.slice(0, 8)}…
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="mono-label text-foreground/60">§ Participant</div>
                    <div className="text-foreground text-[0.9375rem]">
                      {d.identity_released_at ? (
                        <span className="font-mono text-xs">{d.participant_id.slice(0, 8)}…</span>
                      ) : (
                        <span className="text-foreground/50 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> identity withheld
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="mono-label text-foreground/60">§ Access window</div>
                    <div className="text-foreground/80 text-sm">
                      {new Date(d.access_period_starts).toLocaleDateString()} →{" "}
                      {new Date(d.access_period_ends).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <LedgerBadge>{d.status}</LedgerBadge>
                      {active ? (
                        <span className="mono-label text-foreground">report released</span>
                      ) : d.revoked_at ? (
                        <span className="mono-label ink-vermilion">revoked</span>
                      ) : (
                        <span className="mono-label text-foreground/60">report not released</span>
                      )}
                    </div>
                  </div>
                  {d.access_scope && (
                    <div className="col-span-12 mt-1 text-sm text-foreground/70">
                      <span className="mono-label text-foreground/60">§ Access scope:</span> {d.access_scope}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DashSection>

      <DashSection eyebrow="§ III · What the register will not tell you" title="Structural absences">
        <div className="grid md:grid-cols-2 gap-6 text-sm text-foreground/75">
          <div className="border-l-2 border-vermilion pl-3">
            <div className="mono-label ink-vermilion mb-1 flex items-center gap-1"><EyeOff className="w-3 h-3" /> § Never rendered</div>
            <p>
              Rank, score, tier, discovery weight, TEER shape, historical trajectory, or any comparison across
              participants — no query will surface these.
            </p>
          </div>
          <div className="border-l-2 border-foreground/40 pl-3">
            <div className="mono-label text-foreground/60 mb-1 flex items-center gap-1"><Send className="w-3 h-3" /> § Only from a released report</div>
            <p>
              The only path to a report's content is a participant-granted disclosure with both identity release and
              report release explicitly set. Neither implies the other.
            </p>
          </div>
        </div>
      </DashSection>
    </div>
  );
}
