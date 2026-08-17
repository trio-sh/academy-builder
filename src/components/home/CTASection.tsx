import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
            className="display-serif text-5xl md:text-7xl lg:text-[7rem] leading-[0.95] text-foreground"
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

        {/* Right — mock "receipt" card */}
        <motion.aside
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={4}
          className="md:col-span-4 md:pt-16"
        >
          <div className="relative border-2 border-foreground p-8 bg-background/60 backdrop-blur-[1px] rotate-[0.5deg] shadow-[6px_6px_0_rgba(29,24,21,0.15)]">
            {/* Stamp corner */}
            <div className="absolute -top-4 -right-3 stamp">
              Filed 2026
            </div>

            <div className="mono-label text-foreground/60 pb-3 mb-4 border-b border-foreground/25">
              Specimen Receipt · No. 000-001
            </div>

            <p className="display-serif text-xl leading-tight mb-6">
              This is to record that{" "}
              <span className="italic display-serif-italic">the bearer</span> has
              entered the Behavioral Readiness Register on this day.
            </p>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-dashed border-foreground/25 pb-2">
                <dt className="mono-label text-foreground/60">Register</dt>
                <dd className="mono-num text-foreground">T3A / BER-01</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-dashed border-foreground/25 pb-2">
                <dt className="mono-label text-foreground/60">Volume</dt>
                <dd className="mono-num text-foreground">I</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-dashed border-foreground/25 pb-2">
                <dt className="mono-label text-foreground/60">Filed by</dt>
                <dd className="text-foreground italic display-serif-italic">the bearer</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="mono-label text-foreground/60">Status</dt>
                <dd className="ink-vermilion mono-label">Open</dd>
              </div>
            </dl>

            <div className="mt-6 pt-4 border-t border-foreground/25 mono-label text-foreground/50 text-center">
              The 3rd Academy · Register of Behavioral Readiness
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
