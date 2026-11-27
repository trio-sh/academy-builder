import { useEffect, useRef } from "react";
import { canUseDepth } from "@/lib/pointerDepth";

/** A soft light that follows the pointer across the whole page. Only with a mouse or trackpad and no request for reduced motion. */
export function PointerSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canUseDepth()) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 3, tx = x, ty = y, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      el.style.setProperty("--sx", `${x.toFixed(0)}px`); el.style.setProperty("--sy", `${y.toFixed(0)}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; el.style.opacity = "1"; if (!raf) raf = requestAnimationFrame(tick); };
    const leave = () => { el.style.opacity = "0"; };
    window.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} aria-hidden="true" data-testid="pointer-spotlight" className="pointer-spotlight pointer-events-none fixed inset-0 z-[4] opacity-0 transition-opacity duration-500" />;
}
