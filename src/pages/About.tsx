import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";
import {
  LedgerSection,
  LedgerHeader,
  LedgerHero,
  LedgerRow,
  LedgerColumn,
  LedgerLinkCTA,
  rise,
} from "@/components/ledger";

const principles = [
  {
    n: "01",
    title: "Human judgment above all",
    body: "Every entry in the record is written by a mentor. Instruments assist; humans decide. No automated verdicts, no shortcuts around observation.",
    aside: "Instruments do not judge people.",
  },
  {
    n: "02",
    title: "Evidence must be earned",
    body: "Behavioral Evidence Reports emerge from sustained observation and documented conduct. No self-assessments. No manufacturing.",
    aside: "The record only carries what happened.",
  },
  {
    n: "03",
    title: "Dignity in every outcome",
    body: "Difficult findings are delivered with respect. They do not become permanent labels. Re-entry remains possible.",
  },
  {
    n: "04",
    title: "Continuous system learning",
    body: "Every outcome strengthens the framework. The system evolves without judging individuals — data informs, never punishes.",
  },
];

/**
 * About page statistics strip.
 *
 * Every cell carries three lines: a figure, a fact line, and an
 * implication line. Nothing in this strip may be replaced with a
 * traction figure (users on platform, reports issued, etc.) without
 * written confirmation from the founder — per Post-Launch Note 3.
 */
const stats = [
  {
    value: "46%",
    fact: "of new hires fail within eighteen months",
    implication: "The employer carries the cost of a decision made on incomplete information.",
  },
  {
    value: "89%",
    fact: "of those failures are behavioral, not technical",
    implication: "The person could do the work. What was missing was a record of how conduct showed up at work.",
  },
  {
    value: "FIRST 90 DAYS",
    fact: "the window most people get to establish themselves",
    implication: "Long enough to form a pattern. Too short to correct one you cannot see.",
  },
  {
    value: "NO COMMON RECORD",
    fact: "of workplace behavior follows the worker from one employer to the next",
    implication: "Every employer starts again. So does every worker.",
  },
];

const About = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ About · Manifesto"
        meta="Filed for public reading"
        stamp={todayStamp()}
        title={
          <>
            <span className="block">Not a certifier.</span>
            <span className="block italic display-serif-italic">A registrar of</span>
            <span className="block">
              observed <span className="ink-vermilion">conduct.</span>
            </span>
          </>
        }
        lede={
          <>
            Education shows what you studied. Professional credentials show what you are
            qualified to do. We keep a dated record of how your conduct shows up across
            workplace-pressure moments — and you decide who you release it to.
          </>
        }
        ledeSide={
          <>
            <p className="mb-4">
              The 3rd Academy Inc. was founded to close the gap between what a résumé can
              claim and what an employer can trust — not by grading harder, but by
              refusing to convert observation into a rating.
            </p>
            <p className="marginalia">
              We do not certify readiness. We register conduct — and let those who read
              the record draw their own conclusions.
            </p>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-6 text-base font-medium"
          >
            <Link to="/get-started">
              Enter the record
              <span className="ml-3">→</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-6 text-base font-medium underline underline-offset-8 decoration-1"
          >
            <Link to="/contact">Write to the editor</Link>
          </Button>
        </div>
      </LedgerHero>

      {/* Ledger of standing figures — problem framing, not traction.
          Every cell: figure · fact · implication. Source line beneath. */}
      <LedgerSection first className="py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 border-t border-foreground pt-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.value}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={rise}
              custom={i}
              className={
                "flex flex-col " +
                (i > 0 ? "md:border-l md:border-foreground/25 md:pl-8 " : "")
              }
            >
              <div className="ledger-num text-3xl md:text-4xl lg:text-5xl text-foreground leading-[1.05] mb-4">
                {s.value}
              </div>
              <div className="mono-label text-foreground/70 mb-3">
                {s.fact}
              </div>
              <p className="text-foreground/85 text-[0.9375rem] leading-relaxed italic">
                {s.implication}
              </p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-foreground/55 text-xs leading-relaxed border-t border-foreground/20 pt-4 max-w-4xl">
          Sources: Leadership IQ, <em>Why New Hires Fail</em>. "First 90 days"
          reflects common probation practice rather than a measured statistic.
          "No common record" describes an institutional absence, not a measured
          percentage.
        </p>
      </LedgerSection>

      {/* Mission */}
      <LedgerSection>
        <LedgerHeader
          eyebrow="§ I · Our mission"
          side={
            <>
              Traditional credentials tell employers what you studied. Certifications
              show what tests you passed. Neither shows <em>how you actually conduct
              yourself in the work</em>.
            </>
          }
        >
          Making <span className="italic display-serif-italic">behavioral
          readiness</span> <span className="ink-vermilion">documentable.</span>
        </LedgerHeader>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={0}
          className="max-w-4xl display-serif text-2xl md:text-3xl leading-[1.35] text-foreground space-y-8 border-t border-foreground pt-10"
        >
          <p className="editorial-justify">
            The 3rd Academy closes the gap between claim and trust with a mentor-led
            observation system that documents conduct across workplace-pressure moments
            over time — not through scores, not through self-assessment.
          </p>
          <p className="editorial-justify">
            The result:{" "}
            <span className="italic display-serif-italic ink-vermilion">
              a record you can read line by line
            </span>{" "}
            — yours to review and yours to share. Employers gain an additional category
            of evidence to examine. Schools have a way to support the transition they
            prepared their students for.
          </p>
        </motion.div>
      </LedgerSection>

      {/* Principles */}
      <LedgerSection>
        <LedgerHeader
          eyebrow="§ II · Architecture as philosophy"
          side="Every technical decision reflects a human value. Our architecture is our ethics."
        >
          Four <span className="italic display-serif-italic">principles</span> of the
          record.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {principles.map((p, i) => (
            <LedgerRow
              key={p.n}
              n={p.n}
              meta="Principle"
              title={p.title}
              aside={p.aside}
              index={i}
              isLast={i === principles.length - 1}
            >
              {p.body}
            </LedgerRow>
          ))}
        </div>
      </LedgerSection>

      {/* Who We Serve */}
      <LedgerSection>
        <LedgerHeader eyebrow="§ III · Who is served">
          Three <span className="italic display-serif-italic">reading rooms</span>. One{" "}
          <span className="ink-vermilion">register</span>.
        </LedgerHeader>

        <div className="grid md:grid-cols-3 border-t-2 border-foreground border-b border-foreground/40">
          <LedgerColumn
            n="I"
            role="The candidate"
            title="For Candidates"
            lede="Build an evidence-based behavioral profile through mentor observation and real project experience."
            index={0}
            isFirst
            cta={
              <Link to="/get-started" className="mt-2">
                <LedgerLinkCTA>Start your journey</LedgerLinkCTA>
              </Link>
            }
          />
          <LedgerColumn
            n="II"
            role="The hiring desk"
            title="For Employers"
            lede="Access candidates with documented behavioral evidence to inform your judgment of workplace readiness. Follow-through insights after hiring."
            index={1}
            cta={
              <Link to="/employers" className="mt-2">
                <LedgerLinkCTA>Read the employer sheet</LedgerLinkCTA>
              </Link>
            }
          />
          <LedgerColumn
            n="III"
            role="The institution"
            title="For Schools"
            lede="Engage students early. Build longitudinal behavioral documentation that supports transition into work."
            index={2}
            cta={
              <Link to="/schools" className="mt-2">
                <LedgerLinkCTA>Learn about Civic Access Lab</LedgerLinkCTA>
              </Link>
            }
          />
        </div>
      </LedgerSection>

      {/* Closing */}
      <LedgerSection className="pt-28 pb-32 md:pt-40 md:pb-40 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-8 md:-right-24 ledger-num text-foreground/[0.06] select-none"
          style={{ fontSize: "clamp(20rem, 45vw, 44rem)", lineHeight: 0.75 }}
        >
          §
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={rise}
          className="relative max-w-5xl"
        >
          <div className="mono-label text-foreground/60 mb-6">§ IV · Ready to enter</div>
          <h2 className="display-serif text-5xl md:text-7xl lg:text-[6.5rem] text-foreground leading-[0.95]">
            Ready to join the{" "}
            <span className="italic display-serif-italic">movement</span>?
          </h2>
          <p className="mt-10 max-w-xl text-foreground/85 text-lg md:text-xl leading-relaxed border-l-2 border-foreground pl-6">
            Whether you are building your own record, using evidence to hire, onboard,
            develop, or support internal mobility, or preparing students for the
            workforce — there is a place for you in the register.
          </p>
          <div className="mt-14 pt-6 border-t border-foreground flex flex-col sm:flex-row gap-4 items-start">
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-7 text-base font-medium"
            >
              <Link to="/get-started">
                Enter the record
                <span className="ml-3">→</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-7 text-base font-medium underline underline-offset-8 decoration-1"
            >
              <Link to="/contact">Contact the editor</Link>
            </Button>
          </div>
        </motion.div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default About;
