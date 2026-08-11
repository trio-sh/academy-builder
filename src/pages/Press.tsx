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
  { date: "November 20, 2025", title: "Civic Access Lab Launches in 50 School Districts Nationwide", excerpt: "The free behavioural readiness programme brings the register to underserved students." },
  { date: "October 5, 2025", title: "The 3rd Academy Passes 100,000 Behavioural Evidence Reports", excerpt: "Milestone demonstrates growing demand for observation-based hiring evidence." },
  { date: "September 12, 2025", title: "Independent Study: BER Holders Show 40% Higher Retention Rates", excerpt: "External research validates the observation-over-time approach to workplace readiness." },
];

const mediaFeatures = [
  { outlet: "TechCrunch", title: "How The 3rd Academy is Fixing the Broken Credentialing System", date: "January 2026" },
  { outlet: "Forbes", title: "The Future of Hiring: Why Behavioural Observation Matters", date: "December 2025" },
  { outlet: "Harvard Business Review", title: "Rethinking Credentials in the Age of Skills-Based Hiring", date: "November 2025" },
  { outlet: "The Wall Street Journal", title: "Startups Tackle the $400B Credential Gap", date: "October 2025" },
];

const stats = [
  { value: "100K+", label: "Reports issued" },
  { value: "5,000+", label: "Active mentors" },
  { value: "500+", label: "Employer partners" },
  { value: "50", label: "School districts" },
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

      {/* Standing figures */}
      <LedgerSection first className="py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-y border-foreground py-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={rise} custom={i}>
              <div className="ledger-num text-4xl md:text-6xl text-foreground leading-none">{s.value}</div>
              <div className="mono-label text-foreground/60 mt-3">{s.label}</div>
            </motion.div>
          ))}
        </div>
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
