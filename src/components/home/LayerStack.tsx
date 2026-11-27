import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { allowsMotion } from "@/components/home/AmbientVideo";

/**
 * The six steps of the journey as a stack of sheets in real 3D. It turns as the section scrolls past and the sheets draw apart when it is hovered or focused.
 * Decorative: the steps are listed in full beside it, so it is hidden from screen readers.
 */
export const JOURNEY_SHEETS = ["Basic Profile", "Growth Log", "Mentor Guidance", "Behavioral Evidence Report", "TalentVisa", "T3X Exchange"];

export function LayerStack({ sheets = JOURNEY_SHEETS }: { sheets?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotateZ = useTransform(scrollYProgress, [0, 1], [-42, 42]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [66, 52, 66]);
  const still = !allowsMotion();      // scroll-linked values are not switched off by the page-wide setting, so the stack checks it itself
  const gap = open ? 46 : 26;
  return (
    <div ref={ref} aria-hidden="true" data-testid="layer-stack" className="layer-stack relative mx-auto h-[19rem] w-full max-w-[22rem]" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      <motion.div style={still ? { rotateX: 58, rotateZ: -22, transformStyle: "preserve-3d" } : { rotateX, rotateZ, transformStyle: "preserve-3d" }} className="absolute inset-0 grid place-items-center">
        {sheets.map((name, i) => (
          <div key={name} data-testid="layer-sheet" className="layer-sheet" style={{ transform: `translateZ(${(i - (sheets.length - 1) / 2) * gap}px)`, transitionDelay: `${i * 25}ms` }}>
            <span className="mono-label text-foreground/70">{String(i + 1).padStart(2, "0")}</span>
            <span className="display-serif text-base leading-tight text-foreground/90">{name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
