/**
 * Available Reports — T3A-DEV-CN-EMP-001 Item 8.
 *
 * The canonical employer-facing name for the pool environment. There is
 * no tier control, no dimension chip, and no filter, sort, rank,
 * threshold, conduct-derived count or ordering that references a
 * dimension, Stage, observation, Behavioral Evidence Report content or
 * other observed-conduct data.
 *
 * Filter on what the participant stated. Never filter on what was
 * observed about them.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  DashboardPageHeader,
  DashSection,
  LedgerLoading,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  controlledText,
  reportMissingControlledText,
} from "@/lib/employerDeskText";
import {
  queryPool,
  openConversation,
  readLiveWorksActivated,
  type PoolCard,
  type PoolSort,
} from "@/lib/employerDesk";
import { useToast } from "@/hooks/use-toast";

type WorkflowTab = "available" | "saved" | "recently_viewed";

const PERMITTED_FILTERS = [
  { key: "role_or_field_sought", label: "Role or field sought", kind: "text" as const },
  { key: "work_location_preference", label: "Work-location preference or availability", kind: "text" as const },
  { key: "availability_to_start", label: "Availability to start", kind: "text" as const },
  { key: "work_authorization_jurisdiction", label: "Authorization to work in the role jurisdiction", kind: "text" as const },
];

const AvailableReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<PoolCard[]>([]);
  const [refusalCode, setRefusalCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<WorkflowTab>("available");
  const [sort, setSort] = useState<PoolSort>("recently_available");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [liveWorksOn, setLiveWorksOn] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [employerProfileId, setEmployerProfileId] = useState<string | null>(null);

  const header = controlledText("L-EMP-POOL-001");
  const banner = controlledText("L-EMP-POOL-002");
  const emptyPool = controlledText("L-EMP-POOL-EMPTY");
  const noMatch = controlledText("L-EMP-POOL-NOMATCH");

  const load = useCallback(async () => {
    setIsLoading(true);
    const active: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim() !== "") active[k] = v.trim();
    });
    setFiltersApplied(Object.keys(active).length > 0);

    const result = await queryPool(active, sort);
    setRefusalCode(result.refusalCode);
    setCards(result.cards);
    setIsLoading(false);
  }, [filters, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const init = async () => {
      setLiveWorksOn(await readLiveWorksActivated());
      if (!user?.id) return;
      const { data: ep } = await supabase
        .from("employer_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!ep) return;
      setEmployerProfileId(ep.id);
      const { data: saved } = await supabase
        .from("t3a_employer_saved_report")
        .select("participant_id")
        .eq("employer_profile_id", ep.id);
      setSavedIds(new Set((saved ?? []).map((s) => s.participant_id as string)));
    };
    void init();
  }, [user?.id]);

  const toggleSave = async (participantId: string) => {
    if (!employerProfileId) return;
    if (savedIds.has(participantId)) {
      await supabase
        .from("t3a_employer_saved_report")
        .delete()
        .eq("employer_profile_id", employerProfileId)
        .eq("participant_id", participantId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    } else {
      await supabase.from("t3a_employer_saved_report").insert({
        employer_profile_id: employerProfileId,
        participant_id: participantId,
      });
      setSavedIds((prev) => new Set(prev).add(participantId));
    }
  };

  const onContact = async (participantId: string) => {
    const result = await openConversation(participantId);
    if (result.opened) {
      toast({ title: "Conversation opened" });
      await load();
      return;
    }
    // The card having rendered the element is not authority to open a
    // thread. The server rechecked and refused.
    toast({
      title:
        result.refusalCode === "CONTACT_CONSENT_ABSENT"
          ? "This participant has not opened contact."
          : "Contact is not available.",
      variant: "destructive",
    });
    await load();
  };

  if (!header || !banner || !emptyPool || !noMatch) {
    reportMissingControlledText("L-EMP-POOL-001");
    return null;
  }

  const visible = cards.filter((c) =>
    tab === "saved" ? savedIds.has(c.participantId) : true
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Available Reports"
        title={header[0]}
        meta={header.slice(1).join(" ")}
      />

      {/* Item 8 step 5.6 — the principle banner, at the top of the content. */}
      <div className="border-y-2 border-foreground py-5 px-6 mb-10">
        <p className="display-serif text-lg md:text-xl leading-snug text-foreground">
          {banner[0]}
        </p>
      </div>

      {refusalCode ? (
        <DashSection eyebrow="§ Access" title="This organization cannot enter the pool">
          <p className="text-foreground/75 max-w-2xl leading-relaxed">
            Reports become readable once The 3rd Academy has recorded an approval
            for your organization. Nothing about any participant is returned
            before then.
          </p>
        </DashSection>
      ) : (
        <>
          {/* Item 8 step 5.7 — workflow bar. Sort offers availability or
              alphabetical only. No relevance, match, fit, strength,
              most-evidence or recommended ordering exists. */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-foreground/25 pb-4 mb-8">
            {(
              [
                ["available", "Available"],
                ["saved", "Saved"],
                ["recently_viewed", "Recently viewed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "mono-label transition-colors",
                  tab === value
                    ? "text-foreground border-b-2 border-foreground pb-1"
                    : "text-foreground/55 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}

            <label className="ml-auto flex items-center gap-3 mono-label text-foreground/70">
              Order
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as PoolSort)}
                className="border border-foreground/30 bg-transparent px-3 py-1.5 text-foreground"
              >
                <option value="recently_available">Recently available</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </label>
          </div>

          {/* Item 8 step 5.4 — permitted filter fields, all participant-stated. */}
          <DashSection eyebrow="§ I · Details stated by participants" title="Narrow by what was stated">
            <div className="grid gap-6 md:grid-cols-2">
              {PERMITTED_FILTERS.map((f) => (
                <label key={f.key} className="block">
                  <span className="mono-label text-foreground/70 block mb-2">{f.label}</span>
                  <input
                    type="text"
                    value={filters[f.key] ?? ""}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                  />
                </label>
              ))}

              {/* Renders only where LiveWorks is activated and the
                  participant has explicitly supplied the preference. */}
              {liveWorksOn && (
                <label className="flex items-center gap-3 self-end">
                  <input
                    type="checkbox"
                    checked={filters.open_to_liveworks === "true"}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        open_to_liveworks: e.target.checked ? "true" : "",
                      }))
                    }
                  />
                  <span className="mono-label text-foreground/70">Open to LiveWorks</span>
                </label>
              )}
            </div>
          </DashSection>

          {isLoading ? (
            <LedgerLoading />
          ) : visible.length === 0 ? (
            <DashSection eyebrow="§ II · Reports" title="Nothing to read">
              <p className="text-foreground/75 max-w-2xl leading-relaxed">
                {filtersApplied ? noMatch[0] : emptyPool[0]}
              </p>
            </DashSection>
          ) : (
            <DashSection eyebrow="§ II · Reports" title="Available to approved employers">
              <div className="border-t-2 border-foreground">
                {visible.map((card) => (
                  <article
                    key={card.participantId}
                    className="border-b border-foreground/25 py-7 flex flex-wrap gap-y-4 gap-x-10"
                  >
                    <div className="min-w-[16rem] flex-1">
                      {/* Item 8 step 7.8 — the stated name is never
                          masked or abbreviated. */}
                      <h3 className="display-serif text-2xl text-foreground">
                        {card.statedFullName}
                      </h3>
                      {card.statedRoleOrField && (
                        <p className="text-foreground/70 mt-1">{card.statedRoleOrField}</p>
                      )}
                      <p className="mono-label text-foreground/55 mt-3">
                        Behavioral Evidence Report&trade;
                      </p>
                    </div>

                    <dl className="min-w-[14rem] flex-1 space-y-1.5 text-[0.9375rem]">
                      <div className="flex gap-3">
                        <dt className="mono-label text-foreground/55 w-40">Observation period</dt>
                        <dd className="text-foreground/80">
                          {card.observationPeriodStart && card.observationPeriodEnd
                            ? `${card.observationPeriodStart} to ${card.observationPeriodEnd}`
                            : "Not recorded"}
                        </dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="mono-label text-foreground/55 w-40">Report status</dt>
                        <dd className="text-foreground/80">{card.reportStatus ?? "Not recorded"}</dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="mono-label text-foreground/55 w-40">Current through</dt>
                        <dd className="text-foreground/80">{card.currentThrough ?? "Not recorded"}</dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="mono-label text-foreground/55 w-40">Correction open</dt>
                        <dd className="text-foreground/80">{card.correctionOpen ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="mono-label text-foreground/55 w-40">Visibility</dt>
                        <dd className="text-foreground/80">Participant-controlled</dd>
                      </div>
                    </dl>

                    <div className="flex items-start gap-3 self-center">
                      <Link to={`/dashboard/employer/report/${card.berReportId ?? card.participantId}`}>
                        <Button variant="outline">Read report</Button>
                      </Link>
                      <Button variant="ghost" onClick={() => void toggleSave(card.participantId)}>
                        {savedIds.has(card.participantId) ? "Saved" : "Save"}
                      </Button>
                      {/* Item 10 step 5.6 — where consent is absent, no
                          contact element renders at all. */}
                      {card.contactAvailable && (
                        <Button onClick={() => void onContact(card.participantId)}>
                          Contact available
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </DashSection>
          )}
        </>
      )}
    </div>
  );
};

export default AvailableReports;
