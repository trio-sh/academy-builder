# Rejected design system — Editorial Ledger (paper theme)

**Status:** COLOR PALETTE REJECTED by founder (Dr. Tony Mofoke, 2026-08-12).
**Scope of the reject:** colors only. Typography (Fraunces / Instrument Sans / JetBrains Mono), the ledger layout system (§ markers, columns, hero composition, mono labels, marginalia), and every component structure stays. Only the paper/ink/vermilion palette is being swapped for the dark T3A purple.
**Reason:** "too simplistic and, at first sight, sends the wrong signal." Founder direction: dark purple with tech-feel accents that denote simulation. WorkRehearsal also purple. Purple is the standing brand.
**Kept here as a full record so the reasons and the pattern are not repeated.**

---

## What this system was

An editorial, print-first "ledger" system. Warm parchment ground, deep ink type, a single vermilion accent. Every surface was designed to read like a page from a bound volume — with page numbers, section marks (§), stamped datestamps in Roman numerals, marginalia notes, and column rules.

## Palette (from `src/index.css` under `[data-theme="paper"]`)

| Token | HSL | Hex | Role |
| :--- | :--- | :--- | :--- |
| `--paper` | `40 33% 92%` | `#EFE9DA` | Warm parchment ground |
| `--paper-deep` | `38 22% 86%` | `#DED6C2` | Kraft (cards, secondary surfaces) |
| `--ink` | `30 12% 10%` | `#1D1815` | Deep ink (primary type) |
| `--ink-soft` | `30 6% 32%` | `#55504A` | Body ink |
| `--ink-mute` | `30 4% 52%` | `#857F77` | Muted ink |
| `--vermilion` | `12 76% 42%` | `#B84A22` | Single accent — used sparingly for stamps, seal, italic emphasis |
| `--rule` | `30 12% 10%` | ink at alpha `0.14` | Column and section rules |

`[data-theme="paper"]` wired the shadcn tokens: `--background = --paper`, `--foreground = --ink`, `--primary = --ink`, `--accent = --vermilion`. Dashboards deliberately stayed in the older dark theme.

## Typography

- Display: **Fraunces** (serif) — `.display-serif`, italic variant `.display-serif-italic`
- Body: **Instrument Sans**
- Mono labels: **JetBrains Mono** — `.mono-label` with wide letter-spacing, uppercase-adjacent
- Marginalia: small serif with italic slant, near-marginalia colour
- Ledger numerals: `.ledger-num`

## Signature devices

- **§ section markers** in mono at the start of a strip (e.g. "§ Platform Notes", "§ Register · Volume I")
- **Roman-numeral datestamps** (`MMXXVI`) rendered by `todayStamp()`
- **Vermilion stamp disc** — a rotated circle bearing an italic serif "3" (used on OG image, favicon, brand seal)
- **Column rules** — 1–2 px ink lines between grid cells
- **Marginalia footers** in the smallest register
- **`Fig. NN`** captions on figures, **`Vol. / Iss.`** on issue lines
- **`stamp` utility** (dashed vermilion outline, slight rotation) for callouts

## Where it was applied

- Every public page (`Index`, `Platform`, `About`, `Employers`, `Schools`, `Careers`, `Press`, `Contact`, `Blog`, `BlogPost`, `Help`, `Privacy`, `Terms`, `Security`, `Get Started`, `Join`, `Login`, `NotFound`, `VerifyPassport`, `VerifyBER`)
- `PublicLayout` wrapper set `data-theme="paper"`
- `Header`, `Footer`, `Chatbot`, and all `home/*` sections (`HeroSection`, `JourneySection`, `DifferentiatorSection`, `StakeholdersSection`, `CTASection`, `LaunchCountdown`)
- `LegacyBanner`, dashboard `DashboardPageHeader` / `DashSection` / `LedgerStat` / `LedgerBadge` / `LedgerLoading` / `EmptyState` primitives
- OG image (`public/og-image.svg` + PNG), favicon, apple-touch-icon, PWA icons

## Founder feedback that drove rejection (T3A · 2026-08-12)

1. "WorkRehearsal should have T3A purple color theme. And we shall stick to purple going forward."
2. "We need to build the T3A platform to give it a tech feel denoting simulation, etc., while maintaining purple."
3. "The current version is too simplistic and, at first sight, sends the wrong signal."
4. Multiple copy items flagged as too small / hard to read, plus a specific note: "the mobile version needs some appeal. It looks too bare and not attractive to read."
5. Item 24 in the feedback: "The purple logo here looks off." — vermilion seal on paper ground clashed with the existing purple brand.

## Do not reuse

The ledger typography and § marker system may be salvageable for specific artefacts (a BER printed record, verification receipt) where the "official document" tone is doctrinally correct. **Do not restore paper as the default surface.** Do not use vermilion as the standing accent. Do not re-introduce `data-theme="paper"` as an app-wide wrapper.

## Files that carry this system today (to be undone in the revert)

- `src/index.css` — the `[data-theme="paper"]` block and every `.paper-*`, `.mono-label`, `.display-serif*`, `.stamp`, `.ink-vermilion`, `.bg-vermilion`, `.ledger-num`, `.marginalia`, `.paper-grain` utility scoped to it
- `src/components/layout/PublicLayout.tsx` — wraps children in a paper-theme container
- `src/components/layout/Footer.tsx` — colophon strip, ledger meta, Roman-numeral date
- `src/components/BrandSeal.tsx` — vermilion disc + italic 3
- `src/components/ledger/*` — LedgerHero, LedgerSection primitives
- `src/components/home/*` — HeroSection, JourneySection, DifferentiatorSection, StakeholdersSection, CTASection, LaunchCountdown
- `src/lib/dateStamp.ts` — `todayStamp()` in Roman numerals
- `src/components/dashboard/primitives.tsx` — LedgerBadge, LedgerLoading, LegacyBanner, DashboardPageHeader
- `public/og-image.{svg,png}`, `public/favicon.{svg,ico}`, `public/apple-touch-icon.{svg,png}`, `public/icon-{192,512}.png`
- Every page listed under "Where it was applied" above uses one or more paper utilities
