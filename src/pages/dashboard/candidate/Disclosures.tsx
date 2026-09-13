/**
 * Disclosures you have released — T3A-D1-EXEC-001 §8.4 participant
 * pathway, against the §7.5 named-recipient model.
 *
 * Required screens: disclosures you have released.
 * Required actions: release a report to a named recipient; revoke a
 * release.
 *
 * Must not appear on the participant pathway, and are absent here:
 *   — any score, rank, readiness indicator or progress percentage;
 *   — any mentor pool, list, name, count or availability.
 *
 * §7.1: a DISCLOSURE consent is per release and never standing. Each
 * release is its own consent record naming one recipient and covering
 * one report at one version. Releasing again to the same person is a new
 * consent, not a reuse of an old one.
 *
 * §7.5: the participant may revoke at any time, and a revoked token
 * returns the revoked state and no content, immediately.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

type ReleaseRow = {
  release_token_id: string;
  consent_id: string;
  ber_report_id: string;
  report_version: string;
  recipient_name: string;
  recipient_org: string | null;
  recipient_address: string;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  superseded_at: string | null;
};

type ReportRow = {
  ber_report_id: string;
  dimension_id: string;
  status: string;
  issued_at: string | null;
};

/** The state a release is in, from the record alone. */
const releaseState = (r: ReleaseRow): { label: string; live: boolean } => {
  if (r.revoked_at) return { label: "Revoked", live: false };
  if (r.superseded_at) return { label: "Superseded by a later version", live: false };
  if (new Date(r.expires_at) <= new Date()) return { label: "Expired", live: false };
  if (r.redeemed_at) return { label: "Open — read", live: true };
  return { label: "Open — not yet read", live: true };
};

const Disclosures = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const [reportId, setReportId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;

    const { data: issued } = await supabase
      .from("t3a_d1_ber_report")
      .select("ber_report_id, dimension_id, status, issued_at")
      .eq("participant_id", user.id)
      .not("issued_at", "is", null);
    setReports((issued ?? []) as ReportRow[]);

    // Own releases only. The policy restricts these rows to the
    // participant whose consent they hang from.
    const { data: tokens } = await supabase
      .from("t3a_d1_release_token")
      .select("*")
      .order("issued_at", { ascending: false });
    setReleases((tokens ?? []) as ReleaseRow[]);

    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRevoke = async (releaseTokenId: string) => {
    setIsWorking(true);
    const { error } = await supabase
      .from("t3a_d1_release_token")
      .update({ revoked_at: new Date().toISOString() })
      .eq("release_token_id", releaseTokenId);
    setIsWorking(false);

    if (error) {
      toast({ title: "That release could not be revoked.", variant: "destructive" });
      return;
    }
    toast({
      title: "Release revoked",
      description: "The recipient sees the revoked state and no content from now on.",
    });
    await load();
  };

  if (isLoading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Your disclosures"
        title="Who you have let read a report"
        meta="You decide who reads your Behavioral Evidence Report™, and you can take that back at any time."
        actions={<LedgerBadge variant="outline">You control this</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Released" title="Releases you have made">
        {releases.length === 0 ? (
          <EmptyState title="You have not released a report to anyone." />
        ) : (
          <div className="border-t-2 border-foreground">
            {releases.map((r) => {
              const state = releaseState(r);
              return (
                <article
                  key={r.release_token_id}
                  className="py-6 border-b border-foreground/20 flex flex-wrap gap-y-4 gap-x-10"
                >
                  <div className="min-w-[15rem] flex-1">
                    <h3 className="display-serif text-xl text-foreground">
                      {r.recipient_name}
                    </h3>
                    {r.recipient_org && (
                      <p className="text-foreground/70">{r.recipient_org}</p>
                    )}
                    <p className="text-foreground/55 text-[0.875rem] mt-1">
                      {r.recipient_address}
                    </p>
                  </div>

                  <dl className="min-w-[14rem] flex-1 space-y-1.5 text-[0.9375rem]">
                    <div className="flex gap-3">
                      <dt className="mono-label text-foreground/55 w-28">State</dt>
                      <dd
                        className={cn(
                          "text-foreground/85",
                          !state.live && "ink-vermilion"
                        )}
                      >
                        {state.label}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="mono-label text-foreground/55 w-28">Version</dt>
                      <dd className="text-foreground/80">{r.report_version}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="mono-label text-foreground/55 w-28">Released</dt>
                      <dd className="text-foreground/80">
                        {new Date(r.issued_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="mono-label text-foreground/55 w-28">Expires</dt>
                      <dd className="text-foreground/80">
                        {new Date(r.expires_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>

                  <div className="self-center">
                    {state.live ? (
                      <Button
                        variant="outline"
                        disabled={isWorking}
                        onClick={() => void onRevoke(r.release_token_id)}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <span className="mono-label text-foreground/40">
                        No longer readable
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-foreground/65 text-[0.875rem] mt-8 max-w-2xl leading-relaxed">
          A release covers one report at one version. If a report is later
          amended, the person you released it to sees that it has been
          superseded — not the new version — until you release again.
        </p>
      </DashSection>

      <DashSection eyebrow="§ II · Release" title="Let someone read a report">
        {reports.length === 0 ? (
          <p className="text-foreground/75 max-w-2xl leading-relaxed">
            You have no issued report to release yet. A report can only be
            released once it has been issued.
          </p>
        ) : (
          <form
            className="space-y-6 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              toast({
                title: "Release prepared",
                description:
                  "Each release is its own consent, naming one person and covering one report at one version.",
              });
            }}
          >
            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">Report</span>
              <select
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              >
                <option value="">—</option>
                {reports.map((r) => (
                  <option key={r.ber_report_id} value={r.ber_report_id}>
                    {r.dimension_id} · issued{" "}
                    {r.issued_at ? new Date(r.issued_at).toLocaleDateString() : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">
                Their name
              </span>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
            </label>

            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">
                Their organization
              </span>
              <input
                value={recipientOrg}
                onChange={(e) => setRecipientOrg(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
            </label>

            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">
                Their email address
              </span>
              <input
                type="email"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
              <span className="block text-foreground/55 text-[0.875rem] mt-2 leading-relaxed">
                The link goes to this address and only works from it. They do
                not need an account, and having one gives them nothing extra.
              </span>
            </label>

            <Button
              type="submit"
              disabled={
                reportId === "" ||
                recipientName.trim() === "" ||
                recipientAddress.trim() === ""
              }
            >
              Prepare the release
            </Button>
          </form>
        )}
      </DashSection>

      <DashSection eyebrow="§ III · What a reader may do" title="The limits travel with it">
        <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
          <p className="text-foreground/85 leading-relaxed">
            Whoever you release to may read the report for the purpose you
            released it for. They may not copy it to another party, add it to a
            database, use it to build a profile, or use it for a decision about
            anyone but you.
          </p>
          <p className="text-foreground/85 leading-relaxed">
            They see the report itself and nothing else — not your full record,
            not how it was assembled, not any other report, and not anyone
            else's.
          </p>
        </div>
      </DashSection>
    </div>
  );
};

export default Disclosures;
