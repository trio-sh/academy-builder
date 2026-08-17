import { motion } from "framer-motion";

const rise = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.05 + i * 0.06, ease: [0.19, 1, 0.22, 1] },
  }),
};

type Entry = {
  n: string;
  title: string;
  body: string;
  meta: string;
  aside?: string;
  highlight?: boolean;
};

const entries: Entry[] = [
  {
    n: "01",
    title: "Basic Profile",
    meta: "Entry · Résumé or participation",
    body: "You file a starting profile — the initial page in your record. Résumé data is imported without adornment. Nothing is graded here.",
  },
  {
    n: "02",
    title: "Growth Log",
    meta: "Ongoing · Continuously evolving",
    body: "Activity, projects, mentorship notes — appended chronologically. The log is yours; it accrues at the pace of your work, not on a schedule.",
    aside: "Kept in your name. Not aggregated into a score.",
  },
  {
    n: "03",
    title: "Mentor Guidance",
    meta: "Key stage · Human-led observation",
    body: "You work with an experienced professional who observes what actually happens under workplace pressure. Guidance is separate from evaluation.",
    highlight: true,
  },
  {
    n: "04",
    title: "Behavioral Evidence Report (BER)",
    meta: "The record itself",
    body: "A dated account of what you were asked to do, what you did, where the conduct held, and where it did not. Evidence — not a rating.",
    aside: "Every line is legible. Every difference stays visible.",
  },
  {
    n: "05",
    title: "TalentVisa",
    meta: "Visibility switch",
    body: "You turn your visibility to employers on and off. Employers see that you have a current record — never what is in it, without your consent.",
  },
  {
    n: "06",
    title: "T3X Exchange",
    meta: "The reading room",
    body: "Employers discover and review Behavioral Evidence Reports when considering candidates. Nothing is surfaced that you did not release.",
  },
];

export function JourneySection() {
  return (
    <section className="paper-grain relative py-24 md:py-32 border-t border-foreground/50">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={0}
          className="grid md:grid-cols-12 gap-6 md:gap-10 items-end mb-16 md:mb-24"
        >
          <div className="md:col-span-8">
            <div className="mono-label text-foreground/60 mb-4">
              § II · The Behavioral Readiness Journey
            </div>
            <h2 className="display-serif text-5xl md:text-7xl lg:text-[5.5rem] text-foreground leading-[0.95]">
              From <span className="italic display-serif-italic">Profile</span> to{" "}
              <span className="ink-vermilion">Evidence</span>.
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed border-l-2 border-foreground pl-5">
              Behavioral evidence is built through mentor-led observation over time —
              no shortcuts, no self-assessments. Six steps. One record.
            </p>
          </div>
        </motion.div>

        {/* Ledger steps */}
        <div className="border-t-2 border-foreground">
          {entries.map((entry, i) => (
            <motion.article
              key={entry.n}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "row-hover grid grid-cols-12 gap-4 md:gap-8 py-10 md:py-12 px-2 md:px-4 border-b border-foreground/25 transition-colors group " +
                (entry.highlight ? "bg-foreground/[0.025]" : "")
              }
            >
              {/* Big numeral */}
              <div className="col-span-2 md:col-span-1">
                <div className="ledger-num text-5xl md:text-7xl text-foreground leading-none">
                  {entry.n}
                </div>
              </div>

              {/* Title + meta */}
              <div className="col-span-10 md:col-span-4">
                <div className="mono-label text-foreground/50 mb-2">
                  {entry.meta}
                </div>
                <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground">
                  {entry.title}
                  {entry.highlight && (
                    <span className="ml-3 stamp align-middle inline-flex normal-case">
                      Key stage
                    </span>
                  )}
                </h3>
              </div>

              {/* Body */}
              <div className="col-span-12 md:col-span-5 md:pl-4 md:border-l md:border-foreground/25">
                <p className="text-foreground/85 text-base md:text-[1.0625rem] leading-[1.75]">
                  {entry.body}
                </p>
              </div>

              {/* Marginalia */}
              <div className="col-span-12 md:col-span-2">
                {entry.aside && (
                  <p className="marginalia">
                    ↳ {entry.aside}
                  </p>
                )}
              </div>
            </motion.article>
          ))}
        </div>

        {/* Colophon-style promise */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={rise}
          custom={0}
          className="mt-20 md:mt-24 max-w-3xl mx-auto text-center"
        >
          <div className="mono-label text-foreground/50 mb-4">Our promise</div>
          <p className="display-serif text-2xl md:text-3xl leading-snug text-foreground">
            Professional guidance at every step.
            <span className="ink-vermilion"> Evidence</span> that reflects real experience.
            Growth that speaks for itself. Results employers can trust.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
