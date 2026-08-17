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

const benefits = [
  {
    n: "01",
    title: "A record, not a rating",
    body: "You review a Behavioral Evidence Report the candidate has released to you — not a score, not a rank, not a recommendation. Just what was observed.",
  },
  {
    n: "02",
    title: "Conduct across situations",
    body: "Examine how the candidate's behaviour showed up across multiple workplace-pressure situations, over time. A single moment is a moment. A pattern is evidence.",
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
    body: "The evidence is an additional input to your hiring judgment — not a substitute for it. The decision stays inside your organization.",
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
        meta="Filed for hiring desks"
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
            Add documented behavioral evidence to your hiring decisions — showing how
            conduct appeared across workplace situations.
          </>
        }
        ledeSide={
          <>
            <p className="mb-4">
              The Behavioral Evidence Report is an additional source of evidence — not a
              hiring verdict, prediction, or pre-vetting mechanism. Candidate-controlled
              release. Independent verification. Bounded evidence. Employer decision
              ownership.
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

      {/* Anatomy of the report */}
      <LedgerSection first>
        <LedgerHeader
          eyebrow="§ I · Anatomy of the report"
          side="What a hiring desk actually receives when a candidate releases their BER."
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
