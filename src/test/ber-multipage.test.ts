import { describe, it, expect } from "vitest";
import fixture from "@/lib/berMultipage/fix-multipage.json";
import claims from "../../docs/day1/evidence/ber-multipage-claims-sample.json";
import {
  checkAndResolve, paginate, controlledTextDigest, canonicalJson, GEOMETRY, checkGeometry, blockHeight, approxMeasure,
  type Package,
} from "@/lib/berMultipage";

const base = (): Package => JSON.parse(JSON.stringify(fixture));
const ok = (p: Package) => { const r = checkAndResolve(p); if (!r.ok) throw new Error(r.code + ": " + r.detail); return r.value; };
const code = (p: Package, fmt: "multi_page" | "one_page" = "multi_page") => { const r = checkAndResolve(p, fmt); return r.ok ? "ok" : r.code; };

describe("multi page BER (STD v9.19, Section 62)", () => {
  it("the controlled text register matches its authorized digest", async () => {
    expect(await controlledTextDigest(base().controlled_texts)).toBe(base().controlled_text_digest);
    expect(canonicalJson({ b: 1, a: ["x"] })).toBe('{"a": ["x"], "b": 1}');
  });

  it("seven represented dimensions paginate to five pages: cover, 3+3+1, controls", () => {
    const p = base(); const r = ok(p); const l = paginate(p, r);
    expect(l.ok).toBe(true); if (!l.ok) return;
    expect(l.value.total).toBe(5);
    expect(l.value.pages.map((x) => x.kind)).toEqual(["cover", "dimensions", "dimensions", "dimensions", "controls"]);
    expect(l.value.pages.slice(1, 4).map((x) => x.blocks.length)).toEqual([3, 3, 1]);
  });

  it("order is the manifest order, with no padding, rebalancing or reordering of the remainder page (4d)", () => {
    const p = base(); const r = ok(p); const l = paginate(p, r); if (!l.ok) throw new Error();
    expect(l.value.pages.flatMap((x) => x.blocks.map((b) => b.dim))).toEqual(["D1", "D2", "D3", "D4", "D5", "D8", "D9"]);
    expect(l.value.pages[3].blocks.map((b) => b.dim)).toEqual(["D9"]);
  });

  it("one represented dimension renders three pages and is never refused for its count (62.6 case 1)", () => {
    const p = base(); p.render_manifest.claim_packages = [p.render_manifest.claim_packages[0]];
    const r = ok(p); const l = paginate(p, r); if (!l.ok) throw new Error();
    expect(l.value.total).toBe(3);
    expect(r.unrepresented).toHaveLength(13);
  });

  it("a multi dimension manifest given to the single page renderer refuses format_mismatch; no page (case 2)", () => {
    expect(code(base(), "one_page")).toBe("format_mismatch");
    const p = base(); p.render_manifest.claim_packages = [p.render_manifest.claim_packages[0]];
    expect(code(p, "one_page")).toBe("ok");
  });

  it("the same dimension twice refuses dimension_repeated (case 3)", () => {
    const p = base(); p.render_manifest.claim_packages.push({ ...p.render_manifest.claim_packages[0] });
    expect(code(p)).toBe("dimension_repeated");
  });

  it("a manifest with no represented dimension refuses claim_package_absent", () => {
    const p = base(); p.render_manifest.claim_packages = [];
    expect(code(p)).toBe("claim_package_absent");
  });

  it("an unrepresented dimension appears in the contents and the strip, with no block anywhere (case 6)", () => {
    const p = base(); const r = ok(p); const l = paginate(p, r); if (!l.ok) throw new Error();
    expect(r.unrepresented).toEqual(["D6", "D7", "D10", "D11", "D12", "D13", "D14"]);
    expect(l.value.pages.flatMap((x) => x.blocks).some((b) => r.unrepresented.includes(b.dim))).toBe(false);
    expect(l.value.pageOf["D6"]).toBe(l.value.total);
    expect(l.value.pageOf["D5"]).toBe(3);
  });

  it("a block that does not fit starts the next page; three per page is a maximum (62.7)", () => {
    const p = base();
    // make D1's entry long and add many differences so two blocks cannot share the page with a third
    const long = "the participant " + "restated the whole sequence of the discussion and ".repeat(7) + "ended";
    p.entry_library.entries["ST-D2-TEST-001"].composed_text = long;
    const r = ok(p); const l = paginate(p, r); if (!l.ok) throw new Error(l.code);
    expect(l.value.pages.filter((x) => x.kind === "dimensions").every((x) => x.blocks.length <= 3)).toBe(true);
    expect(l.value.pages.filter((x) => x.kind === "dimensions").some((x) => x.blocks.length < 3 && x !== l.value.pages[l.value.pages.length - 2])).toBe(true);
    for (const pg of l.value.pages) if (pg.kind === "dimensions") expect(pg.endY!).toBeLessThanOrEqual(GEOMETRY.contentBottom);
  });

  it("a single block taller than a page refuses layout_overflow and produces no layout", () => {
    const p = base();
    p.entry_library.entries["ST-D2-TEST-001"].composed_text = "the participant " + "restated the sequence ".repeat(900);
    const r = ok(p); const l = paginate(p, r);
    expect(l.ok).toBe(false); if (!l.ok) expect(l.code).toBe("layout_overflow");
  });

  it("every block on every page ends inside the content box (case 4)", () => {
    const p = base(); const r = ok(p); const l = paginate(p, r); if (!l.ok) throw new Error();
    for (const pg of l.value.pages) if (pg.kind === "dimensions") expect(pg.endY!).toBeLessThanOrEqual(744);
  });

  it("a claim package with no differences carries T-NODIFF-001, so the fourth column is not blank (case 5)", () => {
    const p = base(); const r = ok(p);
    const d3 = r.blocks.find((b) => b.dim === "D3")!;
    expect(d3.diffs).toHaveLength(0);
    expect(p.controlled_texts["T-NODIFF-001"]).toBe("No difference across settings is recorded for this entry.");
    expect(blockHeight(p, d3, approxMeasure)).toBeGreaterThan(58);
  });

  it("the four table columns sum to 540.0 points", () => {
    expect(checkGeometry().ok).toBe(true);
  });

  it("a test only entry refuses to issue; the same manifest renders as a demonstration (entry_use_disposition_refused)", () => {
    const p = base(); p.render_manifest.output_mode = "issued";
    expect(code(p)).toBe("entry_use_disposition_refused");
    expect(code(base())).toBe("ok");
  });

  it("demonstration and pilot both set, a pilot without authorization, and ineligible modes refuse", () => {
    let p = base(); p.render_manifest.output_mode = "pilot"; expect(code(p)).toBe("output_mode_invalid");
    p = base(); p.render_manifest.pilot_authorization_id = "PA-1"; expect(code(p)).toBe("output_mode_invalid");
    p = base(); p.render_manifest.release_state = "withdrawn"; expect(code(p)).toBe("output_mode_ineligible");
    p = base(); p.render_manifest.output_mode = "weird" as any; expect(code(p)).toBe("render_input_invalid");
  });

  it("absent or malformed inputs refuse render_input_invalid", () => {
    let p = base(); delete (p.render_manifest as any).report_id; expect(code(p)).toBe("render_input_invalid");
    p = base(); p.render_manifest.issue_date = "2027-02-30"; expect(code(p)).toBe("render_input_invalid");
    p = base(); p.render_manifest.evidence_currency_date = "18 December 2027"; expect(code(p)).toBe("render_input_invalid");
  });

  it("unknown dimension, wrong order, unknown evidence state, unapproved entry refuse by code", () => {
    let p = base(); p.render_manifest.claim_packages[1].dimension_id = "D99"; expect(code(p)).toBe("dimension_unknown");
    p = base(); p.render_manifest.claim_packages.reverse(); expect(code(p)).toBe("dimension_order_invalid");
    p = base(); p.render_manifest.claim_packages[0].evidence_state = "strong"; expect(code(p)).toBe("evidence_state_unknown");
    p = base(); p.render_manifest.claim_packages[0].entry_id = "ST-D1-999"; expect(code(p)).toBe("entry_not_approved");
    p = base(); p.render_manifest.claim_packages[0].entry_version = "D1-LIB-9.9"; expect(code(p)).toBe("entry_not_approved");
  });

  it("a difference naming no context, or one the package does not support, refuses context_dependency_missing", () => {
    let p = base(); (p.render_manifest.claim_packages[0].differences[0] as any).context_instance_id = undefined; expect(code(p)).toBe("context_dependency_missing");
    p = base(); p.render_manifest.claim_packages[0].differences[0].context_instance_id = "CTX-NOPE"; expect(code(p)).toBe("context_dependency_missing");
  });

  it("an unresolved placeholder, a missing bound value and a prohibited term in the resolved clause refuse", () => {
    let p = base(); p.entry_library.entries["ST-D1-011"].composed_text = "the participant stated {count} issues"; expect(code(p)).toBe("placeholder_unresolved");
    p = base(); p.entry_library.entries["ST-D1-011"].composed_text = "the participant stated {count} issues"; p.render_manifest.claim_packages[0].bound_values = { count: "" }; expect(code(p)).toBe("bound_value_absent");
    p = base(); const first = (p.prohibited_vocabulary["D1"] as string[])[0];
    p.entry_library.entries["ST-D1-011"].composed_text = `the participant was ${first} about it`; expect(code(p)).toBe("prohibited_term_in_resolved_entry");
  });

  it("an unknown difference heading refuses difference_heading_absent", () => {
    const p = base(); p.render_manifest.claim_packages[0].heading_id = "T-NOPE"; expect(code(p)).toBe("difference_heading_absent");
  });

  it("a mandatory controlled text, state map key, stage description or the dimension register absent refuses", () => {
    let p = base(); delete (p.controlled_texts as any)["T-COVERAGE-001"]; expect(code(p)).toBe("controlled_text_absent");
    p = base(); delete (p.controlled_texts as any)["T-NODIFF-001"]; expect(code(p)).toBe("controlled_text_absent");
    p = base(); delete (p.state_maps as any)["T-REVIEW-MAP"]; expect(code(p)).toBe("controlled_text_absent");
    p = base(); delete (p.stage_descriptions as any)["S3"]; expect(code(p)).toBe("stage_description_absent");
    p = base(); (p.dimension_register as any).dimensions = []; expect(code(p)).toBe("dimension_register_absent");
    p = base(); p.render_manifest.review_state = "maybe"; expect(code(p)).toBe("state_value_unknown");
  });

  it("four identical runs give identical layouts", () => {
    const run = () => { const p = base(); const r = ok(p); const l = paginate(p, r); return JSON.stringify(l); };
    const a = run(); expect([run(), run(), run()].every((x) => x === a)).toBe(true);
  });

  it("a real report's claim packages from the server: issued mode, a build only entry refuses at issue; an entry approved for production renders three pages", () => {
    const live = (disp: string): Package => {
      const p = base(); const c = claims as any;
      p.render_manifest = JSON.parse(JSON.stringify(c.render_manifest));
      p.entry_library = { version: "LIB", entries: JSON.parse(JSON.stringify(c.entries)) };
      for (const e of Object.values(p.entry_library.entries)) (e as any).use_disposition = disp;
      return p;
    };
    expect(code(live("build_only"))).toBe("entry_use_disposition_refused");
    const p = live("production"); const r = ok(p); const l = paginate(p, r);
    expect(l.ok).toBe(true); if (l.ok) expect(l.value.total).toBe(3);
    expect(p.render_manifest.output_mode).toBe("issued");
  });
});
