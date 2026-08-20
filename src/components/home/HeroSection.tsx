import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";

// Fade-in-up on load, staggered
const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: 0.15 + i * 0.09, ease: [0.19, 1, 0.22, 1] },
  }),
};

export function HeroSection() {
  return (
    <section className="relative paper-grain pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
      {/* Corner registration marks — like a printed press sheet */}
      <RegistrationMarks />

      <div className="relative max-w-[1400px] mx-auto px-6">
        {/* Top masthead metadata */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={0}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 md:mb-20 items-end"
        >
          <div className="col-span-2 md:col-span-1">
            <span className="mono-label text-foreground/60 block">§ Prospectus 01</span>
            <span className="mono-label text-foreground/40 mt-1 block">
              Filed for public reading
            </span>
          </div>
          <div className="hidden md:block text-center">
            <div className="stamp">
              Not a Certification
            </div>
          </div>
          <div className="text-right md:text-right">
            <span className="mono-label text-foreground/60 block">
              {todayStamp()}
            </span>
            <span className="mono-label text-foreground/40 mt-1 block">
              Iss. 04 · pp. 001–024
            </span>
          </div>
        </motion.div>

        {/* Hero headline */}
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-end">
          {/* Left: giant headline */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={1}
            className="md:col-span-8 display-serif text-[2.75rem] sm:text-[3.75rem] md:text-[5.25rem] lg:text-[6.5rem] text-foreground"
          >
            <span className="block">Beyond</span>
            <span className="block italic display-serif-italic text-foreground/90">
              Credentials.
            </span>
            <span className="block relative">
              <span className="text-foreground">Behavioral </span>
              <span className="ink-vermilion">Readiness</span>
              <span className="ink-vermilion">.</span>
            </span>
          </motion.h1>

          {/* Right: lede + dropcap */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={2}
            className="md:col-span-4 md:pb-4"
          >
            <div className="border-l-2 border-foreground pl-5 md:pl-6">
              <p className="text-foreground text-base md:text-[1.0625rem] leading-[1.7] tracking-tight">
                <span className="display-serif text-5xl md:text-6xl float-left leading-[0.85] pr-2 pt-1 -mt-1">
                  T
                </span>
                he 3rd Academy issues a dated account of what you were asked to do,
                what you did, where the conduct held, and where it did not — the kind
                of evidence a résumé cannot carry.
              </p>
              <p className="marginalia mt-4 pl-1">
                “A badge says what you completed. A score says how you were rated. A Behavioral Evidence Report shows how you conducted yourself when the work stopped going to plan.”
              </p>
            </div>
          </motion.div>
        </div>

        {/* Rule + actions */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={3}
          className="mt-16 md:mt-20 pt-6 border-t border-foreground"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-7 py-6 text-base font-medium tracking-wide"
              >
                <Link to="/get-started">
                  Enter the record
                  <span className="ml-3">→</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-6 text-base font-medium tracking-wide underline underline-offset-8 decoration-1"
              >
                <Link to="/employers">
                  Read the employer sheet
                </Link>
              </Button>
            </div>

            {/* Trust bullets — mono metadata style */}
            <ul className="flex flex-wrap gap-x-8 gap-y-2 mono-label text-foreground/60">
              <li>· Free to enter</li>
              <li>· Mentor-matched 48h</li>
              <li>· Evidence-based</li>
            </ul>
          </div>
        </motion.div>

        {/* Sample BER card + companion illustration.
            Per Dr. Mofoke feedback #2, the space left of the card was
            too empty. On md+ we sit the treadmill illustration in that
            open zone so the eye reads "what work looks like today →
            what the record replaces it with". */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={4}
          className="mt-20 md:mt-28 grid md:grid-cols-12 gap-8 md:gap-10 items-center"
        >
          <div className="md:col-span-6 order-2 md:order-1 flex justify-center md:justify-start">
            <DimensionsCard />
          </div>
          <div className="md:col-span-6 order-1 md:order-2 flex justify-center md:justify-end">
            <BERCardMock />
          </div>
        </motion.div>

        {/* Manifesto row — three tenets on a running rule */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={5}
          className="mt-16 md:mt-20 grid md:grid-cols-3 gap-0 border-t border-foreground/40"
        >
          {[
            {
              n: "01",
              t: "A different question",
              b: "We do not ask only whether someone can perform the task. We govern how observed conduct becomes evidence.",
              cap: "The question",
            },
            {
              n: "02",
              t: "A different method",
              b: "Practice is kept separate from evidence. Rehearsal is private. What gets recorded is how conduct shows up across workplace situations, including moments of pressure and uncertainty.",
              cap: "The method",
            },
            {
              n: "03",
              t: "A different receipt",
              b: "You leave with a record, not a rating. Every line is legible. Every difference stays visible.",
              cap: "The receipt",
            },
          ].map((item, i) => (
            <div
              key={item.n}
              className={
                "px-1 py-8 md:py-10 md:px-8 " +
                (i > 0 ? "md:border-l md:border-foreground/20" : "")
              }
            >
              <div className="flex items-baseline gap-4 mb-6 whitespace-nowrap">
                <span className="ledger-num text-3xl text-foreground">{item.n}</span>
                <span className="mono-label text-foreground/50">§ {item.cap}</span>
              </div>
              <h3 className="display-serif text-2xl md:text-3xl leading-tight mb-3">
                {item.t}
              </h3>
              <p className="text-foreground/75 text-[0.9375rem] leading-relaxed">
                {item.b}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * BERCardMock — a tilted, paper-card illustration of a Behavioral Evidence
 * Report. Hand-crafted; not a real record. Sits on the hero to show, at a
 * glance, the shape of the artifact the copy is describing (§ dimension
 * rows, "current until" date, mono metadata, /verify pointer).
 */
function BERCardMock() {
  return (
    <div className="relative w-full max-w-md md:max-w-lg" style={{ transform: "rotate(-1.5deg)" }}>
      {/* Paper shadow to lift the card off the ground */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-foreground/20 -z-10" />
      <article className="border-2 border-foreground bg-background/95 p-6 md:p-7 space-y-4 font-serif">
        {/* Masthead */}
        <header className="flex items-baseline justify-between border-b border-foreground/40 pb-3">
          <div>
            <div className="mono-label text-foreground/60">§ BER · Vol 01</div>
            <div className="display-serif text-lg leading-none mt-1 text-foreground">
              Behavioral Evidence <span className="italic display-serif-italic">Report</span>
            </div>
          </div>
          <div className="text-right">
            <div className="mono-label text-foreground/60">Iss. 04</div>
            <div className="mono-label text-foreground/40 mt-1">{todayStamp()}</div>
          </div>
        </header>

        {/* Participant handle */}
        <div className="flex items-baseline justify-between">
          <span className="mono-label text-foreground/60">§ Participant</span>
          <span className="font-mono text-xs text-foreground/70">a1c…d3b7</span>
        </div>

        {/* Dimension statement rows */}
        <ul className="space-y-2.5">
          {[
            { d: "D1", note: "Integrity & Ethics · truthful in the situation named." },
            { d: "D3", note: "Execution Reliability · delivered to the stated standard." },
            { d: "D6", note: "Resilience & Recovery · continued engaging after the setback." },
          ].map((row) => (
            <li key={row.d} className="flex items-baseline gap-3 text-sm">
              <span className="mono-label text-foreground/60 tabular-nums w-8">{row.d}</span>
              <span className="text-foreground/85 leading-snug">{row.note}</span>
            </li>
          ))}
          <li className="flex items-baseline gap-3 text-sm">
            <span className="mono-label text-foreground/40 tabular-nums w-8">D2</span>
            <span className="text-foreground/50 italic leading-snug">not observed in this period.</span>
          </li>
        </ul>

        {/* Footer meta */}
        <div className="grid grid-cols-2 gap-4 border-t border-foreground/40 pt-3 text-xs">
          <div>
            <div className="mono-label text-foreground/50">Current until</div>
            <div className="text-foreground mt-1">18 Feb 2028</div>
          </div>
          <div className="text-right">
            <div className="mono-label text-foreground/50">Verify at</div>
            <div className="text-foreground mt-1 font-mono">/verify</div>
          </div>
        </div>

        {/* Corner stamp */}
        <div className="pt-1">
          <span className="stamp normal-case">Issued · confirmed by more than one mentor</span>
        </div>
      </article>
    </div>
  );
}



/**
 * DimensionsCard — the six behavioral dimensions the Behavioral
 * Evidence Report actually names, presented as a compact information
 * card. Sits opposite the BER card so the hero reads as "what a résumé
 * cannot carry → the six dimensions we record instead," without leaning
 * on any illustration.
 */
function DimensionsCard() {
  const dims: { d: string; label: string; note: string }[] = [
    { d: "D1", label: "Integrity & Ethics", note: "truthful in the moment named" },
    { d: "D2", label: "Curiosity & Learning", note: "changed course on new information" },
    { d: "D3", label: "Execution Reliability", note: "delivered to the stated standard" },
    { d: "D4", label: "Collaboration", note: "made others visibly better" },
    { d: "D5", label: "Communication", note: "said the difficult thing plainly" },
    { d: "D6", label: "Resilience & Recovery", note: "continued engaging after the setback" },
  ];
  return (
    <article className="relative w-full max-w-md md:max-w-lg border-2 border-foreground bg-background/95 p-6 md:p-7 font-serif" style={{ transform: "rotate(-0.5deg)" }}>
      <div className="absolute -top-3 -left-3 stamp normal-case">Six · dimensions</div>
      <header className="border-b border-foreground/40 pb-3 mb-4">
        <div className="mono-label text-foreground/60">§ What the record names</div>
        <div className="display-serif text-lg leading-none mt-1 text-foreground">
          The six behavioral <span className="italic display-serif-italic">dimensions</span>
        </div>
      </header>
      <ul className="space-y-2">
        {dims.map((row) => (
          <li key={row.d} className="grid grid-cols-[2rem_1fr] gap-3 items-baseline py-1.5 border-b border-foreground/10 last:border-b-0">
            <span className="mono-label text-foreground/60 tabular-nums">{row.d}</span>
            <span className="text-foreground/90 text-sm leading-snug">
              <span className="font-semibold text-foreground">{row.label}</span>
              <span className="text-foreground/60"> · {row.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <footer className="mt-4 pt-3 border-t border-foreground/40 mono-label text-foreground/60 flex items-baseline justify-between">
        <span>Observed. Dated. Signed.</span>
        <span className="ink-vermilion">§ BER</span>
      </footer>
    </article>
  );
}

function RegistrationMarks() {
  const mark = (
    <svg
      className="w-4 h-4 text-foreground/40"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" />
      <line x1="0" y1="8" x2="16" y2="8" />
      <line x1="8" y1="0" x2="8" y2="16" />
    </svg>
  );
  return (
    <>
      <div className="absolute top-24 left-4 hidden md:block">{mark}</div>
      <div className="absolute top-24 right-4 hidden md:block">{mark}</div>
    </>
  );
}
