/**
 * The Annex C safety wording, on a participant screen. CORR-006 CX-31.
 *
 * THIS FILE CONTAINS NO PARTICIPANT-FACING WORDING. Every word it shows
 * comes from t3a_participant_safety_notice, which reads the loaded Annex C
 * and the Annex D theme lines. Annex C.3 says the support information "is
 * held as configuration, so it can be changed or localized without a code
 * change" — and a participant outside Canada needs their own emergency
 * number. A crisis line written into a component is a wrong number that
 * nobody can correct without a deploy.
 *
 * So where the server has nothing to give, this renders NOTHING rather than
 * a sentence of its own. That is the deliberate choice and not a gap: a
 * made-up support line is worse than none, because a participant would act
 * on it.
 *
 * CX-31 asks for this:
 *   — on the participant's pre-session screen for every Stage, BEFORE any
 *     Google Meet link;
 *   — on every Stage 1 and Stage 3 screen;
 *   — with the C4a line on every Stage 3 screen;
 *   — with the Annex D theme line for SRC-D1-S4-007 and SRC-D1-S4-010.
 *
 * The server decides which of those apply from the stage and source it is
 * given. This component asks for all of them and renders what comes back,
 * so a screen cannot accidentally omit the one its Stage needed.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notice = {
  available: boolean;
  support_information?: { text: string } | null;
  stage3_line?: { text: string } | null;
  theme_line?: { text: string } | null;
};

type Props = {
  /** The Stage this screen belongs to. The Stage 3 line returns only at S3. */
  stageCode?: "S1" | "S2" | "S3" | "S4";
  /** The source being administered, where one is known. Decides the theme line. */
  sourceIdentifier?: string | null;
};

const ParticipantSafetyNotice = ({ stageCode, sourceIdentifier }: Props) => {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.rpc("t3a_participant_safety_notice", {
        p_stage_code: stageCode ?? null,
        p_source_identifier: sourceIdentifier ?? null,
      });
      if (alive) setNotice((data ?? null) as Notice | null);
    })();
    return () => {
      alive = false;
    };
  }, [stageCode, sourceIdentifier]);

  // Nothing from the server means nothing on the screen. See the header.
  if (!notice?.available) return null;

  const support = notice.support_information?.text;
  const stage3 = notice.stage3_line?.text;
  const theme = notice.theme_line?.text;

  if (!support && !stage3 && !theme) return null;

  return (
    <aside
      /* A landmark rather than a decoration: this is the thing a distressed
         person needs to find, and it must be reachable by a screen reader
         without traversing the observation. */
      aria-label="Support information"
      className="border-l-2 border-foreground/40 pl-6 py-4 mb-10 space-y-2"
    >
      {theme && <p className="text-foreground/85 leading-relaxed">{theme}</p>}
      {stage3 && <p className="text-foreground/85 leading-relaxed">{stage3}</p>}
      {support && <p className="text-foreground/85 leading-relaxed">{support}</p>}
    </aside>
  );
};

export default ParticipantSafetyNotice;
