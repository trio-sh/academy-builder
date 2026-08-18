import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";

const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.05 + i * 0.08, ease: [0.19, 1, 0.22, 1] },
  }),
};

export function CTASection() {
  return (
    <section className="paper-grain relative py-28 md:py-40 border-t border-foreground overflow-hidden">
      {/* Faint background numeral — a large "01" watermark bleeding off */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-8 md:-right-24 ledger-num text-foreground/[0.06] select-none"
        style={{ fontSize: "clamp(20rem, 45vw, 44rem)", lineHeight: 0.75 }}
      >
        01
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 grid md:grid-cols-12 gap-8 md:gap-12">
        {/* Left — form-like signup */}
        <div className="md:col-span-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={0}
          >
            <div className="mono-label text-foreground/60 mb-6">
              § V · Register of Behavioral Readiness — Entry Form
            </div>
          </motion.div>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={1}
            className="display-serif text-5xl md:text-7xl lg:text-[6.5rem] leading-[1.08] text-foreground"
          >
            Ready to go
            <br />
            <span className="italic display-serif-italic">beyond</span>{" "}
            <span className="ink-vermilion">credentials?</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={2}
            className="mt-10 max-w-xl text-foreground/85 text-lg md:text-xl leading-relaxed border-l-2 border-foreground pl-6"
          >
            Join The 3rd Academy. Upload your résumé, connect with a mentor, and begin
            preparing for the workplace moments where behavior has to show up.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={3}
            className="mt-14 pt-6 border-t border-foreground"
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-7 text-base font-medium tracking-wide"
              >
                <Link to="/get-started">
                  Enter your name in the record
                  <span className="ml-3">→</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-7 text-base font-medium tracking-wide underline underline-offset-8 decoration-1"
              >
                <Link to="/platform">
                  Read the platform notes
                </Link>
              </Button>
            </div>
            <p className="mono-label text-foreground/50 mt-8">
              No credit card required · Mentor-matched within 48 hours · Free to enter
            </p>
          </motion.div>
        </div>

        {/* Right — the single canonical BER sample (matches the hero card
            so there aren't two competing BER samples on the same page,
            per Dr. Mofoke feedback #9b). */}
        <motion.aside
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={4}
          className="md:col-span-4 md:pt-16 flex justify-center md:justify-end"
        >
          <CTABERCard />
        </motion.aside>
      </div>
    </section>
  );
}

/**
 * CTABERCard — same shape as the hero's BER card mock, so the whole
 * page carries ONE canonical Behavioral Evidence Report specimen. Kept
 * local to this section to avoid coupling the hero to the CTA.
 */
function CTABERCard() {
  return (
    <div className="relative w-full max-w-md md:max-w-lg" style={{ transform: "rotate(1deg)" }}>
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-foreground/20 -z-10" />
      <article className="border-2 border-foreground bg-background/95 p-6 md:p-7 space-y-4 font-serif">
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

        <div className="flex items-baseline justify-between">
          <span className="mono-label text-foreground/60">§ Participant</span>
          <span className="font-mono text-xs text-foreground/70">a1c…d3b7</span>
        </div>

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

        <div className="pt-1">
          <span className="stamp normal-case">Issued · confirmed by more than one mentor</span>
        </div>
      </article>
    </div>
  );
}
