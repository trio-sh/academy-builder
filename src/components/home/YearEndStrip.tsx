import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AmbientVideo } from "@/components/home/AmbientVideo";
import { albertaYear, CALGARY, clockText, closingParts, yearEndInstant } from "@/lib/yearEnd";

const two = (n: number) => n.toString().padStart(2, "0");

/** The year-end block that replaced the launch countdown: a count to the end of the Alberta year, over a slow snowfall. */
export function YearEndStrip() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const p = closingParts(now);
  const year = albertaYear(now);
  const anchorZone = clockText(yearEndInstant(now), CALGARY).zone;
  const fields = [
    { label: "Days", value: two(p.days) },
    { label: "Hours", value: two(p.hours) },
    { label: "Minutes", value: two(p.minutes) },
    { label: "Seconds", value: two(p.seconds) },
  ];
  return (
    <section data-rail="Year end" aria-labelledby="year-end-title" className="relative isolate overflow-hidden border-y-2 border-vermilion bg-vermilion/[0.06] paper-grain py-12 md:py-16" data-testid="year-end">
      <AmbientVideo src="/video/winter.mp4" poster="/video/winter.jpg" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45 pointer-events-none" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/80 via-background/40 to-background/70 pointer-events-none" aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-6">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.35 }} className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="stamp">Year-end · {year}</span>
              <span className="live-indicator" role="status" aria-label="Live: entry is open now"><span className="live-indicator-dot" aria-hidden="true" />LIVE</span>
            </div>
            <h2 id="year-end-title" className="display-serif text-2xl md:text-[2rem] leading-[1.15] text-foreground mt-4">
              The year <span className="italic display-serif-italic ink-vermilion">closes</span> in
            </h2>
            <p className="mono-label text-foreground/70 mt-3">§ Anchor · 00:00 {anchorZone} · 1 January {year + 1} · Calgary, Alberta</p>
          </div>
          <div className="md:col-span-7">
            <div className="grid grid-cols-4 border-2 border-vermilion bg-background/80 backdrop-blur-sm divide-x-2 divide-vermilion shadow-[4px_4px_0_0_hsl(var(--vermilion))]">
              {fields.map((f) => (
                <div key={f.label} className="text-center py-4 md:py-6">
                  <div className="display-serif text-4xl sm:text-5xl md:text-6xl tabular-nums leading-none ink-vermilion" aria-label={`${parseInt(f.value, 10)} ${f.label.toLowerCase()}`} data-testid={`year-end-${f.label.toLowerCase()}`}>{f.value}</div>
                  <div className="mono-label text-foreground/70 mt-2 text-[0.65rem] sm:text-[0.7rem] uppercase tracking-widest">{f.label}</div>
                </div>
              ))}
            </div>
            <p className="marginalia text-[0.8rem] text-foreground/80 mt-4 text-center md:text-right">
              Begin the new year with a record of your own. <Link to="/get-started" className="display-serif italic ink-vermilion underline underline-offset-4 hover:no-underline">Enter the record →</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
