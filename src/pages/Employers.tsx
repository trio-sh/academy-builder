import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  LedgerSection,
  LedgerHeader,
  LedgerHero,
  LedgerRow,
  LedgerLinkCTA,
  rise,
} from "@/components/ledger";
import { PageValueCards } from "@/components/ledger/PageFigures";

const benefits = [
  {
    n: "01",
    title: "A record, not a rating",
    body: "You review a Behavioral Evidence Report the individual has released to you — not a score, not a rank, not a recommendation. Just what was observed.",
  },
  {
    n: "02",
    title: "Conduct across workplace-pressure moments",
    body: "Examine how conduct showed up across multiple moments and over time. A single moment shows a moment. A pattern needs more than one.",
  },
  {
    n: "03",
    title: "Bounded, honest evidence",
    body: "The report says what the evidence supports — and where it stops. When limits go unstated, absence of evidence looks like evidence.",
  },
  {
    n: "04",
    title: "Independent verification",
    body: "Verify the report without an account. Every entry is auditable. Every line is legible.",
  },
  {
    n: "05",
    title: "You keep the decision",
    body: "The evidence can inform appropriate hiring, onboarding, development, and internal mobility conversations — it does not make the decision. The decision stays with your organization.",
  },
];

const tiers = [
  {
    name: "Reader",
    price: "Free",
    tagline: "For teams beginning to read the register",
    features: [
      "Review Behavioral Evidence Reports candidates release to you",
      "Verify a report without creating an account",
      "Standard directory filters",
      "Email support",
    ],
    cta: "Begin reading",
    href: "/get-started",
  },
  {
    name: "Subscriber",
    price: "$799",
    period: "/month",
    tagline: "For teams hiring regularly",
    features: [
      "Unlimited candidate browsing",
      "TalentVisa access — see who has a current record",
      "Advanced filters and behavioral cross-references",
      "Follow-through insights after hiring",
      "Dedicated account editor",
      "API access to the register",
    ],
    cta: "Take out a subscription",
    href: "/contact",
    highlight: true,
  },
  {
    name: "Institution",
    price: "Bespoke",
    tagline: "For enterprises with volume hiring",
    features: [
      "Everything in Subscriber",
      "SSO, audit logs, and custom governance",
      "Named editorial liaison",
      "Custom data feeds and integrations",
    ],
    cta: "Speak with editorial",
    href: "/contact",
  },
];

const Employers = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ For Employers · Sheet"
        meta="Filed for employer review"
        stamp="No Rankings · No Scores"
        title={
          <>
            <span className="block">Add</span>
            <span className="block italic display-serif-italic">documented</span>
            <span className="block">
              <span className="ink-vermilion">behavioral</span> evidence.
            </span>
          </>
        }
        lede={
          <>
            Understand how conduct appeared across workplace-pressure moments — and how
            that evidence informs hiring, onboarding, development, and internal mobility.
          </>
        }
        ledeSide={
          <>
            <p className="mb-4">
              The Behavioral Evidence Report is an additional source of evidence — not a
              verdict, prediction, appraisal, or monitoring mechanism. Release remains
              controlled by the individual. Independent verification. Bounded evidence.
              Employment decisions remain with the employer.
            </p>
            <p className="mono-label text-foreground border-l-2 border-vermilion pl-4">
              No scores. No rankings. No recommendations.
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
              Read the register
              <span className="ml-3">→</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-6 text-base font-medium underline underline-offset-8 decoration-1"
          >
            <Link to="/contact">Schedule a briefing</Link>
          </Button>
        </div>
      </LedgerHero>

      <PageValueCards
        cards={[
          {
            n: "I",
            eyebrow: "Restraint",
            title: "A record, not a rating",
            body: "You review what was observed — not a score, rank, or recommendation. The evidence supports your decision; it never replaces it.",
          },
          {
            n: "II",
            eyebrow: "Candor",
            title: "Bounded, honest evidence",
            body: "The report says what the evidence supports — and where it stops. Absence of evidence is stated, not smoothed over.",
          },
          {
            n: "III",
            eyebrow: "Authenticity",
            title: "Independent verification",
            body: "Verify any Behavioral Evidence Report without creating an account. Every entry is auditable, every line legible.",
          },
        ]}
      />

      {/* Anatomy of the report */}
      <LedgerSection first>
        <LedgerHeader
          eyebrow="§ I · Anatomy of the report"
          side="What an employer receives when an individual chooses to release their Behavioral Evidence Report."
        >
          Five <span className="italic display-serif-italic">rights</span> the reader
          holds.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {benefits.map((b, i) => (
            <LedgerRow
              key={b.n}
              n={b.n}
              meta="Right"
              title={b.title}
              index={i}
              isLast={i === benefits.length - 1}
            >
              {b.body}
            </LedgerRow>
          ))}
        </div>
      </LedgerSection>

      {/* Pricing */}
      <LedgerSection>
        <LedgerHeader
          eyebrow="§ II · Terms of subscription"
          side="Access to the reading room. Priced by the depth of the read."
        >
          Three <span className="italic display-serif-italic">tiers</span> of
          readership.
        </LedgerHeader>

        <div className="grid md:grid-cols-3 border-t-2 border-foreground border-b border-foreground/40">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "flex flex-col p-8 md:p-10 relative " +
                (i > 0 ? "border-t md:border-t-0 md:border-l border-foreground/25 " : "") +
                (tier.highlight ? "bg-foreground/[0.035]" : "")
              }
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-8 stamp normal-case">
                  Most read
                </div>
              )}
              {/* Small paper glyph — the crest for this tier */}
              <div className="mb-5 w-12 h-12 border border-foreground/40 bg-background/60 flex items-center justify-center">
                {i === 0 && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                    <path d="M4 5h16v14H4z" />
                    <path d="M4 9h16" />
                    <path d="M8 5v14" />
                  </svg>
                )}
                {i === 1 && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                    <path d="M12 2l9 4v6c0 5-3.8 9-9 10-5.2-1-9-5-9-10V6l9-4z" />
                    <path d="M8 12l3 3 5-6" />
                  </svg>
                )}
                {i === 2 && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                    <path d="M3 20h18" />
                    <path d="M4 20V9l8-5 8 5v11" />
                    <path d="M9 20v-6h6v6" />
                    <path d="M4 12h16" />
                  </svg>
                )}
              </div>
              <div className="mono-label text-foreground/50 mb-2">Tier {String(i + 1).padStart(2, "0")}</div>
              <h3 className="display-serif text-3xl md:text-4xl text-foreground mb-2">
                {tier.name}
              </h3>
              <p className="marginalia mb-6">{tier.tagline}</p>
              <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-foreground/20">
                <span className="ledger-num text-5xl text-foreground">{tier.price}</span>
                {tier.period && (
                  <span className="mono-label text-foreground/60">{tier.period}</span>
                )}
              </div>
              <ul className="mb-10 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-baseline gap-3 py-1.5">
                    <span className="ink-vermilion mt-0.5">§</span>
                    <span className="text-foreground text-[0.9375rem] leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "rounded-none shadow-none py-6 text-base font-medium " +
                  (tier.highlight
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background")
                }
              >
                <Link to={tier.href}>
                  {tier.cta}
                  <span className="ml-3">→</span>
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </LedgerSection>

      {/* Closing */}
      <LedgerSection className="pt-28 pb-32 md:pt-36 md:pb-36 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-8 md:-right-24 ledger-num text-foreground/[0.06] select-none"
          style={{ fontSize: "clamp(20rem, 45vw, 44rem)", lineHeight: 0.75 }}
        >
          II
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={rise}
          className="relative max-w-4xl"
        >
          <div className="mono-label text-foreground/60 mb-6">§ III · Begin</div>
          <h2 className="display-serif text-5xl md:text-7xl lg:text-[6.5rem] text-foreground leading-[0.95]">
            Read the <span className="ink-vermilion">record.</span>{" "}
            Keep the <span className="italic display-serif-italic">decision.</span>
          </h2>
          <div className="mt-14 pt-6 border-t border-foreground">
            <Link to="/contact">
              <LedgerLinkCTA>Schedule a briefing with editorial</LedgerLinkCTA>
            </Link>
          </div>
        </motion.div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Employers;
