/**
 * REC-07 — approving a source for serving.
 *
 * This screen exists because the act it performs is not a developer's to
 * perform. The sources are loaded, hashed and refusing to serve; what is
 * missing is a person with standing saying that a given text is fit to
 * put in front of a participant. That is a signature, and a signature
 * has to be made by whoever it names.
 *
 * So the screen does one thing: it makes that act easy, and records who
 * made it. Everything it offers is checked again server-side by
 * t3a_d1_record_source_approval — standing, the version, the hash, the
 * supersession state — and this page never decides any of it.
 *
 * Must not appear, and are absent here:
 *   — any approve-all or bulk control. An approval is per source and per
 *     version, and a control that approves forty at once is a control
 *     that approves forty unread;
 *   — any edit to a source. Approving is not editing, and a screen that
 *     offered both would invite a correction recorded as an approval.
 *
 * Withdrawing is a new row rather than an edit, so the history shows
 * that the source was once approved.
 *
 * CORR-006 CX-18. An approval also records WHAT IT RESTED ON, from a
 * closed list of three. The forty original approvals were recorded in one
 * minute and twenty-seven seconds and the record could not show what any
 * of them rested on; this is the control that makes that unrepeatable.
 *
 * The list is fetched from t3a_d1_approval_basis_closed_list() rather than
 * written out here, so the screen offers exactly what the route accepts.
 * A fourth option typed into this file would be a fourth option the server
 * refuses, and the person would meet the refusal after choosing.
 *
 * The basis is NOT stored on the approval row. It goes to
 * t3a_d1_approval_basis, keyed to the approval, in the same transaction.
 *
 * Withdrawing needs no basis and is not gated by one.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

type Readiness = {
  sources_loaded: number;
  sources_approved: number;
  versions_carrying_a_hash: number;
  any_source_servable: boolean;
  blocked_on: string;
};

type SourceRow = {
  content_object_id: string;
  identifier: string;
  title: string;
};

type VersionRow = {
  content_version_id: string;
  content_object_id: string;
  body: {
    stage_code?: string;
    source_version_hash?: string;
    title?: string;
  };
};

type BasisKind = {
  basis_kind: string;
  records: string;
  requires_referenced_identifier: boolean;
  closed_list_under: string;
};

/** What the approver has selected for one source, before recording. */
type BasisChoice = {
  kind: string | null;
  identifier: string;
};

type ApprovalRow = {
  source_approval_id: string;
  source_id: string;
  source_version_id: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
};

/**
 * The words a person reads for each basis. The server holds the identifier
 * and what it records; this holds only the phrasing of the option, taken
 * from the table at CORR-006 Section 5.2.
 *
 * An identifier with no phrasing here falls back to the identifier itself
 * rather than disappearing from the list — a basis the server accepts must
 * never be one this screen silently declines to offer.
 */
const BASIS_LABEL: Record<string, string> = {
  READ_IN_FULL_IN_THIS_SCREEN: "Read in full in this screen",
  REVIEWED_DURING_AUTHORING_OF_ISSUED_DOCUMENT:
    "Reviewed during authoring of a named issued document",
  COMPARED_AGAINST_SPECIFIED_VALUES_UNDER_INSTRUMENT:
    "Compared against specified values under a named instrument",
};

const basisLabel = (kind: string) => BASIS_LABEL[kind] ?? kind;

const SourceApproval = () => {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [bases, setBases] = useState<BasisKind[]>([]);
  const [choice, setChoice] = useState<Record<string, BasisChoice>>({});

  const load = useCallback(async () => {
    const [{ data: ready }, { data: objs }, { data: vers }, { data: apps }, { data: kinds }] =
      await Promise.all([
        supabase.rpc("t3a_d1_serving_readiness"),
        supabase
          .from("t3a_content_object")
          .select("content_object_id, identifier, title")
          .eq("family", "source")
          .order("identifier"),
        supabase
          .from("t3a_d1_content_version")
          .select("content_version_id, content_object_id, body")
          .is("superseded_by", null),
        supabase.from("t3a_d1_source_approval").select("*"),
        supabase.rpc("t3a_d1_approval_basis_closed_list"),
      ]);
    setReadiness((ready ?? null) as Readiness | null);
    setSources((objs ?? []) as SourceRow[]);
    setVersions((vers ?? []) as VersionRow[]);
    setApprovals((apps ?? []) as ApprovalRow[]);
    setBases((kinds ?? []) as BasisKind[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The basis is sent only with an approval. A withdrawal carries none,
   * and sending one would imply the withdrawal rested on a reading.
   */
  const onRecord = async (
    sourceId: string,
    versionId: string,
    status: "approved" | "withdrawn"
  ) => {
    const picked = choice[sourceId];
    const kind = bases.find((b) => b.basis_kind === picked?.kind) ?? null;
    setWorking(sourceId);
    const { data } = await supabase.rpc("t3a_d1_record_source_approval", {
      p_source_id: sourceId,
      p_source_version_id: versionId,
      p_status: status,
      p_basis_kind: status === "approved" ? (picked?.kind ?? null) : null,
      p_referenced_identifier:
        status === "approved" && kind?.requires_referenced_identifier
          ? picked?.identifier.trim() || null
          : null,
    });
    setWorking(null);

    const result = data as { recorded?: boolean; refusal_code?: string; remedy?: string } | null;
    if (!result?.recorded) {
      toast({
        title: result?.refusal_code ?? "That could not be recorded.",
        description: result?.remedy,
        variant: "destructive",
      });
      return;
    }
    setChoice((c) => ({ ...c, [sourceId]: { kind: null, identifier: "" } }));
    toast({
      title: status === "approved" ? "Approved" : "Withdrawn",
      description:
        status === "approved"
          ? "Recorded against this exact version, in your name."
          : "The approval stands in the history; the source no longer serves.",
    });
    await load();
  };

  if (isLoading) return <LedgerLoading />;

  /**
   * Standing is the LATEST event for this source at THIS version, not any
   * historical approval.
   *
   * Raised in review and correct: the table is append-only, so a
   * withdrawal leaves the original `approved` row in place. Looking for
   * any approved row therefore kept reporting a withdrawn source as
   * approved and offering to withdraw it again — and it ignored whether
   * the approval belonged to the version now standing, so a corrected
   * source would have inherited its predecessor's approval on screen.
   *
   * Ordering is by approved_at and then by the row identifier, which is
   * stable rather than meaningful; the server is the authority on whether
   * an approval may be recorded, and this only decides what to show.
   */
  /**
   * Whether the approve control may be offered. The server refuses the
   * same three ways regardless — this only spares the person a refusal it
   * can see coming, and it never decides whether the basis is TRUE.
   */
  const basisIsComplete = (sourceId: string) => {
    const picked = choice[sourceId];
    const kind = bases.find((b) => b.basis_kind === picked?.kind);
    if (!kind) return false;
    return (
      !kind.requires_referenced_identifier || picked!.identifier.trim().length > 0
    );
  };

  const standing = (sourceId: string, versionId: string | undefined) => {
    if (!versionId) return null;
    const history = approvals
      .filter((a) => a.source_id === sourceId && a.source_version_id === versionId)
      .sort((a, b) => {
        const at = (a.approved_at ?? "").localeCompare(b.approved_at ?? "");
        return at !== 0 ? at : a.source_approval_id.localeCompare(b.source_approval_id);
      });
    const latest = history[history.length - 1];
    return latest && latest.status === "approved" ? latest : null;
  };

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ REC-07 · Source approval"
        title="Which sources may be put in front of a participant"
        meta="An approval names you, a moment and one exact text. It is not something a build can record."
        actions={
          <LedgerBadge variant="outline">
            {readiness
              ? `${readiness.sources_approved} of ${readiness.sources_loaded} approved`
              : "—"}
          </LedgerBadge>
        }
      />

      {readiness && (
        <DashSection eyebrow="§ I · Readiness" title="Where this stands">
          <dl className="max-w-3xl space-y-3 border-t-2 border-foreground pt-6">
            <div className="flex flex-wrap gap-3">
              <dt className="mono-label text-foreground/55 w-56">Sources loaded</dt>
              <dd className="text-foreground/85">{readiness.sources_loaded}</dd>
            </div>
            <div className="flex flex-wrap gap-3">
              <dt className="mono-label text-foreground/55 w-56">Carrying a hash</dt>
              <dd className="text-foreground/85">
                {readiness.versions_carrying_a_hash}
              </dd>
            </div>
            <div className="flex flex-wrap gap-3">
              <dt className="mono-label text-foreground/55 w-56">Approved</dt>
              <dd className="text-foreground/85">{readiness.sources_approved}</dd>
            </div>
          </dl>
          <p className="text-foreground/65 text-[0.875rem] mt-8 max-w-2xl leading-relaxed">
            A hash says which text a version is. It says nothing about whether
            that text is fit to serve — that is this page, and it is a
            signature rather than a calculation.
          </p>
        </DashSection>
      )}

      <DashSection eyebrow="§ II · Sources" title="One at a time, and one version each">
        {sources.length === 0 ? (
          <EmptyState title="No source is loaded." />
        ) : (
          <div className="border-t-2 border-foreground">
            {sources.map((s) => {
              const v = versions.find((x) => x.content_object_id === s.content_object_id);
              const a = standing(s.content_object_id, v?.content_version_id);
              const hash = v?.body?.source_version_hash ?? null;

              return (
                <article
                  key={s.content_object_id}
                  className="py-6 border-b border-foreground/20 flex flex-wrap gap-y-4 gap-x-10"
                >
                  <div className="min-w-[18rem] flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-4">
                      <span className="mono-label text-foreground/55">
                        {s.identifier}
                      </span>
                      {v?.body?.stage_code && (
                        <span className="mono-label text-foreground/40">
                          {v.body.stage_code}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/85 mt-1 leading-relaxed">
                      {s.title}
                    </p>
                    <p className="mono-label text-foreground/40 mt-2 break-all">
                      {hash ? `sha256 ${hash.slice(0, 16)}…` : "no hash — cannot be approved"}
                    </p>
                  </div>

                  <div className="min-w-[10rem] flex-1">
                    <span className="mono-label text-foreground/55">Status</span>
                    <p
                      className={cn(
                        "mt-1",
                        a ? "text-foreground/85" : "ink-vermilion"
                      )}
                    >
                      {a ? "Approved for serving" : "Not approved"}
                    </p>
                    {a?.approved_at && (
                      <p className="text-foreground/55 text-[0.875rem] mt-1">
                        {new Date(a.approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="self-center">
                    {!v ? (
                      <span className="mono-label text-foreground/40">
                        No standing version
                      </span>
                    ) : a ? (
                      <Button
                        variant="ghost"
                        disabled={working === s.content_object_id}
                        onClick={() =>
                          void onRecord(
                            s.content_object_id,
                            a.source_version_id,
                            "withdrawn"
                          )
                        }
                      >
                        Withdraw
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={
                          working === s.content_object_id ||
                          !hash ||
                          !basisIsComplete(s.content_object_id)
                        }
                        onClick={() =>
                          void onRecord(
                            s.content_object_id,
                            v.content_version_id,
                            "approved"
                          )
                        }
                      >
                        {working === s.content_object_id ? "Recording…" : "Approve this version"}
                      </Button>
                    )}
                  </div>

                  {/*
                    CX-18. Offered only where an approval is the act on
                    offer: a withdrawal records no basis, and a source
                    already approved is not being approved again here.
                  */}
                  {v && !a && (
                    <fieldset className="w-full border-t border-foreground/15 pt-4">
                      <legend className="mono-label text-foreground/55 pr-3">
                        What this approval rests on
                      </legend>
                      <div className="space-y-2">
                        {bases.map((b) => {
                          const picked =
                            choice[s.content_object_id]?.kind === b.basis_kind;
                          return (
                            <div key={b.basis_kind}>
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`basis-${s.content_object_id}`}
                                  className="mt-1"
                                  checked={picked}
                                  onChange={() =>
                                    setChoice((c) => ({
                                      ...c,
                                      [s.content_object_id]: {
                                        kind: b.basis_kind,
                                        identifier:
                                          c[s.content_object_id]?.identifier ?? "",
                                      },
                                    }))
                                  }
                                />
                                <span>
                                  <span className="text-foreground/85">
                                    {basisLabel(b.basis_kind)}
                                  </span>
                                  <span className="mono-label text-foreground/40 block mt-0.5">
                                    {b.records}
                                  </span>
                                </span>
                              </label>
                              {picked && b.requires_referenced_identifier && (
                                <input
                                  type="text"
                                  value={choice[s.content_object_id]?.identifier ?? ""}
                                  placeholder="Its identifier, exactly as issued"
                                  aria-label="Identifier of the document or instrument this approval rests on"
                                  className="mono-label mt-2 ml-7 w-full max-w-md border-b border-foreground/30 bg-transparent py-1 outline-none focus:border-foreground"
                                  onChange={(e) =>
                                    setChoice((c) => ({
                                      ...c,
                                      [s.content_object_id]: {
                                        kind: b.basis_kind,
                                        identifier: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!basisIsComplete(s.content_object_id) && (
                        <p className="mono-label ink-vermilion mt-3">
                          {choice[s.content_object_id]?.kind
                            ? "Name the document or instrument."
                            : "Choose one. An approval that records nothing about what it rested on is refused."}
                        </p>
                      )}
                    </fieldset>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </DashSection>

      <DashSection eyebrow="§ III · What approving means" title="And what it does not">
        <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
          <p className="text-foreground/85 leading-relaxed">
            Approving records that you, by name, hold this exact text fit to
            put in front of a participant. It is recorded against the version
            hash, so a later version does not inherit it and a corrected source
            must be approved again.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            There is no approve-all control. An approval is per source and per
            version, because a control that approves forty at once is a control
            that approves forty unread.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Withdrawing does not erase an approval. It records a withdrawal, so
            the history shows that the source was once approved and by whom.
          </p>
        </div>
      </DashSection>
    </div>
  );
};

export default SourceApproval;
