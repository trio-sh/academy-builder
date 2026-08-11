/**
 * Ledger-style date stamps. The site's design language leans on
 * mono uppercase labels ("MMXXVI · Q3", "est. MMXXV") — earlier
 * iterations hard-coded roman-numeral vanity dates. These helpers
 * substitute the real current date so the page reads as freshly
 * dated rather than a fossil of when the theme was written.
 */

export function todayStamp(now: Date = new Date()): string {
  return now
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export function todayShort(now: Date = new Date()): string {
  return now
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function todayQuarterStamp(now: Date = new Date()): string {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()} · Q${q}`;
}
