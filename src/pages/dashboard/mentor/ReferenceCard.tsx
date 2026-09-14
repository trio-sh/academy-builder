/**
 * The mentor reference card — T3A-D1-EXEC-001 §5.3 and §1.5.
 *
 * "Every script now ends with a one-page MENTOR REFERENCE CARD, kept
 * visible for the whole session."
 *
 * It carries: the four questions, the material items, the unsupported
 * assertions, the attribution support set, the available routes, and
 * which capture lines are shown.
 *
 * Must not appear, and are absent here:
 *   — any expected response, strong answer or red flag;
 *   — anything indicating which capture line is the better one.
 *
 * That absence is structural rather than editorial. The card is
 * assembled by t3a_d1_reference_card and the register it reads has no
 * column a preference could be written into — an event trigger refuses
 * to let one be added. This screen renders what the server returns and
 * computes nothing about a line.
 *
 * Lines render in the register's own order. They are never sorted,
 * grouped, emphasized, coloured by position or marked, because any of
 * those would tell a mentor which one to reach for.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

type Line = { line_order: number; line_text: string };

type CaptureSet = {
  capture_set_code: string;
  title: string;
  applicability_note: string | null;
  governing_field: string | null;
  governing_value_verbatim: string | null;
  offered:
    | "ALWAYS"
    | "STATED_BY_SOURCE"
    | "NOT_OFFERED_BY_SOURCE"
    | "NOT_DETERMINABLE_FROM_SOURCE_SHEET";
  lines: Line[] | null;
};

type SourceList = {
  field: string;
  well_formed: boolean;
  verbatim?: string;
  empty_set?: boolean;
  refusal_code?: string;
};

type Card = {
  rendered: boolean;
  refusal_code?: string;
  source_identifier?: string;
  title?: string;
  stage_code?: string;
  operational_state?: string;
  four_questions?: { ask_no: number; question_text: string }[];
  four_questions_note?: string | null;
  lists?: {
    material_items: SourceList;
    unsupported_assertions: SourceList;
    attribution_support_set: SourceList;
    available_routes: SourceList;
  };
  capture_sets?: CaptureSet[];
};

type SourceRow = { identifier: string; title: string };

/** §1.5 sections 2 and 3 — the two lists a claim is checked against. */
const LIST_LABELS: Record<string, string> = {
  material_items: "Material items",
  unsupported_assertions: "Unsupported assertions",
  attribution_support_set: "Attribution support set",
  available_routes: "Available routes",
};

const SourceListBlock = ({ list }: { list: SourceList }) => (
  <div className="py-5 border-b border-foreground/20">
    <span className="mono-label text-foreground/55">
      {LIST_LABELS[list.field] ?? list.field}
    </span>
    {list.well_formed ? (
      list.empty_set ? (
        <p className="text-foreground/70 mt-2 leading-relaxed">{list.verbatim}</p>
      ) : (
        <p className="text-foreground/85 mt-2 leading-relaxed">{list.verbatim}</p>
      )
    ) : (
      <div className="mt-2">
        <p className="mono-label ink-vermilion">{list.refusal_code}</p>
        <p className="text-foreground/70 text-[0.875rem] mt-2 leading-relaxed">
          This list is not in the form the source states it in, so the card
          will not present it as a list to check a claim against. Read it in
          the source.
        </p>
      </div>
    )}
  </div>
);

const ReferenceCard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [card, setCard] = useState<Card | null>(null);

  const loadSources = useCallback(async () => {
    const { data } = await supabase
      .from("t3a_content_object")
      .select("identifier, title")
      .eq("family", "source")
      .order("identifier");
    setSources((data ?? []) as SourceRow[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    const build = async () => {
      if (!selected) {
        setCard(null);
        return;
      }
      // The card is the server's, whole. Nothing is assembled here.
      const { data } = await supabase.rpc("t3a_d1_reference_card", {
        p_source_identifier: selected,
      });
      setCard((data ?? null) as Card | null);
    };
    void build();
  }, [selected]);

  if (isLoading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ 5.3 · Mentor reference card"
        title="The lines, the lists and the four questions"
        meta="Kept visible for the whole session. It holds no expected response and nothing saying which line is the better one."
        actions={<LedgerBadge variant="outline">No preferred line</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Source" title="Which script">
        {sources.length === 0 ? (
          <EmptyState title="No source is loaded." />
        ) : (
          <label className="block max-w-xl">
            <span className="mono-label text-foreground/70 block mb-2">Source</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
            >
              <option value="">—</option>
              {sources.map((s) => (
                <option key={s.identifier} value={s.identifier}>
                  {s.identifier} · {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </DashSection>

      {card && !card.rendered && (
        <DashSection eyebrow="§ II · Refused" title="No card for this source">
          <p className="mono-label ink-vermilion">{card.refusal_code}</p>
        </DashSection>
      )}

      {card?.rendered && (
        <>
          {/* §5.18 — none of these sources is registered for serving.
              A card that looked production-ready would misrepresent
              that, so the state is stated at the top. */}
          {card.operational_state !== "serving" && (
            <DashSection eyebrow="§ II · State" title="This source is not registered for serving">
              <p className="text-foreground/80 max-w-2xl leading-relaxed">
                It carries no source approval and no source-version hash, so it
                holds the state{" "}
                <span className="mono-label">{card.operational_state}</span>. The
                card is readable; the source is not servable.
              </p>
            </DashSection>
          )}

          <DashSection eyebrow="§ III · The four questions" title="In this order, and nothing else is a question">
            {card.four_questions && card.four_questions.length > 0 ? (
              <ol className="border-t-2 border-foreground max-w-3xl">
                {card.four_questions.map((q) => (
                  <li
                    key={q.ask_no}
                    className="flex gap-6 py-4 border-b border-foreground/20"
                  >
                    <span className="mono-label text-foreground/55 shrink-0">
                      ASK {q.ask_no}
                    </span>
                    <span className="text-foreground/85 leading-relaxed">
                      {q.question_text}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {card.four_questions_note === "STAGE_CARRIES_NO_LIVE_SCRIPT" && (
              <p className="text-foreground/75 max-w-2xl leading-relaxed">
                This Stage carries no live script, so it asks no four questions.
                Stage 1 is administered and Stage 3 is a work sample.
              </p>
            )}
            {card.four_questions_note ===
              "FOUR_QUESTIONS_NOT_FULLY_EXTRACTABLE_READ_THE_SCRIPT" && (
              <p className="text-foreground/75 max-w-2xl leading-relaxed mt-6">
                Fewer than four questions could be read out of this script
                verbatim. The card shows only what the script states and
                supplies nothing — read the script itself before the session.
              </p>
            )}
          </DashSection>

          {card.lists && (
            <DashSection
              eyebrow="§ IV · The lists"
              title="What a claim is checked against"
            >
              <div className="border-t-2 border-foreground max-w-3xl">
                <SourceListBlock list={card.lists.material_items} />
                <SourceListBlock list={card.lists.unsupported_assertions} />
                <SourceListBlock list={card.lists.attribution_support_set} />
                <SourceListBlock list={card.lists.available_routes} />
              </div>
              <p className="text-foreground/65 text-[0.875rem] mt-8 max-w-2xl leading-relaxed">
                Whether an account corresponds to what the source provided is
                the one place correctness genuinely exists. It is a factual
                check against these written lists, not a judgment.
              </p>
            </DashSection>
          )}

          <DashSection eyebrow="§ V · Capture lines" title="What you select from">
            <div className="border-t-2 border-foreground">
              {(card.capture_sets ?? []).map((s) => (
                <section key={s.capture_set_code} className="py-6 border-b border-foreground/20">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="mono-label text-foreground/55">
                      {s.capture_set_code}
                    </span>
                    <h3 className="display-serif text-lg text-foreground">{s.title}</h3>
                    {s.applicability_note && (
                      <span className="text-foreground/55 text-[0.875rem]">
                        {s.applicability_note}
                      </span>
                    )}
                  </div>

                  {s.offered === "NOT_OFFERED_BY_SOURCE" ? (
                    <p className="text-foreground/60 text-[0.875rem] mt-3 leading-relaxed">
                      This source does not offer it, so no row exists at all.
                    </p>
                  ) : s.offered === "NOT_DETERMINABLE_FROM_SOURCE_SHEET" ? (
                    <div className="mt-3">
                      <p className="mono-label ink-vermilion">
                        NOT_DETERMINABLE_FROM_SOURCE_SHEET
                      </p>
                      <p className="text-foreground/70 text-[0.875rem] mt-2 leading-relaxed">
                        The source sheet field{" "}
                        <span className="mono-label">{s.governing_field}</span>{" "}
                        does not state this plainly. Read the source rather than
                        taking the card's word for it.
                      </p>
                      {s.governing_value_verbatim && (
                        <p className="text-foreground/60 text-[0.875rem] mt-2 leading-relaxed">
                          {s.governing_value_verbatim}
                        </p>
                      )}
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2 max-w-3xl">
                      {(s.lines ?? []).map((l) => (
                        <li
                          key={l.line_order}
                          className={cn(
                            "flex gap-4 text-foreground/85 leading-relaxed"
                          )}
                        >
                          <span className="mono-label text-foreground/40 shrink-0">
                            {l.line_order}
                          </span>
                          <span>{l.line_text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </DashSection>

          <DashSection
            eyebrow="§ VI · What this card does not hold"
            title="And why it does not"
          >
            <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
              <p className="text-foreground/85 leading-relaxed">
                There is no expected response, no strong answer, no red flag and
                nothing indicating which capture line is the better one.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                A mentor who knows the preferred answer will find it, and two
                mentors who both know it end up agreeing with each other about
                the participant rather than about what happened. The agreement
                statistic then looks excellent while measuring nothing.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                Telling the manager first rather than sending the report quietly
                is a defensible choice, not a right one. The moment the platform
                holds a view about which is better, the record stops describing
                conduct and starts scoring judgment.
              </p>
            </div>
          </DashSection>
        </>
      )}
    </div>
  );
};

export default ReferenceCard;
