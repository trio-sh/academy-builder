import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

/**
 * Public launch countdown — 22 August 2026, 00:00 America/Edmonton
 * (Alberta local time, MDT / UTC-6 in August). Company HQ is in
 * Calgary, so the launch is anchored to that zone. Because the anchor
 * is a specific UTC instant (2026-08-22T06:00:00Z), every viewer sees
 * the same countdown regardless of where they read from — the display
 * strip shows their own local zone with an Alberta reference beside it.
 */

// Alberta = UTC-6 in August (MDT). Constructing from the ISO offset string
// pins the instant unambiguously.
const LAUNCH_INSTANT = new Date("2026-08-22T00:00:00-06:00");

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function computeParts(target: Date): Parts | null {
  const diff = target.getTime() - Date.now();
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

// Best-effort local zone abbreviation (falls back to the IANA name).
function localZoneLabel(): string {
  try {
    const fmt = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tz = fmt.find((p) => p.type === "timeZoneName")?.value;
    if (tz && tz.length <= 6) return tz;
  } catch {
    // ignore
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function LaunchCountdown() {
  const [parts, setParts] = useState<Parts | null>(() => computeParts(LAUNCH_INSTANT));

  useEffect(() => {
    const tick = () => setParts(computeParts(LAUNCH_INSTANT));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const launched = parts === null;

  const localLaunch = useMemo(
    () =>
      LAUNCH_INSTANT.toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );
  const localZone = useMemo(localZoneLabel, []);

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
      className="relative border-y-2 border-vermilion bg-vermilion/[0.06] paper-grain py-10 md:py-14"
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35 }}
          className="grid gap-6 md:grid-cols-12 md:items-end"
        >
          {/* Left — stamped-notice heading */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="stamp">{launched ? "Now open" : "Register · Opening soon"}</span>
              <span className="mono-label ink-vermilion animate-pulse">● LIVE</span>
            </div>
            <h2
              id="launch-countdown-title"
              className="display-serif text-2xl md:text-[2rem] leading-[1.15] text-foreground mt-4"
            >
              {launched ? (
                <>
                  <span className="italic display-serif-italic ink-vermilion">Now open</span> for public reading.
                </>
              ) : (
                <>
                  <span className="italic display-serif-italic ink-vermilion">Opening</span> Saturday,
                  22 August 2026.
                </>
              )}
            </h2>
            <p className="mono-label text-foreground/70 mt-3">
              § Anchor · 00:00 MDT · Calgary, Alberta
            </p>
          </div>

          {/* Right — count fields, vermilion frame */}
          <div className="md:col-span-7">
            {launched ? (
              <div className="border-2 border-vermilion bg-background p-5 md:p-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                <span className="mono-label ink-vermilion">§ In session</span>
                <a
                  href="/get-started"
                  className="display-serif text-xl md:text-2xl italic ink-vermilion underline underline-offset-4 hover:no-underline"
                >
                  Enter the record →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-4 border-2 border-vermilion bg-background divide-x-2 divide-vermilion shadow-[4px_4px_0_0_hsl(var(--vermilion))]">
                {fields.map((f) => (
                  <div key={f.label} className="text-center py-4 md:py-6">
                    <div
                      className="display-serif text-4xl sm:text-5xl md:text-6xl tabular-nums leading-none ink-vermilion"
                      aria-label={`${parseInt(f.value, 10)} ${f.label.toLowerCase()}`}
                    >
                      {f.value}
                    </div>
                    <div className="mono-label text-foreground/70 mt-2 text-[0.65rem] sm:text-[0.7rem] uppercase tracking-widest">
                      {f.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="marginalia text-[0.7rem] text-foreground/70 mt-3 text-center md:text-right">
              Your local zone ({localZone}): {localLaunch}
              {" · "}Alberta anchor: 22 August 2026, 00:00 MDT.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
