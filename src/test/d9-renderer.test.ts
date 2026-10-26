import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import fixture from "@/lib/berMultipage/fix-multipage.json";
import { checkAndResolve, paginate, type Package } from "@/lib/berMultipage";

// D9 on the multi page renderer: D-07 (a D9 only report is three pages), the D9 prohibited list of Section 5.7a supplied to the renderer (row 14.3.1.16),
// and test D9-70 (a stated change and a kept approach render the same way). Pure functions on the frozen package; no network, no browser.
// Section 5.7a, word for word
const D9_LIST: string[] = ["learned", "learns", "learner", "learning", "realized", "understood", "grasped", "picked up", "caught on", "mastered", "grew", "growth", "improved", "improvement", "developed", "progressed", "agile", "agility", "adaptable", "adapted", "flexible", "coachable", "receptive", "open minded", "open-minded", "curious", "humble", "willing", "eager", "resistant", "resisted", "rigid", "stubborn", "defensive", "slow", "slowly", "quick", "quickly", "fast", "readily", "easily", "struggled", "capable", "ability", "intelligent", "smart", "bright", "competent", "beginner", "novice", "inexperienced", "expert", "rightly", "correctly", "wisely", "appropriately", "better", "worse", "best", "tends to", "always", "never", "likely", "took", "acted", "sought", "performed", "applied", "carried out", "tried", "tested", "adopted", "changed", "adjusted", "switched", "will", "would", "owned", "caused", "blamed", "prioritized", "verified", "proposed", "agreed", "disclosed", "recovered", "resumed", "persuaded"];
const base = (): Package => JSON.parse(JSON.stringify(fixture));
const only = (p: Package, dim: string) => { p.render_manifest.claim_packages = p.render_manifest.claim_packages.filter((c) => c.dimension_id === dim); return p; };
const withEntry = (id: string, text: string): Package => {
  const p = only(base(), "D9"); const lib = p.entry_library.entries as Record<string, Record<string, unknown>>;
  lib[id] = { ...lib["ST-D9-TEST-001"], entry_id: id, composed_text: text };
  p.render_manifest.claim_packages[0].entry_id = id; return p;
};
const CHANGE = "the participant stated a change to the approach from those the situation made available";            // ST-D9-006
const KEPT = "the participant stated that all or part of the current approach is to be kept and named a ground the situation set out";   // ST-D9-011

describe("D9 on the multi page renderer", () => {
  it("D9-67: a D9 only report renders three pages: cover, one dimension page, controls", () => {
    const p = withEntry("ST-D9-006", CHANGE); const r = checkAndResolve(p); if (!r.ok) throw new Error(r.code + r.detail);
    const l = paginate(p, r.value); if (!l.ok) throw new Error(l.code);
    expect(l.value.total).toBe(3);
    expect(l.value.pages.map((x) => x.kind)).toEqual(["cover", "dimensions", "controls"]);
    expect(l.value.pages[1].blocks.map((b) => b.dim)).toEqual(["D9"]);
    expect(r.value.unrepresented).toHaveLength(13);
  });

  it("the renderer's D9 list holds all 88 words of Section 5.7a (supplied to it in the D9 package) and refuses a D9 entry carrying any one of them", () => {
    const list = (fixture as Package).prohibited_vocabulary["D9"] as string[];
    expect(D9_LIST).toHaveLength(88);
    for (const w of D9_LIST) expect(list, w).toContain(w);
    for (const w of D9_LIST) {
      const r = checkAndResolve(withEntry("ST-D9-006", `the participant stated ${w} here`));
      expect(r.ok, w).toBe(false); if (!r.ok) expect(r.code, w).toBe("prohibited_term_in_resolved_entry");
    }
  });

  it("a D9 entry of the library renders, and the D9 list is not applied to another dimension", () => {
    expect(checkAndResolve(withEntry("ST-D9-006", CHANGE)).ok).toBe(true);
    expect(checkAndResolve(withEntry("ST-D9-011", KEPT)).ok).toBe(true);
    const p4 = only(base(), "D4"); const lib = p4.entry_library.entries as Record<string, Record<string, unknown>>; const id = p4.render_manifest.claim_packages[0].entry_id;
    lib[id] = { ...lib[id], composed_text: "the participant stated that they took the note" };
    expect(checkAndResolve(p4).ok).toBe(true);
  });

  it("D9-70: a claim package for a stated change and one for a kept approach resolve to the same structure; they differ only in the entry text", () => {
    const a = checkAndResolve(withEntry("ST-D9-006", CHANGE)), b = checkAndResolve(withEntry("ST-D9-011", KEPT));
    if (!a.ok || !b.ok) throw new Error("resolve");
    const strip = (blk: Record<string, unknown>) => { const { entry, ...rest } = blk; void entry; return rest; };
    expect(strip(a.value.blocks[0] as unknown as Record<string, unknown>)).toEqual(strip(b.value.blocks[0] as unknown as Record<string, unknown>));
    expect(a.value.blocks[0].entry).not.toBe(b.value.blocks[0].entry);
    expect(a.value.unrepresented).toEqual(b.value.unrepresented);
    // the same frame, the same context line, the same difference heading and the same dimension block for both; no word joins the two
    expect(a.value.blocks[0].state).toBe(b.value.blocks[0].state);
    expect(a.value.blocks[0].diffHeading).toBe(b.value.blocks[0].diffHeading);
    expect(a.value.blocks[0].entry + " " + b.value.blocks[0].entry).not.toMatch(/\b(but|however|although|instead)\b/i);
    // and laid out with the same measure for text of the same length: the layout reads the text length, never the entry
    const pa = withEntry("ST-D9-006", CHANGE), pb = withEntry("ST-D9-011", CHANGE);
    const la = paginate(pa, a.value), lb = paginate(pb, (checkAndResolve(pb) as { ok: true; value: never }).value);
    if (!la.ok || !lb.ok) throw new Error("layout");
    expect(la.value.pages.map((x) => [x.kind, x.blocks.length, x.endY ?? null])).toEqual(lb.value.pages.map((x) => [x.kind, x.blocks.length, x.endY ?? null]));
  });

  it("D9-70: no code of the renderer is keyed to a D9 entry, question, conduct element, or to a change or a kept approach", () => {
    const root = path.resolve(__dirname, "../..");
    for (const f of ["src/lib/berMultipage/index.ts", "src/pages/print/BerMultiPrintView.tsx"]) {
      const t = readFileSync(path.join(root, f), "utf8");
      expect(t, f).not.toMatch(/ST-D9-0|CE-D9|REK-D9|Q-D9|stated change|kept approach|keep(ing)? the approach/i);
    }
  });
});
