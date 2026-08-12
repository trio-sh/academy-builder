import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.19, 1, 0.22, 1] },
  }),
};

const features = [
  {
    n: "01",
    title: "Behavioral Evidence Record",
    body: "Documented evidence of how your conduct showed up across workplace-pressure situations — built through mentor-led observation over time, with you controlling when and with whom the record is shared.",
  },
  {
    n: "02",
    title: "Mentor-Led Observation",
    body: "Work with experienced professionals who observe and document how your conduct shows up across workplace-pressure situations over time.",
  },
  {
    n: "03",
    title: "Real-World Situations",
    body: "Build your record through real project settings and live work — the situations where conduct actually has to show up.",
  },
  {
    n: "04",
    title: "Longitudinal Growth Log",
    body: "A dated log that accrues at the pace of your work. Not a scoreboard — an audit trail you can read line by line.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Get Started",
    body: "Choose your path and create your account to begin building your behavioral evidence over time.",
  },
  {
    step: "02",
    title: "Work with Mentors",
    body: "Get paired with experienced professionals who observe how your conduct shows up across workplace-pressure situations over time.",
  },
  {
    step: "03",
    title: "Build Evidence",
    body: "Take part in different workplace situations where your conduct is observed and documented over time, building a record of behavioral evidence.",
  },
  {
    step: "04",
    title: "Review & Share Your Record",
    body: "Review your Behavioral Evidence Record, question anything you believe is inaccurate, and choose when and with whom to share it.",
  },
];

const jobSeekerPoints = [
  "Practice privately, separate from your evidence record",
  "Build behavioral evidence over time",
  "Work with experienced mentors",
  "Review your evidence record",
  "Decide whether it is shared, and with whom",
];

const employerPoints = [
  "Review a Behavioral Evidence Report a candidate has released to you",
  "Examine observed conduct across workplace situations",
  "Understand what the evidence supports — and where it stops",
  "Verify the report without creating an account",
  "Keep the hiring decision with your organization",
];

const Platform = () => {
  return (
    <div
      data-theme="paper"
      className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background"
    >
      <Header />

      {/* Hero */}
      <section className="relative paper-grain pt-28 pb-14 md:pt-44 md:pb-32 border-b border-foreground/40">
        <div className="max-w-[1400px] mx-auto px-5 md:px-6">
          {/* Meta — mobile: one compact strip; desktop: full three-column */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={0}
            className="mb-8 md:mb-14 md:grid md:grid-cols-3 md:gap-4 md:items-end"
          >
            {/* Mobile compact strip */}
            <div className="md:hidden flex items-center justify-between text-[0.7rem]">
              <span className="mono-label text-foreground/60">§ Platform Notes</span>
              <span className="mono-label text-foreground/50">Iss. 04 · {todayStamp()}</span>
            </div>
            {/* Desktop columns */}
            <div className="hidden md:block">
              <span className="mono-label text-foreground/60 block">§ Platform Notes</span>
              <span className="mono-label text-foreground/40 mt-1 block">Field 01 · Overview</span>
            </div>
            <div className="hidden md:block text-center">
              <div className="stamp">Layer III · Evidence</div>
            </div>
            <div className="hidden md:block text-right">
              <span className="mono-label text-foreground/60 block">Iss. 04 · {todayStamp()}</span>
              <span className="mono-label text-foreground/40 mt-1 block">Pp. 025–052</span>
            </div>
          </motion.div>

          {/* Headline — sized down on mobile so it fits in one screen */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={1}
            className="display-serif text-[2.25rem] leading-[1.02] sm:text-[3.5rem] sm:leading-[1] md:text-[6.5rem] md:leading-[0.95] lg:text-[8rem] text-foreground"
          >
            <span className="block">The Future of</span>
            <span className="block italic display-serif-italic">Workplace Readiness</span>
            <span className="block">
              Is <span className="ink-vermilion">Behavioral</span>.
            </span>
          </motion.h1>

          {/* Lede — one paragraph on mobile, two-column on desktop */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={2}
            className="mt-8 md:mt-16 md:grid md:grid-cols-2 md:gap-10"
          >
            <p className="display-serif text-lg leading-[1.5] sm:text-xl md:text-[1.75rem] md:leading-[1.35] text-foreground border-l-2 border-foreground pl-4 md:pl-6">
              A comprehensive platform connecting people, mentors, and employers through
              documented behavioral evidence.
            </p>
            {/* Second paragraph — desktop only; mobile keeps the hero tight */}
            <p className="hidden md:block text-foreground/80 text-base md:text-lg leading-[1.75] md:pt-2">
              Everything you need to prepare for workplace moments, receive mentor-led
              observation, and build behavioral evidence over time.
            </p>
          </motion.div>

          {/* CTAs — full-width primary on mobile, inline on desktop */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={3}
            className="mt-8 pt-5 md:mt-12 md:pt-6 border-t border-foreground flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start"
          >
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base font-medium justify-center sm:justify-start"
            >
              <Link to="/get-started">
                Enter the record
                <span className="ml-3">→</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-foreground hover:bg-foreground/5 rounded-none w-full sm:w-auto px-4 py-5 sm:py-6 text-base font-medium underline underline-offset-8 decoration-1 justify-center sm:justify-start"
            >
              <Link to="/about">Read the manifesto</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="paper-grain py-24 md:py-32 border-b border-foreground/40">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={0}
            className="grid md:grid-cols-12 gap-6 items-end mb-16"
          >
            <div className="md:col-span-8">
              <div className="mono-label text-foreground/60 mb-4">§ I · Platform Features</div>
              <h2 className="display-serif text-5xl md:text-[5rem] text-foreground leading-[0.95]">
                What the <span className="italic display-serif-italic">platform</span> holds.
              </h2>
            </div>
            <div className="md:col-span-4">
              <p className="text-foreground/80 text-base leading-relaxed border-l-2 border-foreground pl-5">
                Not modules. Not badges. The apparatus that keeps observation, evidence, and
                release cleanly separated.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 border-t-2 border-foreground border-b border-foreground/40">
            {features.map((f, i) => (
              <motion.div
                key={f.n}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={rise}
                custom={i}
                className={
                  "p-8 md:p-12 group hover:bg-foreground/[0.025] transition-colors " +
                  (i % 2 === 1 ? "md:border-l border-foreground/25" : "") +
                  (i >= 2 ? " border-t border-foreground/25" : "")
                }
              >
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="ledger-num text-4xl text-foreground">{f.n}</span>
                  <span className="mono-label text-foreground/40">Fig.</span>
                </div>
                <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground mb-4">
                  {f.title}
                </h3>
                <p className="text-foreground/80 leading-[1.75] text-[0.9375rem]">
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="paper-grain py-24 md:py-32 border-b border-foreground/40">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={0}
            className="grid md:grid-cols-12 gap-6 items-end mb-16"
          >
            <div className="md:col-span-8">
              <div className="mono-label text-foreground/60 mb-4">§ II · How It Works</div>
              <h2 className="display-serif text-5xl md:text-[5rem] text-foreground leading-[0.95]">
                Your journey to <span className="ink-vermilion">building</span>
                <br />
                <span className="italic display-serif-italic">documented behavioral evidence</span> over time.
              </h2>
            </div>
            <div className="md:col-span-4">
              <p className="text-foreground/80 text-base leading-relaxed border-l-2 border-foreground pl-5">
                Four entries into the register. Evidence develops through observation — it is
                not awarded.
              </p>
            </div>
          </motion.div>

          {/* Ledger rows */}
          <div className="border-t-2 border-foreground">
            {howItWorks.map((item, i) => (
              <motion.article
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={rise}
                custom={i}
                className="row-hover grid grid-cols-12 gap-4 md:gap-8 py-10 md:py-14 px-2 md:px-4 border-b border-foreground/25 transition-colors"
              >
                <div className="col-span-2 md:col-span-1">
                  <div className="ledger-num text-5xl md:text-7xl text-foreground leading-none">
                    {item.step}
                  </div>
                </div>
                <div className="col-span-10 md:col-span-4">
                  <div className="mono-label text-foreground/50 mb-2">Step</div>
                  <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground">
                    {item.title}
                  </h3>
                </div>
                <div className="col-span-12 md:col-span-7 md:pl-4 md:border-l md:border-foreground/25">
                  <p className="text-foreground/85 text-base md:text-[1.0625rem] leading-[1.75]">
                    {item.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Built for candidate/employer */}
      <section className="paper-grain py-24 md:py-32 border-b border-foreground/40">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={0}
            className="grid md:grid-cols-12 gap-6 items-end mb-16"
          >
            <div className="md:col-span-8">
              <div className="mono-label text-foreground/60 mb-4">§ III · Propositions</div>
              <h2 className="display-serif text-5xl md:text-[5rem] text-foreground leading-[0.95]">
                Two reading rooms. One <span className="italic display-serif-italic">register</span>.
              </h2>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 border-t-2 border-foreground border-b border-foreground/40">
            {/* Job Seekers */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={0}
              className="p-8 md:p-12"
            >
              <div className="mono-label text-foreground/50 mb-3">For Job Seekers</div>
              <h3 className="display-serif text-3xl md:text-[2.5rem] leading-tight text-foreground mb-6">
                Go beyond the résumé with{" "}
                <span className="italic display-serif-italic">documented evidence</span> of how
                your conduct shows up in workplace situations.
              </h3>
              <ul className="mt-8 space-y-3">
                {jobSeekerPoints.map((p, j) => (
                  <li key={p} className="flex items-baseline gap-4 py-2 border-b border-foreground/15">
                    <span className="mono-num text-foreground/40 text-xs pt-0.5">
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground text-[0.9375rem] leading-snug flex-1">
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="ghost"
                className="mt-8 justify-start rounded-none px-0 py-6 text-foreground hover:bg-transparent hover:text-foreground text-base font-medium tracking-wide group/btn"
              >
                <Link to="/get-started">
                  <span className="border-b border-foreground pb-1 group-hover/btn:border-b-2 transition-all">
                    Enter the record
                  </span>
                  <span className="ml-3 transition-transform group-hover/btn:translate-x-1">→</span>
                </Link>
              </Button>
            </motion.div>

            {/* Employers */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={1}
              className="p-8 md:p-12 md:border-l border-t md:border-t-0 border-foreground/25"
            >
              <div className="mono-label text-foreground/50 mb-3">For Employers</div>
              <h3 className="display-serif text-3xl md:text-[2.5rem] leading-tight text-foreground mb-6">
                Add <span className="italic display-serif-italic">documented behavioral evidence</span> to
                your hiring decisions — showing how conduct appeared across workplace
                situations.
              </h3>
              <ul className="mt-8 space-y-3">
                {employerPoints.map((p, j) => (
                  <li key={p} className="flex items-baseline gap-4 py-2 border-b border-foreground/15">
                    <span className="mono-num text-foreground/40 text-xs pt-0.5">
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground text-[0.9375rem] leading-snug flex-1">
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 mono-label text-foreground border-t border-foreground/25 pt-6">
                No scores. No rankings. No recommendations.
              </p>
              <Button
                asChild
                variant="ghost"
                className="mt-6 justify-start rounded-none px-0 py-6 text-foreground hover:bg-transparent hover:text-foreground text-base font-medium tracking-wide group/btn"
              >
                <Link to="/employers">
                  <span className="border-b border-foreground pb-1 group-hover/btn:border-b-2 transition-all">
                    Read the employer sheet
                  </span>
                  <span className="ml-3 transition-transform group-hover/btn:translate-x-1">→</span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="paper-grain relative py-28 md:py-36 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-8 md:-left-24 ledger-num text-foreground/[0.06] select-none"
          style={{ fontSize: "clamp(20rem, 45vw, 44rem)", lineHeight: 0.75 }}
        >
          III
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            custom={0}
            className="max-w-5xl"
          >
            <div className="mono-label text-foreground/60 mb-6">§ IV · Closing</div>
            <h2 className="display-serif text-5xl md:text-7xl lg:text-[6.5rem] leading-[0.95] text-foreground">
              Start building{" "}
              <span className="italic display-serif-italic">documented behavioral evidence</span>{" "}
              of how your conduct shows up{" "}
              <span className="ink-vermilion">across workplace situations.</span>
            </h2>
            <div className="mt-14 pt-6 border-t border-foreground flex flex-col sm:flex-row gap-4 items-start">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-7 text-base font-medium tracking-wide"
              >
                <Link to="/get-started">
                  Create your account
                  <span className="ml-3">→</span>
                </Link>
              </Button>
              <p className="mono-label text-foreground/50 sm:ml-6 sm:mt-3">
                No credit card required · Mentor-matched within 48 hours
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Platform;
