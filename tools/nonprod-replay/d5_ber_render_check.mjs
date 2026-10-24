// Renders the multi page specimen for a D5 only report in a real browser and records what was observed (STD v9.19 Section 62.7; D5 test D5-67, D5-62, D5-51, D5-37, D5-68, D5-64).
// Usage: node d5_ber_render_check.mjs <base url> <out json>   (the app is served by `vite preview`; the browser is the one Playwright uses for the repository's own tests)
// The specimen is the frozen multi page fixture of the repository (src/lib/berMultipage/fix-multipage.json): a D5 only report is the same manifest reduced to its D5 claim package.
import { chromium } from "playwright";
import fs from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:4180", out = process.argv[3] || "docs/day1/evidence/d5-ber-multipage-render-check.json";
const exe = process.env.CHROMIUM || "/opt/pw-browsers/chromium";
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const open = async (path) => { const p = await b.newPage({ viewport: { width: 900, height: 1200 } }); await p.goto(base + path, { waitUntil: "load" }); await p.waitForTimeout(2500); return p; };
const probe = (p) => p.evaluate(() => {
  const pg = [...document.querySelectorAll(".mp-page")]; const box = (e) => e.getBoundingClientRect();
  return {
    pages: pg.map(x => ({ n: +x.dataset.page, kind: x.dataset.kind, w: Math.round(box(x).width), h: Math.round(box(x).height), blocks: [...x.querySelectorAll("[data-block]")].map(y => ({ d: y.dataset.block, bottom: Math.round(box(y).bottom - box(x).top), right: Math.round(box(y).right - box(x).left), text: y.innerText })), over: (() => { const c = x.querySelector(".mp-content"); return c ? c.scrollHeight - c.clientHeight : 0; })(), text: x.innerText })),
    refused: document.querySelector(".mp-refused")?.innerText ?? null,
  };
});
// the Section 5.7a list of D5 (prohibited in every D5 statement and template, scanned on rendered output)
const PROHIBITED = ["resolved", "unresolved", "settled", "defused", "de-escalated", "escalated", "aligned", "agreed", "compromised", "conceded", "won", "lost", "persuaded", "convinced", "reconciled", "repaired", "restored", "built rapport", "smoothed", "salvaged", "bridged", "brought round", "collaborative", "cooperative", "uncooperative", "difficult", "rigid", "flexible", "accommodating", "diplomatic", "abrasive", "team player", "reasonable", "unreasonable", "fair", "unfair", "territorial", "calmly", "politely", "warmly", "defensively", "will", "would", "tends to", "always", "never", "likely", "owned", "caused", "blamed", "prioritized", "verified"];
const hasWord = (t, w) => new RegExp("(^|[^a-z0-9_])" + w.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9_])", "i").test(t);
const ROLE_SUBJECT = /(^|[.;:!?]\s+|,\s+|\b(?:that|and|but|when|while|if|because)\s+)(?:the\s+)?(?:other\s+)?(colleague|colleagues|manager|managers|team|lead|leads|director|representative|representatives|party|parties|member|members|chair|agent|sponsor|counterpart|executive|nominee|nominees|officer)\s+(?!(?:a|an|the|of|in|on|at|to|for|from|with|by|and|or|but|as|than|about|their|his|her|its|not)\b)[a-z]/i;

let p = await open("/print/ber-multi/specimen?only=D5"); let r = await probe(p);
rec("D5-67", "a D5 only report renders three pages through the multi page renderer: cover, one dimension page holding the D5 block, controls; it is not refused", r.pages.length === 3 && r.pages[1].blocks.length === 1 && r.pages[1].blocks[0].d === "D5" && !r.refused, r.pages.map(x => `${x.kind}:${x.blocks.length}`));
rec("D5-67", "the contents list D5 as represented and thirteen dimensions as not represented", (r.pages[0].text.match(/Not represented/g) || []).length === 13 && /D5 Collaboration and Conflict Resolution\s+Represented/.test(r.pages[0].text), null);
const PX = 816, PY = 1056, ptpx = 96 / 72;
rec("D5-25", "every page is 612 by 792 points, no block passes the content box (x 576, y 744), nothing overflows, and every page states Page n of 3", r.pages.every(x => x.w === PX && x.h === PY) && r.pages.every(x => x.blocks.every(y => y.bottom <= 744 * ptpx + 1 && y.right <= 576 * ptpx + 1)) && r.pages.every(x => x.over <= 0) && r.pages.every(x => x.text.includes(`Page ${x.n} of 3`)), r.pages.map(x => x.blocks.map(y => y.bottom)));
const ctl = r.pages[2].text;
rec("D5-51", "the evidence currency statement appears visibly on the controls page (the availability and status block), with the absolute date", /AVAILABILITY AND STATUS/.test(ctl) && /Evidence current until: December 18, 2027/.test(ctl), null);
rec("D5-62", "the specimen face renders in full: cover, D5 block, controls with the unrepresented strip, permitted use and disclosure limits; the specimen footer is on every page and no issued claim is made", /NOT REPRESENTED IN THIS REPORT/.test(ctl) && /Permitted use/.test(ctl) && /Disclosure limits/.test(ctl) && r.pages.every(x => x.text.includes("LAYOUT SPECIMEN — NOT AN ISSUED REPORT")), null);
rec("D5-43", "no named-recipient, release-token, passcode or released-to-your-organization construction appears on any page of the D5 only report", !r.pages.some(x => /named recipient|release token|redemption passcode|released to your organization/i.test(x.text)), null);
rec("D5-68", "neither counterpart_role nor counterpart_position, nor a counterpart label, appears on any page of the D5 only report", !r.pages.some(x => /counterpart/i.test(x.text)), null);
const d5text = r.pages[1].blocks[0].text;
rec("D5-27", "no word of the Section 5.7a list (outcome, trait, manner, modal, prediction and cross dimension words) appears in the rendered D5 block", PROHIBITED.filter(w => hasWord(d5text, w)).length === 0, PROHIBITED.filter(w => hasWord(d5text, w)));
rec("D5-64", "no rendered D5 sentence has a counterpart role label as the subject of a verb", !ROLE_SUBJECT.test(d5text.replace(/\n+/g, ". ")), null);
rec("D5-26", "no overall, composite, average, profile or score element appears on any page", !r.pages.some(x => /\b(overall|composite|average|profile|score)\b/i.test(x.text.replace(/not a score, a rating, a ranking or an endorsement/i, ""))), null);
await p.close();
// the same report as a refusal: the permitted-use text unloaded
p = await open("/print/ber-multi/specimen?only=D5&drop=T-USE-001"); r = await probe(p);
rec("D5-37", "a D5 only report with the permitted-use text unloaded refuses controlled_text_absent and draws no page; the block is never omitted", r.pages.length === 0 && /controlled_text_absent/.test(r.refused || ""), r.refused);
await p.close();
p = await open("/print/ber-multi/specimen?only=D99"); r = await probe(p);
rec("D5-67", "a manifest with no D5 claim package (or any represented dimension) refuses claim_package_absent and draws no page", r.pages.length === 0 && /claim_package_absent/.test(r.refused || ""), r.refused);
await p.close();
// the multi dimension manifest on the same renderer still renders; the D5 route is not a special case of it
p = await open("/print/ber-multi/specimen?only=D1,D5"); r = await probe(p);
rec("D5-25", "a two dimension report (D1 and D5) renders through the multi page renderer as three pages, one dimension page holding both blocks", r.pages.length === 3 && r.pages[1].blocks.length === 2 && !r.refused, r.pages.map(x => `${x.kind}:${x.blocks.length}`));
await p.close();
await b.close();
fs.writeFileSync(out, JSON.stringify({ passed: R.filter(x => x.pass).length, total: R.length, failed: R.filter(x => !x.pass), results: R }, null, 1));
console.log(JSON.stringify({ passed: R.filter(x => x.pass).length, total: R.length, failed: R.filter(x => !x.pass) }, null, 1));
