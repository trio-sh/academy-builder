import { useEffect, useState } from "react";
import { CALGARY, clockText } from "@/lib/yearEnd";
import { todayStamp } from "@/lib/dateStamp";

/** The masthead's date and a clock that ticks: the reader's own time, and Calgary's beside it. */
export function LiveDateline() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const you = clockText(now);
  const home = clockText(now, CALGARY);
  return (
    <>
      <span className="mono-label text-foreground/60 block">{todayStamp(now)}</span>
      <span className="mono-label text-foreground/40 mt-1 block tabular-nums" data-testid="live-clock">
        {you.time} {you.zone}<span className="hidden sm:inline"> · Calgary {home.time} {home.zone}</span>
      </span>
    </>
  );
}
