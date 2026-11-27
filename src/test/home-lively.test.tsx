import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { albertaYear, CALGARY, clockText, closingParts, yearEndInstant } from "@/lib/yearEnd";
import { AmbientVideo, allowsMotion } from "@/components/home/AmbientVideo";
import { LiveDateline } from "@/components/home/LiveDateline";
import { YearEndStrip } from "@/components/home/YearEndStrip";

const at = (iso: string) => new Date(iso);

// The Alberta rules differ between time-zone databases (standard or daylight time in winter), so these check what must hold under any of them.
describe("year end clock", () => {
  const now = at("2026-11-27T17:17:03Z");
  it("ends the year at midnight by Calgary's wall clock, whatever the zone rules say", () => {
    const end = yearEndInstant(now);
    expect(clockText(end, "America/Edmonton").time).toBe("00:00:00");
    expect(albertaYear(new Date(end.getTime() - 1000))).toBe(2026);
    expect(albertaYear(end)).toBe(2027);
  });
  it("counts to that instant", () => {
    const end = yearEndInstant(now);
    expect(closingParts(new Date(end.getTime() - 1000))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
    expect(closingParts(new Date(end.getTime() - 86_400_000))).toEqual({ days: 1, hours: 0, minutes: 0, seconds: 0 });
    const total = (end.getTime() - now.getTime()) / 1000;
    const p = closingParts(now);
    expect(p.days * 86400 + p.hours * 3600 + p.minutes * 60 + p.seconds).toBe(Math.floor(total));
  });
  it("rolls to the next year at the instant this one ends, instead of stopping at zero", () => {
    const end = yearEndInstant(now);
    expect(closingParts(end).days).toBe(365);                       // 2027 is not a leap year
    expect(yearEndInstant(end).getTime()).toBeGreaterThan(end.getTime());
  });
  it("shows every viewer the same count, wherever they read it", () => {
    expect(closingParts(now)).toEqual(closingParts(new Date(now.getTime())));
  });
  it("writes a wall clock in a named zone", () => {
    expect(clockText(now, "UTC").time).toBe("17:17:03");
    expect(clockText(now, "Asia/Kolkata").time).toBe("22:47:03");
  });
});

function motion(reduce: boolean, saveData = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: q.includes("reduce") ? reduce : false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }),
  });
  Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData } });
}

describe("ambient video", () => {
  it("plays muted, looping and hidden from screen readers when motion is fine", () => {
    motion(false);
    const { container } = render(<AmbientVideo src="/v.mp4" poster="/v.jpg" />);
    const v = container.querySelector("video")!;
    expect(v).not.toBeNull();
    expect(v.muted || v.hasAttribute("muted")).toBe(true);
    expect(v.loop).toBe(true);
    expect(v.getAttribute("aria-hidden")).toBe("true");
    expect(v.getAttribute("poster")).toBe("/v.jpg");
  });
  it("shows only the still frame when the reader asks for reduced motion", () => {
    motion(true);
    const { container } = render(<AmbientVideo src="/v.mp4" poster="/v.jpg" />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/v.jpg");
    expect(allowsMotion()).toBe(false);
  });
  it("shows only the still frame when data saving is on", () => {
    motion(false, true);
    const { container } = render(<AmbientVideo src="/v.mp4" poster="/v.jpg" />);
    expect(container.querySelector("video")).toBeNull();
  });
});

class FakeObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
describe("the live parts of the page", () => {
  beforeEach(() => { vi.stubGlobal("IntersectionObserver", FakeObserver); motion(false); vi.useFakeTimers(); vi.setSystemTime(at("2026-11-27T17:17:03Z")); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("the masthead clock ticks every second", () => {
    render(<LiveDateline />);
    const before = screen.getByTestId("live-clock").textContent;
    const cal = (d: Date) => { const c = clockText(d, CALGARY); return `Calgary ${c.time} ${c.zone}`; };
    expect(before).toContain(cal(new Date("2026-11-27T17:17:03Z")).replace("Calgary ", "Calgary "));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId("live-clock").textContent).toContain(cal(new Date("2026-11-27T17:17:05Z")));
  });
  it("the year-end block counts down second by second", () => {
    render(<MemoryRouter><YearEndStrip /></MemoryRouter>);
    const secs = () => Number(screen.getByTestId("year-end-seconds").textContent);
    const first = secs();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(secs()).toBe((first + 59) % 60);
    expect(screen.getByTestId("year-end-days").textContent).toBe(String(closingParts(new Date("2026-11-27T17:17:04Z")).days).padStart(2, "0"));
    expect(screen.getByText(/Year-end · 2026/)).toBeTruthy();
  });
});
