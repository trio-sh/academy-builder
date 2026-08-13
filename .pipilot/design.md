# Design system — T3A Purple (adopted 2026-08-12)

**Direction:** Dr. Tony Mofoke, T3A · 2026-08-12 (in response to the T3A-DEV-RESP-002-review PDF).
**Scope of this change:** **colors only.** Typography, layout, ledger devices (§ markers, columns, mono labels, marginalia, stamp callouts, `todayStamp()` date, brand seal shape) all stay. We are swapping the paper/ink/vermilion palette out for T3A dark purple + tech-feel signals. WorkRehearsal ships in the same palette.

---

## Palette

Purple-forward dark theme, adopted from the pre-editorial `AcademyHub` system (`4fb1395^:src/index.css`) with tech-feel accents added.

| Token | HSL | Hex | Role |
| :--- | :--- | :--- | :--- |
| `--background` | `0 0% 0%` | `#000000` | Pure black canvas |
| `--foreground` | `0 0% 100%` | `#FFFFFF` | Primary type |
| `--card` | `0 0% 5%` | `#0D0D0D` | Card surface |
| `--muted` | `0 0% 10%` | `#1A1A1A` | Muted surface |
| `--muted-foreground` | `0 0% 85%` | `#D9D9D9` | Muted body |
| `--border` | `0 0% 15%` | `#262626` | Ambient border |
| **`--primary` / `--indigo-500`** | `239 84% 67%` | `#6366F1` | T3A indigo — primary brand |
| **`--accent` / `--purple-500`** | `270 91% 65%` | `#A855F7` | Purple accent — hero highlights, italics |
| `--purple-950` | `270 67% 20%` | `#1A0B33` | Deep purple backdrop |
| `--indigo-950` | `239 84% 20%` | `#1E1B4B` | Deep indigo backdrop |
| `--pink-500` | `340 82% 70%` | `#F472B6` | Tertiary accent — gradient tail only |
| `--tech-cyan` | `189 94% 60%` | `#22D3EE` | **NEW · tech-feel accent** — signals simulation / running process |
| `--tech-lime` | `84 81% 55%` | `#A3E635` | **NEW · tech-feel accent** — status "live/ok" ticks |
| `--destructive` | `0 84% 60%` | `#EF4444` | Errors |
| `--ring` | `239 84% 67%` | `#6366F1` | Focus ring |

### Gradients

Retained from the pre-editorial system:

- `--gradient-hero` — `linear-gradient(135deg, #000 0%, #1E1B4B 50%, #000 100%)`
- `--gradient-accent` — `linear-gradient(135deg, #6366F1 0%, #A855F7 100%)`
- `--gradient-text` — `linear-gradient(90deg, #6366F1 0%, #A855F7 50%, #F472B6 100%)`

### Glow shadows

- `--shadow-glow` — `0 0 40px rgba(99, 102, 241, 0.3)` (indigo)
- `--shadow-glow-purple` — `0 0 40px rgba(168, 85, 247, 0.3)` (purple)
- **NEW · `--shadow-glow-tech`** — `0 0 24px rgba(34, 211, 238, 0.35)` (cyan; used sparingly on running-simulation surfaces)

### Glass

`glass` and `glass-card` utilities retained: `rgba(255,255,255,0.05)` background, `backdrop-filter: blur(20px)`, `rgba(255,255,255,0.1)` border.

---

## Tech-feel signals (NEW)

The founder brief: "give it a tech feel denoting simulation." These are the specific signals added on top of the palette so the platform reads as running system, not print document:

1. **Terminal-cursor eyebrow** — the `§` marker now sits beside a `▍` block-cursor that pulses `--tech-cyan` on any live surface (countdown, dashboards, agent, PraxisAI).
2. **Scan-line strip** — an optional 1-px cyan progress underline on hero rows, animated left-to-right at 6s ease-in-out, used at most once per view.
3. **Status pills** — `● LIVE`, `● SYNC`, `● RECORDING` in the mono label register. Use `--tech-lime` for `LIVE/OK` and `--tech-cyan` for `SYNC/OBSERVING`.
4. **Grid backdrop** — a faint `rgba(99,102,241,0.05)` 60-px grid on hero sections, echoing the classic simulation-UI motif without demanding attention.
5. **Digit runs** — countdown / stat digits render in tabular-nums mono with a soft indigo glow (`text-shadow: 0 0 12px rgba(99,102,241,0.35)`), reading as instrument readouts.
6. **Glass card edges** — an internal 1-px inset `rgba(255,255,255,0.08)` border on `glass-card` gives the impression of etched panels.
7. **BrandSeal recolor** — the rotated disc bearing the italic serif "3" swaps from vermilion to `--gradient-accent` (indigo → purple) with a `--shadow-glow` halo. Same shape, same italic 3, different surface.

Reserve tech-cyan and tech-lime for status/simulation signalling only. They are **not** brand colors and should not carry hero type.

---

## What is UNCHANGED (kept from the editorial system)

Per founder direction "reverting only colors and not font or design":

- **Typography:** Fraunces (display serif), Instrument Sans (body), JetBrains Mono (labels)
- **`.display-serif`, `.display-serif-italic`, `.mono-label`, `.marginalia`, `.ledger-num`** — same class names, same sizing, same tracking
- **Composition:** hero → journey → differentiator → stakeholders → CTA order; page-header `§ Section · Title` pattern; column rules; `Fig. NN` figure captions; `Vol / Iss` masthead lines
- **`todayStamp()`** — same call site, same Roman-numeral format
- **Layout components:** `LedgerHero`, `LedgerSection`, `DashSection`, `LedgerStat`, `LedgerBadge` (recolored, same shape), `EmptyState`, `LegacyBanner`
- **Icon set:** favicon / apple-touch / OG image / PWA icons — the seal shape stays, only the fill palette changes (see `BrandSeal recolor` above)

---

## Recolor mapping (what to swap where)

Purely a token remap. No component structure changes.

| Editorial (rejected) | T3A Purple (adopted) |
| :--- | :--- |
| `bg-background` (paper `#EFE9DA`) | `bg-background` (pure black) |
| `text-foreground` (ink `#1D1815`) | `text-foreground` (white) |
| `border-foreground` (ink) | `border-white/15` or `border-primary/30` |
| `ink-vermilion` / `bg-vermilion` / `border-vermilion` | `text-accent` (purple) / `bg-accent` / `border-accent`, or `text-primary` / `border-primary` (indigo) — see rule below |
| `.stamp` (vermilion dashed) | `.stamp-tech` — cyan dashed, no rotation, uppercase mono |
| `.paper-grain` | `.gradient-hero` on hero sections; solid `bg-background` elsewhere |
| Marginalia in `text-foreground/60` | Marginalia in `text-foreground/70` on the darker canvas |

### When to reach for indigo vs purple

- **Indigo (`--primary`)** — CTAs, links, ring/focus, brand seal core, section eyebrows
- **Purple (`--accent`)** — italic emphasis in the display serif, secondary CTAs, hover states, background gradient tail
- **Cyan (`--tech-cyan`)** — running/simulation signals only (live pulse, cursor, scan-line)
- **Lime (`--tech-lime`)** — success ticks in a status pill only
- Never mix pink into standing UI; pink lives only inside `--gradient-text`

---

## WorkRehearsal

WorkRehearsal ships in the same palette. Same `--gradient-hero` backdrop, same purple italic hero, same glass cards. **Do not visually distinguish WorkRehearsal from the main platform by color.** The domain separation lives in the schema (§6 firewall), not in the paint.

---

## PDF review items to address in the revert PR

From `Comments on Textbook Platform.pdf` (Dr. Tony, 2026-08-12). Copy/spacing fixes must ship alongside the color revert:

1. "entries" → "steps" (Steps 01..06 · One record)
2. Circled mast: use `Vol 01 · Issue 01`; drop `MMXXVI` (verify date is current; plan launch for last week of August — already anchored to Aug 22)
3. Bold sections that today are hard to read
4. Section `§` should sit **before** the numeric, and larger. Copy: "Practice is kept separate from evidence. Rehearsal is private. What gets recorded is how conduct shows up across workplace situations, including moments of pressure and uncertainty."
5. Increase font-size on the small highlighted body copy
6. "You work with an experienced professional who observes how conduct shows up across workplace pressure moments. Guidance is kept separate from evidence."
7. `OUR PROMISE` — larger; copy: "Professional guidance at every step. Evidence grounded in observed behavior across workplace situations. Growth that speaks for itself. Results employers can trust."
8. Bump comparison-table small type; keep `§1` placement clean; do not strike through Common Approach entries
9. `Editor's Note` larger; copy: "A Behavioral Evidence Report reflects how your conduct shows up across workplace situations over time."
10. "Learn about Civic Access Lab."
11. Increase letter spacing on the touching lines; move "filed 2026" inside the BER box
12. **New Journal filter · Founder's Desk** — positioned immediately after "All Posts". Standing editorial column, target cadence ~monthly. Purpose: founder-led direction, reflections, decisions. Separate from Platform Updates.
13. Rename `LAYER III · EVIDENCE` → `LAYER III · BEHAVIORAL EVIDENCE`
14. "entries" → "steps" (second occurrence)
15. Bump highlighted small type
16. Add spacing where lines are jammed
17. Rewrite For Job Seekers / Employers / Schools card bullets to founder-approved wording (see PDF item 17 in full)
18. Add spacing where jammed
19. Grade-6 school observation copy: "A structured and streamlined observation tool for documenting students behavior and development notes."
20. Layer-triple copy: "Education shows what you studied. Professional credentials show what you are qualified to do. We keep a dated record of how your conduct shows up across workplace situations."
21. Result copy: "The result: a record you can read line by line — yours to review and yours to share. Employers gain documented evidence to inform hiring decisions. Schools have a way to support the transition they prepared their students for."
22. Item 03 copy: "A recommended pause is communicated with respect. Exits are graceful. Re-entry remains an option. No permanent labels. No closed doors."
23. Employers card: "Access candidates with documented behavioral evidence to inform your judgment of workplace readiness. Follow-through insights after hiring." + "Learn About Civic Access Lab."
24. FAQ purple logo looks off — automatically resolves in the recolor
25. Mobile version needs more appeal — the tech-feel signals above (grid backdrop, glow digits, status pills) should carry the load without turning the composition into decoration; sizes bumped per items 3/5/7/8/9/15/18

School grade range: **9 through university** (was 9–12).

---

## Files to touch in the revert (this PR)

- `src/index.css` — remove `[data-theme="paper"]` block; put the AcademyHub palette back as the default; add tech-cyan / tech-lime tokens + the new tech-feel utilities (`.stamp-tech`, `.scan-line`, `.grid-backdrop`, `.digit-glow`, `.live-pulse`)
- `src/components/layout/PublicLayout.tsx` — drop `data-theme="paper"` wrapper
- `src/components/layout/Footer.tsx` — recolor: black canvas, white type, indigo/purple accents; keep the address + phone + colophon strip
- `src/components/BrandSeal.tsx` — swap disc fill from vermilion to `--gradient-accent` with a `--shadow-glow` halo; keep italic 3
- `src/components/home/*` — recolor; apply the founder-approved copy per PDF items 4/6/7/17/20/21/22
- `src/components/home/LaunchCountdown.tsx` — recolor vermilion → indigo, add digit-glow; keep the 22-Aug-2026 anchor and MDT display
- `src/components/dashboard/primitives.tsx` — recolor `LedgerBadge` / `LegacyBanner` etc.; keep names + shape
- `src/pages/Blog.tsx` — add `Founder's Desk` filter after `All Posts` (PDF item 12)
- `src/pages/Platform.tsx`, `src/pages/Employers.tsx`, `src/pages/Schools.tsx`, `src/pages/GetStarted.tsx`, `src/pages/Help.tsx` — copy fixes per PDF items
- `public/og-image.svg` + `public/og-image.png` — recolor to dark purple backdrop with the recolored seal; keep composition
- `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.{svg,png}`, `public/icon-{192,512}.png` — recolor the seal; keep shape
- `scripts/check-vocabulary.mjs` allowlist — no changes needed (vocab lock is not color-scoped)

**Fonts are NOT touched.** `Fraunces`, `Instrument Sans`, `JetBrains Mono` all stay.
