/**
 * Multi page Behavioral Evidence Report: T3A-RCE-STD-001 v9.19, Section 62.
 *
 * Sits beside BerPrintView (the single page face) and shares its palette, fonts and controlled texts. The two
 * differ in pagination and nothing else (¶62.3). Every page is 612 x 792 points. Page 1 is the cover, pages
 * 2 onward carry the dimension blocks (three at most, a block never splits), the last page carries the controls.
 *
 * Nothing is drawn unless every control passes (checkAndResolve and paginate). A refusal shows its code and
 * no page. A page whose content runs past the content box is measured after layout and refuses `layout_overflow`.
 *
 * Source of the manifest: the frozen specimen (FIX-MULTIPAGE, demonstration mode) at /print/ber-multi/specimen, and for a real
 * report the server's t3a_ber_multipage_claims route (CR-168): issued reports only, mode issued, so an entry that is not
 * approved for production refuses at issue. A real participant is never shown as a specimen.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import fixture from "@/lib/berMultipage/fix-multipage.json";
import {
  GEOMETRY, longDate, paginate, checkAndResolve, frameText,
  type Layout, type Package, type Resolved, type ResolvedBlock, type Page, type Measure,
} from "@/lib/berMultipage";
import { BarCode, COLORS, FONTS_HREF, QrPlaceholder } from "./BerPrintView";
import { supabase } from "@/lib/supabase";

const C = COLORS;
const PT = (n: number) => `${n}pt`;

const CSS = `
html, body { margin: 0; padding: 0; background: #e8e4dc; }
body.ber-multi-root { font-family: 'Liberation Sans', Arial, Helvetica, sans-serif; color: ${C.BODY}; }
.mp * { box-sizing: border-box; }
.mp-page { position: relative; width: 612pt; height: 792pt; margin: 18px auto; background: #fff; overflow: hidden;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15); page-break-after: always; break-after: page; }
.mp-abs { position: absolute; }
.mp-sans { font-family: 'Liberation Sans', Arial, sans-serif; }
.mp-serif { font-family: 'Liberation Serif', Georgia, 'Times New Roman', serif; font-weight: 700; }
.mp-b { font-weight: 700; }
.mp-i { font-style: italic; }
.mp-nav { color: ${C.NAVY}; } .mp-ox { color: ${C.OX}; } .mp-mu { color: ${C.MUTED}; }
.mp-caps { text-transform: uppercase; }
.mp-j { text-align: justify; }
.mp-block-fill { background: ${C.PARCH}; border: 0.5pt solid ${C.GTL}; }
.mp-colhead { background: ${C.NAVY}; color: #fff; font-weight: 700; font-size: 7pt; letter-spacing: 0.04em; text-transform: uppercase; }
.mp-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: ${C.NAVY}; color: #fff; font-size: 10.5pt; letter-spacing: 0.08em; text-transform: uppercase; }
.mp-toolbar button { padding: 8px 18px; border: 1px solid #fff; background: #fff; color: ${C.NAVY}; font: inherit; font-weight: 700; cursor: pointer; }
.mp-refused { max-width: 720px; margin: 60px auto; font-family: 'Liberation Sans', Arial, sans-serif; }
@page { size: 612pt 792pt; margin: 0; }
@media print {
  html, body { background: #fff; }
  .mp-toolbar { display: none; }
  .mp-page { margin: 0; box-shadow: none; }
}
`;

/** Browser measure with the real faces; falls back to the calibrated estimate where no canvas exists. */
function browserMeasure(): Measure | undefined {
  if (typeof document === "undefined") return undefined;
  const ctx = document.createElement("canvas").getContext?.("2d");
  if (!ctx) return undefined;
  const fonts: Record<string, string> = {
    sans: "400 {s}pt 'Liberation Sans', Arial, sans-serif",
    sansBold: "700 {s}pt 'Liberation Sans', Arial, sans-serif",
    sansItalic: "italic 400 {s}pt 'Liberation Sans', Arial, sans-serif",
    serifBold: "700 {s}pt 'Liberation Serif', Georgia, serif",
  };
  return (text, face, size, tracking = 0) => {
    ctx.font = fonts[face].replace("{s}", String(size));
    return ctx.measureText(text).width * (72 / 96) + text.length * tracking * size;
  };
}

function Refused({ code, detail }: { code: string; detail?: string }) {
  return (
    <div className="mp-refused">
      <div style={{ fontSize: "11pt", color: C.NAVY, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>Report not produced</div>
      <h2 className="mp-serif" style={{ color: C.NAVY, fontSize: "22pt", margin: "6px 0 10px 0" }}>{code}</h2>
      <p style={{ fontSize: "10pt", lineHeight: 1.4 }}>{detail ?? ""}</p>
      <p style={{ fontSize: "9pt", color: C.MUTED }}>No page is produced for a manifest the Standard refuses.</p>
    </div>
  );
}

const T = (pkg: Package, k: string): string => pkg.controlled_texts[k] as string;
const TL = (pkg: Package, k: string): [string, string] => pkg.controlled_texts[k] as unknown as [string, string];

function Footer({ pkg, r, page, total }: { pkg: Package; r: Resolved; page: number; total: number }) {
  const mode = r.manifest.output_mode;
  return (
    <>
      <div className="mp-abs" style={{ left: PT(36), width: PT(540), top: PT(752), borderTop: `0.5pt solid ${C.GTL}` }} />
      <div className="mp-abs mp-b mp-nav" style={{ left: PT(36), top: PT(756), fontSize: PT(7.5) }}>{pkg.state_maps["T-FOOTER-MAP"][mode]}</div>
      <div className="mp-abs mp-b mp-nav" style={{ right: PT(36), top: PT(756), fontSize: PT(7.5) }}>Page {page} of {total}</div>
      <div className="mp-abs mp-mu" style={{ left: 0, width: PT(612), textAlign: "center", top: PT(768), fontSize: PT(6.2) }}>{T(pkg, "T-COLOPHON-001")}</div>
    </>
  );
}

function RunHead({ pkg, r, title, detail }: { pkg: Package; r: Resolved; title: string; detail?: string }) {
  const m = r.manifest;
  return (
    <>
      <img src="/logo.png" alt="" className="mp-abs" style={{ left: PT(36), top: PT(24), height: PT(14) }} />
      <div className="mp-abs mp-b mp-nav" style={{ left: PT(58), top: PT(27), fontSize: PT(7), letterSpacing: "0.08em" }}>{pkg.fixed_strings.institution}</div>
      <div className="mp-abs mp-mu" style={{ right: PT(36), top: PT(27), fontSize: PT(7), letterSpacing: 0 }}>
        {m.participant_display_name}  |  {m.report_id}  |  v{m.report_version}
      </div>
      <div className="mp-abs" style={{ left: PT(36), width: PT(540), top: PT(40), borderTop: `0.5pt solid ${C.GTL}` }} />
      <div className="mp-abs mp-b mp-nav" style={{ left: PT(36), top: PT(46), fontSize: PT(13) }}>{title}</div>
      {detail ? <div className="mp-abs mp-mu" style={{ left: PT(36), top: PT(65), fontSize: PT(7.5) }}>{detail}</div> : null}
    </>
  );
}

function Lead({ lead, body, size, color = C.BODY }: { lead: string; body: string; size: number; color?: string }) {
  return (
    <p className="mp-j" style={{ margin: 0, fontSize: PT(size), lineHeight: 1.15, color }}>
      <span className="mp-b mp-nav" style={{ marginRight: PT(5) }}>{lead}</span>{body}
    </p>
  );
}

function Cover({ pkg, r, layout }: { pkg: Package; r: Resolved; layout: Layout }) {
  const m = r.manifest;
  const F = pkg.fixed_strings;
  const vis = pkg.state_maps["T-VISIBILITY-MAP"][
    ({ released: "active", withdrawn: "withdrawn" } as Record<string, string>)[m.release_state] ?? "not_released"] as [string, string];
  const refmark = pkg.state_maps["T-REFMARK-MAP"][m.output_mode] as string | null;
  const scope = TL(pkg, "T-SCOPE-001");
  const dims = pkg.dimension_register.dimensions;
  return (
    <>
      <div className="mp-abs" style={{ left: PT(496), top: PT(24), width: PT(80), height: PT(76), background: C.PARCH, border: `0.5pt solid ${C.GTL}` }}>
        <svg viewBox="0 0 80 76" width="100%" height="100%"><circle cx="40" cy="22" r="11" fill={C.GT} /><rect x="20" y="38" width="40" height="24" rx="10" fill={C.GT} /></svg>
        <div className="mp-abs mp-b mp-mu" style={{ left: 0, width: "100%", textAlign: "center", top: PT(60), fontSize: PT(5.8) }}>{F.photo_label}</div>
      </div>
      <img src="/logo.png" alt="" className="mp-abs" style={{ left: PT(36), top: PT(19.8), height: PT(21.2) }} />
      <div className="mp-abs mp-b mp-nav" style={{ left: PT(61), top: PT(24), fontSize: PT(9), letterSpacing: "0.08em" }}>{F.institution}</div>
      <div className="mp-abs mp-serif mp-nav" style={{ left: PT(36), top: PT(44), fontSize: PT(22) }}>{F.title}</div>
      <div className="mp-abs" style={{ left: PT(36), top: PT(79), width: PT(440), fontSize: PT(8), lineHeight: 1.15 }}>{T(pkg, "T-PURPOSE-001")}</div>
      <div className="mp-abs" style={{ left: PT(36), top: PT(104), width: PT(540), height: PT(3), background: C.NAVY }} />
      <div className="mp-abs" style={{ left: PT(36), top: PT(107), width: PT(540), height: PT(49), background: C.PARCH, border: `0.5pt solid ${C.GTL}` }} />
      {[47.2, 180.0, 309.6, 403.6].map((x, i) => (
        <div key={i} className="mp-abs" style={{ left: PT(x), top: PT(110) }}>
          <div className="mp-b" style={{ color: C.NAVYL, fontSize: PT(7), letterSpacing: "0.06em" }}>{F.id_labels[i]}</div>
          <div className="mp-b" style={{ fontSize: PT(i === 0 ? 13 : 10.5), color: i === 0 ? C.NAVY : C.BODY, marginTop: PT(2) }}>
            {[m.participant_display_name, m.report_id, longDate(m.issue_date), longDate(m.evidence_currency_date)][i]}
          </div>
        </div>
      ))}
      <div className="mp-abs" style={{ left: PT(47.2), top: PT(139), fontSize: PT(7) }}>
        <span className="mp-b" style={{ color: C.NAVYL, letterSpacing: "0.06em" }}>{F.status_label}</span>
        <span style={{ fontSize: PT(8.5), marginLeft: PT(14) }}>{pkg.state_maps["T-STATUS-MAP"][m.participant_status]}</span>
        <span className="mp-mu" style={{ fontSize: PT(7.5), marginLeft: PT(60) }}>Version {m.report_version}</span>
      </div>
      <div className="mp-abs" style={{ left: PT(36), top: PT(162), width: PT(540), height: PT(68), background: C.PARCH, border: `0.5pt solid ${C.GTL}` }} />
      <div className="mp-abs" style={{ left: PT(46), top: PT(172) }}><QrPlaceholder size={44 * (96 / 72)} /></div>
      <div className="mp-abs mp-b mp-ox" style={{ left: PT(104.8), top: PT(169), fontSize: PT(7.5), letterSpacing: "0.04em" }}>{F.verify_heading}</div>
      <div className="mp-abs mp-i mp-nav" style={{ left: PT(104.8), top: PT(183), fontSize: PT(8.5) }}>{m.verification_display_address}</div>
      <div className="mp-abs" style={{ left: PT(104.8), top: PT(195), fontSize: PT(7.5) }}>{T(pkg, "T-VERIFCAP-001")}</div>
      <div className="mp-abs mp-b" style={{ left: PT(104.8), top: PT(207), fontSize: PT(8.5) }}>{vis[0]}</div>
      <div className="mp-abs mp-mu" style={{ left: PT(104.8), top: PT(218), fontSize: PT(7) }}>{vis[1]}</div>
      <div className="mp-abs" style={{ right: PT(25), top: PT(176), textAlign: "center" }}>
        <BarCode text={m.verification_reference} width={150} height={40} />
        {refmark ? <div className="mp-mu" style={{ fontSize: PT(7) }}>{refmark}</div> : null}
      </div>
      {/* report contents: all fourteen dimensions, then T-COVERAGE-001 beneath, never shortened (¶62.10, ¶62.11) */}
      <div className="mp-abs" style={{ left: PT(36), top: PT(246), width: PT(540) }}>
        <div className="mp-b mp-nav" style={{ fontSize: PT(9), letterSpacing: "0.04em" }}>REPORT CONTENTS</div>
        <div className="mp-colhead" style={{ display: "grid", gridTemplateColumns: "250fr 200fr 90fr", height: PT(15), marginTop: PT(6), alignItems: "center" }}>
          <span style={{ paddingLeft: PT(7.2) }}>DIMENSION</span><span style={{ paddingLeft: PT(7.2) }}>IN THIS REPORT</span><span style={{ paddingLeft: PT(7.2) }}>PAGE</span>
        </div>
        <div style={{ border: `0.5pt solid ${C.GTL}`, background: C.PARCH }}>
          {dims.map((d) => {
            const rep = r.represented.includes(d.dimension_id);
            return (
              <div key={d.dimension_id} style={{ display: "grid", gridTemplateColumns: "250fr 200fr 90fr", height: PT(12), alignItems: "center", fontSize: PT(7.5), borderBottom: `0.5pt solid ${C.GT}`, color: rep ? C.BODY : C.MUTED }}>
                <span style={{ paddingLeft: PT(7.2) }}>{d.dimension_id}  {d.full_name}</span>
                <span style={{ paddingLeft: PT(7.2), fontWeight: rep ? 700 : 400, color: rep ? C.OX : C.MUTED }}>{rep ? "Represented" : "Not represented"}</span>
                <span className="mp-mu" style={{ paddingLeft: PT(7.2) }}>{layout.pageOf[d.dimension_id]}</span>
              </div>
            );
          })}
        </div>
        <p className="mp-j mp-mu" style={{ margin: `${PT(8)} 0 0`, fontSize: PT(6.8), lineHeight: 1.15 }}>{T(pkg, "T-COVERAGE-001")}</p>
        {/* scope panel: Parchment light fill, 3.0 point Antique gold left edge marker, text inset to x 46.9 */}
      <div style={{ marginTop: PT(12), background: C.PARCHL, padding: `${PT(6)} ${PT(10)} ${PT(6)} ${PT(10.9)}`, borderLeft: `3pt solid ${C.GOLD}` }}>
        <Lead lead={scope[0]} body={scope[1]} size={7.5} />
      </div>
      </div>
    </>
  );
}

function DimBlock({ pkg, b, first }: { pkg: Package; b: ResolvedBlock; first: boolean }) {
  const cols = GEOMETRY.cols.map((c) => PT(c.w)).join(" ");
  const st = pkg.evidence_states[b.state];
  const entry = b.entry.charAt(0).toUpperCase() + b.entry.slice(1) + ".";
  const cell = (i: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: `${PT(12)} ${PT(GEOMETRY.cols[i].pad)} ${PT(8)}`, borderLeft: i ? `0.5pt solid ${C.GT}` : undefined, ...extra,
  });
  return (
    <div style={{ marginTop: first ? 0 : PT(GEOMETRY.blockGap) }}>
      <div className="mp-b mp-nav" style={{ fontSize: PT(10), height: PT(16) }}>{b.dim}  {b.name}</div>
      <div className="mp-colhead" style={{ display: "grid", gridTemplateColumns: cols, height: PT(18), alignItems: "center" }}>
        {pkg.fixed_strings.columns.map((h: string, i: number) => (
          <div key={i} style={{ padding: `0 ${PT(GEOMETRY.cols[i].pad)}`, borderLeft: i ? `0.5pt solid ${C.GT}` : undefined }}>{h}</div>
        ))}
      </div>
      <div className="mp-block-fill" data-block={b.dim} style={{ display: "grid", gridTemplateColumns: cols, minHeight: PT(58) }}>
        <div style={cell(0)}>
          <div className="mp-b mp-nav" style={{ fontSize: PT(18), lineHeight: 1.1 }}>{b.dim}</div>
          <div style={{ fontSize: PT(8), marginTop: PT(4) }}>{b.name}</div>
        </div>
        <div style={cell(1)}>
          <div className="mp-b mp-ox" style={{ fontSize: PT(11) }}>{b.contexts.map((s) => <span key={s} style={{ marginRight: PT(6) }}>{s}</span>)}</div>
          <div style={{ fontSize: PT(8) }}>{b.contexts.length} recorded Stage context{b.contexts.length === 1 ? "" : "s"}</div>
          {b.contexts.map((s) => <div key={s} className="mp-mu" style={{ fontSize: PT(7), marginTop: PT(2.5) }}>{pkg.stage_descriptions[s]}</div>)}
        </div>
        <div style={cell(2)}>
          <div className="mp-b mp-ox" style={{ fontSize: PT(7.5), letterSpacing: "0.04em" }}>{st.display_label}</div>
          <div style={{ fontSize: PT(8), marginTop: PT(3), lineHeight: 1.19 }}>{frameText(pkg, b)}</div>
          <div className="mp-serif" style={{ borderLeft: `2.5pt solid ${C.NAVY}`, paddingLeft: PT(11.5), margin: `${PT(8)} 0`, fontSize: PT(10), lineHeight: 1.1 }}>{entry}</div>
          <div className="mp-i mp-mu" style={{ fontSize: PT(6.5), lineHeight: 1.15 }}>{T(pkg, "T-ILLUS-001")}</div>
          <div className="mp-mu" style={{ fontSize: PT(7.5), marginTop: PT(6), lineHeight: 1.2 }}>{T(pkg, "T-LIMIT-001")}</div>
        </div>
        <div style={cell(3)}>
          {b.diffs.length ? (
            <>
              <div className="mp-b mp-ox" style={{ fontSize: PT(7.5), letterSpacing: "0.04em" }}>{b.diffHeading}</div>
              {b.diffs.map((d, i) => <div key={i} style={{ fontSize: PT(8), lineHeight: 1.25, marginTop: PT(2) }}>{d.stage}: {d.body}</div>)}
              <div className="mp-mu" style={{ fontSize: PT(7.5), marginTop: PT(9), lineHeight: 1.2 }}>{T(pkg, "T-DIFF-SEP")}</div>
            </>
          ) : (
            <div className="mp-mu" style={{ fontSize: PT(7.5), lineHeight: 1.2 }}>{T(pkg, "T-NODIFF-001")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Controls({ pkg, r }: { pkg: Package; r: Resolved }) {
  const m = r.manifest;
  const F = pkg.fixed_strings;
  const review = pkg.state_maps["T-REVIEW-MAP"][m.review_state] + " " + pkg.state_maps["T-CORRECTION-MAP"][m.correction_state];
  const avail = T(pkg, "T-AVAIL-001").replace("{d}", longDate(m.evidence_currency_date)).replace("{r}", m.verification_reference);
  const names = Object.fromEntries(pkg.dimension_register.dimensions.map((d) => [d.dimension_id, d.full_name]));
  const parts = ["T-USE-001", "T-DISC-001", "T-INTEG-001", "T-VERIF-001"].map((k) => TL(pkg, k));
  const diffShown = TL(pkg, "T-DIFFSHOWN-001");
  return (
    <div className="mp-abs" style={{ left: PT(36), top: PT(86), width: PT(540) }}>
      <div style={{ display: "grid", gridTemplateColumns: "262fr 262fr", columnGap: PT(16) }}>
        <div><div className="mp-b mp-nav" style={{ fontSize: PT(7.5), letterSpacing: "0.04em" }}>{F.participant_review}</div><p style={{ margin: `${PT(4)} 0 0`, fontSize: PT(8), lineHeight: 1.15 }}>{review}</p></div>
        <div><div className="mp-b mp-nav" style={{ fontSize: PT(7.5), letterSpacing: "0.04em" }}>{F.availability}</div><p style={{ margin: `${PT(4)} 0 0`, fontSize: PT(8), lineHeight: 1.15 }}>{avail}</p></div>
      </div>
      <div style={{ marginTop: PT(16) }}>
        {r.unrepresented.length ? (
          <>
            <div style={{ display: "flex", gap: PT(14), alignItems: "baseline", borderBottom: `0.5pt solid ${C.GT}`, paddingBottom: PT(3) }}>
              <span className="mp-b mp-nav" style={{ fontSize: PT(7), letterSpacing: "0.04em" }}>{F.strip_heading}</span>
              <span className="mp-mu" style={{ fontSize: PT(6.8) }}>{T(pkg, "T-STUB-001")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: C.PARCH }}>
              {r.unrepresented.map((d) => <div key={d} className="mp-mu" style={{ fontSize: PT(7), padding: `${PT(2)} ${PT(7.2)}`, borderBottom: `0.5pt solid ${C.GT}`, borderLeft: `0.5pt solid ${C.GT}` }}>{d}  {names[d]}</div>)}
            </div>
          </>
        ) : <p className="mp-mu" style={{ fontSize: PT(7.5) }}>{T(pkg, "T-NOTREP-ALL")}</p>}
      </div>
      <div style={{ marginTop: PT(16) }}><Lead lead={diffShown[0]} body={diffShown[1]} size={7.5} color={C.MUTED} /></div>
      <div style={{ marginTop: PT(12), background: C.PARCHL, border: `0.5pt solid ${C.GTL}`, padding: PT(8) }}>
        <div className="mp-b mp-ox" style={{ fontSize: PT(7.5), letterSpacing: "0.04em" }}>{F.evidence_note}</div>
        <p className="mp-j mp-mu" style={{ margin: `${PT(2)} 0 0`, fontSize: PT(7), lineHeight: 1.15 }}>{T(pkg, "T-EVNOTE-001")}</p>
        {parts.map(([lead, body], i) => <div key={i} style={{ marginTop: PT(5) }}><Lead lead={lead} body={body} size={7} color={C.MUTED} /></div>)}
      </div>
    </div>
  );
}

function PageView({ pkg, r, layout, page }: { pkg: Package; r: Resolved; layout: Layout; page: Page }) {
  return (
    <section className="mp-page" data-page={page.number} data-kind={page.kind}>
      {page.kind === "cover" ? <Cover pkg={pkg} r={r} layout={layout} /> : null}
      {page.kind === "dimensions" ? (
        <>
          <RunHead pkg={pkg} r={r} title="Recorded conduct" detail={page.blocks.map((b) => b.dim).join("  and  ")} />
          <div className="mp-abs mp-content" style={{ left: PT(36), top: PT(GEOMETRY.contentTop), width: PT(540), height: PT(GEOMETRY.contentBottom - GEOMETRY.contentTop), overflow: "visible" }}>
            {page.blocks.map((b, i) => <DimBlock key={b.dim} pkg={pkg} b={b} first={i === 0} />)}
          </div>
        </>
      ) : null}
      {page.kind === "controls" ? (
        <>
          <RunHead pkg={pkg} r={r} title="Evidence notes and report controls" detail="Participant review, dimensions not represented, and the limits on use." />
          <Controls pkg={pkg} r={r} />
        </>
      ) : null}
      <Footer pkg={pkg} r={r} page={page.number} total={layout.total} />
    </section>
  );
}

export function BerMultiDocument({ pkg }: { pkg: Package }) {
  const measure = useMemo(() => browserMeasure(), []);
  const resolved = useMemo(() => checkAndResolve(pkg, "multi_page"), [pkg]);
  const layout = useMemo(() => (resolved.ok ? paginate(pkg, resolved.value, measure) : null), [pkg, resolved, measure]);
  const root = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<string | null>(null);

  // Measured after layout: nothing may run past the content box (case 4). A page that does refuses layout_overflow.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    for (const pg of Array.from(el.querySelectorAll<HTMLElement>(".mp-page[data-kind='dimensions']"))) {
      const box = pg.querySelector<HTMLElement>(".mp-content");
      if (box && box.scrollHeight - box.clientHeight > 1) { setOverflow(`page ${pg.dataset.page} runs ${(box.scrollHeight - box.clientHeight).toFixed(1)} px past the content box`); return; }
    }
    setOverflow(null);
  }, [layout]);

  if (!resolved.ok) return <Refused code={resolved.code} detail={resolved.detail} />;
  if (!layout) return null;
  if (!layout.ok) return <Refused code={layout.code} detail={layout.detail} />;
  if (overflow) return <Refused code="layout_overflow" detail={overflow} />;
  return (
    <div className="mp" ref={root}>
      {layout.value.pages.map((p) => <PageView key={p.number} pkg={pkg} r={resolved.value} layout={layout.value} page={p} />)}
    </div>
  );
}

export default function BerMultiPrintView() {
  const { berId } = useParams<{ berId: string }>();
  const [search] = useSearchParams();
  // specimen only: ?only=D4 keeps the named dimensions (comma separated) so one dimension reports can be shown
  const only = (search.get("only") ?? "").split(",").filter(Boolean);
  // specimen only: ?drop=T-XXX removes a controlled text, to show that the render then refuses (it never lifts a refusal)
  const drop = (search.get("drop") ?? "").split(",").filter(Boolean);
  const pkg = useMemo(() => {
    const p = JSON.parse(JSON.stringify(fixture)) as Package;
    for (const k of drop) delete (p.controlled_texts as Record<string, unknown>)[k];
    if (only.length) p.render_manifest.claim_packages = p.render_manifest.claim_packages.filter((c) => only.includes(c.dimension_id));
    return p;
  }, [only.join(","), drop.join(",")]);
  useEffect(() => {
    document.body.classList.add("ber-multi-root");
    return () => document.body.classList.remove("ber-multi-root");
  }, []);
  const frame = (children: React.ReactNode) => (
    <>
      <link href={FONTS_HREF} rel="stylesheet" />
      <style>{CSS}</style>
      {children}
    </>
  );
  const [live, setLive] = useState<{ pkg?: Package; refused?: { code: string; detail?: string } } | null>(null);
  useEffect(() => {
    if (!berId || berId === "specimen") return;
    let on = true;
    void supabase.rpc("t3a_ber_multipage_claims", { p_ber_report_id: berId }).then(({ data, error }) => {
      if (!on) return;
      const d = data as { outcome?: string; reason?: string; detail?: string; render_manifest?: Package["render_manifest"]; entries?: Record<string, never> } | null;
      if (error || !d) { setLive({ refused: { code: "route_unavailable", detail: error?.message } }); return; }
      if (d.outcome !== "ok" || !d.render_manifest) { setLive({ refused: { code: d.reason ?? "refused", detail: d.detail } }); return; }
      // the registers (controlled texts, maps, fixed strings, dimension register) are the frozen package's; the manifest and the entries are the server's
      const base = JSON.parse(JSON.stringify(fixture)) as Package;
      base.render_manifest = d.render_manifest;
      base.entry_library = { version: "LIB", entries: d.entries as unknown as Package["entry_library"]["entries"] };
      setLive({ pkg: base });
    });
    return () => { on = false; };
  }, [berId]);
  if (berId !== "specimen") {
    if (!live) return frame(<div className="mp-refused">Checking this report…</div>);
    if (live.refused) return frame(<Refused code={live.refused.code} detail={live.refused.detail} />);
    return frame(<BerMultiDocument pkg={live.pkg!} />);
  }
  return frame(
    <>
      <div className="mp-toolbar"><span>Behavioral Evidence Report · multi page · layout specimen</span><button onClick={() => window.print()}>Print</button></div>
      <BerMultiDocument pkg={pkg} />
    </>,
  );
}
