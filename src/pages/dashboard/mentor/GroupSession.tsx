/**
 * Stage 4 — shared session facilitator workspace — T3A-D1-EXEC-001 §8.3
 * and §8.4.
 *
 * Required screens: facilitator workspace with the facilitator card and
 * one capture lane; shared participant view; per-person pre-brief
 * delivery.
 * Required actions: compose the session naming the observed participant
 * and the co-participants; run the session; capture for the observed
 * participant; record their progression.
 *
 * Must not appear, and are absent here:
 *   — any capture lane, determination or progression for a
 *     co-participant;
 *   — any cross-participant visibility of records or lanes.
 *
 * ONE SHARED INTERACTION. ONE OBSERVED PARTICIPANT. One observation
 * record is written, for the observed participant only. The
 * co-participants are role players for that run: they generate the
 * pressure the observed participant meets, and they generate no
 * observation record, no determination and no statement from this
 * session.
 *
 * No participant sees any determination, record, capture lane or
 * progression, at any point, by any route — including the observed
 * participant. This surface is the facilitator's alone.
 *
 * No media persists. RECORDING consent is not granted at any Stage in
 * D1, and this workspace has no recording control of any kind.
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

type GroupSession = {
  group_session_id: string;
  observed_participant_id: string;
  facilitator_id: string;
  accommodation_settled: boolean;
  composed_at: string;
  started_at: string | null;
  ended_at: string | null;
  paused_at: string | null;
};

type Member = {
  member_id: string;
  group_session_id: string;
  participant_id: string;
  member_role: "observed" | "co_participant";
  pre_brief_ref: string | null;
  disconnected_at: string | null;
  withdrew_at: string | null;
};

type CaptureVerdict = {
  permitted: boolean;
  refusal_code?: string;
  capture_lanes?: number;
};

const GroupSessionWorkspace = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, CaptureVerdict>>({});
  const [isWorking, setIsWorking] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    // The policy restricts these rows to the facilitator. A participant
    // reaching this route sees nothing, and there is no query here that
    // would return another facilitator's session.
    const { data } = await supabase
      .from("t3a_d1_group_session")
      .select("*")
      .order("composed_at", { ascending: false });
    setSessions((data ?? []) as GroupSession[]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!selected) {
        setMembers([]);
        setVerdicts({});
        return;
      }
      const { data } = await supabase
        .from("t3a_d1_group_session_member")
        .select("*")
        .eq("group_session_id", selected);
      const rows = (data ?? []) as Member[];
      setMembers(rows);

      // Whether a lane exists is the server's answer, per member. The
      // facilitator never sees a lane the server would refuse.
      const next: Record<string, CaptureVerdict> = {};
      for (const m of rows) {
        const { data: v } = await supabase.rpc("t3a_d1_group_capture_permitted", {
          p_group_session_id: selected,
          p_participant_id: m.participant_id,
        });
        next[m.participant_id] = (v ?? { permitted: false }) as CaptureVerdict;
      }
      setVerdicts(next);
    };
    void loadMembers();
  }, [selected]);

  const onMemberEvent = async (participantId: string, event: string) => {
    if (!selected) return;
    setIsWorking(true);
    const { data } = await supabase.rpc("t3a_d1_group_member_event", {
      p_group_session_id: selected,
      p_participant_id: participantId,
      p_event: event,
    });
    setIsWorking(false);

    const result = data as { recorded?: boolean; effect?: string; refusal_code?: string } | null;
    if (!result?.recorded) {
      toast({ title: result?.refusal_code ?? "That could not be recorded.", variant: "destructive" });
      return;
    }
    toast({ title: "Recorded", description: result.effect });
    await load();
  };

  if (isLoading) return <LedgerLoading />;

  const session = sessions.find((s) => s.group_session_id === selected) ?? null;
  const observed = members.find((m) => m.member_role === "observed") ?? null;
  const coParticipants = members.filter((m) => m.member_role === "co_participant");

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Stage 4 · Shared session"
        title="One interaction, one observed participant"
        meta="The others in the room generate the pressure. Nothing is recorded about them, and nobody in the session sees a lane."
        actions={<LedgerBadge variant="outline">One capture lane</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Sessions" title="Sessions you facilitate">
        {sessions.length === 0 ? (
          <EmptyState title="You have no shared session composed." />
        ) : (
          <div className="border-t-2 border-foreground">
            {sessions.map((s) => (
              <button
                key={s.group_session_id}
                type="button"
                onClick={() => setSelected(s.group_session_id)}
                className={cn(
                  "w-full text-left flex flex-wrap gap-x-8 gap-y-1 py-4 border-b border-foreground/20 transition-colors",
                  selected === s.group_session_id
                    ? "bg-foreground/[0.04]"
                    : "hover:bg-foreground/[0.02]"
                )}
              >
                <span className="mono-label text-foreground/55 w-72 truncate">
                  {s.group_session_id}
                </span>
                <span className="text-foreground/70">
                  composed {new Date(s.composed_at).toLocaleDateString()}
                </span>
                <span className="text-foreground/60">
                  {s.paused_at ? "paused" : s.ended_at ? "ended" : s.started_at ? "running" : "not started"}
                </span>
              </button>
            ))}
          </div>
        )}
      </DashSection>

      {session && (
        <>
          {/* Accommodation needs are settled before composition, never
              during the session. Stated so a facilitator does not try. */}
          {!session.accommodation_settled && (
            <DashSection eyebrow="§ II · Before you start" title="Accommodation is not settled">
              <p className="text-foreground/80 max-w-2xl leading-relaxed">
                Accommodation needs are settled before a session is composed,
                never during it. This session records none as settled.
              </p>
            </DashSection>
          )}

          <DashSection eyebrow="§ II · The room" title="Who is here, and what that means">
            <div className="border-t-2 border-foreground">
              {/* The observed participant. One lane, and it is theirs. */}
              {observed && (
                <article className="py-6 border-b border-foreground/25 flex flex-wrap gap-y-4 gap-x-10">
                  <div className="min-w-[16rem] flex-1">
                    <span className="mono-label text-foreground/55">Observed</span>
                    <p className="text-foreground/85 mt-1">{observed.participant_id}</p>
                    <p className="text-foreground/60 text-[0.875rem] mt-2 leading-relaxed">
                      One observation record is written, for this person only.
                    </p>
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <span className="mono-label text-foreground/55">Capture lane</span>
                    <p className="text-foreground/85 mt-1">
                      {verdicts[observed.participant_id]?.permitted
                        ? `${verdicts[observed.participant_id]?.capture_lanes} lane`
                        : verdicts[observed.participant_id]?.refusal_code ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-3 self-center">
                    <Button
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => void onMemberEvent(observed.participant_id, "disconnect")}
                    >
                      Record a disconnection
                    </Button>
                  </div>
                </article>
              )}

              {/* Co-participants. No lane, no determination, no
                  progression — and no control that would offer one. */}
              {coParticipants.map((m) => (
                <article
                  key={m.member_id}
                  className="py-6 border-b border-foreground/20 flex flex-wrap gap-y-4 gap-x-10"
                >
                  <div className="min-w-[16rem] flex-1">
                    <span className="mono-label text-foreground/55">Co-participant</span>
                    <p className="text-foreground/85 mt-1">{m.participant_id}</p>
                    <p className="text-foreground/60 text-[0.875rem] mt-2 leading-relaxed">
                      Nothing is recorded about this person from this session.
                    </p>
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <span className="mono-label text-foreground/55">Capture lane</span>
                    <p className="text-foreground/70 mt-1 text-[0.875rem]">
                      {verdicts[m.participant_id]?.refusal_code ?? "None"}
                    </p>
                  </div>
                  <div className="flex gap-3 self-center">
                    <Button
                      variant="ghost"
                      disabled={isWorking}
                      onClick={() => void onMemberEvent(m.participant_id, "disconnect")}
                    >
                      Record a disconnection
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <p className="text-foreground/65 text-[0.875rem] mt-8 max-w-2xl leading-relaxed">
              If a co-participant disconnects or leaves, that is recorded as an
              administration variance on the observed participant's record —
              never as a judgment about the person who left, and never as a
              removal of anything, because they hold nothing.
            </p>
          </DashSection>

          <DashSection eyebrow="§ III · Pre-briefs" title="Each person has their own">
            <ul className="border-t-2 border-foreground max-w-3xl">
              {members.map((m) => (
                <li
                  key={m.member_id}
                  className="flex flex-wrap justify-between gap-4 py-4 border-b border-foreground/20"
                >
                  <span className="text-foreground/80">
                    {m.member_role === "observed" ? "Observed" : "Co-participant"}
                  </span>
                  <span className="mono-label text-foreground/55">
                    {m.pre_brief_ref ? "pre-brief issued" : "no pre-brief issued"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-foreground/65 text-[0.875rem] mt-6 max-w-2xl leading-relaxed">
              A pack is never visible to anyone else. The observed
              participant's pack is bound to their Stage instance; a
              co-participant's pack is session material and creates no evidence
              object.
            </p>
          </DashSection>

          <DashSection eyebrow="§ IV · What nobody in the room sees" title="Not even the observed participant">
            <div className="border-l-2 border-foreground pl-8 max-w-3xl">
              <p className="text-foreground/85 leading-relaxed">
                No participant sees any determination, record, capture lane or
                progression, at any point, by any route — including the person
                being observed. Everyone sees the shared material and each
                other, and nothing else.
              </p>
            </div>
          </DashSection>
        </>
      )}
    </div>
  );
};

export default GroupSessionWorkspace;
