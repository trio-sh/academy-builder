import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

/**
 * Depth for the sections below the hero. Cards enter at an angle under perspective instead of only fading up; each section has a backdrop whose layers move at
 * different speeds as the page scrolls, over a floor grid that recedes and flows. The page wraps these in MotionConfig reducedMotion="user", which switches the
 * transforms off for readers who ask for less motion; the floor grid and orbs are also still under that setting in the stylesheet.
 */
export const rise3d: Variants = {
  hidden: { opacity: 0, y: 46, rotateX: 16, scale: 0.97, transformPerspective: 1000 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0, rotateX: 0, scale: 1, transformPerspective: 1000,
    transition: { duration: 0.9, delay: 0.05 + i * 0.07, ease: [0.19, 1, 0.22, 1] },
  }),
};

/** Orbs that drift against the scroll, and optionally a floor grid receding to the horizon. Sits behind its section's content. */
export function SceneBackdrop({ floor = false, tone = "indigo" }: { floor?: boolean; tone?: "indigo" | "violet" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const a = useTransform(scrollYProgress, [0, 1], [-70, 70]);
  const b = useTransform(scrollYProgress, [0, 1], [60, -90]);
  const c = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const orb = tone === "violet" ? "from-purple-500/25" : "from-indigo-500/25";
  const orb2 = tone === "violet" ? "from-indigo-500/20" : "from-purple-500/20";
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" data-testid="scene-backdrop">
      <motion.div style={{ y: a }} className={`depth-orb absolute -left-28 top-[8%] h-80 w-80 rounded-full bg-gradient-radial ${orb} to-transparent blur-2xl`} />
      <motion.div style={{ y: b }} className={`depth-orb absolute -right-32 bottom-[6%] h-[26rem] w-[26rem] rounded-full bg-gradient-radial ${orb2} to-transparent blur-3xl`} />
      <motion.div style={{ y: c }} className="depth-orb absolute left-[42%] top-[30%] h-40 w-40 rounded-full bg-gradient-radial from-sky-400/15 to-transparent blur-2xl" />
      {floor && <div className="floor-grid" data-testid="floor-grid" />}
    </div>
  );
}
