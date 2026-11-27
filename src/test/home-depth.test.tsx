import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LayerStack, JOURNEY_SHEETS } from "@/components/home/LayerStack";
import { ScrollRail } from "@/components/home/ScrollRail";
import { PointerSpotlight } from "@/components/home/PointerSpotlight";
import { CountUp } from "@/components/home/CountUp";
import { rise3d } from "@/components/home/depth";

/** jsdom has neither IntersectionObserver nor ResizeObserver; these stand-ins report "visible" at once so view-triggered code runs. */
class SeenObserver {
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
  observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
  unobserve() {} disconnect() {} takeRecords() { return []; }
}
class QuietResize { observe() {} unobserve() {} disconnect() {} }

function media(reduce: boolean, fine = true) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: q.includes("reduce") ? reduce : q.includes("hover: hover") ? fine : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }),
  });
  Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: false } });
}

beforeEach(() => { vi.stubGlobal("IntersectionObserver", SeenObserver); vi.stubGlobal("ResizeObserver", QuietResize); media(false); });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("the entrance", () => {
  it("tips in from an angle under perspective and settles flat", () => {
    expect((rise3d.hidden as { rotateX: number }).rotateX).toBeGreaterThan(0);
    expect((rise3d.hidden as { transformPerspective: number }).transformPerspective).toBeGreaterThan(0);
    const v = (rise3d.visible as (i: number) => { rotateX: number; opacity: number })(0);
    expect(v.rotateX).toBe(0); expect(v.opacity).toBe(1);
  });
});

describe("layer stack", () => {
  it("is a stack of one sheet per journey step, hidden from screen readers, that draws apart when hovered", () => {
    render(<LayerStack />);
    const stack = screen.getByTestId("layer-stack");
    expect(stack.getAttribute("aria-hidden")).toBe("true");
    const sheets = screen.getAllByTestId("layer-sheet");
    expect(sheets.map((s) => s.textContent)).toEqual(JOURNEY_SHEETS.map((n, i) => `${String(i + 1).padStart(2, "0")}${n}`));
    const z = (el: HTMLElement) => Number(/translateZ\((-?[\d.]+)px\)/.exec(el.style.transform)![1]);
    const closed = z(sheets[5]) - z(sheets[0]);
    fireEvent.pointerEnter(stack);
    expect(z(sheets[5]) - z(sheets[0])).toBeGreaterThan(closed);
    fireEvent.pointerLeave(stack);
    expect(z(sheets[5]) - z(sheets[0])).toBe(closed);
  });
});

describe("layer stack, reduced motion", () => {
  it("does not turn with the scroll for readers who ask for reduced motion", () => {
    media(true);
    render(<LayerStack />);
    const inner = screen.getByTestId("layer-stack").firstElementChild as HTMLElement;
    expect(inner.style.transform).toContain("rotateZ(-22deg)");        // a fixed pose, not a scroll-linked value
  });
});

describe("scroll rail", () => {
  it("has a marker for each marked section and scrolls to the one clicked", () => {
    const names = ["Home", "The journey", "Enter the record"];
    names.forEach((n) => { const s = document.createElement("section"); s.dataset.rail = n; s.scrollIntoView = vi.fn(); document.body.appendChild(s); });
    render(<ScrollRail />);
    const rail = screen.getByTestId("scroll-rail");
    expect(rail.querySelector("[role=progressbar]")).not.toBeNull();
    const buttons = Array.from(rail.querySelectorAll("button"));
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(names.map((n) => `Go to ${n}`));
    fireEvent.click(buttons[1]);
    expect((document.querySelector('[data-rail="The journey"]') as HTMLElement & { scrollIntoView: ReturnType<typeof vi.fn> }).scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe("pointer spotlight", () => {
  it("follows a mouse", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
    render(<PointerSpotlight />);
    fireEvent(window, Object.assign(new MouseEvent("pointermove", { clientX: 300, clientY: 200 }), {}));
    const el = screen.getByTestId("pointer-spotlight");
    expect(el.style.opacity).toBe("1");
    expect(el.style.getPropertyValue("--sx")).not.toBe("");
  });
  it("does nothing for reduced motion or touch", () => {
    media(true); render(<PointerSpotlight />);
    fireEvent(window, new MouseEvent("pointermove", { clientX: 300, clientY: 200 }));
    expect(screen.getByTestId("pointer-spotlight").style.opacity).not.toBe("1");
    document.body.innerHTML = ""; media(false, false); render(<PointerSpotlight />);
    fireEvent(window, new MouseEvent("pointermove", { clientX: 300, clientY: 200 }));
    expect(screen.getByTestId("pointer-spotlight").style.opacity).not.toBe("1");
  });
});

describe("count up", () => {
  it("counts from zero to the figure when it comes into view", () => {
    let now = 0; const queue: FrameRequestCallback[] = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { queue.push(cb); return queue.length; });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    render(<CountUp to={68} secs={1} testId="n" />);
    expect(screen.getByTestId("n").textContent).toBe("0");
    for (let i = 0; i < 12; i++) { now += 100; const cbs = queue.splice(0); act(() => { cbs.forEach((cb) => cb(now)); }); }
    expect(screen.getByTestId("n").textContent).toBe("68");
    vi.restoreAllMocks();
  });
  it("shows the figure straight away for reduced motion", () => {
    media(true);
    render(<CountUp to={68} testId="n" />);
    expect(screen.getByTestId("n").textContent).toBe("68");
  });
});
