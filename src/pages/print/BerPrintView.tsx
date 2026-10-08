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

const PRINT_CSS = `
:root {
  --ink: #141210;
  --ink-soft: #3a3530;
  --ink-mute: #6a6460;
  --rule: #2a2520;
  --paper: #f4ede0;
  --paper-tint: #efe6d4;
  --vermilion: #c7322c;
  --vermilion-dark: #972722;
}
html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
body.ber-print-root {
  font-family: 'Source Serif 4','Source Serif Pro', Georgia, 'Times New Roman', serif;
  font-size: 10.5pt;
  line-height: 1.55;
  letter-spacing: 0.005em;
  min-height: 100vh;
}
.ber-print-root * { box-sizing: border-box; }

.ber-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; border-bottom: 1px solid rgba(42,37,32,0.2);
  background: var(--paper-tint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
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
.ber-toolbar button:hover { background: var(--vermilion); border-color: var(--vermilion); }

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
    radial-gradient(rgba(50,30,10,0.03) 1px, transparent 1.5px),
    radial-gradient(rgba(50,30,10,0.02) 1px, transparent 1.5px);
  background-size: 7px 7px, 11px 11px;
  background-position: 0 0, 3px 4px;
}
.ber-page > * { position: relative; z-index: 1; }

.ber-masthead {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-bottom: 1.5px solid var(--rule);
  padding-bottom: 8mm; margin-bottom: 10mm;
}
.ber-brand { display: flex; align-items: center; gap: 10mm; }
.ber-shield {
  width: 24mm; height: 24mm; background: var(--ink); color: var(--paper);
  border-radius: 2mm; display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-weight: 700;
  font-size: 60pt; line-height: 1; letter-spacing: -0.03em; position: relative;
}
.ber-shield::after {
  content: ""; position: absolute; inset: 1.2mm;
  border: 0.6px solid rgba(244,237,224,0.35); border-radius: 1mm;
}
.ber-wordmark { display: flex; flex-direction: column; gap: 0.8mm; }
.ber-wordmark .mast-title {
  font-family: 'Cormorant Garamond', serif; font-weight: 500;
  font-size: 22pt; line-height: 1;
}
.ber-wordmark .mast-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ink-mute);
}
.ber-masthead-right { text-align: right; display: flex; flex-direction: column; gap: 1mm; }
.ber-form-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-doc-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt; color: var(--ink-soft); word-break: break-all;
}

.ber-doc-title { text-align: center; margin: 2mm 0 14mm 0; }
.ber-doc-title .eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--vermilion); margin-bottom: 3mm;
}
.ber-doc-title h1 {
  font-family: 'Cormorant Garamond', serif; font-weight: 400;
  font-size: 42pt; line-height: 0.95; letter-spacing: -0.015em; margin: 0 0 3mm 0;
}
.ber-doc-title h1 em { font-style: italic; color: var(--vermilion); }
.ber-doc-title .subtitle {
  font-family: 'Cormorant Garamond', serif; font-size: 13pt; font-style: italic;
  color: var(--ink-soft); max-width: 110mm; margin: 0 auto;
}

.ber-particulars {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 5mm 8mm; padding: 5mm 7mm;
  border-top: 0.5px solid var(--rule); border-bottom: 0.5px solid var(--rule);
  margin-bottom: 10mm;
}
.ber-particular { display: flex; flex-direction: column; gap: 1mm; }
.ber-particular .label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 6.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-particular .value {
  font-family: 'Cormorant Garamond', serif; font-size: 12pt; line-height: 1.1;
}
.ber-particular .value.mono {
  font-family: 'JetBrains Mono', monospace; font-size: 8pt; word-break: break-all;
}
.ber-pill {
  display: inline-block; padding: 1mm 2.5mm; border: 0.5px solid var(--ink);
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5pt; letter-spacing: 0.15em; text-transform: uppercase;
}
.ber-pill.vermilion { background: var(--vermilion); color: var(--paper); border-color: var(--vermilion); }

.ber-block { margin-bottom: 10mm; page-break-inside: avoid; }
.ber-block-head {
  display: flex; align-items: baseline; gap: 5mm;
  padding-bottom: 2mm; border-bottom: 0.5px solid var(--rule);
  margin-bottom: 4mm;
}
.ber-block-no {
  font-family: 'Cormorant Garamond', serif; font-size: 18pt; font-weight: 500;
  color: var(--vermilion); line-height: 1; min-width: 10mm;
}
.ber-block-name {
  font-family: 'Cormorant Garamond', serif; font-size: 15pt; font-weight: 500;
  letter-spacing: -0.005em; flex: 1;
}
.ber-block-ref {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7pt; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-mute);
}
.ber-block-body { padding-left: 15mm; }
.ber-controlled { font-family: 'Source Serif 4', Georgia, serif; font-size: 10.5pt; line-height: 1.6; color: var(--ink); }
.ber-controlled.verbatim::before {
  content: "“"; font-family: 'Cormorant Garamond', serif;
  font-size: 24pt; line-height: 0; color: var(--vermilion);
  margin-right: 1mm; vertical-align: -4mm;
}
.ber-not-rendering {
  display: inline-block; padding: 2mm 4mm;
  background: var(--paper-tint); border-left: 1.5px solid var(--vermilion);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt; letter-spacing: 0.08em; color: var(--ink-mute);
}
.ber-not-rendering .reason { color: var(--ink); font-weight: 500; margin-left: 2mm; }

.ber-conduct-table { border-top: 0.5px solid var(--rule); margin-top: 2mm; }
.ber-conduct-row {
  display: grid; grid-template-columns: 14mm 14mm 1fr;
  gap: 4mm; padding: 3mm 0;
  border-bottom: 0.5px solid rgba(42,37,32,0.25); align-items: start;
}
.ber-conduct-row .dim, .ber-conduct-row .stage {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt; letter-spacing: 0.15em; color: var(--ink-mute); padding-top: 0.5mm;
}
.ber-conduct-row .statement { font-family: 'Source Serif 4', Georgia, serif; font-size: 10.5pt; line-height: 1.5; }
.ber-conduct-row .statement .mark { font-family: 'Cormorant Garamond', serif; color: var(--vermilion); margin: 0 1mm; }

.ber-verification {
  margin-top: 4mm; padding: 3mm 4mm;
  background: var(--paper-tint); border: 0.5px dashed var(--ink-mute); text-align: center;
}
.ber-verification .label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
  margin-bottom: 1mm;
}
.ber-verification .url {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10pt; color: var(--vermilion-dark); letter-spacing: 0.03em;
}

.ber-colophon {
  margin-top: 14mm; padding-top: 6mm;
  border-top: 1.5px solid var(--rule);
  display: grid; grid-template-columns: 1fr auto; gap: 4mm; align-items: end;
}
.ber-colophon .issuer {
  font-family: 'Cormorant Garamond', serif; font-size: 11pt; font-style: italic; color: var(--ink-soft);
}
.ber-colophon .seal { display: flex; align-items: center; gap: 4mm; }
.ber-colophon .mono-stack {
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-mute); line-height: 1.5;
}
.ber-stamp {
  width: 20mm; height: 20mm;
  border: 1.5px double var(--vermilion); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 7pt; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--vermilion); text-align: center; line-height: 1.2;
  transform: rotate(-6deg);
}

.ber-loading, .ber-refused {
  padding: 60px 20px; text-align: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20pt; color: var(--ink-mute);
}

@media print {
  @page { size: A4; margin: 18mm 20mm 22mm 20mm; }
  .ber-toolbar { display: none; }
  .ber-page { margin: 0 auto; }
  html, body { background: var(--paper); }
}
`;

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500;600&display=swap";

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
