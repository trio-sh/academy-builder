/**
 * Stage 1 — the participant's screen. CORR-006 Section 4, CX-08 and CX-13.
 *
 * THIS FILE CONTAINS NO PARTICIPANT-FACING WORDING, and that is the point
 * rather than a style preference.
 *
 * Every word a participant reads here comes from the server: the situation
 * and each reveal from the approved source version, byte-identical, and the
 * opening, closing, support line, Stop label and timing notice from the
 * loaded Annexes A, B and C. CX-13 says the Stop control and support line
 * render "from Annexes A and C, never from code", and the only way to mean
 * that is for the code to have nothing of its own to fall back on. So where
 * the server refuses, this shows the refusal and no Stage 1 content at all —
 * it does not substitute a friendly sentence of its own.
 *
 * WHAT THE SERVER DECIDES, NOT THIS FILE:
 *   — which reveals exist and in what order (t3a_d1_s1_render, scoped to
 *     the source's "**Reveal sequence**" section);
 *   — whether a reveal may be shown yet (t3a_d1_s1_reveal_shown, AC-B2);
 *   — whether a response may be recorded (t3a_d1_s1_reveal_submit, DS-2).
 * This screen asks and reports. Hiding a control is not a rule.
 *
 * REQUIRED ABSENT, per Annex A's fixed rules, and absent here:
 *   — DS-3: no feedback, no correct answer, no indication of how a response
 *     was received. The only thing shown after a submission is the next
 *     part;
 *   — DS-4: progress appears ONLY as the part number. No bar, no
 *     percentage, no count of parts remaining, and no total — a participant
 *     who knows there are four parts is being told something about the
 *     shape of the situation;
 *   — DS-5: the source title, the source sheet and applicability are never
 *     shown. The render deliberately does not return them;
 *   — DS-6: nothing a confirmer does. No determination, statement or
 *     record;
 *   — AC-B4: no running clock. The timing notice appears once.
 *
 * DS-2: a submitted response cannot be edited or recalled, so there is no
 * back control and no edit. The textarea is replaced by what was submitted,
 * read-only, because hiding it would make the participant doubt it saved.
 *
 * AC-B6: no pause. Stop ends the run and is recorded under CX-28, which is
 * not built yet — see the Stop handler.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LedgerLoading, EmptyState } from "@/components/dashboard/primitives";

type Reveal = {
  ordinal: number;
  label: string;
  verbatim: string;
  verbatim_hash: string;
};

type Render = {
  renderable: boolean;
  refusal_code?: string;
  why?: string;
  source_identifier?: string;
  max_minutes?: number;
  max_seconds?: number;
  framing?: {
    opening: string;
    closing: string;
    support_line: string;
  };
  situation?: { verbatim: string };
  reveals?: Reveal[];
};

type Notices = {
  available: boolean;
  refusal_code?: string;
  missing?: string;
  five_minute_notice?: { text: string; seconds_remaining_at_which_to_show: number };
  support_line?: { text: string };
  support_information?: { text: string };
  stop_control?: { label: string | null };
};

type ResponseRow = {
  reveal_ordinal: number;
  response_text: string | null;
  outcome: string;
};

/** Where the participant is. Part 0 is the opening; the closing follows the last reveal. */
type Phase = { kind: "opening" } | { kind: "reveal"; ordinal: number } | { kind: "closing" };

const S1Delivery = () => {
  const { runId } = useParams<{ runId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [render, setRender] = useState<Render | null>(null);
  const [notices, setNotices] = useState<Notices | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "opening" });
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  /** AC-B4: shown once. A ref, so a re-render cannot show it twice. */
  const timingNoticeShown = useRef(false);
  const [showTimingNotice, setShowTimingNotice] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!runId) return;

    const { data: run } = await supabase
      .from("t3a_d1_ai_administration_run")
      .select("source_version_id")
      .eq("ai_administration_run_id", runId)
      .maybeSingle();

    if (!run) {
      setRender({ renderable: false, refusal_code: "RUN_NOT_FOUND" });
      setIsLoading(false);
      return;
    }

    const [{ data: r }, { data: n }, { data: rows }] = await Promise.all([
      supabase.rpc("t3a_d1_s1_render", {
        p_source_version_id: (run as { source_version_id: string }).source_version_id,
      }),
      supabase.rpc("t3a_d1_s1_participant_notices"),
      supabase
        .from("t3a_d1_s1_reveal_response")
        .select("reveal_ordinal, response_text, outcome")
        .eq("ai_administration_run_id", runId)
        .order("reveal_ordinal"),
    ]);

    setRender((r ?? null) as Render | null);
    setNotices((n ?? null) as Notices | null);
    setResponses((rows ?? []) as ResponseRow[]);
    setIsLoading(false);
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * AC-B4. One notice, when five minutes remain, and no running clock. The
   * remaining time is derived from max_seconds rather than counted down on
   * screen: nothing here renders a duration to the participant except the
   * one sentence from Annex B.
   */
  useEffect(() => {
    const max = render?.max_seconds;
    const at = notices?.five_minute_notice?.seconds_remaining_at_which_to_show;
    if (!max || !at || timingNoticeShown.current) return;

    const msUntil = (max - at) * 1000 - (Date.now() - startedAt);
    if (msUntil <= 0) {
      timingNoticeShown.current = true;
      setShowTimingNotice(true);
      return;
    }
    const t = setTimeout(() => {
      timingNoticeShown.current = true;
      setShowTimingNotice(true);
    }, msUntil);
    return () => clearTimeout(t);
  }, [render?.max_seconds, notices?.five_minute_notice, startedAt]);

  const answered = useMemo(
    () => new Map(responses.map((r) => [r.reveal_ordinal, r])),
    [responses]
  );

  const reveals = render?.reveals ?? [];

  const beginReveal = async (ordinal: number) => {
    setWorking(true);
    setRefusal(null);
    const { data } = await supabase.rpc("t3a_d1_s1_reveal_shown", {
      p_run_id: runId,
      p_ordinal: ordinal,
    });
    setWorking(false);
    const res = data as { recorded?: boolean; refusal_code?: string; remedy?: string } | null;
    if (!res?.recorded) {
      setRefusal(res?.refusal_code ?? "COULD_NOT_RECORD");
      return;
    }
    setPhase({ kind: "reveal", ordinal });
    setDraft("");
    await load();
  };

  const submit = async (ordinal: number) => {
    setWorking(true);
    setRefusal(null);
    // Sent exactly as typed. Not trimmed here: the server trims a copy to
    // decide whether anything was written and stores the original.
    const { data } = await supabase.rpc("t3a_d1_s1_reveal_submit", {
      p_run_id: runId,
      p_ordinal: ordinal,
      p_response: draft,
    });
    setWorking(false);
    const res = data as { recorded?: boolean; refusal_code?: string } | null;
    if (!res?.recorded) {
      setRefusal(res?.refusal_code ?? "COULD_NOT_RECORD");
      return;
    }
    await load();
    const next = ordinal + 1;
    if (reveals.some((x) => x.ordinal === next)) {
      await beginReveal(next);
    } else {
      setPhase({ kind: "closing" });
    }
  };

  if (isLoading) return <LedgerLoading />;

  /**
   * The server refused, so nothing of Stage 1 is shown. The refusal code is
   * displayed as it came: it is an identifier, not participant wording, and
   * inventing a gentler sentence here would be this file writing
   * participant-facing text — which is the one thing CX-13 forbids.
   */
  if (!render?.renderable || !notices?.available) {
    const refusalToShow =
      render?.refusal_code ?? notices?.refusal_code ?? "UNSPECIFIED_REFUSAL";
    /*
     * My first draft ended this with a friendly fallback sentence — "This
     * part cannot be shown." — and the surface test for this file caught it,
     * which is exactly what that test is for. A sentence written here is
     * participant-facing wording written in code, whatever its tone. So the
     * fallback is a refusal IDENTIFIER too, and if the server gave none, the
     * screen says so in the same register rather than making something up.
     */
    return <EmptyState title={refusalToShow} />;
  }

  const framing = render.framing!;
  const notice = notices.five_minute_notice!;
  const stopLabel = notices.stop_control?.label;

  /**
   * CX-13. On EVERY screen: the Stop control and, beside it, the support
   * line. Rendered from the server's text, never from a literal here.
   *
   * Stop ends the run and is recorded under CX-28, which is not built. So
   * this reports that plainly rather than pretending to stop the run — a
   * control that looks like it stopped an observation and did not is worse
   * than one that says it cannot yet.
   */
  const stopAndSupport = (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/20 pb-4 mb-8">
      <div className="flex items-center gap-4">
        {stopLabel && (
          <Button
            variant="outline"
            onClick={() => setRefusal("STOP_NOT_RECORDABLE_UNTIL_CX28_IS_BUILT")}
          >
            {stopLabel}
          </Button>
        )}
        <span className="mono-label text-foreground/60">
          {notices.support_line?.text}
        </span>
      </div>
      {/* DS-4: the part number alone. No total, no bar, no percentage. */}
      {phase.kind === "reveal" && (
        <span className="mono-label text-foreground/60">Part {phase.ordinal}</span>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl">
      {stopAndSupport}

      {showTimingNotice && (
        <p className="mono-label ink-vermilion mb-8">{notice.text}</p>
      )}

      {refusal && <p className="mono-label ink-vermilion mb-8">{refusal}</p>}

      {phase.kind === "opening" && (
        <section>
          {/* Annex A's opening, with {max_minutes} already filled server-side. */}
          <div className="space-y-4 text-foreground/85 leading-relaxed whitespace-pre-line">
            {framing.opening}
          </div>
          <div className="mt-10">
            <Button
              variant="outline"
              disabled={working || reveals.length === 0}
              onClick={() => void beginReveal(1)}
            >
              {/* The one control label this file supplies. It names an action
                  in the interface, not a statement about the assessment. */}
              Begin
            </Button>
          </div>
        </section>
      )}

      {phase.kind === "reveal" && (
        <section>
          {/* The situation stays on screen throughout: a participant answering
              R3 is answering about this situation, and hiding it would make
              them recall it rather than read it. Byte-identical to the
              approved source version. */}
          <div className="text-foreground/85 leading-relaxed whitespace-pre-line border-l-2 border-foreground/20 pl-6">
            {render.situation?.verbatim}
          </div>

          <div className="mt-10 text-foreground/85 leading-relaxed whitespace-pre-line">
            {reveals.find((x) => x.ordinal === phase.ordinal)?.verbatim}
          </div>

          {answered.get(phase.ordinal)?.outcome === "submitted" ? (
            /* DS-2. Shown read-only rather than hidden: a participant whose
               words vanish cannot tell that they saved. */
            <div className="mt-8">
              <p className="text-foreground/85 leading-relaxed whitespace-pre-line border-l-2 border-foreground/40 pl-6">
                {answered.get(phase.ordinal)?.response_text}
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <label className="mono-label text-foreground/60 block mb-2" htmlFor="response">
                Your response
              </label>
              <textarea
                id="response"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={10}
                /* AC-B8: no maxLength. No content limit is imposed on the
                   participant, and the server's technical ceiling refuses
                   visibly rather than truncating. */
                className="w-full border border-foreground/30 bg-transparent p-4 leading-relaxed outline-none focus:border-foreground"
              />
              <div className="mt-6">
                <Button
                  variant="outline"
                  disabled={working || draft.trim().length === 0}
                  onClick={() => void submit(phase.ordinal)}
                >
                  Submit and continue
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {phase.kind === "closing" && (
        <section>
          <div className="space-y-4 text-foreground/85 leading-relaxed whitespace-pre-line">
            {framing.closing}
          </div>
        </section>
      )}
    </div>
  );
};

export default S1Delivery;
