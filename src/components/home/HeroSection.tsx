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

      {/* Floating decorative figures — pushed to the edges so they read
          as ambient plates, not the subject of the hero */}
      <FloatingFigures />

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
            <TreadmillIllustration />
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
              image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=400&fit=crop&crop=faces",
              cap: "Fig. i · the question",
            },
            {
              n: "02",
              t: "A different method",
              b: "Practice is kept separate from evidence. Rehearsal is private. What gets recorded is how conduct shows up across workplace situations, including moments of pressure and uncertainty.",
              image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=400&fit=crop&crop=faces",
              cap: "Fig. ii · the method",
            },
            {
              n: "03",
              t: "A different receipt",
              b: "You leave with a record, not a rating. Every line is legible. Every difference stays visible.",
              image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=400&fit=crop&crop=faces",
              cap: "Fig. iii · the receipt",
            },
          ].map((item, i) => (
            <div
              key={item.n}
              className={
                "px-1 py-8 md:py-10 md:px-8 " +
                (i > 0 ? "md:border-l md:border-foreground/20" : "")
              }
            >
              <div className="flex items-baseline gap-4 mb-4">
                <span className="ledger-num text-3xl text-foreground">{item.n}</span>
                <span className="mono-label text-foreground/50">§</span>
              </div>
              <figure className="mb-4 border border-foreground/25 bg-background/40 w-20 md:w-24">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.cap}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="mono-label text-foreground/60 px-1.5 py-0.5 border-t border-foreground/25 text-[0.55rem]">
                  {item.cap}
                </figcaption>
              </figure>
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
 * TreadmillIllustration — a small hand-drawn journal sketch showing the
 * appraisal treadmill on the left (crossed out) and an open dated ledger
 * on the right (kept). Sits opposite the BER card so the hero reads as
 * "what the workplace does today → what the record replaces it with"
 * (per Dr. Mofoke feedback #2). Everything is inline SVG so it stays on
 * the paper/indigo palette and renders at any DPR.
 */
function TreadmillIllustration() {
  return (
    <figure className="relative w-full max-w-md md:max-w-lg border-2 border-foreground bg-background/70 p-5 md:p-6" style={{ transform: "rotate(-0.75deg)" }}>
      <div className="absolute -top-3 -left-3 stamp normal-case">Editor's plate</div>
      <div className="mono-label text-foreground/60 border-b border-foreground/40 pb-2 mb-4 flex items-baseline justify-between">
        <span>§ Plate 00 · what a résumé cannot carry</span>
        <span className="text-foreground/40">Fig. 00</span>
      </div>
      <svg
        viewBox="0 0 480 260"
        className="w-full h-auto"
        role="img"
        aria-labelledby="treadmill-title treadmill-desc"
      >
        <title id="treadmill-title">The treadmill of appraisal vs. the record</title>
        <desc id="treadmill-desc">
          A hand-drawn sketch: on the left, a figure runs on a treadmill
          chasing a dangling carrot labelled "Rated"; the whole panel is
          crossed out. On the right, an open ledger has three dated
          entries — the Behavioral Evidence Report.
        </desc>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
          </pattern>
        </defs>
        <g className="text-foreground" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          {/* Left panel — the treadmill */}
          <g transform="translate(0,0)">
            {/* Panel frame */}
            <rect x="8" y="14" width="220" height="232" rx="2" strokeOpacity="0.35" fill="url(#hatch)" />
            {/* Label */}
            <text x="18" y="34" fontFamily="ui-monospace,monospace" fontSize="9" letterSpacing="0.14em" fill="currentColor" opacity="0.6">A · RATED</text>
            {/* Treadmill base */}
            <rect x="40" y="180" width="150" height="14" rx="2" />
            <line x1="40" y1="187" x2="190" y2="187" strokeDasharray="3 4" strokeOpacity="0.5" />
            <line x1="40" y1="194" x2="46" y2="204" />
            <line x1="190" y1="194" x2="184" y2="204" />
            {/* Handlebar column */}
            <line x1="190" y1="180" x2="190" y2="120" />
            <line x1="190" y1="120" x2="220" y2="120" />
            {/* Runner — stick figure */}
            <circle cx="120" cy="112" r="12" />
            {/* body */}
            <line x1="120" y1="124" x2="120" y2="158" />
            {/* arms reaching forward */}
            <line x1="120" y1="132" x2="150" y2="118" />
            <line x1="120" y1="132" x2="102" y2="146" />
            {/* legs mid-stride */}
            <line x1="120" y1="158" x2="106" y2="180" />
            <line x1="120" y1="158" x2="138" y2="180" />
            {/* sweat drops */}
            <path d="M108 96 q-2 4 0 6 t2 -6" strokeOpacity="0.6" />
            <path d="M100 104 q-2 4 0 6 t2 -6" strokeOpacity="0.6" />
            {/* Fishing pole from the right — carrot dangling */}
            <line x1="215" y1="70" x2="160" y2="102" />
            <line x1="160" y1="102" x2="160" y2="116" strokeDasharray="2 3" strokeOpacity="0.55" />
            <g transform="translate(154,116)">
              <path d="M0 0 l12 0 l-6 18 z" fill="currentColor" fillOpacity="0.15" />
              <path d="M0 0 l12 0 l-6 18 z" />
              <line x1="4" y1="-2" x2="2" y2="-8" />
              <line x1="8" y1="-2" x2="10" y2="-8" />
              <text x="16" y="10" fontFamily="Fraunces,serif" fontSize="9" fontStyle="italic" fill="currentColor" opacity="0.7">Rated</text>
            </g>
            {/* Management chair silhouette in the corner */}
            <rect x="180" y="130" width="30" height="34" rx="2" strokeOpacity="0.45" />
            <circle cx="195" cy="118" r="6" strokeOpacity="0.5" />
            <text x="180" y="176" fontFamily="ui-monospace,monospace" fontSize="7" opacity="0.55" fill="currentColor">Mgmt.</text>
            {/* Crossed-out lines through the whole panel */}
            <g stroke="hsl(var(--vermilion))" strokeOpacity="0.85" strokeWidth="2">
              <line x1="14" y1="24" x2="222" y2="238" />
              <line x1="222" y1="24" x2="14" y2="238" />
            </g>
          </g>

          {/* Right panel — the ledger / BER */}
          <g transform="translate(240,0)">
            <rect x="8" y="14" width="220" height="232" rx="2" strokeOpacity="0.55" />
            <text x="18" y="34" fontFamily="ui-monospace,monospace" fontSize="9" letterSpacing="0.14em" fill="currentColor" opacity="0.7">B · RECORDED</text>
            {/* Ledger spine */}
            <line x1="118" y1="46" x2="118" y2="220" strokeDasharray="2 4" strokeOpacity="0.5" />
            {/* Page rules — left leaf */}
            <g stroke="currentColor" strokeOpacity="0.35">
              <line x1="24" y1="70" x2="112" y2="70" />
              <line x1="24" y1="86" x2="112" y2="86" />
              <line x1="24" y1="102" x2="112" y2="102" />
              <line x1="24" y1="118" x2="112" y2="118" />
              <line x1="24" y1="134" x2="112" y2="134" />
              <line x1="24" y1="150" x2="112" y2="150" />
              <line x1="24" y1="166" x2="112" y2="166" />
              <line x1="24" y1="182" x2="112" y2="182" />
            </g>
            {/* Left leaf: dated entries */}
            <text x="24" y="66" fontFamily="ui-monospace,monospace" fontSize="7" fill="currentColor" opacity="0.65">§ Growth log</text>
            <text x="24" y="80" fontFamily="Fraunces,serif" fontSize="8" fill="currentColor">18·02  D1 · stayed with the task</text>
            <text x="24" y="96" fontFamily="Fraunces,serif" fontSize="8" fill="currentColor">22·02  D3 · delivered on stated standard</text>
            <text x="24" y="112" fontFamily="Fraunces,serif" fontSize="8" fill="currentColor">02·03  D6 · recovered after the setback</text>
            <text x="24" y="128" fontFamily="Fraunces,serif" fontSize="8" fontStyle="italic" opacity="0.6" fill="currentColor">D2 · not observed in period</text>
            {/* Right leaf: signature / stamp / bookmark */}
            <g stroke="currentColor" strokeOpacity="0.35">
              <line x1="126" y1="70" x2="212" y2="70" />
              <line x1="126" y1="118" x2="212" y2="118" />
              <line x1="126" y1="166" x2="212" y2="166" />
            </g>
            <text x="126" y="66" fontFamily="ui-monospace,monospace" fontSize="7" fill="currentColor" opacity="0.65">§ Signed</text>
            <text x="126" y="86" fontFamily="Fraunces,serif" fontSize="9" fontStyle="italic" fill="currentColor">— mentor</text>
            <text x="126" y="102" fontFamily="Fraunces,serif" fontSize="9" fontStyle="italic" fill="currentColor">— mentor</text>
            <text x="126" y="140" fontFamily="ui-monospace,monospace" fontSize="7" opacity="0.65" fill="currentColor">§ Verify</text>
            <text x="126" y="156" fontFamily="ui-monospace,monospace" fontSize="8" fill="currentColor">/verify · a1c…d3b7</text>
            {/* Vermilion stamp on the right leaf */}
            <g transform="translate(158,180) rotate(-8)">
              <rect x="0" y="0" width="52" height="20" rx="1" fill="hsl(var(--vermilion))" fillOpacity="0.14" stroke="hsl(var(--vermilion))" strokeWidth="1.25" />
              <text x="26" y="13" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="hsl(var(--vermilion))" letterSpacing="0.18em">FILED</text>
            </g>
            {/* Ribbon bookmark */}
            <path d="M118 14 l0 34 l-6 -8 l-6 8 l0 -34 z" fill="hsl(var(--vermilion))" fillOpacity="0.5" stroke="hsl(var(--vermilion))" strokeWidth="1" />
          </g>

          {/* Arrow bridging the panels */}
          <g transform="translate(224,128)">
            <line x1="0" y1="0" x2="18" y2="0" strokeWidth="1.5" />
            <path d="M14 -4 l4 4 l-4 4" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
      <figcaption className="mono-label text-foreground/60 border-t border-foreground/40 pt-2 mt-4 flex items-baseline justify-between">
        <span>A · <span className="line-through decoration-foreground/40">rated on a treadmill</span></span>
        <span className="ink-vermilion">B · recorded on a dated register</span>
      </figcaption>
    </figure>
  );
}

/**
 * FloatingFigures — two off-set portrait figures (mentor + team)
 * anchored to the hero's outer margins. Framed as ledger figures with a
 * mono caption strip so they don't compete with the headline; hidden
 * below md so they never crowd mobile layouts.
 */
function FloatingFigures() {
  return (
    <>
      {/* Straightened, smaller, tucked into corners so text never overlaps
          the photo (per Dr. Mofoke feedback #1). */}
      <figure className="pointer-events-none hidden xl:block absolute top-6 right-6 w-36 opacity-80 border border-foreground/25 bg-background/40">
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=800&fit=crop&crop=faces"
            alt="Fig. A — mentor at the desk"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <figcaption className="mono-label text-foreground/60 px-2 py-1 border-t border-foreground/25 text-[0.55rem]">
          Fig. A · at the desk
        </figcaption>
      </figure>
      <figure className="pointer-events-none hidden xl:block absolute bottom-20 left-6 w-32 opacity-80 border border-foreground/25 bg-background/40">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=450&fit=crop&crop=faces"
            alt="Fig. B — the room"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <figcaption className="mono-label text-foreground/60 px-2 py-1 border-t border-foreground/25 text-[0.55rem]">
          Fig. B · the room
        </figcaption>
      </figure>
    </>
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
