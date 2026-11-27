import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/**
 * A rail down the right edge of wide screens: how far through the page you are, and a marker for each section (any element marked data-rail="Name").
 * The marker for the section you are in lights up; a click scrolls to it.
 */
interface Mark { name: string; top: number }

export function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const measure = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"));
      const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setMarks(els.map((el) => ({ name: el.dataset.rail || "", top: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY) / total)) })));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => scrollYProgress.on("change", (v) => {
    setPct(Math.round(v * 100));
    let idx = 0;
    marks.forEach((m, i) => { if (v + 0.02 >= m.top) idx = i; });
    setActive(idx);
  }), [scrollYProgress, marks]);

  const go = (name: string) => {
    const el = document.querySelector<HTMLElement>(`[data-rail="${name}"]`);
    el?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav aria-label="Page sections" className="scroll-rail fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block" data-testid="scroll-rail">
      <div role="progressbar" aria-label="How far down the page" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="relative h-56 w-px bg-foreground/20">
        <motion.div style={{ scaleY: fill, transformOrigin: "top" }} className="absolute inset-0 w-px bg-vermilion" />
        {marks.map((m, i) => (
          <button key={m.name + i} type="button" onClick={() => go(m.name)} aria-label={`Go to ${m.name}`} aria-current={i === active ? "true" : undefined}
            style={{ top: `${m.top * 100}%` }} className="group absolute -left-[5px] h-[11px] w-[11px] -translate-y-1/2 rounded-full border border-foreground/50 bg-background transition-transform hover:scale-125 aria-[current=true]:border-vermilion aria-[current=true]:bg-vermilion aria-[current=true]:shadow-[0_0_10px_hsl(var(--vermilion))]">
            <span className="mono-label pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-background/90 px-2 py-0.5 text-[0.6rem] text-foreground/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{m.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
