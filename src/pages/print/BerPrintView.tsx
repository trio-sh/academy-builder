/**
 * BER print view — the §6 face rendered on cream paper, print-ready.
 *
 * This page is a self-contained print target. The caller opens it in a
 * new window ("Download printable report" on the Mentor Cockpit's
 * Report Face screen), the page assembles the same face JSON the dark
 * cockpit shows, and the browser's print pipeline turns it into a PDF
 * at A4 with the house styling. No separate PDF library is needed.
 *
 * Design notes:
 *   - The dark dashboard theme would misread as a drafting proof here.
 *     The register's printed face is cream + ink + vermilion — the
 *     editorial house look.
 *   - Fonts are the register faces: Cormorant Garamond (display),
 *     Source Serif 4 (body), JetBrains Mono (register labels).
 *   - Blocks that do not fire render a "BLOCK NOT RENDERING" strip
 *     with the reason, not vanish (§6.3 and the design mantra: a
 *     block that is absent and a block that had nothing to say are
 *     different facts).
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type ConductRow = {
  dimension_id: string;
  stage_code: string;
  statement: string;
  composed_at: string;
};
type Block = {
  block_no: number;
  block_name: string;
  render_behaviour: string;
  renders: boolean;
  not_rendering_reason: string | null;
  controlled_text_ref: string | null;
  controlled_text: string | null;
  controlled_text_is_verbatim: boolean | null;
  rows: ConductRow[] | null;
};
type Face = {
  rendered: boolean;
  refusal_code?: string;
  ber_report_id?: string;
  dimension_id?: string;
  status?: string;
  issued_at?: string | null;
  amended_at?: string | null;
  withdrawn_at?: string | null;
  traceability_sheet?: string;
  blocks?: Block[];
};

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
};
const shortId = (uuid?: string | null) =>
  uuid ? "BER-" + uuid.slice(0, 8).toUpperCase() : "BER-PENDING";

// The register face wears the house palette, same as every dashboard
// and the public site: deep indigo canvas, white type, T3A indigo and
// purple accents, cyan stamp. Fonts match the system — Fraunces for
// display, Instrument Sans for body, JetBrains Mono for register labels.
const PRINT_CSS = `
:root {
  --paper: hsl(240 25% 6%);
  --paper-deep: hsl(240 22% 9%);
  --paper-tint: hsl(240 22% 12%);
  --ink: hsl(0 0% 100%);
  --ink-soft: hsl(0 0% 85%);
  --ink-mute: hsl(0 0% 60%);
  --rule: hsla(0 0% 100% / 0.14);
  --rule-strong: hsla(0 0% 100% / 0.28);
  --t3a-indigo: hsl(239 84% 67%);
  --t3a-purple: hsl(270 91% 65%);
  --t3a-cyan: hsl(189 94% 60%);
}
html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
body.ber-print-root {
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  letter-spacing: 0.005em;
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 50% -200px, hsl(239 84% 10%), transparent 70%),
    var(--paper);
}
.ber-print-root * { box-sizing: border-box; }

.ber-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--rule);
  background: hsla(240 25% 6% / 0.92);
  backdrop-filter: blur(6px);
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-mute);
}
.ber-toolbar button {
  padding: 8px 18px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  font-family: inherit;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  cursor: pointer;
}
.ber-toolbar button:hover { background: var(--t3a-indigo); border-color: var(--t3a-indigo); color: var(--ink); }

.ber-page {
  position: relative;
  max-width: 170mm;
  margin: 20mm auto 40mm auto;
  padding: 0 10mm;
}
.ber-page::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(hsla(0 0% 100% / 0.025) 1px, transparent 1.5px),
    radial-gradient(hsla(0 0% 100% / 0.015) 1px, transparent 1.5px);
  background-size: 7px 7px, 11px 11px;
  background-position: 0 0, 3px 4px;
}
.ber-page > * { position: relative; z-index: 1; }

.ber-masthead {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-bottom: 1.5px solid var(--rule-strong);
  padding-bottom: 8mm; margin-bottom: 10mm;
}
.ber-brand { display: flex; align-items: center; gap: 10mm; }
.ber-shield {
  width: 24mm; height: 24mm;
  background: linear-gradient(135deg, var(--t3a-indigo) 0%, var(--t3a-purple) 100%);
  color: var(--ink);
  border-radius: 2mm;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: "SOFT" 40, "WONK" 1;
  font-weight: 460;
  font-size: 60pt; line-height: 1; letter-spacing: -0.03em; position: relative;
}
.ber-shield::after {
  content: ""; position: absolute; inset: 1.2mm;
  border: 0.6px solid hsla(0 0% 100% / 0.35); border-radius: 1mm;
}
.ber-wordmark { display: flex; flex-direction: column; gap: 0.8mm; }
.ber-wordmark .mast-title {
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: "SOFT" 40, "WONK" 1;
  font-weight: 460;
  font-size: 22pt; line-height: 1; letter-spacing: -0.025em;
}
.ber-wordmark .mast-sub {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ink-mute);
}
.ber-masthead-right { text-align: right; display: flex; flex-direction: column; gap: 1mm; }
.ber-form-number {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-doc-id {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 8.5pt; color: var(--ink-soft); word-break: break-all;
}

.ber-doc-title { text-align: center; margin: 2mm 0 14mm 0; }
.ber-doc-title .eyebrow {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 8pt; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--t3a-indigo); margin-bottom: 3mm;
}
.ber-doc-title h1 {
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: "SOFT" 40, "WONK" 1;
  font-weight: 460;
  font-size: 44pt; line-height: 0.95; letter-spacing: -0.025em; margin: 0 0 3mm 0;
}
.ber-doc-title h1 em {
  font-style: italic;
  font-variation-settings: "SOFT" 100, "WONK" 1;
  font-weight: 500;
  background: linear-gradient(135deg, var(--t3a-indigo), var(--t3a-purple));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ber-doc-title .subtitle {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 13pt; font-style: italic;
  color: var(--ink-soft); max-width: 110mm; margin: 0 auto;
}

.ber-particulars {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 5mm 8mm; padding: 5mm 7mm;
  background: hsla(0 0% 100% / 0.02);
  border: 0.5px solid var(--rule);
  margin-bottom: 10mm;
}
.ber-particular { display: flex; flex-direction: column; gap: 1mm; }
.ber-particular .label {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 6.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-particular .value {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 12pt; line-height: 1.1; color: var(--ink);
}
.ber-particular .value.mono {
  font-family: '"JetBrains Mono"', ui-monospace, monospace; font-size: 8pt; word-break: break-all;
  color: var(--ink-soft);
}
.ber-pill {
  display: inline-block; padding: 1mm 2.5mm;
  border: 0.5px solid var(--ink);
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7.5pt; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--ink);
}
.ber-pill.vermilion {
  background: linear-gradient(135deg, var(--t3a-indigo), var(--t3a-purple));
  color: var(--ink); border-color: transparent;
}

.ber-block { margin-bottom: 10mm; page-break-inside: avoid; }
.ber-block-head {
  display: flex; align-items: baseline; gap: 5mm;
  padding-bottom: 2mm; border-bottom: 0.5px solid var(--rule-strong);
  margin-bottom: 4mm;
}
.ber-block-no {
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: "SOFT" 40, "WONK" 1;
  font-size: 20pt; font-weight: 460;
  background: linear-gradient(135deg, var(--t3a-indigo), var(--t3a-purple));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  line-height: 1; min-width: 10mm;
}
.ber-block-name {
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: "SOFT" 40, "WONK" 1;
  font-size: 15pt; font-weight: 460; letter-spacing: -0.015em; flex: 1;
  color: var(--ink);
}
.ber-block-ref {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7pt; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-block-body { padding-left: 15mm; }
.ber-controlled {
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 10.5pt; line-height: 1.6; color: var(--ink-soft);
}
.ber-controlled.verbatim { border-left: 2px solid var(--t3a-indigo); padding-left: 4mm; }

.ber-not-rendering {
  display: inline-block; padding: 2mm 4mm;
  background: hsla(0 0% 100% / 0.03);
  border-left: 1.5px solid var(--t3a-purple);
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 8pt; letter-spacing: 0.08em; color: var(--ink-mute);
}
.ber-not-rendering .reason { color: var(--ink); font-weight: 500; margin-left: 2mm; }

.ber-conduct-table { border-top: 0.5px solid var(--rule-strong); margin-top: 2mm; }
.ber-conduct-row {
  display: grid; grid-template-columns: 14mm 14mm 1fr;
  gap: 4mm; padding: 3mm 0;
  border-bottom: 0.5px solid var(--rule); align-items: start;
}
.ber-conduct-row .dim, .ber-conduct-row .stage {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 8pt; letter-spacing: 0.15em; color: var(--ink-mute); padding-top: 0.5mm;
}
.ber-conduct-row .statement {
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 10.5pt; line-height: 1.5; color: var(--ink);
}
.ber-conduct-row .statement .mark {
  font-family: 'Fraunces', Georgia, serif;
  color: var(--t3a-indigo); margin: 0 1mm;
}

.ber-verification {
  margin-top: 4mm; padding: 4mm 5mm;
  background: hsla(239 84% 67% / 0.08);
  border: 0.5px dashed var(--t3a-indigo); text-align: center;
}
.ber-verification .label {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
  margin-bottom: 1mm;
}
.ber-verification .url {
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 11pt; color: var(--t3a-cyan); letter-spacing: 0.03em;
}

.ber-colophon {
  margin-top: 14mm; padding-top: 6mm;
  border-top: 1.5px solid var(--rule-strong);
  display: grid; grid-template-columns: 1fr auto; gap: 4mm; align-items: end;
}
.ber-colophon .issuer {
  font-family: 'Fraunces', Georgia, serif; font-size: 11pt; font-style: italic;
  color: var(--ink-soft);
}
.ber-colophon .issuer strong { color: var(--ink); font-weight: 500; font-style: normal; }
.ber-colophon .seal { display: flex; align-items: center; gap: 4mm; }
.ber-colophon .mono-stack {
  text-align: right;
  font-family: '"JetBrains Mono"', ui-monospace, monospace;
  font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-mute); line-height: 1.5;
}
.ber-stamp {
  width: 20mm; height: 20mm;
  border: 1.5px double var(--t3a-cyan); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 7pt; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--t3a-cyan); text-align: center; line-height: 1.2;
  transform: rotate(-6deg);
}

.ber-loading, .ber-refused {
  padding: 60px 20px; text-align: center;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 20pt; color: var(--ink-mute);
}

@media print {
  @page { size: A4; margin: 18mm 20mm 22mm 20mm; }
  .ber-toolbar { display: none; }
  .ber-page { margin: 0 auto; }
  html, body { background: var(--paper); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

// Fraunces (display), Instrument Sans (body) and JetBrains Mono (labels)
// are the register's three faces, same as the rest of the system.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;600&display=swap";

export default function BerPrintView() {
  const { berId } = useParams<{ berId: string }>();
  const [face, setFace] = useState<Face | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docIdRef = useRef<string>("");

  useEffect(() => {
    document.body.classList.add("ber-print-root");
    return () => {
      document.body.classList.remove("ber-print-root");
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!berId) return;
      const { data, error: rpcError } = await supabase.rpc("t3a_d1_report_face", {
        p_ber_report_id: berId,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setFace((data ?? null) as Face | null);
    };
    void load();
  }, [berId]);

  if (!berId) return <div className="ber-loading">Missing report identifier.</div>;
  if (error) return <div className="ber-refused">Could not assemble this report. {error}</div>;
  if (!face) return <div className="ber-loading">Assembling…</div>;

  if (!face.rendered) {
    return (
      <div className="ber-refused">
        This face does not render. {face.refusal_code ?? ""}
      </div>
    );
  }

  docIdRef.current = shortId(face.ber_report_id);
  const particulars: Array<{ label: string; value: React.ReactNode; mono?: boolean }> = [
    { label: "Participant", value: <span className="ber-pill">RELEASED ON VERIFICATION</span> },
    { label: "Dimension", value: face.dimension_id ?? "—" },
    {
      label: "Status",
      value: (
        <span className="ber-pill vermilion">
          {(face.status ?? "—").replace(/_/g, " ")}
        </span>
      ),
    },
    { label: "Record identifier", value: face.ber_report_id ?? "—", mono: true },
    { label: "Issued at", value: fmtDate(face.issued_at) },
    { label: "Amended at", value: fmtDate(face.amended_at) },
    { label: "Withdrawn at", value: fmtDate(face.withdrawn_at) },
    { label: "Current through", value: "—" },
  ];

  return (
    <>
      <link href={FONTS_HREF} rel="stylesheet" />
      <style>{PRINT_CSS}</style>

      <div className="ber-toolbar">
        <span>Printable record · {docIdRef.current}</span>
        <button onClick={() => window.print()}>Download PDF</button>
      </div>

      <div className="ber-page">
        <header className="ber-masthead">
          <div className="ber-brand">
            <div className="ber-shield">3</div>
            <div className="ber-wordmark">
              <div className="mast-title">The 3rd Academy</div>
              <div className="mast-sub">Register · Behavioral Evidence</div>
            </div>
          </div>
          <div className="ber-masthead-right">
            <div className="ber-form-number">Form No. T3A-D1 · 006</div>
            <div className="ber-doc-id">{docIdRef.current}</div>
          </div>
        </header>

        <section className="ber-doc-title">
          <div className="eyebrow">§ VI · Report face</div>
          <h1>
            Behavioral <em>Evidence</em> Report
          </h1>
          <div className="subtitle">
            A record of selected conduct observed in defined workplace situations
            — composed from recorded factual determinations under authorized
            observation.
          </div>
        </section>

        <section className="ber-particulars">
          {particulars.map((p) => (
            <div key={p.label} className="ber-particular">
              <div className="label">{p.label}</div>
              <div className={`value${p.mono ? " mono" : ""}`}>{p.value}</div>
            </div>
          ))}
        </section>

        <main>
          {(face.blocks ?? []).map((b) => (
            <section key={b.block_no} className="ber-block">
              <div className="ber-block-head">
                <div className="ber-block-no">{String(b.block_no).padStart(2, "0")}</div>
                <div className="ber-block-name">{b.block_name}</div>
                {b.controlled_text_ref && (
                  <span className="ber-block-ref">§ {b.controlled_text_ref}</span>
                )}
              </div>
              <div className="ber-block-body">
                {!b.renders && (
                  <div className="ber-not-rendering">
                    BLOCK NOT RENDERING{" "}
                    <span className="reason">
                      {(b.not_rendering_reason ?? "CONDITION_NOT_MET").replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {b.renders && b.block_no === 4 && (
                  <div className="ber-conduct-table">
                    {(b.rows ?? []).length === 0 ? (
                      <em style={{ color: "var(--ink-mute)" }}>
                        No conduct recorded for this participant in this dimension.
                      </em>
                    ) : (
                      (b.rows ?? []).map((r, i) => (
                        <div key={i} className="ber-conduct-row">
                          <div className="dim">{r.dimension_id}</div>
                          <div className="stage">{r.stage_code}</div>
                          <div className="statement">
                            {r.statement.split(" — ").map((part, j, arr) => (
                              <span key={j}>
                                {part}
                                {j < arr.length - 1 && <span className="mark">—</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {b.renders && b.block_no === 7 && (
                  <div className="ber-verification">
                    <div className="label">To verify this record</div>
                    <div className="url">
                      verify.the3rdacademy.com/{docIdRef.current}
                    </div>
                  </div>
                )}
                {b.renders && b.block_no !== 4 && b.block_no !== 7 && b.controlled_text && (
                  <div
                    className={`ber-controlled${b.controlled_text_is_verbatim ? " verbatim" : ""}`}
                  >
                    {b.controlled_text}
                  </div>
                )}
                {b.renders && b.block_no !== 4 && b.block_no !== 7 && !b.controlled_text && (
                  <div
                    className="ber-controlled"
                    style={{ color: "var(--ink-mute)", fontStyle: "italic" }}
                  >
                    {b.render_behaviour}
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>

        <footer className="ber-colophon">
          <div className="issuer">
            Issued by <strong>The 3rd Academy</strong>, Register of Behavioral Evidence.
            <br />
            This report contains no score, rank or recommendation. Relevance is
            for the reader to determine.
          </div>
          <div className="seal">
            <div className="mono-stack">
              <div>Register seal</div>
              <div>{fmtDate(face.issued_at ?? new Date().toISOString())}</div>
            </div>
            <div className="ber-stamp">
              Register
              <br />
              of Record
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
