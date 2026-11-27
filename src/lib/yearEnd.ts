/**
 * The countdown to the end of the year on the home page, anchored to Calgary like the rest of the site (the company's home zone).
 * The anchor is 00:00 on 1 January by Calgary's wall clock. The offset is read from the time-zone rules, not written down: Alberta's rules are the
 * reader's own browser's, so the count follows whatever those rules say (standard or daylight time) and its label names the zone the rules give.
 * The year is taken from Alberta's calendar, not the viewer's, and rolls forward by itself: on 1 January it counts to the next year end.
 */
export interface ClosingParts { days: number; hours: number; minutes: number; seconds: number }

const ALBERTA = "America/Edmonton";

/** the calendar year it currently is in Alberta */
export function albertaYear(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: ALBERTA, year: "numeric" }).format(now));
}

/** milliseconds the zone's wall clock is ahead of UTC at an instant */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(at).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** the instant the current Alberta year ends: 00:00 on 1 January by Alberta's wall clock */
export function yearEndInstant(now: Date): Date {
  const wall = Date.UTC(albertaYear(now) + 1, 0, 1);
  let instant = wall - zoneOffsetMs(new Date(wall), ALBERTA);
  instant = wall - zoneOffsetMs(new Date(instant), ALBERTA);   // once more, in case the offset changes between the guess and the answer
  return new Date(instant);
}

/** time left until the year ends, always positive because the year rolls over at the instant it ends */
export function closingParts(now: Date): ClosingParts {
  const diff = Math.max(0, yearEndInstant(now).getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/** a ticking wall clock in a zone, as HH:MM:SS (24 hour) with the zone's short name */
export function clockText(now: Date, timeZone?: string): { time: string; zone: string } {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", ...(timeZone ? { timeZone } : {}) };
  const time = new Intl.DateTimeFormat("en-GB", opts).format(now);
  const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short", ...(timeZone ? { timeZone } : {}) }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
  return { time, zone };
}

export const CALGARY = ALBERTA;

/** Registration opened on this date (the first sign-up on the live project, 20 September 2026). */
export const REGISTRATION_OPENED = "2026-09-20";

/** whole days registration has been open, counted by Alberta's calendar dates so it turns over at Calgary's midnight */
export function daysOpen(now: Date, since: string = REGISTRATION_OPENED): number {
  // read the date as numbers, not text: browsers and Node spell a date differently for the same locale
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ALBERTA, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  const [sy, sm, sd] = since.split("-").map(Number);
  return Math.max(0, Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(sy, sm - 1, sd)) / 86_400_000));
}
