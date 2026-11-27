import { useRef, type ReactNode } from "react";
import { canUseDepth } from "@/lib/pointerDepth";

/** A card that tips toward the pointer in 3D, with a soft light that follows it. Flat and still for touch and for reduced motion. */
export function TiltCard({ children, className = "", max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const card = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType === "touch" || !canUseDepth()) return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };
  const leave = () => { const el = card.current; if (el) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
  return (
    <div className={`tilt-scene ${className}`} onPointerMove={move} onPointerLeave={leave}>
      <div ref={card} className="tilt-card" data-testid="tilt-card">
        {children}
        <span className="tilt-glare" aria-hidden="true" />
      </div>
    </div>
  );
}
