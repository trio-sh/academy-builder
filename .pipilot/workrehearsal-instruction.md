# Instruction to the WorkRehearsal-repo agent

**Origin:** Dr. Tony Mofoke (T3A founder) · relayed via the T3A-platform agent on 2026-08-13.
**Target:** the agent maintaining the **WorkRehearsal** repository (separate codebase from `trio-sh/academy-builder`).

## Directive

The paper / vermilion editorial palette that was applied to WorkRehearsal is rejected. Adopt the T3A purple palette instead. **Scope is colors only.** Do not touch typography or layout.

## What to keep

- Fonts stay: **Fraunces** (display), **Instrument Sans** (body), **JetBrains Mono** (labels)
- Layout composition stays: `§` section markers, column grids, mono meta rows, marginalia footers, hero framing, card frames, stamps
- All component structures + class names stay — nothing needs to be renamed

## What to change

Swap the CSS custom-property values (only). New palette:

| Token | Old (paper) | New (T3A purple) |
| :--- | :--- | :--- |
| `--background` | `40 33% 92%` (paper) | `0 0% 0%` (pure black) |
| `--foreground` | `30 12% 10%` (ink) | `0 0% 100%` (white) |
| `--primary` | `30 12% 10%` (ink) | `239 84% 67%` (indigo `#6366F1`) |
| `--accent` | `12 76% 42%` (vermilion) | `270 91% 65%` (purple `#A855F7`) |
| `--card` / `--popover` | paper | `0 0% 5%` |
| `--muted` | `38 22% 86%` (paper-deep) | `0 0% 10%` |
| `--muted-foreground` | ink-mute | `0 0% 85%` |
| `--border` / `--input` | ink | `0 0% 15%` |
| `--ring` | vermilion | `239 84% 67%` |
| `--vermilion` (legacy alias) | `12 76% 42%` | remap to `239 84% 67%` so `.ink-vermilion` renders indigo without touching components |
| `--paper` (legacy alias) | warm parchment | remap to `0 0% 0%` so `.paper-grain` renders as a subtle indigo grid on black |
| `--stamp` (legacy alias) | vermilion | remap to `189 94% 60%` (tech cyan) so stamped notices read as tech |

## Extra tokens to add (for tech-feel signalling on any live/simulation surface)

```
--tech-cyan: 189 94% 60%;
--tech-lime: 84 81% 55%;
--shadow-glow-tech: 0 0 24px rgba(34, 211, 238, 0.35);
```

## Extra utilities to add (do not rename existing ones)

- `.stamp-tech` — dashed cyan border, no rotation, uppercase mono
- `.grid-backdrop` — 60px indigo grid backdrop on black
- `.digit-glow` — `text-shadow: 0 0 12px rgba(99, 102, 241, 0.35)` for countdown / stat digits
- `.live-pulse` — a `0.5rem` cyan dot animated on a `1.6s` pulse
- `.scan-line` — a 1-px cyan underline swept left-to-right at `6s`
- `.cursor-block` — appends a pulsing `▍` block cursor to a mono label

## Do not do

- Do not restore the vermilion palette anywhere
- Do not change fonts, weights, spacing, or component structure
- Do not add new marketing copy or copy-rewrite behavior
- Do not touch the schema-firewall boundary — WorkRehearsal domain isolation is unchanged

## Full companion spec

`.pipilot/design.md` in `trio-sh/academy-builder` documents the T3A purple system in full. Use the section titled "Palette", the "Recolor mapping" table, and the "Tech-feel signals" list as the source of truth. Ignore the "Full techy redesign" sections — those apply only to the T3A platform repo, not to WorkRehearsal.
