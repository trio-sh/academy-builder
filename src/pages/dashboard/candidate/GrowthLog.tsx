import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader, DashSection, EmptyState, LedgerLoading } from "@/components/dashboard/primitives";

/**
 * The Growth Log (T3A-DEV-DAY1-001 Domain J, REQ-GL-001).
 *
 * It is the participant's own notebook. Only they can read or write it. The platform writes nothing here; nothing here is scored,
 * trended, shared with a mentor or an employer, or used to decide anything. The observation list below it is not stored in the log:
 * it is regenerated from the canonical record each time the page opens, and carries no measure, trend or progress figure.
 */

type EntryKind = "practice_note" | "rehearsal_reference";

interface Note {
  entry_id: string;
  entry_kind: EntryKind;
  text: string | null;
  module_reference: string | null;
  created_at: string;
  updated_at: string;
}

interface ObservationRow {
  observation_id: string;
  stage_code: string;
  dimension_id: string;
  committed_at: string;
}

// The Domain J tables are not in the generated client types, so they are reached through an untyped handle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

const KIND_LABEL: Record<EntryKind, string> = { practice_note: "Practice note", rehearsal_reference: "Rehearsal reference" };

const GrowthLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<EntryKind>("practice_note");
  const [text, setText] = useState("");
  const [moduleRef, setModuleRef] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [n, o] = await Promise.all([
      db.from("t3a_growth_log_entry").select("entry_id, entry_kind, text, module_reference, created_at, updated_at").order("created_at", { ascending: false }),
      db.from("t3a_growth_log_observation_view").select("*").order("committed_at", { ascending: false }),
    ]);
    setNotes((n.data ?? []) as Note[]);
    setObservations((o.data ?? []) as ObservationRow[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setText("");
    setModuleRef("");
    setKind("practice_note");
    setEditingId(null);
  };

  const save = async () => {
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    const moduleReference = moduleRef.trim() || null;
    const result = editingId
      ? await db.from("t3a_growth_log_entry").update({ text: body, module_reference: moduleReference }).eq("entry_id", editingId)
      : await db.from("t3a_growth_log_entry").insert({ entry_kind: kind, text: body, module_reference: moduleReference });
    setSaving(false);
    if (result.error) {
      toast({ title: "Could not save the note", description: result.error.message, variant: "destructive" });
      return;
    }
    reset();
    await load();
  };

  const edit = (n: Note) => {
    setEditingId(n.entry_id);
    setKind(n.entry_kind);
    setText(n.text ?? "");
    setModuleRef(n.module_reference ?? "");
  };

  const remove = async (id: string) => {
    const { error } = await db.from("t3a_growth_log_entry").delete().eq("entry_id", id);
    if (error) {
      toast({ title: "Could not delete the note", description: error.message, variant: "destructive" });
      return;
    }
    if (editingId === id) reset();
    await load();
  };

  if (loading) return <LedgerLoading text="Opening your notebook…" />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Growth Log"
        title="Your own notes."
        meta="Only you can see this page. The platform writes nothing here, and nothing here is measured, compared, shared or used to decide anything."
      />

      <DashSection eyebrow={editingId ? "Editing" : "New"} title={editingId ? "Change your note" : "Write a note"}>
        <div className="space-y-4 max-w-2xl">
          {!editingId && (
            <div className="flex gap-2" role="group" aria-label="Kind of note">
              {(Object.keys(KIND_LABEL) as EntryKind[]).map((k) => (
                <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)} className="border-foreground/25">
                  {KIND_LABEL[k]}
                </Button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="What did you notice? What would you try next time?"
            aria-label="Note text"
            className="w-full border border-foreground/30 bg-background p-3 text-foreground"
          />
          <input
            value={moduleRef}
            onChange={(e) => setModuleRef(e.target.value)}
            maxLength={200}
            placeholder="Practice or module this is about (optional)"
            aria-label="Module reference"
            className="w-full border border-foreground/30 bg-background p-3 text-foreground"
          />
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving || !text.trim()}>{editingId ? "Save changes" : "Save note"}</Button>
            {editingId && <Button variant="outline" onClick={reset} className="border-foreground/25">Cancel</Button>}
          </div>
        </div>
      </DashSection>

      <DashSection eyebrow="Notes" title="What you have written">
        {notes.length === 0 ? (
          <EmptyState title="Nothing here yet." body="Notes you write will appear here, and only to you." />
        ) : (
          <ul className="space-y-4">
            {notes.map((n) => (
              <li key={n.entry_id} className="border border-foreground/30 p-4">
                <div className="mono-label text-foreground/60 mb-2">
                  {KIND_LABEL[n.entry_kind]} · {new Date(n.created_at).toLocaleDateString()}
                  {n.module_reference ? ` · ${n.module_reference}` : ""}
                </div>
                <p className="whitespace-pre-wrap text-foreground">{n.text}</p>
                <div className="mt-3 flex gap-3">
                  <Button size="sm" variant="outline" onClick={() => edit(n)} className="border-foreground/25">Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(n.entry_id)} className="border-foreground/25">Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashSection>

      <DashSection eyebrow="From your record" title="Observations on file">
        <p className="text-foreground/60 mb-4 max-w-2xl">
          This list is rebuilt from your observation record each time you open the page. It is not stored here and it does not measure anything.
        </p>
        {observations.length === 0 ? (
          <EmptyState title="No observations yet." />
        ) : (
          <ul className="divide-y divide-foreground/20 border-y border-foreground/30">
            {observations.map((o) => (
              <li key={o.observation_id} className="py-3 flex justify-between gap-4 text-foreground">
                <span>Stage {o.stage_code.replace(/^S/, "")} · {o.dimension_id}</span>
                <span className="text-foreground/60">{new Date(o.committed_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </DashSection>
    </div>
  );
};

export default GrowthLog;
