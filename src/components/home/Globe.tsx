import { useEffect, useRef } from "react";
import { drawGlobe } from "@/lib/globe";
import { allowsMotion } from "@/components/home/AmbientVideo";
import { canUseDepth } from "@/lib/pointerDepth";

/**
 * The turning globe. Drawn live on a canvas: it turns slowly, leans a little toward the pointer, pauses when it is off screen or the tab is hidden, and for readers who
 * ask for reduced motion (or have data saving on) is drawn once and left still. Decorative, so hidden from assistive technology.
 */
export function Globe({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current, canvas = cv.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const animate = allowsMotion(), depth = canUseDepth();
    let w = 0, h = 0, raf = 0, visible = true, start = performance.now(), tx = 0, ty = 0, nx = 0, ny = 0;

    const size = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (now: number) => {
      nx += (tx - nx) * 0.05; ny += (ty - ny) * 0.05;
      drawGlobe(ctx, w, h, animate ? (now - start) / 1000 : 4, { turnSecs: 120, radius: 0.36, nudgeYaw: nx * 0.35, nudgeTilt: ny * 0.14 });
    };
    const frame = (now: number) => { paint(now); raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0; };
    const kick = () => { if (animate && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

    size(); paint(performance.now());
    const ro = new ResizeObserver(() => { size(); paint(performance.now()); }); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }); io.observe(el);
    const vis = () => kick();
    const move = (e: PointerEvent) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; };
    document.addEventListener("visibilitychange", vis);
    if (depth && animate) window.addEventListener("pointermove", move, { passive: true });
    kick();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <div ref={wrap} className={className} aria-hidden="true" data-testid="globe">
      <canvas ref={cv} className="h-full w-full" />
    </div>
  );
}
