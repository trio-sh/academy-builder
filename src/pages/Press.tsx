import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  LedgerHero,
  LedgerSection,
  LedgerHeader,
  LedgerLinkCTA,
  rise,
} from "@/components/ledger";

const pressReleases = [
  { date: "January 15, 2026", title: "The 3rd Academy Raises $25M Series B to Scale Mentor-Led Observation", excerpt: "Funding will accelerate expansion of the mentor network and the T3X reading room." },
  { date: "December 8, 2025", title: "Partnership: Major Tech Employers Join The Register", excerpt: "Leading companies commit to reading Behavioral Evidence Reports before making hiring decisions." },
  { date: "November 20, 2025", title: "Civic Access Lab Launches in 50 School Districts Nationwide", excerpt: "The free behavioral readiness programme brings the register to underserved students." },
  { date: "October 5, 2025", title: "The 3rd Academy Passes 100,000 Behavioral Evidence Reports", excerpt: "Milestone demonstrates growing demand for observation-based hiring evidence." },
  { date: "September 12, 2025", title: "Independent Study: BER Holders Show 40% Higher Retention Rates", excerpt: "External research validates the observation-over-time approach to workplace readiness." },
];

const mediaFeatures = [
  { outlet: "TechCrunch", title: "How The 3rd Academy is Fixing the Broken Credentialing System", date: "January 2026" },
  { outlet: "Forbes", title: "The Future of Hiring: Why Behavioral Observation Matters", date: "December 2025" },
  { outlet: "Harvard Business Review", title: "Rethinking Credentials in the Age of Skills-Based Hiring", date: "November 2025" },
  { outlet: "The Wall Street Journal", title: "Startups Tackle the $400B Credential Gap", date: "October 2025" },
];

/**
 * Press page statistics strip.
 *
 * Every figure is externally sourced and verified against the primary
 * document — NACE Job Outlook 2026 for the two point gaps, WEF Future
 * of Jobs Report 2025 for resilience and leadership. Do not restore
 * any traction figure (reports issued, mentors active, districts, etc.)
 * without written confirmation from the founder — per Post-Launch
 * Note 7.
 */
const stats = [
  {
    value: "43-POINT GAP",
    label: "The communication gap",
    body: "98.7% of employers say communication is essential; 55.4% rate recent graduates as very or extremely proficient at it.",
  },
  {
    value: "39-POINT GAP",
    label: "The professionalism gap",
    body: "94.1% rate professionalism as very or extremely important; 54.7% rate recent graduates as very or extremely proficient at it.",
  },
  {
    value: "67%",
    label: "Resilience is core",
    body: "Two-thirds of employers surveyed globally now name resilience, flexibility and agility as a core skill for the future workforce.",
  },
  {
    value: "+22 POINTS",
    label: "Leadership is rising",
    body: "The share of employers identifying leadership and social influence as a core skill has risen by twenty-two percentage points.",
  },
];

const Press = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Press · Room"
        meta="For editors and reporters"
        stamp="Media kit available"
        title={
          <>
            <span className="block">Press &</span>
            <span className="block italic display-serif-italic">Public</span>
            <span className="block ink-vermilion">Records.</span>
          </>
        }
        lede="The 3rd Academy in the press — announcements, features, and materials for editors covering the future of work."
        ledeSide={
          <a
            href="mailto:press@the3rdacademy.com"
            className="inline-block"
          >
            <LedgerLinkCTA>press@the3rdacademy.com</LedgerLinkCTA>
          </a>
        }
      />

      {/* Standing figures — external research, not traction. Each cell
          holds figure + label + supporting sentence. Source line beneath. */}
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
              <div className="ledger-num text-2xl md:text-[1.75rem] lg:text-[2rem] text-foreground leading-[1.05] mb-3 tracking-tight">
                {s.value}
              </div>
              <div className="mono-label text-foreground/70 mb-3">
                {s.label}
              </div>
              <p className="text-foreground/85 text-[0.9375rem] leading-relaxed">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-foreground/55 text-xs leading-relaxed border-t border-foreground/20 pt-4 max-w-4xl">
          Sources: National Association of Colleges and Employers,{" "}
          <em>Job Outlook 2026 Spring Update</em> (United States employers,
          recent graduates); World Economic Forum, <em>Future of Jobs
          Report 2025</em> (global employer survey).
        </p>
      </LedgerSection>

      {/* Announcements */}
      <LedgerSection>
        <LedgerHeader eyebrow="§ I · Announcements" side="Official statements from The 3rd Academy, most recent first.">
          Recent <span className="italic display-serif-italic">announcements</span>.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {pressReleases.map((p, i) => (
            <motion.article
              key={p.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={rise}
              custom={i}
              className="row-hover grid grid-cols-12 gap-6 py-10 px-2 md:px-4 border-b border-foreground/25 transition-colors items-start"
            >
              <div className="col-span-12 md:col-span-2 mono-label text-foreground/50">{p.date}</div>
              <div className="col-span-12 md:col-span-7">
                <h3 className="display-serif text-2xl md:text-3xl text-foreground leading-tight">{p.title}</h3>
                <p className="mt-3 text-foreground/80 text-[0.95rem] leading-relaxed">{p.excerpt}</p>
              </div>
              <div className="col-span-12 md:col-span-3 md:text-right mono-label text-foreground/60">
                Read release →
              </div>
            </motion.article>
          ))}
        </div>
      </LedgerSection>

      {/* Coverage */}
      <LedgerSection>
        <LedgerHeader eyebrow="§ II · Coverage">
          As <span className="italic display-serif-italic">covered</span>.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {mediaFeatures.map((m, i) => (
            <motion.div
              key={m.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={rise}
              custom={i}
              className="grid grid-cols-12 gap-6 py-8 px-2 md:px-4 border-b border-foreground/25 items-baseline"
            >
              <div className="col-span-12 md:col-span-3">
                <div className="display-serif text-2xl text-foreground">{m.outlet}</div>
                <div className="mono-label text-foreground/50 mt-2">{m.date}</div>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-foreground text-[1.05rem] italic display-serif-italic leading-snug">
                  "{m.title}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Press;
