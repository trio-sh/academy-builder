/**
 * Multi page Behavioral Evidence Report: manifest checks, resolution and pagination.
 *
 * T3A-RCE-STD-001 v9.19, Part F, Section 62. This is the production format for one or more
 * represented dimensions. It sits beside the single page face (BerPrintView) and shares its
 * palette, type and controlled texts; it differs in pagination and nothing else (¶62.3).
 *
 * The renderer selects and places; it composes nothing (Section 50). Every refusal is raised
 * BEFORE anything is drawn, so a manifest the Standard refuses produces no page.
 *
 * Pure functions only. The measuring function is injected so the same wrapping is used for the
 * height computation and for the draw (¶62.5).
 */

/** One shape for both outcomes (the project compiles without strictNullChecks, so a union would not narrow). */
export interface Result<T> { ok: boolean; value?: T; code?: string; detail?: string }
export type Refusal = Result<never>;

export const refuse = (code: string, detail = ""): Result<never> => ({ ok: false, code, detail });

export type StageCode = "S1" | "S2" | "S3" | "S4";
const STAGE_ORDER: StageCode[] = ["S1", "S2", "S3", "S4"];

export interface SupportingContext { context_instance_id: string; stage_code: StageCode }
export interface Difference { difference_id: string; context_instance_id: string; condition: string; body: string }
export interface ClaimPackage {
  dimension_id: string;
  entry_id: string;
  entry_version: string;
  evidence_state: string;
  supporting_contexts: SupportingContext[];
  bound_values: Record<string, string>;
  heading_id?: string;
  differences: Difference[];
  context_dependencies: unknown[];
}
export interface RenderManifest {
  report_id: string;
  report_version: string;
  participant_display_name: string;
  participant_status: string;
  issue_date: string;
  evidence_currency_date: string;
  release_state: string;
  review_state: string;
  correction_state: string;
  entry_library_version: string;
  controlled_text_versions: Record<string, string>;
  presentation_version: string;
  output_mode: "issued" | "demonstration" | "pilot";
  pilot_authorization_id?: string | null;
  verification_display_address: string;
  verification_reference: string;
  participant_photo: unknown;
  claim_packages: ClaimPackage[];
}
export interface LibraryEntry {
  entry_id: string; entry_version: string; dimension_id: string; entry_type: string;
  composed_text: string; placeholder_grammar: Record<string, unknown>; context_dependencies: unknown[];
  use_disposition: "production" | "build_only" | "calibration_restricted" | string;
}
export interface Package {
  fixture_id?: string;
  render_manifest: RenderManifest;
  entry_library: { version: string; entries: Record<string, LibraryEntry> };
  prohibited_vocabulary: Record<string, string[] | string>;
  dimension_register: { version: string; dimensions: Array<{ dimension_id: string; full_name: string }> };
  stage_descriptions: Record<StageCode, string>;
  evidence_states: Record<string, { display_label: string; frame_text_id: string }>;
  controlled_texts: Record<string, string | string[]>;
  state_maps: Record<string, any>;
  fixed_strings: Record<string, any>;
  controlled_text_digest?: string;
}

const REQUIRED = [
  "report_id", "report_version", "participant_display_name", "participant_status", "issue_date",
  "evidence_currency_date", "release_state", "review_state", "correction_state", "claim_packages",
  "controlled_text_versions", "entry_library_version", "presentation_version", "output_mode",
  "verification_display_address", "verification_reference",
] as const;

/** Python json.dumps(sort_keys=True, ensure_ascii=False) so the digest matches the package's. */
export function canonicalJson(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(", ") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ": " + canonicalJson(o[k])).join(", ") + "}";
}

export async function controlledTextDigest(texts: Package["controlled_texts"]): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(texts));
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ELIGIBLE: Record<string, string[]> = {
  released: ["issued", "demonstration", "pilot"],
  draft: ["demonstration"],
  in_correction: ["demonstration"],
  superseded: ["demonstration"],
  withdrawn: [],
};

const MANDATORY_TEXTS = [
  "T-PURPOSE-001", "T-VERIFCAP-001", "T-SCOPE-001", "T-LIMIT-001", "T-DIFF-SEP", "T-DIFFSHOWN-001",
  "T-AVAIL-001", "T-STUB-001", "T-EVNOTE-001", "T-USE-001", "T-DISC-001", "T-INTEG-001", "T-VERIF-001",
  "T-NODIFF-001", "T-COVERAGE-001", "T-COLOPHON-001", "T-NOTREP-ALL",
];
const MANDATORY_MAPS = ["T-STATUS-MAP", "T-VISIBILITY-MAP", "T-REVIEW-MAP", "T-CORRECTION-MAP", "T-FOOTER-MAP", "T-REFMARK-MAP"];

function isRealDate(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Part F Table 56.1 step 5: the RESOLVED clause, whole words, case insensitive. */
export function scanProhibited(clause: string, dimensionId: string, vocab: Package["prohibited_vocabulary"]): string | null {
  const words = vocab[dimensionId];
  if (!Array.isArray(words)) return null;
  for (const w of words) {
    if (new RegExp("(^|[^A-Za-z0-9_])" + escapeRe(w) + "($|[^A-Za-z0-9_])", "i").test(clause)) return w;
  }
  return null;
}

export interface ResolvedBlock {
  dim: string;
  name: string;
  contexts: StageCode[];
  state: string;
  entry: string;
  diffHeading: string;
  diffs: Array<{ stage: StageCode; body: string }>;
}

export interface Resolved {
  manifest: RenderManifest;
  blocks: ResolvedBlock[];
  represented: string[];
  unrepresented: string[];
}

/**
 * Every control that runs before a page is drawn. The first failing control wins and nothing is produced.
 * `format` is the renderer being asked: the multi page renderer accepts one or more represented dimensions.
 */
export function validateAndResolve(pkg: Package, format: "multi_page" | "one_page" = "multi_page"): Result<Resolved> {
  const man = pkg.render_manifest;
  if (!man) return refuse("render_input_invalid", "no render manifest");
  for (const f of REQUIRED) {
    if (!(f in man)) return refuse("render_input_invalid", `missing field ${f}`);
    const v = (man as any)[f];
    if (f !== "claim_packages" && (v === null || v === "" || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0))) {
      return refuse("render_input_invalid", `empty field ${f}`);
    }
  }
  const mode = man.output_mode;
  if (!["issued", "demonstration", "pilot"].includes(mode)) return refuse("render_input_invalid", `unknown output_mode ${mode}`);
  const auth = man.pilot_authorization_id;
  if (mode === "pilot" && !auth) return refuse("output_mode_invalid", "pilot output without an authorization");
  if ((mode === "issued" || mode === "demonstration") && auth) return refuse("output_mode_invalid", `${mode} output carrying a pilot authorization`);

  const rel = man.release_state;
  if (!(rel in ELIGIBLE)) return refuse("render_input_invalid", `unknown release_state ${rel}`);
  if (!ELIGIBLE[rel].includes(mode)) return refuse("output_mode_ineligible", `${mode} output from a ${rel} version`);

  for (const f of ["issue_date", "evidence_currency_date"] as const) {
    if (!isRealDate(man[f])) return refuse("render_input_invalid", `${f} is not an absolute calendar date: ${String(man[f])}`);
  }

  // the registers the renderer reads must be loaded
  if (!pkg.dimension_register?.dimensions?.length) return refuse("dimension_register_absent");
  if (!pkg.evidence_states || !pkg.fixed_strings) return refuse("controlled_text_absent", "fixed strings or evidence states");
  for (const k of MANDATORY_TEXTS) if (pkg.controlled_texts?.[k] === undefined) return refuse("controlled_text_absent", k);
  for (const k of MANDATORY_MAPS) if (pkg.state_maps?.[k] === undefined) return refuse("controlled_text_absent", k);
  for (const s of STAGE_ORDER) if (!pkg.stage_descriptions?.[s]) return refuse("stage_description_absent", s);
  if (pkg.state_maps["T-REVIEW-MAP"][man.review_state] === undefined) return refuse("state_value_unknown", `review_state ${man.review_state}`);
  if (pkg.state_maps["T-CORRECTION-MAP"][man.correction_state] === undefined) return refuse("state_value_unknown", `correction_state ${man.correction_state}`);
  if (pkg.state_maps["T-STATUS-MAP"][man.participant_status] === undefined) return refuse("state_value_unknown", `participant_status ${man.participant_status}`);
  if (pkg.state_maps["T-FOOTER-MAP"][mode] === undefined) return refuse("state_value_unknown", `output_mode ${mode}`);

  const cps = man.claim_packages;
  if (!Array.isArray(cps) || cps.length === 0) return refuse("claim_package_absent", "no represented dimension");

  // the single page renderer is closed to a multi dimension manifest (refusal 35e)
  if (format === "one_page" && cps.length > 1) return refuse("format_mismatch", "a multi dimension manifest given to the single page renderer");

  const known = new Map(pkg.dimension_register.dimensions.map((d) => [d.dimension_id, d.full_name]));
  const order = pkg.dimension_register.dimensions.map((d) => d.dimension_id);
  const seen = new Set<string>();
  let last = -1;
  const blocks: ResolvedBlock[] = [];
  for (const cp of cps) {
    if (!known.has(cp.dimension_id)) return refuse("dimension_unknown", cp.dimension_id);
    if (seen.has(cp.dimension_id)) return refuse("dimension_repeated", cp.dimension_id);
    seen.add(cp.dimension_id);
    const idx = order.indexOf(cp.dimension_id);
    if (idx < last) return refuse("dimension_order_invalid", cp.dimension_id);
    last = idx;

    const st = pkg.evidence_states[cp.evidence_state];
    if (!st) return refuse("evidence_state_unknown", cp.evidence_state);
    if (pkg.controlled_texts[st.frame_text_id] === undefined) return refuse("frame_absent", st.frame_text_id);

    const ent = pkg.entry_library.entries[cp.entry_id];
    if (!ent || ent.entry_version !== cp.entry_version) return refuse("entry_not_approved", cp.entry_id);
    if (ent.dimension_id !== cp.dimension_id) return refuse("entry_not_approved", `${cp.entry_id} belongs to ${ent.dimension_id}`);
    const disp = ent.use_disposition ?? "build_only";
    if (mode === "issued" && disp !== "production") return refuse("entry_use_disposition_refused", `${cp.entry_id} is ${disp} and may not be issued`);
    if (mode === "pilot" && disp === "calibration_restricted") return refuse("entry_use_disposition_refused", `${cp.entry_id} is calibration restricted`);

    const hid = cp.heading_id ?? "T-DIFF-HEADING-001";
    if (pkg.controlled_texts[hid] === undefined) return refuse("difference_heading_absent", hid);

    const ctxIds = new Set(cp.supporting_contexts.map((c) => c.context_instance_id));
    for (const c of cp.supporting_contexts) {
      if (!c.context_instance_id || !c.stage_code) return refuse("context_dependency_missing", `a supporting context of ${cp.dimension_id} is incomplete`);
      if (!STAGE_ORDER.includes(c.stage_code)) return refuse("stage_description_absent", c.stage_code);
    }
    for (const d of cp.differences ?? []) {
      if (!d.context_instance_id) return refuse("context_dependency_missing", `difference ${d.difference_id ?? "?"} names no context instance`);
      if (!ctxIds.has(d.context_instance_id)) return refuse("context_dependency_missing", `difference ${d.difference_id ?? "?"} names ${d.context_instance_id}, which this package does not support`);
    }

    // resolve the clause: bound values substituted, then nothing may remain, then the scan
    let clause = ent.composed_text;
    for (const [k, v] of Object.entries(cp.bound_values ?? {})) {
      if (v === undefined || v === null || String(v).trim() === "") return refuse("bound_value_absent", k);
      clause = clause.split("{" + k + "}").join(String(v));
    }
    if (/[{}]/.test(clause)) return refuse("placeholder_unresolved", clause);
    const hit = scanProhibited(clause, cp.dimension_id, pkg.prohibited_vocabulary);
    if (hit) return refuse("prohibited_term_in_resolved_entry", `${cp.dimension_id}: ${hit}`);

    const byId = new Map(cp.supporting_contexts.map((c) => [c.context_instance_id, c.stage_code]));
    const contexts = Array.from(new Set(cp.supporting_contexts.map((c) => c.stage_code))).sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
    blocks.push({
      dim: cp.dimension_id, name: known.get(cp.dimension_id)!, contexts, state: cp.evidence_state, entry: clause,
      diffHeading: pkg.controlled_texts[hid] as string,
      diffs: (cp.differences ?? []).map((d) => ({ stage: byId.get(d.context_instance_id)!, body: d.body })),
    });
  }
  // the demonstration notice never appears outside demonstration mode (refusal 29)
  if (mode === "issued") {
    const demo = pkg.controlled_texts["T-DEMO-001"];
    const all = JSON.stringify([blocks.map((b) => b.entry), man.participant_display_name]);
    if (typeof demo === "string" && all.includes(demo)) return refuse("demonstration_text_on_issued_report", "T-DEMO-001");
  }
  const represented = blocks.map((b) => b.dim);
  return { ok: true, value: { manifest: man, blocks, represented, unrepresented: order.filter((d) => !seen.has(d)) } };
}

// ---------------------------------------------------------------------------------------------
// Pagination (Table 62.2). Geometry in points, page 612 x 792, content y 86.0 to 744.0.
// ---------------------------------------------------------------------------------------------

export const GEOMETRY = {
  pageW: 612, pageH: 792, left: 36, right: 576, contentTop: 86, contentBottom: 744,
  /** The four table columns sum to 540.0 points (refusal 7). */
  cols: [
    { x: 36.0, w: 70.0, pad: 7.2 }, { x: 106.0, w: 103.0, pad: 7.2 },
    { x: 209.0, w: 189.0, pad: 7.4 }, { x: 398.0, w: 178.0, pad: 7.4 },
  ],
  perPageMax: 3,
  blockGap: 14,
  /** heading line (16) and the 18 point column header strip, painted above the fill */
  blockHeader: 34,
};

export function checkGeometry(): Result<boolean> {
  const sum = GEOMETRY.cols.reduce((a, c) => a + c.w, 0);
  return Math.abs(sum - 540.0) < 1e-9 ? { ok: true, value: true } : refuse("layout_geometry_invalid", `columns sum to ${sum}`);
}

/** width of a string in points for a font face and size; injected so draw and measure agree */
export type Measure = (text: string, face: "sans" | "sansBold" | "sansItalic" | "serifBold", size: number, tracking?: number) => number;

/**
 * Average advance widths (em) of Liberation Sans / Serif Bold, used where no canvas is available (tests, server).
 * Calibrated on FIX-MULTIPAGE so the three page fixture paginates 3 + 3 + 1; the browser view measures with the
 * real faces instead. It errs wide, which breaks a page early rather than overrunning the boundary.
 */
export const approxMeasure: Measure = (text, face, size, tracking = 0) => {
  const k = face === "serifBold" ? 0.44 : face === "sansBold" ? 0.44 : face === "sansItalic" ? 0.41 : 0.42;
  return text.length * (size * k + tracking * size);
};

export function wrapLines(text: string, face: Parameters<Measure>[1], size: number, width: number, measure: Measure, tracking = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (measure(t, face, size, tracking) <= width || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const WORD: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four" };
export const frameText = (pkg: Package, b: ResolvedBlock): string => {
  const f = pkg.controlled_texts[pkg.evidence_states[b.state].frame_text_id] as string;
  return f.replace("{context_count}", WORD[b.contexts.length] ?? String(b.contexts.length));
};

/** Height of a dimension block body, computed before the fill is painted (¶62.5). Same wrap as the draw. */
export function blockHeight(pkg: Package, b: ResolvedBlock, measure: Measure): number {
  const [, , c2, c3] = GEOMETRY.cols;
  const ww = c2.w - 2 * c2.pad, w3 = c3.w - 2 * c3.pad;
  const T = pkg.controlled_texts as Record<string, string>;
  let y = 12 + 13;
  y += wrapLines(frameText(pkg, b), "sans", 8, ww, measure).length * 9.5 + 4;
  const e = b.entry.charAt(0).toUpperCase() + b.entry.slice(1) + ".";
  y += wrapLines(e, "serifBold", 10, ww - 28, measure).length * 11 + 24 + 4;
  y += wrapLines(T["T-ILLUS-001"] ?? "", "sansItalic", 6.5, ww, measure).length * 7.5 + 6;
  y += wrapLines(T["T-LIMIT-001"], "sans", 7.5, ww, measure).length * 9;
  const col3 = y;
  y = 12;
  if (b.diffs.length) {
    y += 13;
    for (const d of b.diffs) y += wrapLines(`${d.stage}: ${d.body}`, "sans", 8, w3, measure).length * 10;
    y += 9 + wrapLines(T["T-DIFF-SEP"], "sans", 7.5, w3, measure).length * 9;
  } else {
    y += wrapLines(T["T-NODIFF-001"], "sans", 7.5, w3, measure).length * 9;
  }
  const col2 = 44 + b.contexts.length * 10.5;
  return Math.max(col3, y, col2, 58) + 8;
}

export interface Page {
  kind: "cover" | "dimensions" | "controls";
  number: number;
  blocks: ResolvedBlock[];
  /** the y at which the last block on a dimension page finishes, for the boundary check */
  endY?: number;
}
export interface Layout { pages: Page[]; total: number; pageOf: Record<string, number> }

/**
 * Cover, dimension pages, controls. Three per page is a maximum: a block that does not fit starts the next
 * page, blocks never split, never reorder, the last page carries the remainder and is not padded (¶62.7).
 * A single block that cannot fit a page of its own refuses `layout_overflow`.
 */
export function paginate(pkg: Package, r: Resolved, measure: Measure = approxMeasure): Result<Layout> {
  const g = checkGeometry();
  if (!g.ok) return refuse(g.code!, g.detail);
  const avail = GEOMETRY.contentBottom - GEOMETRY.contentTop;
  const pages: Page[] = [{ kind: "cover", number: 1, blocks: [] }];
  let cur: ResolvedBlock[] = [];
  let y = GEOMETRY.contentTop;
  const flush = () => { if (cur.length) { pages.push({ kind: "dimensions", number: pages.length + 1, blocks: cur, endY: y }); cur = []; y = GEOMETRY.contentTop; } };
  for (const b of r.blocks) {
    const h = GEOMETRY.blockHeader + blockHeight(pkg, b, measure) + GEOMETRY.blockGap;
    if (h > avail) return refuse("layout_overflow", `${b.dim} needs ${h.toFixed(1)} points; a page offers ${avail}`);
    if (cur.length === GEOMETRY.perPageMax || y + h > GEOMETRY.contentBottom) flush();
    cur.push(b); y += h;
  }
  flush();
  pages.push({ kind: "controls", number: pages.length + 1, blocks: [] });
  const total = pages.length;
  const pageOf: Record<string, number> = {};
  for (const p of pages) for (const b of p.blocks) pageOf[b.dim] = p.number;
  for (const d of r.unrepresented) pageOf[d] = total;
  return { ok: true, value: { pages, total, pageOf } };
}

/** Month day, year; the date strings are absolute and never parsed loosely. */
export const longDate = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[Number(m) - 1]} ${Number(d)}, ${y}`;
};
