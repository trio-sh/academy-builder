/**
 * Who can read your report — T3A-D1-EXEC-001 §8.4 participant pathway,
 * against the approved employer pool (D2/D3 D-04).
 *
 * The named recipient route is closed. A report is released by making it
 * available to approved employers, and by taking that back.
 *
 * Required screens: where your reports are available.
 * Required actions: make an issued report available; withdraw it.
 *
 * Must not appear on the participant pathway, and are absent here:
 *   — any score, rank, readiness indicator or progress percentage;
 *   — any mentor pool, list, name, count or mentor availability.
 *
 * Consent (employer_share) is per dimension and never inherited. The text
 * the participant is shown is hashed and the hash is recorded with the
 * consent, so the record names the wording that was agreed to.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

// Untyped handle: the Day 1 release functions are not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CONSENT_COPY_VERSION = "1.0";
const CONSENT_COPY =
  "I agree that approved employers may read this one report, and nothing else, while it is available. I can withdraw at any time, and the report leaves the pool from then on.";

const sha256Hex = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

type ReportRow = {
  ber_report_id: string;
  dimension_id: string;
  issued_at: string | null;
  withdrawn_at: string | null;
  amended_at: string | null;
};

type PoolState = {
  available: boolean;
  report_status?: string;
  correction_open?: boolean;
  made_available_at?: string;
  withdrawn_at?: string | null;
};

const REFUSALS: Record<string, string> = {
  EMPLOYER_SHARE_CONSENT_REQUIRED: "Agree to the wording first.",
  NAME_NOT_STATED: "Add your name to your profile first.",
  REPORT_NOT_ISSUED: "Only an issued report can be made available.",
  REPORT_WITHDRAWN: "This report has been withdrawn.",
  REPORT_SUPERSEDED: "This report has been replaced by a later version.",
  ALREADY_AVAILABLE: "This report is already available.",
};

const Disclosures = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [states, setStates] = useState<Record<string, PoolState>>({});
  const [form, setForm] = useState<Record<string, { role: string; location: string; start: string; auth: string; agreed: boolean }>>({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: issued } = await supabase
      .from("t3a_d1_ber_report")
      .select("ber_report_id, dimension_id, issued_at, withdrawn_at, amended_at")
      .eq("participant_id", user.id)
      .not("issued_at", "is", null);
    const rows = (issued ?? []) as ReportRow[];
    setReports(rows);
    const next: Record<string, PoolState> = {};
    for (const r of rows) {
      const { data } = await db.rpc("t3a_pool_state", { p_ber_report_id: r.ber_report_id });
      next[r.ber_report_id] = (data ?? { available: false }) as PoolState;
    }
    setStates(next);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const field = (id: string) => form[id] ?? { role: "", location: "", start: "", auth: "", agreed: false };
  const setField = (id: string, patch: Partial<ReturnType<typeof field>>) =>
    setForm((f) => ({ ...f, [id]: { ...field(id), ...patch } }));

  const onMakeAvailable = async (r: ReportRow) => {
    if (!user?.id) return;
    const f = field(r.ber_report_id);
    setIsWorking(true);
    const hash = await sha256Hex(CONSENT_COPY);
    const consent = await db.rpc("t3a_record_consent", {
      p_account: user.id,
      p_type: "employer_share",
      p_status: "granted",
      p_dim: r.dimension_id,
      p_stage: null,
      p_copy_version: CONSENT_COPY_VERSION,
      p_copy_hash: hash,
      p_method: "checkbox",
      p_language: "en",
      p_purpose: "report_release",
    });
    const consentResult = consent.data as { reason?: string } | null;
    if (consent.error || consentResult?.reason) {
      setIsWorking(false);
      toast({ title: "That could not be recorded.", variant: "destructive" });
      return;
    }
    const { data } = await db.rpc("t3a_pool_make_available", {
      p_ber_report_id: r.ber_report_id,
      p_stated_role_or_field: f.role.trim() || null,
      p_work_location_preference: f.location.trim() || null,
      p_availability_to_start: f.start.trim() || null,
      p_work_authorization_jurisdiction: f.auth.trim() || null,
      p_open_to_liveworks: null,
    });
    setIsWorking(false);
    const result = data as { outcome?: string; reason?: string } | null;
    if (result?.outcome !== "available") {
      toast({ title: REFUSALS[result?.reason ?? ""] ?? "That could not be done.", variant: "destructive" });
      return;
    }
    toast({ title: "Available to approved employers", description: "You can withdraw it at any time." });
    await load();
  };

  const onWithdraw = async (r: ReportRow) => {
    if (!user?.id) return;
    setIsWorking(true);
    const { data } = await db.rpc("t3a_pool_withdraw", { p_ber_report_id: r.ber_report_id });
    const result = data as { outcome?: string } | null;
    if (result?.outcome === "withdrawn") {
      // Consent is withdrawn with it, for this dimension only. The consequence is stated on the page.
      await db.rpc("t3a_record_consent", {
        p_account: user.id,
        p_type: "employer_share",
        p_status: "withdrawn",
        p_dim: r.dimension_id,
        p_stage: null,
        p_copy_version: CONSENT_COPY_VERSION,
        p_copy_hash: await sha256Hex(CONSENT_COPY),
        p_method: "checkbox",
        p_language: "en",
        p_purpose: "report_release",
        p_reuse: "future_only",
        p_consequence_displayed: true,
      });
    }
    setIsWorking(false);
    if (result?.outcome !== "withdrawn") {
      toast({ title: "That could not be withdrawn.", variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawn", description: "The report is out of the pool from now on." });
    await load();
  };

  if (isLoading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Your reports"
        title="Who can read your report"
        meta="Approved employers can read a report only while you keep it available, and you can take that back at any time."
        actions={<LedgerBadge variant="outline">You control this</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Your reports" title="Where each report stands">
        {reports.length === 0 ? (
          <EmptyState title="You have no issued report yet." />
        ) : (
          <div className="border-t-2 border-foreground">
            {reports.map((r) => {
              const s = states[r.ber_report_id] ?? { available: false };
              const live = s.available && !s.withdrawn_at;
              const dead = r.withdrawn_at !== null;
              const f = field(r.ber_report_id);
              return (
                <article key={r.ber_report_id} className="py-6 border-b border-foreground/20">
                  <h3 className="display-serif text-xl text-foreground">
                    {r.dimension_id} · issued {r.issued_at ? new Date(r.issued_at).toLocaleDateString() : ""}
                  </h3>
                  <p className="text-foreground/70 mt-1">
                    {dead
                      ? "Withdrawn"
                      : live
                        ? s.correction_open
                          ? "Available to approved employers — a correction is open"
                          : "Available to approved employers"
                        : "Not available to anyone"}
                  </p>

                  {live && (
                    <Button variant="outline" className="mt-4" disabled={isWorking} onClick={() => void onWithdraw(r)}>
                      Withdraw
                    </Button>
                  )}

                  {!live && !dead && !r.amended_at && (
                    <div className="mt-4 space-y-4 max-w-xl">
                      {(
                        [
                          ["role", "The role or field you are looking for"],
                          ["location", "Where you want to work"],
                          ["start", "When you could start"],
                          ["auth", "Where you are authorized to work"],
                        ] as const
                      ).map(([key, label]) => (
                        <label className="block" key={key}>
                          <span className="mono-label text-foreground/70 block mb-2">{label}</span>
                          <input
                            value={f[key]}
                            onChange={(e) => setField(r.ber_report_id, { [key]: e.target.value })}
                            className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                          />
                        </label>
                      ))}
                      <label className="flex gap-3 items-start">
                        <input
                          type="checkbox"
                          checked={f.agreed}
                          onChange={(e) => setField(r.ber_report_id, { agreed: e.target.checked })}
                          className="mt-1"
                        />
                        <span className="text-foreground/80 text-[0.9375rem] leading-relaxed">{CONSENT_COPY}</span>
                      </label>
                      <Button disabled={isWorking || !f.agreed} onClick={() => void onMakeAvailable(r)}>
                        {isWorking ? "Working…" : "Make it available"}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="text-foreground/65 text-[0.875rem] mt-8 max-w-2xl leading-relaxed">
          Your agreement covers this dimension only. A report that is later amended is marked for correction, and a
          report you withdraw leaves the pool from then on.
        </p>
      </DashSection>

      <DashSection eyebrow="§ II · What a reader may do" title="The limits travel with it">
        <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
          <p className="text-foreground/85 leading-relaxed">
            An approved employer may read the report for the purpose you made it available for. They may not copy it
            to another party, add it to a database, use it to build a profile, or use it for a decision about anyone
            but you.
          </p>
          <p className="text-foreground/85 leading-relaxed">
            They see the report itself and nothing else — not your full record, not how it was assembled, not any
            other report, and not anyone else's.
          </p>
        </div>
      </DashSection>
    </div>
  );
};

export default Disclosures;
