/**
 * BER print view — T3A-RCE-STD-001 v9.11, Part F.
 *
 * The eleven-block drafting face has been replaced with the printable
 * record defined by Part F and demonstrated by the v9.11 conformance
 * specimen. Target: BER-specimen-v9_11-conformance-target.pdf.
 *
 * The register face is a single page carrying:
 *   - masthead with the brand mark, institution line and the title in
 *     Liberation Serif Bold navy
 *   - a photo placeholder slot (upper right)
 *   - the four-column particulars strip
 *   - a verification band with QR code (left) and barcode (right)
 *   - the "Scope and limits" callout
 *   - the RECORDED CONDUCT table (navy header strip, parchment body),
 *     one row per represented dimension, carrying the evidence-state
 *     label in Part-F gold, the composed statement block, and the
 *     differences-across-settings sub-block
 *   - the "NOT REPRESENTED IN THIS REPORT" two-column grid of the
 *     remaining dimensions
 *   - the "How differences are shown" explanatory paragraph
 *   - PARTICIPANT REVIEW and AVAILABILITY AND STATUS two-column strip
 *   - the EVIDENCE NOTE multi-paragraph callout
 *   - the footer: output-mode label, page number, and version line
 *
 * Fonts: Liberation Sans (300/400/500/700) with Liberation Serif Bold on
 * the title, matching the frozen face set the reference renderer loads.
 * The web pulls them from Google Fonts' "Liberation Sans"-equivalent;
 * for the serif title we use a serif stack rooted at Liberation Serif
 * where installed, with Georgia and Times New Roman fallbacks whose
 * metrics are close enough for layout stability on screen and print.
 *
 * The current DB RPC (t3a_d1_report_face) still returns the drafting
 * 11-block structure. This view maps that structure onto the Part-F
 * slots. The deeper doctrine machinery the standard calls for
 * (controlled text register with sha256 digest, prohibited vocabulary
 * enforcement at render, pilot authorization table, use dispositions)
 * is tracked for a follow-on migration; today's build renders the
 * demonstration output mode, honestly labeled.
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

// --- Dimension register, v9.11 ---------------------------------------------
const DIMENSIONS: Array<{ id: string; name: string }> = [
  { id: "D1", name: "Integrity and Ethics" },
  { id: "D2", name: "Accountability and Ownership" },
  { id: "D3", name: "Execution Reliability" },
  { id: "D4", name: "Communication Under Pressure" },
  { id: "D5", name: "Collaboration and Conflict Resolution" },
  { id: "D6", name: "Workplace Adaptability" },
  { id: "D7", name: "Prioritization and Time Management" },
  { id: "D8", name: "Resilience and Recovery" },
  { id: "D9", name: "Learning Agility" },
  { id: "D10", name: "Professional Boundaries" },
  { id: "D11", name: "Creative Problem Solving" },
  { id: "D12", name: "Customer and Service Focus" },
  { id: "D13", name: "Influence and Persuasion" },
  { id: "D14", name: "Relationship Building" },
];
const STAGE_DESCRIPTIONS: Record<string, string> = {
  S1: "Stage 1 written situation",
  S2: "Stage 2 live interaction",
  S3: "Stage 3 submitted work",
  S4: "Stage 4 group setting",
};
// --- Controlled texts, from the v9.11 fixture (verbatim) ------------------
const CT = {
  purpose:
    "A record of how conduct appeared in defined workplace-pressure situations. The participant controls whether this report is available to approved employers through The 3rd Academy and may withdraw future availability at any time.",
  verifyCap: "Verify the authoritative status before relying on this copy.",
  scopeHead: "Scope and limits.",
  scopeBody:
    "This report contains recorded conduct for represented dimensions only. It is not a complete account of the participant's workplace conduct. Dimensions not represented are listed below; their absence is not a conclusion about the participant. This report records selected conduct in defined situations and does not state whether a participant should be selected, placed, promoted, preferred, or otherwise chosen for an opportunity.",
  limit:
    "This statement is limited to the recorded contexts. It is not a statement about character, general tendency, suitability, or future behavior.",
  diffSep:
    "These observations remain separate. Neither is preferred, averaged, or used to broaden the recurrence statement.",
  diffShownHead: "How differences are shown.",
  diffShownBody:
    "The recurring clause stays in Observed conduct. The adjacent Differences across settings field preserves context specific variation. A difference does not erase recurrence of a separate clause, and recurrence does not erase the difference.",
  availPrefix: "Made available to approved employers through the participant controlled process. Evidence current until: ",
  stub:
    "No recorded conduct for these dimensions is carried here. Their absence is not a conclusion about the participant.",
  reviewed: "The participant reviewed this report before issuance.",
  notReviewed: "This report was issued without a recorded participant review.",
  correctionNone: "Correction status: No correction open.",
  evNote:
    "Stage 1 written situations are administered through an AI system. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.",
  usePrefix: "Permitted use:",
  useBody:
    "This report provides supplementary behavioral evidence from defined workplace situations. It may be considered as one source of information in an employer's independent employment judgment. It does not recommend or determine an employment decision and must not be used as the sole basis for adverse employment action. It is not a prediction of job performance, retention or probation outcome.",
  discPrefix: "Disclosure limits:",
  discBody:
    "This report was made available at the participant's discretion and covers only the evidence window stated above. Withdrawal ends availability for subsequent access through The 3rd Academy; it does not recall a copy already read. Earlier or later reports may exist; this page is not the complete observation history.",
  integPrefix: "Record integrity:",
  integBody:
    "Statements are source linked and subject to participant review, correction, amendment and evidence currency controls. Withdrawal is governed separately and applies to employer availability, not to the evidence record.",
  verifPrefix: "Verification:",
  verifBody:
    "A verification check confirms authenticity and current status; it does not disclose report content or participant identity.",
  frameRec: (n: number) => `Recorded in each of the ${n === 1 ? "single" : n === 2 ? "two" : n === 3 ? "three" : n === 4 ? "four" : String(n)} Stage contexts identified for this entry:`,
  framesByCount: (n: number): { label: string; frame: string } => {
    if (n === 1)
      return {
        label: "SINGLE RECORDED CONTEXT",
        frame: "Recorded in one Stage context:",
      };
    if (n >= 3)
      return {
        label: "BOUNDED RECURRENCE",
        frame: CT.frameRec(n),
      };
    return {
      label: "MULTIPLE RECORDED CONTEXTS",
      frame: `Recorded across ${n} Stage contexts:`,
    };
  },
};

// --- Formatting helpers ---------------------------------------------------
const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
const addMonths = (iso: string | null | undefined, months: number): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};
const yearOf = (iso?: string | null): string => {
  if (!iso) return new Date().getFullYear().toString();
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? new Date().getFullYear().toString()
    : d.getFullYear().toString();
};
const shortSerial = (uuid?: string | null): string => {
  if (!uuid) return "000000";
  // Six zero-padded digits derived from the uuid's first segment, stable per report.
  const n = parseInt(uuid.slice(0, 8), 16) % 1000000;
  return n.toString().padStart(6, "0");
};
const reportId = (uuid: string | undefined, issued: string | null | undefined): string =>
  `BER-${yearOf(issued)}-${shortSerial(uuid)}`;

// Build a minimal QR code at render time without a library. For a true
// Part-F renderer this would be a server-generated QR; for now we draw a
// placeholder that reads as a QR to a casual eye and prints at the right
// size. Replace with a real QR when the verification endpoint is wired.
export function QrPlaceholder({ size = 64 }: { size?: number }) {
  const cells = 25;
  const cs = size / cells;
  // Deterministic pseudo-random pattern from a small LCG so the view is stable.
  const seed = 1234567;
  const bits: boolean[] = [];
  let x = seed;
  for (let i = 0; i < cells * cells; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    bits.push(((x >> 16) & 1) === 1);
  }
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Finder patterns in three corners
      const inFinder = (rr: number, cc: number) =>
        rr < 7 && cc < 7
          ? !(rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4))
          : null;
      let fill = bits[r * cells + c];
      if (r < 7 && c < 7) fill = inFinder(r, c) === false;
      else if (r < 7 && c >= cells - 7) fill = inFinder(r, c - (cells - 7)) === false;
      else if (r >= cells - 7 && c < 7) fill = inFinder(r - (cells - 7), c) === false;
      if (fill)
        squares.push(
          <rect key={`${r}-${c}`} x={c * cs} y={r * cs} width={cs} height={cs} />,
        );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="#1A1A1A">
      <rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />
      {squares}
    </svg>
  );
}

export function BarCode({ text, width = 180, height = 40 }: { text: string; width?: number; height?: number }) {
  // Simple deterministic Code-128-looking bar pattern for layout. Replace
  // with a real Code-128 encoder when the verification endpoint lands.
  const chars = text.split("");
  const total = chars.reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars: React.ReactNode[] = [];
  let xcur = 0;
  for (let i = 0; i < chars.length * 4 && xcur < width; i++) {
    const w = ((chars[i % chars.length].charCodeAt(0) + i) % 4) + 1;
    const gap = ((total + i * 3) % 3) + 1;
    bars.push(<rect key={i} x={xcur} y={0} width={w} height={height - 10} fill="#1A1A1A" />);
    xcur += w + gap;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
      {bars}
      <text x={width / 2} y={height - 2} fontFamily="'Liberation Sans', Arial, sans-serif" fontSize="7" textAnchor="middle" fill="#1A1A1A">
        {text}
      </text>
    </svg>
  );
}

// Part-F colors, Table 57.3
export const COLORS = {
  NAVY: "#1B3A5C",
  NAVYL: "#2E4E70",
  OX: "#6E1F2A",
  GOLD: "#A8834A",
  GT: "#DFD8C9",
  GTL: "#E9E3D8",
  PARCH: "#FBF9F4",
  PARCHL: "#FEFDFB",
  BODY: "#1A1A1A",
  MUTED: "#5A5A5A",
};

const PRINT_CSS = `
:root {
  --ber-navy: ${COLORS.NAVY};
  --ber-navy-l: ${COLORS.NAVYL};
  --ber-ox: ${COLORS.OX};
  --ber-gold: ${COLORS.GOLD};
  --ber-gt: ${COLORS.GT};
  --ber-gtl: ${COLORS.GTL};
  --ber-parch: ${COLORS.PARCH};
  --ber-parch-l: ${COLORS.PARCHL};
  --ber-body: ${COLORS.BODY};
  --ber-muted: ${COLORS.MUTED};
}

html, body { margin: 0; padding: 0; background: #e8e4dc; color: var(--ber-body); }
body.ber-print-root {
  font-family: 'Liberation Sans', Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
  min-height: 100vh;
}
.ber-print-root * { box-sizing: border-box; }

.ber-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px;
  background: var(--ber-navy);
  color: #fff;
  font-family: 'Liberation Sans', Arial, sans-serif;
  font-size: 10.5pt; letter-spacing: 0.08em; text-transform: uppercase;
}
.ber-toolbar button {
  padding: 8px 18px;
  border: 1px solid #fff;
  background: #fff;
  color: var(--ber-navy);
  font-family: inherit;
  font-size: 10pt; letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
}
.ber-toolbar button:hover { background: var(--ber-gold); border-color: var(--ber-gold); color: #fff; }

.ber-page {
  background: var(--ber-parch);
  width: 816px;
  max-width: 100%;
  min-height: 1056px;
  margin: 24px auto;
  padding: 42px 42px 28px 42px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
}

.ber-mast {
  display: grid;
  /* Fixed photo column + 24px gutter so the title and purpose paragraph
     never crowd or wrap under the photo frame. */
  grid-template-columns: 1fr 94px;
  gap: 24px;
  align-items: start;
}
.ber-mast-left { min-width: 0; padding-right: 8px; }
.ber-brand-row { display: flex; align-items: center; gap: 10px; }
.ber-brand-mark { width: 24px; height: 28px; object-fit: contain; }
.ber-brand-text {
  font-weight: 700; letter-spacing: 0.14em;
  color: var(--ber-navy); font-size: 10.5pt;
}
.ber-title {
  font-family: 'Liberation Serif', Georgia, 'Times New Roman', serif;
  font-weight: 700;
  color: var(--ber-navy);
  font-size: 28pt;
  line-height: 1.05;
  margin: 6px 0 10px 0;
  letter-spacing: -0.01em;
}
.ber-purpose {
  color: var(--ber-body);
  font-size: 9.5pt; line-height: 1.4;
}
.ber-photo {
  /* The photo cell sits in its own fixed column; nothing in the left
     column can reach it. */
  width: 94px; height: 110px;
  background: #d9d4c7;
  border: 1px solid #b8b2a3;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 8px 6px;
  overflow: hidden;
}
/* Avatar silhouette: a single SVG so sizing stays predictable and no
   pseudo-element can bleed out of the frame. */
.ber-photo-silhouette {
  width: 48px; height: 56px;
  color: #a9a394;
}
.ber-photo-label {
  font-size: 6.5pt; color: var(--ber-muted); letter-spacing: 0.08em; text-transform: uppercase;
  margin-top: 2px; text-align: center; line-height: 1.1;
}

/* Particulars strip --------------------------------------------------- */
.ber-particulars {
  margin-top: 16px;
  background: var(--ber-gtl);
  border-top: 1px solid var(--ber-gt);
  border-bottom: 1px solid var(--ber-gt);
  padding: 12px 14px;
}
.ber-particulars-row {
  display: grid; grid-template-columns: 1.5fr 1.5fr 1.5fr 2fr;
  gap: 24px;
  align-items: flex-start;
}
.ber-particular .label {
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ber-navy);
  font-weight: 700; margin-bottom: 3px;
}
.ber-particular .value {
  font-weight: 700; color: var(--ber-body); font-size: 14pt;
}
.ber-particular .sub {
  font-size: 8.5pt; color: var(--ber-muted); margin-top: 2px;
}
.ber-status-line {
  margin-top: 6px;
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ber-navy);
  font-weight: 700;
}
.ber-status-line .val {
  color: var(--ber-body); font-weight: 400; margin-left: 6px; text-transform: none; letter-spacing: 0.03em;
  font-size: 9pt;
}

/* Verification band --------------------------------------------------- */
.ber-verify {
  margin-top: 14px;
  background: var(--ber-parch-l);
  border: 1px solid var(--ber-gt);
  padding: 14px;
  display: grid; grid-template-columns: 72px 1fr 220px;
  gap: 14px; align-items: center;
}
.ber-verify .heading {
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-navy); font-weight: 700; margin-bottom: 3px;
}
.ber-verify .url { color: var(--ber-body); font-size: 9.5pt; }
.ber-verify .cap { color: var(--ber-muted); font-size: 8.5pt; margin-top: 4px; }
.ber-verify .visibility { font-size: 8.5pt; margin-top: 6px; }
.ber-verify .visibility b { font-weight: 700; }
.ber-verify .sample {
  font-size: 7pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-muted); text-align: center; margin-top: 2px;
}

/* Scope callout ------------------------------------------------------- */
.ber-scope {
  margin-top: 14px;
  border-left: 3px solid var(--ber-gold);
  background: #f7f2e3;
  padding: 10px 14px;
  font-size: 9pt;
}
.ber-scope b { font-weight: 700; }

/* Recorded conduct heading ------------------------------------------- */
.ber-recorded-head {
  margin-top: 18px;
  font-size: 11pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-navy); font-weight: 700;
}

/* Conduct table ------------------------------------------------------ */
.ber-table {
  margin-top: 8px;
  width: 100%;
  border-collapse: collapse;
  background: var(--ber-parch-l);
  border: 1px solid var(--ber-gt);
}
.ber-table thead th {
  background: var(--ber-navy-l);
  color: #fff;
  font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 700;
  text-align: left;
  padding: 8px 10px;
  border-right: 1px solid var(--ber-navy);
}
.ber-table thead th:last-child { border-right: none; }
.ber-table td {
  padding: 14px 12px; vertical-align: top;
  border-right: 1px solid var(--ber-gt);
  border-top: 1px solid var(--ber-gt);
}
.ber-table td:last-child { border-right: none; }
.ber-table .dim-col {
  width: 90px;
}
.ber-table .dim-id {
  font-family: 'Liberation Serif', Georgia, serif;
  font-weight: 700; color: var(--ber-navy); font-size: 24pt; line-height: 1;
}
.ber-table .dim-name {
  font-size: 8.5pt; color: var(--ber-body); margin-top: 6px;
}
.ber-table .ctx-col { width: 150px; }
.ber-table .ctx-stages {
  color: var(--ber-navy); font-weight: 700; font-size: 10.5pt;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.ber-table .ctx-count { font-size: 8.5pt; color: var(--ber-body); margin-bottom: 6px; }
.ber-table .ctx-list { font-size: 8.5pt; color: var(--ber-body); }
.ber-table .ctx-list div { padding: 1px 0; }

.ber-table .conduct-col { }
.ber-table .ev-label {
  color: var(--ber-gold); font-weight: 700;
  font-size: 8.5pt; letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 4px;
}
.ber-table .frame { font-size: 9pt; margin-bottom: 10px; }
.ber-table .statement-block {
  border-left: 3px solid var(--ber-navy);
  padding: 6px 12px;
  background: var(--ber-parch);
  font-family: 'Liberation Serif', Georgia, serif;
  font-size: 11pt; line-height: 1.35; color: var(--ber-body);
  margin: 6px 0 10px 0;
  font-weight: 700;
}
.ber-table .illus-note {
  font-size: 8pt; font-style: italic; color: var(--ber-gold); margin: 4px 0 10px 0;
}
.ber-table .limit-note { font-size: 8.5pt; color: var(--ber-body); }

.ber-table .diff-col { width: 180px; }
.ber-table .diff-heading {
  color: var(--ber-gold); font-weight: 700;
  font-size: 8.5pt; letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 6px;
}
.ber-table .diff-row { font-size: 8.5pt; margin-bottom: 4px; }
.ber-table .diff-sep { font-size: 8pt; color: var(--ber-muted); margin-top: 8px; line-height: 1.35; }

/* Not represented strip ---------------------------------------------- */
.ber-not-rep-head {
  background: var(--ber-navy-l); color: #fff;
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
  padding: 6px 10px;
}
.ber-not-rep-sub {
  background: var(--ber-parch-l);
  border: 1px solid var(--ber-gt); border-top: none;
  padding: 6px 10px; font-size: 8.5pt; color: var(--ber-body);
}
.ber-not-rep {
  border: 1px solid var(--ber-gt); border-top: none;
  background: var(--ber-parch-l);
  padding: 10px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 24px;
  font-size: 9pt;
}
.ber-not-rep-item { padding: 2px 0; }
.ber-not-rep-item b { color: var(--ber-navy); font-weight: 700; margin-right: 6px; }

.ber-diff-shown {
  margin-top: 12px;
  font-size: 8.5pt; color: var(--ber-body);
}
.ber-diff-shown b { font-weight: 700; }

/* Review + availability --------------------------------------------- */
.ber-review-row {
  margin-top: 14px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
}
.ber-review-col .heading {
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-navy); font-weight: 700; margin-bottom: 4px;
}
.ber-review-col p { margin: 0; font-size: 9pt; }

/* Evidence note ----------------------------------------------------- */
.ber-evnote {
  margin-top: 14px;
  background: var(--ber-gtl);
  border-top: 1px solid var(--ber-gt);
  border-bottom: 1px solid var(--ber-gt);
  padding: 12px 16px;
}
.ber-evnote .heading {
  font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-navy); font-weight: 700; margin-bottom: 6px;
}
.ber-evnote p { margin: 4px 0; font-size: 8.5pt; line-height: 1.4; }
.ber-evnote p b { font-weight: 700; }

/* Footer ----------------------------------------------------------- */
.ber-footer {
  margin-top: 28px;
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ber-navy); font-weight: 700;
}
.ber-footer .version-line {
  margin-top: 2px; font-size: 7pt; color: var(--ber-muted); letter-spacing: 0.1em;
  text-transform: none; text-align: center;
  grid-column: 1 / span 2;
}

.ber-loading, .ber-refused {
  padding: 60px 20px; text-align: center;
  font-family: 'Liberation Serif', Georgia, serif;
  font-size: 18pt; color: var(--ber-muted);
}

@media print {
  /* 5 mm page margin: tight but safe for every modern consumer
     printer's unprintable zone (laser printers typically clip at 4 mm,
     inkjet at 3 mm). */
  @page { size: Letter; margin: 5mm; }
  .ber-toolbar { display: none; }
  body.ber-print-root { background: var(--ber-parch); }
  /* Pin the printed layout to paper width (8.5 in minus the 5 mm × 2
     page margin = ~8.11 in) regardless of whatever viewport width the
     print pipeline is using. Chrome's print-emulation uses 1280 px,
     Playwright's pdf() renders at ~756 px — both end up with the same
     typographic layout once width is nailed to paper. */
  html, body {
    background: var(--ber-parch);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: 8.11in;
    margin: 0 auto;
  }
  .ber-page {
    width: 8.11in;
    min-height: auto;
    height: 10.6in;
    overflow: hidden;
    margin: 0;
    padding: 0;
    box-shadow: none;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  /* Chrome's print pipeline ignores transform:scale and zoom for
     pagination decisions, so getting the record on one physical page
     needs real content tightening. The on-screen view is untouched;
     these rules apply only when @media print matches. */
  .ber-mast { gap: 14px; }
  .ber-title { font-size: 24pt; margin: 4px 0 6px 0; }
  .ber-purpose { font-size: 8.5pt; line-height: 1.3; }
  .ber-particulars { margin-top: 8px; padding: 6px 10px; }
  .ber-particulars-row { gap: 4px 18px; }
  .ber-particular .value { font-size: 11pt; }
  .ber-status-line { margin-top: 4px; }
  /* Verify-authenticity band (QR + barcode row): tightened so the trailing
     footer content fits on one page without touching the rest of the face. */
  .ber-verify { margin-top: 3px; padding: 2px 10px; }
  .ber-verify .cap, .ber-verify .visibility { font-size: 6.5pt; line-height: 1.2; }
  .ber-scope { margin-top: 8px; padding: 6px 10px; font-size: 8pt; }
  .ber-recorded-head { margin-top: 10px; font-size: 10pt; }
  .ber-table { margin-top: 5px; }
  .ber-table thead th { padding: 5px 8px; font-size: 7.5pt; }
  .ber-table td { padding: 7px 8px; }
  .ber-table .dim-id { font-size: 20pt; }
  .ber-table .dim-name { font-size: 7.5pt; }
  .ber-table .statement-block { font-size: 10pt; padding: 5px 10px; margin: 4px 0 6px 0; }
  .ber-table .illus-note, .ber-table .limit-note { font-size: 7.5pt; }
  .ber-table .frame { font-size: 8pt; margin-bottom: 6px; }
  .ber-table .ctx-stages { font-size: 9.5pt; margin-bottom: 4px; }
  .ber-table .ctx-count, .ber-table .ctx-list { font-size: 7.5pt; }
  /* Not-represented-in-this-report band (D2-D14 dimension grid): tightened
     so the trailing footer content fits on one page without touching the
     rest of the face. */
  .ber-not-rep-head { margin-top: 0; padding: 2px 10px; font-size: 6.5pt; }
  .ber-not-rep-sub { padding: 2px 10px; font-size: 7pt; }
  .ber-not-rep { padding: 2px 10px; gap: 0 20px; font-size: 7.5pt; line-height: 1.1; }
  .ber-not-rep-item { padding: 0; }
  .ber-diff-shown { margin-top: 4px; font-size: 7.5pt; }
  .ber-review-row { margin-top: 8px; }
  .ber-review-col p { font-size: 8pt; }
  /* Evidence Note block: slight tightening (padding, inter-paragraph
     margin, line-height) so the footer's "Issued under a published
     evidence standard" sub-line fits above the one-page clip. Font
     size unchanged — still 7.5pt — so legibility is kept. */
  .ber-evnote { margin-top: 6px; padding: 5px 10px; }
  .ber-evnote .heading { font-size: 7.5pt; margin-bottom: 3px; }
  .ber-evnote p { font-size: 7.5pt; margin: 1px 0; line-height: 1.25; }
  .ber-footer { margin-top: 2px; font-size: 7pt; }
}
`;

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Liberation+Sans:ital,wght@0,400;0,700;1,400&family=Liberation+Serif:ital,wght@0,400;0,700;1,400&display=swap";

type DimensionBucket = {
  id: string;
  name: string;
  stages: string[];
  rows: ConductRow[];
};

function bucketByDimension(rows: ConductRow[]): DimensionBucket[] {
  const map = new Map<string, DimensionBucket>();
  for (const r of rows) {
    const dim = DIMENSIONS.find((d) => d.id === r.dimension_id);
    if (!dim) continue;
    if (!map.has(dim.id))
      map.set(dim.id, { id: dim.id, name: dim.name, stages: [], rows: [] });
    const b = map.get(dim.id)!;
    b.rows.push(r);
    if (!b.stages.includes(r.stage_code)) b.stages.push(r.stage_code);
  }
  // Sort stages canonically, S1 → S4
  for (const b of map.values()) b.stages.sort();
  // Preserve DIMENSIONS order
  return DIMENSIONS.map((d) => map.get(d.id)).filter(Boolean) as DimensionBucket[];
}

type RenderCheckResult = {
  ok: boolean;
  refusal_code?: string;
  detail?: string;
  release_state?: string;
  output_mode?: string;
  entry_id?: string;
  use_disposition?: string;
  hit_words?: string[];
  sealed_digest?: string;
  live_digest?: string;
};

export default function BerPrintView() {
  const { berId } = useParams<{ berId: string }>();
  const [face, setFace] = useState<Face | null>(null);
  const [renderCheck, setRenderCheck] = useState<RenderCheckResult | null>(null);
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
      // Part F render check runs first. The face only renders if the
      // Standard approves this serve — the output mode is live, the pilot
      // authorization table (if any) is honored, the controlled text
      // register has not diverged, each composed statement's use
      // disposition permits the serve, and no composed body carries a word
      // on the prohibited vocabulary. Anything else is a refusal with the
      // Part F refusal code.
      const { data: cdata, error: cErr } = await supabase.rpc(
        "t3a_rce_render_check",
        {
          p_ber_report_id: berId,
          p_output_mode: "demonstration",
          p_pilot_authorization_id: null,
        },
      );
      if (cErr) {
        setError(cErr.message);
        return;
      }
      setRenderCheck((cdata ?? null) as RenderCheckResult | null);
      if (cdata && (cdata as RenderCheckResult).ok === false) return; // refusal — do not load the face

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

  // Every state carries PRINT_CSS + the font link in a shared frame so
  // the body always paints cream and the refusal / loading messages are
  // legible. Without this, a signed-out visitor (or anyone who prints
  // before the face RPC returns) sees the app's global dark theme and
  // prints a blank-looking record because the message text is dark on
  // dark.
  const frame = (children: React.ReactNode) => (
    <>
      <link href={FONTS_HREF} rel="stylesheet" />
      <style>{PRINT_CSS}</style>
      {children}
    </>
  );

  if (!berId) return frame(<div className="ber-loading">Missing report identifier.</div>);
  if (error) return frame(<div className="ber-refused">Could not assemble this report. {error}</div>);
  if (renderCheck && !renderCheck.ok) {
    return frame(
      <div className="ber-refused" style={{ textAlign: "left", maxWidth: 720, margin: "60px auto" }}>
        <div style={{ fontSize: "11pt", color: COLORS.NAVY, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
          Serve refused
        </div>
        <h2 style={{ fontFamily: "'Liberation Serif', Georgia, serif", color: COLORS.NAVY, fontSize: "22pt", margin: "6px 0 10px 0" }}>
          {renderCheck.refusal_code ?? "refusal"}
        </h2>
        <p style={{ fontSize: "10pt", color: COLORS.BODY, lineHeight: 1.4 }}>{renderCheck.detail ?? ""}</p>
        {renderCheck.hit_words && renderCheck.hit_words.length > 0 ? (
          <p style={{ fontSize: "9pt", color: COLORS.MUTED, marginTop: 10 }}>
            Prohibited words carried: {renderCheck.hit_words.join(", ")}
          </p>
        ) : null}
        {renderCheck.entry_id ? (
          <p style={{ fontSize: "9pt", color: COLORS.MUTED, marginTop: 6 }}>
            Entry: {renderCheck.entry_id}
            {renderCheck.use_disposition ? ` · disposition ${renderCheck.use_disposition}` : ""}
          </p>
        ) : null}
        {renderCheck.sealed_digest ? (
          <p style={{ fontSize: "8pt", color: COLORS.MUTED, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            sealed: {renderCheck.sealed_digest}<br />
            live:   {renderCheck.live_digest}
          </p>
        ) : null}
      </div>,
    );
  }
  if (!face) return frame(<div className="ber-loading">Assembling…</div>);
  if (!face.rendered) {
    return frame(
      <div className="ber-refused">This face does not render. {face.refusal_code ?? ""}</div>,
    );
  }

  const issuedAt = face.issued_at ?? face.amended_at ?? new Date().toISOString();
  const currencyAt = addMonths(issuedAt, 6);
  const reportIdStr = reportId(face.ber_report_id, issuedAt);
  docIdRef.current = reportIdStr;

  const conductBlock = face.blocks?.find((b) => b.block_no === 4);
  const buckets = bucketByDimension(conductBlock?.rows ?? []);
  const representedIds = new Set(buckets.map((b) => b.id));
  const notRepresented = DIMENSIONS.filter((d) => !representedIds.has(d.id));

  const participantStatus =
    face.status === "withdrawn" ? "Prior" : "Current";
  const outputModeLabel = "LAYOUT SPECIMEN — NOT AN ISSUED REPORT";

  // T3A-DEV-CR-BER-001 Change 2 (and §6.4 default): the subline
  // "Name shown on released copies" appears only when the Participant
  // field holds a placeholder — either empty, or the literal word
  // "Participant" (case-insensitive). A real participant name shows
  // no subline. The specimen face has no participant_name source so
  // the value is the literal placeholder, which keeps the subline on.
  const participantValue = "Participant";
  const isParticipantPlaceholder =
    participantValue.trim() === "" ||
    participantValue.trim().toLowerCase() === "participant";

  return frame(
    <>
      <div className="ber-toolbar">
        <span>Printable record · {reportIdStr}</span>
        <button onClick={() => window.print()}>Download PDF</button>
      </div>

      <div className="ber-page">
        {/* Masthead */}
        <div className="ber-mast">
          <div className="ber-mast-left">
            <div className="ber-brand-row">
              <img className="ber-brand-mark" src="/logo.png" alt="" />
              <span className="ber-brand-text">THE 3RD ACADEMY INC.</span>
            </div>
            <h1 className="ber-title">Behavioral Evidence Report</h1>
            <p className="ber-purpose">{CT.purpose}</p>
          </div>
          <div className="ber-photo">
            <svg
              className="ber-photo-silhouette"
              viewBox="0 0 48 56"
              fill="currentColor"
              aria-hidden="true"
            >
              {/* Head */}
              <circle cx="24" cy="18" r="11" />
              {/* Shoulders / torso silhouette, clipped at the frame bottom */}
              <path d="M 2 56 C 2 40, 10 32, 24 32 C 38 32, 46 40, 46 56 Z" />
            </svg>
            <div className="ber-photo-label">Photo placeholder</div>
          </div>
        </div>

        {/* Particulars strip */}
        <div className="ber-particulars">
          <div className="ber-particulars-row">
            <div className="ber-particular">
              <div className="label">Participant</div>
              <div className="value">{participantValue}</div>
              {isParticipantPlaceholder ? (
                <div className="sub">Name shown on released copies</div>
              ) : null}
            </div>
            <div className="ber-particular">
              <div className="label">Report ID</div>
              <div className="value">{reportIdStr}</div>
              <div className="sub">Version 1.0</div>
            </div>
            <div className="ber-particular">
              <div className="label">Issued</div>
              <div className="value">{fmtDate(issuedAt)}</div>
            </div>
            <div className="ber-particular">
              <div className="label">Evidence current until</div>
              <div className="value">{fmtDate(currencyAt)}</div>
            </div>
          </div>
          <div className="ber-status-line">
            Status <span className="val">{participantStatus}</span>
          </div>
        </div>

        {/* Verification band */}
        <div className="ber-verify">
          <QrPlaceholder size={66} />
          <div>
            <div className="heading">Verify authenticity and current status</div>
            <div className="url">verify.the3rdacademy.com/{reportIdStr}</div>
            <div className="cap">{CT.verifyCap}</div>
            <div className="visibility">
              <b>Employer visibility:</b> Participant controlled
            </div>
            <div className="cap">Available to approved employers while participant visibility is active.</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <BarCode text={reportIdStr} />
            <div className="sample">Sample reference</div>
          </div>
        </div>

        {/* Scope callout */}
        <div className="ber-scope">
          <b>{CT.scopeHead}</b> {CT.scopeBody}
        </div>

        {/* Recorded conduct */}
        <div className="ber-recorded-head">Recorded conduct</div>
        <table className="ber-table">
          <thead>
            <tr>
              <th className="dim-col">Dimension</th>
              <th className="ctx-col">Recorded contexts</th>
              <th className="conduct-col">Observed conduct</th>
              <th className="diff-col">Differences across settings</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 20, color: COLORS.MUTED, fontStyle: "italic" }}>
                  No conduct has been recorded for this participant yet.
                </td>
              </tr>
            ) : (
              buckets.map((b) => {
                const n = b.stages.length;
                const frame = CT.framesByCount(n);
                const stmt = b.rows[0]?.statement ?? "—";
                return (
                  <tr key={b.id}>
                    <td className="dim-col">
                      <div className="dim-id">{b.id}</div>
                      <div className="dim-name">{b.name}</div>
                    </td>
                    <td className="ctx-col">
                      <div className="ctx-stages">{b.stages.join(" ")}</div>
                      <div className="ctx-count">{n} recorded Stage context{n === 1 ? "" : "s"}</div>
                      <div className="ctx-list">
                        {b.stages.map((s) => (
                          <div key={s}>{STAGE_DESCRIPTIONS[s] ?? s}</div>
                        ))}
                      </div>
                    </td>
                    <td className="conduct-col">
                      <div className="ev-label">{frame.label}</div>
                      <div className="frame">{frame.frame}</div>
                      <div className="statement-block">{stmt.replace(/ — .+$/, "")}</div>
                      {b.rows.length === 1 ? null : (
                        <div className="illus-note">
                          Source links are held by The 3rd Academy.
                        </div>
                      )}
                      <div className="limit-note">{CT.limit}</div>
                    </td>
                    <td className="diff-col">
                      {n > 1 ? (
                        <>
                          <div className="diff-heading">Timing differed by setting</div>
                          {b.stages.slice(0, 3).map((s) => (
                            <div key={s} className="diff-row">
                              <b>{s}:</b> context-specific timing recorded.
                            </div>
                          ))}
                          <div className="diff-sep">{CT.diffSep}</div>
                        </>
                      ) : (
                        <div className="diff-sep">No cross-setting differences recorded.</div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Not represented */}
        <div className="ber-not-rep-head">Not represented in this report</div>
        <div className="ber-not-rep-sub">{CT.stub}</div>
        <div className="ber-not-rep">
          {notRepresented.length === 0 ? (
            <div style={{ gridColumn: "1 / span 3", color: COLORS.MUTED }}>
              Every dimension in the catalogue is represented in this report.
            </div>
          ) : (
            notRepresented.map((d) => (
              <div key={d.id} className="ber-not-rep-item">
                <b>{d.id}</b>
                {d.name}
              </div>
            ))
          )}
        </div>

        {/* How differences are shown */}
        <div className="ber-diff-shown">
          <b>{CT.diffShownHead}</b> {CT.diffShownBody}
        </div>

        {/* Review + availability */}
        <div className="ber-review-row">
          <div className="ber-review-col">
            <div className="heading">Participant review</div>
            <p>
              {CT.reviewed} {CT.correctionNone}
            </p>
          </div>
          <div className="ber-review-col">
            <div className="heading">Availability and status</div>
            <p>
              {CT.availPrefix}
              {fmtDate(currencyAt)}. Verification reference: {reportIdStr}.
            </p>
          </div>
        </div>

        {/* Evidence note */}
        <div className="ber-evnote">
          <div className="heading">Evidence note</div>
          <p>{CT.evNote}</p>
          <p>
            <b>{CT.usePrefix}</b> {CT.useBody}
          </p>
          <p>
            <b>{CT.discPrefix}</b> {CT.discBody}
          </p>
          <p>
            <b>{CT.integPrefix}</b> {CT.integBody}
          </p>
          <p>
            <b>{CT.verifPrefix}</b> {CT.verifBody}
          </p>
        </div>

        {/* Footer */}
        <div className="ber-footer">
          <span>{outputModeLabel}</span>
          <span>Page 1 of 1</span>
        </div>
        <div style={{ marginTop: 0, fontSize: "7pt", color: COLORS.MUTED, textAlign: "center", lineHeight: 1.1 }}>
          Prepared under The 3rd Academy evidence standard.
        </div>
      </div>
    </>,
  );
}
