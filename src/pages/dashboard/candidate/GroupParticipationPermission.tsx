/**
 * The Stage 4 group participation permission: one question, the founder's text, Yes or No.
 *
 * The text, its version and its hash are read from t3a_s4_group_notice(); nothing is written here.
 * Yes records the permission through t3a_s4_record_group_participation, bound to that version and hash.
 * No records nothing and is not held against the participant. Unloaded text renders no question.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Notice { rendered?: boolean; text?: string; notice_version?: string }

export default function GroupParticipationPermission({ groupSessionId, onDone }: { groupSessionId: string; onDone?: (answer: "yes" | "no") => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.rpc("t3a_s4_group_notice").then(({ data }) => { if (live) setNotice((data as Notice) ?? null); });
    return () => { live = false; };
  }, []);

  if (!notice?.rendered || !notice.text) return null;

  const answerYes = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("t3a_s4_record_group_participation", { p_group_session: groupSessionId });
    setBusy(false);
    const outcome = (data as { outcome?: string } | null)?.outcome;
    if (error || outcome === "refused") { setMessage("Your answer could not be saved. Please try again."); return; }
    onDone?.("yes");
  };
  const answerNo = () => { onDone?.("no"); setMessage("Thank you. Nothing has been recorded."); };

  return (
    <section className="rounded-md border p-4 space-y-3" data-testid="group-participation-permission">
      {notice.text.split("\n").map((line, i) => (<p key={i} className="text-sm">{line}</p>))}
      <div className="flex gap-2">
        <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy} onClick={answerYes}>Yes</button>
        <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy} onClick={answerNo}>No</button>
      </div>
      {message ? <p className="text-sm" role="status">{message}</p> : null}
    </section>
  );
}
