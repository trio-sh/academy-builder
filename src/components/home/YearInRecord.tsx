import { useEffect, useState } from "react";
import { REGISTRATION_OPENED, daysOpen } from "@/lib/yearEnd";
import { CountUp } from "@/components/home/CountUp";

/**
 * The year in the record: a ledger line of facts that are true today and can be checked. The day count is live (it turns over at midnight in Calgary).
 * Counts of people are deliberately not here: until the pilot has real participants to report, a number would mostly be test accounts and the team.
 * When there are figures worth publishing, add them to EXTRA with the date they were true; nothing else on the page needs to change.
 */
export interface LedgerFigure { value: string; label: string; asOf?: string; count?: number }
const EXTRA: LedgerFigure[] = [];

const since = new Date(`${REGISTRATION_OPENED}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function YearInRecord() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const figures: LedgerFigure[] = [
    { value: String(daysOpen(now)), count: daysOpen(now), label: `days open · registration since ${since}` },
    { value: "6", label: "steps from profile to evidence · one record" },
    { value: "48h", label: "to a mentor match · free to enter" },
    ...EXTRA,
  ];
  return (
    <section aria-labelledby="year-in-record-title" className="relative border-b border-foreground/30 bg-background/70" data-testid="year-in-record">
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-8 md:py-10">
        <div className="mono-label text-foreground/60 mb-5" id="year-in-record-title">§ The year in the record</div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-t border-foreground/40">
          {figures.map((f, i) => (
            <div key={f.label} className={"py-5 sm:px-8 sm:first:pl-0 " + (i > 0 ? "border-t sm:border-t-0 sm:border-l border-foreground/20" : "")}>
              <dd className="ledger-num text-5xl md:text-6xl leading-none ink-vermilion tabular-nums" data-testid={`ledger-${i}`}>{f.count !== undefined ? <CountUp to={f.count} testId={`ledger-count-${i}`} /> : f.value}</dd>
              <dt className="mono-label text-foreground/70 mt-3 leading-relaxed">{f.label}{f.asOf ? ` · as of ${f.asOf}` : ""}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
