import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Public launch countdown — 22 August 2026, 00:00 UTC.
 *
 * Editorial ledger-strip: a datestamp, the four count fields, and a
 * marginalia footer. Paper-theme first-class. Post-launch it renders a
 * "Now open for public reading" strip instead of negative counts.
 */

const LAUNCH_DATE_UTC = new Date(Date.UTC(2026, 7 /* Aug */, 22, 0, 0, 0));

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function computeParts(target: Date): Parts | null {
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function two(n: number): string {
  return n.toString().padStart(2, "0");
}

export function LaunchCountdown() {
  const [parts, setParts] = useState<Parts | null>(() => computeParts(LAUNCH_DATE_UTC));

  useEffect(() => {
    const tick = () => setParts(computeParts(LAUNCH_DATE_UTC));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const launched = parts === null;

  const fields = launched
    ? []
    : [
        { label: "Days", value: two(parts.days) },
        { label: "Hours", value: two(parts.hours) },
        { label: "Minutes", value: two(parts.minutes) },
        { label: "Seconds", value: two(parts.seconds) },
      ];

  return (
    <section
      aria-labelledby="launch-countdown-title"
      className="relative paper-grain border-y border-foreground/40 py-10 md:py-12"
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35 }}
          className="grid gap-6 md:grid-cols-12 md:items-end"
        >
          {/* Left — marginalia label + display line */}
          <div className="md:col-span-5">
            <div className="mono-label text-foreground/60">§ Launch · Public opening</div>
            <h2
              id="launch-countdown-title"
              className="display-serif text-2xl md:text-[2rem] leading-[1.15] text-foreground mt-2"
            >
              {launched ? (
                <>
                  <span className="italic display-serif-italic ink-vermilion">Now open</span> for public reading.
                </>
              ) : (
                <>
                  <span className="italic display-serif-italic">Opening</span> Friday, 22 August 2026.
                </>
              )}
            </h2>
          </div>

          {/* Right — count fields */}
          <div className="md:col-span-7">
            {launched ? (
              <div className="border-2 border-foreground p-5 md:p-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                <span className="mono-label text-foreground">§ In session</span>
                <a
                  href="/get-started"
                  className="display-serif text-xl md:text-2xl italic ink-vermilion underline underline-offset-4 hover:no-underline"
                >
                  Enter the record →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-4 border-2 border-foreground divide-x-2 divide-foreground">
                {fields.map((f) => (
                  <div key={f.label} className="text-center py-4 md:py-5">
                    <div
                      className="display-serif text-3xl sm:text-4xl md:text-5xl tabular-nums leading-none text-foreground"
                      aria-label={`${parseInt(f.value, 10)} ${f.label.toLowerCase()}`}
                    >
                      {f.value}
                    </div>
                    <div className="mono-label text-foreground/60 mt-2 text-[0.65rem] sm:text-[0.7rem]">
                      {f.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="marginalia text-[0.7rem] text-foreground/60 mt-3 text-center md:text-right">
              Register opens {LAUNCH_DATE_UTC.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}Time stamp in your local zone.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
