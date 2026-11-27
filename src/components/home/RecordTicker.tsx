/** A slow ribbon of the site's own method statements. Static, wrapping text for anyone who asks for reduced motion. */
const LINES = [
  "A different question: not only whether someone can perform the task",
  "Practice is kept separate from evidence",
  "Rehearsal is private",
  "What gets recorded is how conduct shows up across workplace situations",
  "Every line is legible",
  "Every difference stays visible",
  "A dated account of what you were asked to do, and what you did",
  "Free to enter · Mentor-matched in 48 hours",
];

export function RecordTicker() {
  const row = (key: string) => (
    <ul key={key} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={key === "b" ? "true" : undefined}>
      {LINES.map((l) => (
        <li key={l} className="flex items-center gap-10 whitespace-nowrap mono-label text-foreground/70"><span>{l}</span><span className="text-vermilion" aria-hidden="true">§</span></li>
      ))}
    </ul>
  );
  return (
    <section aria-label="From the record" className="relative border-b border-foreground/30 bg-background/60 py-4 overflow-hidden" data-testid="record-ticker">
      <div className="ticker-track flex w-max">{row("a")}{row("b")}</div>
    </section>
  );
}
