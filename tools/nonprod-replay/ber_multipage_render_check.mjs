// Renders the multi page specimen in a real browser and records what was observed (STD v9.19 Section 62.7).
// Usage: node ber_multipage_render_check.mjs <base url> <out json>   (the app is served by `vite preview`)
import { chromium } from "playwright";
import fs from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:4180", out = process.argv[3] || "docs/day1/evidence/ber-multipage-render-check.json";
const exe = process.env.CHROMIUM || "/opt/pw-browsers/chromium";
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const open = async (path) => { const p = await b.newPage({ viewport: { width: 900, height: 1200 } }); await p.goto(base + path, { waitUntil: "load" }); await p.waitForTimeout(2500); return p; };
const probe = (p) => p.evaluate(() => {
  const pg = [...document.querySelectorAll(".mp-page")]; const box = (e) => e.getBoundingClientRect();
  return {
    pages: pg.map(x => ({ n: +x.dataset.page, kind: x.dataset.kind, w: Math.round(box(x).width), h: Math.round(box(x).height), blocks: [...x.querySelectorAll("[data-block]")].map(y => ({ d: y.dataset.block, bottom: Math.round(box(y).bottom - box(x).top), right: Math.round(box(y).right - box(x).left) })), over: (() => { const c = x.querySelector(".mp-content"); return c ? c.scrollHeight - c.clientHeight : 0; })(), text: x.innerText })),
    refused: document.querySelector(".mp-refused")?.innerText ?? null,
  };
});
// seven dimensions: five pages, 3 + 3 + 1
let p = await open("/print/ber-multi/specimen"); let r = await probe(p);
const dimPages = r.pages.filter(x => x.kind === "dimensions");
rec("render-7", "seven represented dimensions render five pages: cover, three dimension pages (3, 3, 1 blocks), controls", r.pages.length === 5 && JSON.stringify(dimPages.map(x => x.blocks.length)) === "[3,3,1]", r.pages.map(x => `${x.kind}:${x.blocks.length}`));
const PX = 816, PY = 1056, ptpx = 96 / 72;
rec("render-7", "every page is 612 by 792 points and no block passes the content box (x 576, y 744) on any page", r.pages.every(x => x.w === PX && x.h === PY) && r.pages.every(x => x.blocks.every(y => y.bottom <= 744 * ptpx + 1 && y.right <= 576 * ptpx + 1)) && r.pages.every(x => x.over <= 0), r.pages.map(x => x.blocks.map(y => y.bottom)));
rec("render-7", "every page states Page n of 5", r.pages.every(x => x.text.includes(`Page ${x.n} of 5`)), null);
const cover = r.pages[0].text, ctl = r.pages[4].text;
rec("render-7", "the cover carries the report contents with all fourteen dimensions, T-COVERAGE-001 and the scope panel", (cover.match(/Not represented/g) || []).length === 7 && (cover.match(/Represented/g) || []).length >= 7 && /not a score, a rating/.test(cover) && /Scope and limits/.test(cover), null);
rec("render-7", "the controls page carries the unrepresented strip, the evidence note, permitted use and the currency date visibly", /NOT REPRESENTED IN THIS REPORT/.test(ctl) && /Permitted use/.test(ctl) && /Evidence current until: December 18, 2027/.test(ctl), null);
rec("render-7", "the demonstration footer is on every page and no issued claim is made", r.pages.every(x => x.text.includes("LAYOUT SPECIMEN — NOT AN ISSUED REPORT")), null);
rec("render-7", "a dimension with no recorded difference shows the controlled sentence, not a blank (D3 and D9)", dimPages.flatMap(x => x.text.match(/No difference across settings is recorded for this entry\./g) || []).length === 2, null);
rec("render-7", "no block is rendered for an unrepresented dimension (the strip and contents list them only)", dimPages.every(x => !/D6|D7|D10|D11|D12|D13|D14/.test(x.text.replace(/Differences? across settings/gi, ""))), null);
// one dimension: three pages
await p.close(); p = await open("/print/ber-multi/specimen?only=D4"); r = await probe(p);
rec("render-1", "a D4 only report renders three pages: cover, one dimension page, controls; it is not refused for its count", r.pages.length === 3 && r.pages[1].blocks.length === 1 && r.pages[1].blocks[0].d === "D4" && !r.refused, r.pages.map(x => `${x.kind}:${x.blocks.length}`));
rec("render-1", "the contents list D4 as represented and thirteen dimensions as not represented", (r.pages[0].text.match(/Not represented/g) || []).length === 13, null);
// one D9 dimension: three pages, and its entry is styled as every other dimension's entry (D9 tests D9-67 and D9-70)
const entryStyle = (pg, dim) => pg.evaluate((d) => { const e = document.querySelector(`[data-block="${d}"] .mp-serif`); if (!e) return null; const cs = getComputedStyle(e); return { cls: e.className, size: cs.fontSize, weight: cs.fontWeight, color: cs.color, rule: cs.borderLeft, family: cs.fontFamily, style: cs.fontStyle, text: e.textContent }; }, dim);
const style4 = await entryStyle(p, "D4");
await p.close(); p = await open("/print/ber-multi/specimen?only=D9"); r = await probe(p);
rec("render-1", "a D9 only report renders three pages: cover, one dimension page, controls; it is not refused for its count", r.pages.length === 3 && r.pages[1].blocks.length === 1 && r.pages[1].blocks[0].d === "D9" && !r.refused, r.pages.map(x => `${x.kind}:${x.blocks.length}`));
rec("render-1", "the contents list D9 as represented and thirteen dimensions as not represented", (r.pages[0].text.match(/Not represented/g) || []).length === 13, null);
const style9 = await entryStyle(p, "D9");
const W88 = ["learned", "realized", "understood", "mastered", "improved", "adaptable", "coachable", "curious", "resistant", "rigid", "slow", "quick", "readily", "easily", "capable", "competent", "beginner", "novice"];
rec("render-1", "the D9 claim package block is styled exactly as the D4 entry block: the same classes, size, weight, colour, rule and face, no marker, icon or colour of its own; and its text carries no word of the D9 list and no joining but, however, although or instead", !!style9 && !!style4 && ["cls", "size", "weight", "color", "rule", "family", "style"].every(k => style9[k] === style4[k]) && !W88.some(w => new RegExp("\\b" + w + "\\b", "i").test(style9.text)) && !/\b(but|however|although|instead)\b/i.test(style9.text), { d9: style9, d4: style4 });
// a refusal draws nothing
await p.close(); p = await open("/print/ber-multi/BER-REAL-1"); r = await probe(p);
rec("render-refuse", "a real report identifier with no signed in participant produces no page: the server route refuses and the screen shows the refusal", r.pages.length === 0 && !!r.refused, r.refused);
await p.close(); p = await open("/print/ber-multi/specimen?only=D99"); r = await probe(p);
rec("render-refuse", "a manifest with no represented dimension refuses claim_package_absent and draws no page", r.pages.length === 0 && /claim_package_absent/.test(r.refused || ""), r.refused);
await p.close(); p = await open("/print/ber-multi/specimen?drop=T-USE-001"); r = await probe(p);
rec("render-refuse", "a report with the permitted-use text unloaded refuses controlled_text_absent and draws no page; the block is never omitted", r.pages.length === 0 && /controlled_text_absent/.test(r.refused || ""), r.refused);
await b.close();
fs.writeFileSync(out, JSON.stringify({ passed: R.filter(x => x.pass).length, total: R.length, failed: R.filter(x => !x.pass), results: R }, null, 1));
console.log(JSON.stringify({ passed: R.filter(x => x.pass).length, total: R.length, failed: R.filter(x => !x.pass) }, null, 1));
