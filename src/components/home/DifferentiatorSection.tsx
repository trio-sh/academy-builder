import { motion } from "framer-motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.05 + i * 0.05, ease: [0.19, 1, 0.22, 1] },
  }),
};

type Row = {
  criteria: string;
  t3a: string;
  competitors: string;
  note: string;
};

const rows: Row[] = [
  {
    criteria: "The question asked",
    t3a: "How does conduct show up when the job goes sideways?",
    competitors: "Can this person demonstrate the capability required for the role or task?",
    note: "Doing the job well and being trusted at work are not the same thing.",
  },
  {
    criteria: "Practice",
    t3a: "Private rehearsal is kept separate from evidence",
    competitors: "Practice and evaluation happen inside the same exercise",
    note: "If practising is being judged, people perform instead of learning.",
  },
  {
    criteria: "What you receive",
    t3a: "A dated record of observed conduct",
    competitors: "Evidence of capability or proficiency",
    note: "A result requires people to accept a conclusion. A record lets them see what happened.",
  },
  {
    criteria: "How evidence builds",
    t3a: "Evidence accumulates across situations and over time",
    competitors: "The result reflects a defined occasion",
    note: "A single response shows a moment. A pattern needs more than one.",
  },
  {
    criteria: "When evidence differs",
    t3a: "Differences remain visible in the record",
    competitors: "Differences are resolved into a single result",
    note: "One number hides the moment you struggled inside the ones you did not.",
  },
  {
    criteria: "Limits",
    t3a: "The record says what the evidence supports, and where it stops",
    competitors: "The result stands on its own terms",
    note: "When limits go unstated, absence of evidence looks like evidence.",
  },
  {
    criteria: "If it is wrong",
    t3a: "You read every line and can challenge it",
    competitors: "The result goes to whoever commissioned it",
    note: "An error nobody can see is an error nobody can correct.",
  },
];

export function DifferentiatorSection() {
  return (
    <section className="paper-grain relative py-24 md:py-32 border-t border-foreground/50">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={0}
          className="grid md:grid-cols-12 gap-6 items-end mb-16 md:mb-20"
        >
          <div className="md:col-span-8">
            <div className="mono-label text-foreground/60 mb-4">
              § III · A Different Question
            </div>
            <h2 className="display-serif text-5xl md:text-7xl lg:text-[5.5rem] text-foreground leading-[0.95]">
              Not a{" "}
              <span className="italic display-serif-italic">feature</span>{" "}
              difference.
              <br />
              <span className="ink-vermilion">A category difference.</span>
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed border-l-2 border-foreground pl-5">
              Others test a moment. We document behaviour across workplace pressure
              moments — with accountable human confirmation.
            </p>
          </div>
        </motion.div>

        {/* Split-panel figure — "algorithm vs mentor" contrast, hand-crafted
            so it stays on the paper theme. Sits before the table to give the
            eye a picture of the category difference the copy is about. */}
        <motion.figure
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={1}
          className="mb-16 md:mb-20 border-2 border-foreground bg-background/70 max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-2 divide-x-2 divide-foreground">
            {/* Left · Algorithmic assessment */}
            <div className="relative p-5 md:p-6 overflow-hidden">
              <div className="mono-label text-foreground/50 mb-3">
                Common approach
              </div>
              <div className="display-serif text-lg md:text-xl leading-tight mb-4">
                Algorithm reads the résumé
              </div>
              {/* Mock terminal readout */}
              <div className="font-mono text-[0.65rem] md:text-[0.7rem] text-foreground/60 leading-relaxed space-y-1 border border-foreground/25 bg-foreground/[0.03] p-3">
                <div>&gt; scan.candidate</div>
                <div>&gt; keyword_hits: 14 / 22</div>
                <div>&gt; score: 0.71</div>
                <div className="text-foreground/40">&gt; conduct: <em>not observed</em></div>
                <div>&gt; verdict: <span className="line-through decoration-foreground/50">match</span></div>
              </div>
              <p className="marginalia mt-4">
                A single number stands for a person.
              </p>
            </div>

            {/* Right · Mentor observation */}
            <div className="relative p-5 md:p-6 overflow-hidden">
              <div className="mono-label text-foreground mb-3">
                The 3rd Academy
              </div>
              <div className="display-serif text-lg md:text-xl leading-tight mb-4">
                Mentor observes the conduct
              </div>
              {/* Dated ledger notes — the counterpart to the terminal */}
              <ul className="text-[0.75rem] md:text-[0.8rem] text-foreground/80 leading-snug space-y-2 border border-foreground/25 bg-background/60 p-3">
                <li className="flex gap-2">
                  <span className="mono-label text-foreground/50 tabular-nums shrink-0">§1</span>
                  <span>Stayed with the task after the setback.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mono-label text-foreground/50 tabular-nums shrink-0">§2</span>
                  <span>Named what they got wrong on the record.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mono-label text-foreground/50 tabular-nums shrink-0">§3</span>
                  <span>D5 <em>not observed</em> — stated, not filled in.</span>
                </li>
              </ul>
              <p className="marginalia mt-4 ink-vermilion">
                ↳ Dated, human-signed, legible line by line.
              </p>
              {/* Vermilion stamp mark to anchor the "right" side */}
              <span className="stamp absolute top-3 right-3">Signed</span>
            </div>
          </div>
          <figcaption className="mono-label text-foreground/60 border-t-2 border-foreground px-5 py-2 flex items-center justify-between">
            <span>Fig. 00 · same candidate, two records</span>
            <span className="text-foreground/40">§ III</span>
          </figcaption>
        </motion.figure>

        {/* Broadsheet table — desktop */}
        <div className="hidden md:block">
          {/* Column header row */}
          <div className="grid grid-cols-12 gap-6 border-t-2 border-foreground pt-4 pb-3 border-b border-foreground/25">
            <div className="col-span-3 mono-label text-foreground/60">
              The criterion
            </div>
            <div className="col-span-4 mono-label text-foreground">
              The 3rd Academy
            </div>
            <div className="col-span-4 mono-label text-foreground/60">
              Common approach
            </div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={row.criteria}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className="grid grid-cols-12 gap-6 py-7 border-b border-foreground/20 row-hover group"
            >
              <div className="col-span-3">
                <div className="display-serif text-2xl leading-tight text-foreground">
                  {row.criteria}
                </div>
                <div className="mono-num text-foreground/40 text-xs mt-2">
                  Fig. {String(i + 1).padStart(2, "0")}
                </div>
              </div>
              <div className="col-span-4 relative">
                {/* Vermilion tick — ink dot */}
                <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-vermilion" />
                <p className="text-foreground text-[0.95rem] leading-[1.65]">
                  {row.t3a}
                </p>
              </div>
              <div className="col-span-4">
                <p className="text-foreground/55 text-[0.95rem] leading-[1.65] line-through decoration-foreground/30 decoration-[0.5px]">
                  {row.competitors}
                </p>
              </div>
              <div className="col-span-1 flex items-start justify-end">
                <span className="mono-num text-foreground/40 text-xs">§{i + 1}</span>
              </div>
              {/* Full-width note */}
              <div className="col-span-12 pt-1">
                <p className="marginalia pl-6 border-l border-foreground/20">
                  {row.note}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stacked cards — mobile */}
        <div className="md:hidden space-y-8 border-t-2 border-foreground pt-6">
          {rows.map((row, i) => (
            <motion.div
              key={row.criteria}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={rise}
              custom={i}
              className="border-b border-foreground/20 pb-8"
            >
              <div className="mono-num text-foreground/40 text-xs mb-2">
                Fig. {String(i + 1).padStart(2, "0")}
              </div>
              <div className="display-serif text-2xl leading-tight text-foreground mb-4">
                {row.criteria}
              </div>
              <div className="mb-4">
                <div className="mono-label text-foreground mb-1">The 3rd Academy</div>
                <p className="text-foreground text-[0.95rem] leading-[1.65]">
                  {row.t3a}
                </p>
              </div>
              <div className="mb-4">
                <div className="mono-label text-foreground/50 mb-1">Common approach</div>
                <p className="text-foreground/55 text-[0.95rem] leading-[1.65] line-through decoration-foreground/30 decoration-[0.5px]">
                  {row.competitors}
                </p>
              </div>
              <p className="marginalia pl-4 border-l border-foreground/20">
                {row.note}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Editor's pull quote */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={rise}
          custom={0}
          className="mt-20 md:mt-28 max-w-4xl mx-auto text-center"
        >
          <div className="mono-label text-foreground/50 mb-6">Editor's note</div>
          <blockquote className="display-serif text-3xl md:text-5xl leading-[1.15] text-foreground">
            A badge says what you completed. A score says how you were rated.
            <span className="block italic display-serif-italic mt-4 ink-vermilion">
              A Behavioral Evidence Report shows how you conducted yourself when the
              work stopped going to plan.
            </span>
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
