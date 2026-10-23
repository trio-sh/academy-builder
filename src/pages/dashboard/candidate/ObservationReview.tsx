/**
 * CORR-007 CR-06: the participant reviews a committed observation and may challenge it.
 *
 * The page shows the statements written from the observation and the commitment of the consent notice (paragraph 2.21) word for word, taken from the
 * database. A correction is raised with one of the six named grounds. Nothing here edits the record: a correction opens a case that is decided by someone
 * uninvolved. If the commitment cannot render, no correction is taken.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const GROUNDS: { key: string; label: string; body: string }[] = [
  { key: "factual_error", label: "Factual error", body: "Something in the statement or its underlying observation is factually incorrect." },
  { key: "mistaken_identity", label: "Mistaken identity", body: "The observation records someone else's conduct as though it were mine." },
  { key: "procedural_failure", label: "Procedural failure", body: "The observation was not conducted per the stated method or standard." },
  { key: "observer_conflict", label: "Observer conflict", body: "The observer had a conflict of interest that was not declared." },
  { key: "inaccurate_description", label: "Inaccurate description", body: "The statement's wording characterizes the observation in a way the observation does not support." },
  { key: "compromised_conditions", label: "Compromised conditions", body: "The administration conditions of the observation were compromised in a material way." },
];

interface Commitment { rendered?: boolean; value?: string }
interface Statement { composed_statement_id: string; stage_code: string; clauses: { clause_text?: string }[] | null }
interface Review {
  outcome?: string; dimension_id?: string; stage_code?: string; committed_at?: string; in_a_report?: boolean;
  statements?: Statement[]; correction_commitment?: Commitment; open_corrections?: number;
}

export default function ObservationReview() {
  const { observationId } = useParams<{ observationId: string }>();
  const [review, setReview] = useState<Review | null | "error">(null);
  const [ground, setGround] = useState("");
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [raised, setRaised] = useState<Commitment | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!observationId) return;
    const { data, error } = await supabase.rpc("t3a_cr06_observation_review", { p_observation_record: observationId });
    setReview(error ? "error" : ((data as Review) ?? {}));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [observationId]);

  if (!observationId) return null;
  if (review === null) return <p role="status">Loading…</p>;
  if (review === "error") return <p role="alert">This observation could not be loaded. Please try again.</p>;
  if (review.outcome !== "open") return <p role="status" data-testid="obs-unavailable">This observation is not available to you.</p>;

  const commitment = review.correction_commitment;
  const canRaise = commitment?.rendered === true && !!commitment.value;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ground) return;
    setBusy(true);
    const { data } = await supabase.rpc("t3a_cr06_raise_correction", { p_observation_record: observationId, p_ground: ground, p_narrative: narrative.trim() || null });
    setBusy(false);
    const d = data as { outcome?: string; correction_commitment?: Commitment } | null;
    if (d?.outcome === "raised") { setRaised(d.correction_commitment ?? commitment ?? null); setMessage(null); setGround(""); setNarrative(""); await load(); }
    else setMessage("Your correction could not be taken. Please try again.");
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="observation-review">
      <h1 className="text-xl font-semibold">Review this observation</h1>
      <p className="text-sm" data-testid="obs-meta">Dimension {review.dimension_id}, Stage {review.stage_code}{review.in_a_report ? ". It is used in a report." : "."}</p>

      <section className="space-y-2" data-testid="obs-statements">
        <h2 className="font-medium">What was written from it</h2>
        {(review.statements ?? []).length === 0 ? <p className="text-sm">No statement has been written from it yet.</p> : (
          <ul className="space-y-2">
            {review.statements!.map((s) => (
              <li key={s.composed_statement_id} className="text-sm border-l-2 pl-3">
                {(s.clauses ?? []).map((c, i) => (<p key={i}>{c.clause_text}</p>))}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(review.open_corrections ?? 0) > 0 ? <p className="text-sm" data-testid="obs-open">You have {review.open_corrections} correction{review.open_corrections === 1 ? "" : "s"} open on this observation.</p> : null}

      {raised ? <p role="status" data-testid="obs-raised">Your correction is raised. {raised.value}</p> : null}
      {message ? <p role="alert">{message}</p> : null}

      {canRaise ? (
        <form onSubmit={submit} className="space-y-3" data-testid="obs-form">
          <h2 className="font-medium">Raise a correction</h2>
          <p className="text-sm" data-testid="obs-commitment">{commitment!.value}</p>
          <fieldset className="space-y-1">
            <legend className="text-sm">What is wrong?</legend>
            {GROUNDS.map((g) => (
              <label key={g.key} className="block text-sm">
                <input type="radio" name="ground" value={g.key} checked={ground === g.key} onChange={() => setGround(g.key)} /> <strong>{g.label}.</strong> {g.body}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm">Tell us more (optional)<textarea className="block w-full border rounded px-2 py-1" value={narrative} onChange={(e) => setNarrative(e.target.value)} /></label>
          <button type="submit" className="rounded border px-4 py-2 text-sm" disabled={busy || !ground}>Raise correction</button>
        </form>
      ) : <p role="status" data-testid="obs-no-commitment">Corrections cannot be taken right now. Please try again later.</p>}
    </div>
  );
}
