import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { drawGlobe } from "@/lib/globe";
import { isLand, MASK_H, MASK_W } from "@/lib/globeLand";
import { TiltCard } from "@/components/home/TiltCard";

describe("land mask", () => {
  it("puts land where the continents are and water where the oceans are", () => {
    // inland points: the mask is one degree a cell, so a coastal city can fall in an ocean cell
    expect(isLand(51.05, -114.07)).toBe(true);     // Calgary
    expect(isLand(55.75, 37.62)).toBe(true);       // Moscow
    expect(isLand(-1.29, 36.82)).toBe(true);       // Nairobi
    expect(isLand(28.61, 77.21)).toBe(true);       // Delhi
    expect(isLand(-25, 134)).toBe(true);           // central Australia
    expect(isLand(0, -150)).toBe(false);           // the Pacific
    expect(isLand(30, -40)).toBe(false);           // the Atlantic
    expect(isLand(-40, 80)).toBe(false);           // the southern Indian Ocean
  });
  it("covers about a third of the Earth's cells, as the Earth does", () => {
    let land = 0;
    for (let y = 0; y < MASK_H; y++) for (let x = 0; x < MASK_W; x++) if (isLand(90 - y - 0.5, x - 180 + 0.5)) land++;
    expect(land / (MASK_W * MASK_H)).toBeGreaterThan(0.28);
    expect(land / (MASK_W * MASK_H)).toBeLessThan(0.38);
  });
});

/** A canvas context that records where things are drawn, to compare two frames. */
function recorder() {
  const log: string[] = [];
  const grad = { addColorStop: () => {} };
  const r = (n: number) => Math.round(n * 10) / 10;
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, k: string) => {
      if (k === "createRadialGradient" || k === "createLinearGradient") return () => grad;
      if (["fillRect", "lineTo", "moveTo", "arc"].includes(k)) return (...a: number[]) => { log.push(`${k}:${a.map(r).join(",")}`); };
      return () => {};
    },
    set: (_t, k: string, v: unknown) => { if (k === "strokeStyle" || k === "lineWidth" || k === "fillStyle") log.push(`${k}=${typeof v === "number" ? r(v) : String(v).replace(/\d+\.\d+/g, (m) => Number(m).toFixed(2))}`); return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, log };
}

describe("globe frame", () => {
  const opts = { turnSecs: 40, arcSecs: 8 };
  it("draws land, arcs and nodes", () => {
    const { ctx, log } = recorder();
    drawGlobe(ctx, 1280, 720, 5, opts);
    expect(log.filter((l) => l.startsWith("fillRect")).length).toBeGreaterThan(1500);   // land dots
    expect(log.filter((l) => l.startsWith("lineTo")).length).toBeGreaterThan(100);      // arcs and graticule
  });
  it("turns: a later frame is a different picture", () => {
    const a = recorder(), b = recorder();
    drawGlobe(a.ctx, 1280, 720, 5, opts); drawGlobe(b.ctx, 1280, 720, 9, opts);
    expect(a.log.join("|")).not.toBe(b.log.join("|"));
  });
  it("loops exactly: the frame one turn later is the same picture, so the video has no jump", () => {
    const a = recorder(), b = recorder();
    drawGlobe(a.ctx, 1280, 720, 7.5, opts); drawGlobe(b.ctx, 1280, 720, 7.5 + 40, opts);
    expect(b.log.join("|")).toBe(a.log.join("|"));
  });
});

// jsdom has no PointerEvent: a mouse event with the pointer's type is enough for the handlers
class FakePointerEvent extends MouseEvent { pointerType: string; constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) { super(type, { bubbles: true, ...init }); this.pointerType = init.pointerType ?? "mouse"; } }
(window as unknown as { PointerEvent: unknown }).PointerEvent = FakePointerEvent;

describe("tilt card", () => {
  function pointer(fine: boolean, reduce = false) {
    Object.defineProperty(window, "matchMedia", { writable: true, value: (q: string) => ({ matches: q.includes("reduce") ? reduce : q.includes("hover: hover") ? fine : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) });
  }
  const rect = { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} };
  it("tips toward the pointer with a mouse", () => {
    pointer(true);
    render(<TiltCard><p>x</p></TiltCard>);
    const card = screen.getByTestId("tilt-card"); card.getBoundingClientRect = () => rect as DOMRect;
    fireEvent.pointerMove(card.parentElement!, { clientX: 200, clientY: 0, pointerType: "mouse" });
    expect(card.style.getPropertyValue("--ry")).toBe("6.00deg");    // far right: tipped right
    expect(card.style.getPropertyValue("--rx")).toBe("6.00deg");    // top edge: tipped up
    fireEvent.pointerLeave(card.parentElement!);
    expect(card.style.getPropertyValue("--ry")).toBe("0deg");
  });
  it("stays flat for reduced motion and for touch", () => {
    pointer(true, true);
    const { unmount } = render(<TiltCard><p>x</p></TiltCard>);
    let card = screen.getByTestId("tilt-card"); card.getBoundingClientRect = () => rect as DOMRect;
    fireEvent.pointerMove(card.parentElement!, { clientX: 200, clientY: 0, pointerType: "mouse" });
    expect(card.style.getPropertyValue("--ry")).toBe("");
    unmount();
    pointer(true);
    render(<TiltCard><p>x</p></TiltCard>);
    card = screen.getByTestId("tilt-card"); card.getBoundingClientRect = () => rect as DOMRect;
    fireEvent.pointerMove(card.parentElement!, { clientX: 200, clientY: 0, pointerType: "touch" });
    expect(card.style.getPropertyValue("--ry")).toBe("");
  });
});
