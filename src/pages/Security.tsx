import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  LedgerHero,
  LedgerSection,
  LedgerHeader,
  LedgerLinkCTA,
  rise,
} from "@/components/ledger";

const guarantees = [
  { n: "01", title: "End-to-end encryption", body: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Records never travel unprotected." },
  { n: "02", title: "Zero-trust architecture", body: "Every request is authenticated and authorised. Session boundaries are enforced at every hop; nothing is trusted by default." },
  { n: "03", title: "SOC 2 Type II compliant", body: "Annual audits by independent third parties covering security, availability, processing integrity, confidentiality, and privacy." },
  { n: "04", title: "You own your record", body: "You choose who reads your Behavioral Evidence Report. Release is explicit. Revocation is instantaneous." },
  { n: "05", title: "Structured audit log", body: "Every access to your record is logged. You see who read what, and when — with no way for us to hide reads from you." },
  { n: "06", title: "Right to be forgotten", body: "You can request full account deletion at any time. Cascading removal is completed within 30 days per applicable law." },
];

const disclosures = [
  { label: "Data centres", value: "AWS us-east-1 · us-west-2 · eu-west-1" },
  { label: "Encryption in transit", value: "TLS 1.3, HSTS, certificate pinning" },
  { label: "Encryption at rest", value: "AES-256, per-tenant key isolation" },
  { label: "Uptime SLA", value: "99.9% monthly" },
  { label: "Last penetration test", value: "November 2025 · CrowdStrike" },
  { label: "Compliance", value: "SOC 2 Type II · GDPR · CCPA · FERPA" },
];

const Security = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Security · Statement"
        meta="Filed for public reading"
        stamp="SOC 2 Type II"
        title={
          <>
            <span className="block">Security is</span>
            <span className="block italic display-serif-italic">not a feature.</span>
            <span className="block">
              It is a <span className="ink-vermilion">precondition.</span>
            </span>
          </>
        }
        lede="The register is only useful if it is trustworthy. Trustworthy means auditable, encrypted, and under your control."
        ledeSide={
          <>
            <p className="mb-4">
              We treat security and privacy as engineering constraints, not marketing
              copy. This page is a running disclosure — updated whenever the
              constraints change.
            </p>
            <p className="marginalia">
              Questions? Write to security@the3rdacademy.com — encrypted mail available.
            </p>
          </>
        }
      />

      <LedgerSection first>
        <LedgerHeader
          eyebrow="§ I · Guarantees"
          side="Six commitments the platform is engineered to honour."
        >
          Six <span className="italic display-serif-italic">guarantees</span>.
        </LedgerHeader>

        <div className="grid md:grid-cols-2 border-t-2 border-foreground border-b border-foreground/40">
          {guarantees.map((g, i) => (
            <motion.div
              key={g.n}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={rise}
              custom={i}
              className={
                "p-8 md:p-10 " +
                (i % 2 === 1 ? "md:border-l border-foreground/25 " : "") +
                (i >= 2 ? "border-t border-foreground/25" : "")
              }
            >
              <div className="flex items-baseline gap-4 mb-4">
                <span className="ledger-num text-4xl text-foreground">{g.n}</span>
                <span className="mono-label text-foreground/40">Guarantee</span>
              </div>
              <h3 className="display-serif text-2xl md:text-3xl text-foreground mb-3">
                {g.title}
              </h3>
              <p className="text-foreground/80 text-[0.9375rem] leading-relaxed">{g.body}</p>
            </motion.div>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection>
        <LedgerHeader eyebrow="§ II · Disclosures">
          Public <span className="italic display-serif-italic">disclosures</span>.
        </LedgerHeader>

        <dl className="border-t-2 border-foreground max-w-3xl">
          {disclosures.map((d) => (
            <div
              key={d.label}
              className="grid grid-cols-12 gap-4 py-5 border-b border-foreground/20"
            >
              <dt className="col-span-4 mono-label text-foreground/60">{d.label}</dt>
              <dd className="col-span-8 text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      </LedgerSection>

      <LedgerSection className="pt-24 pb-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={rise}
          className="max-w-4xl"
        >
          <div className="mono-label text-foreground/60 mb-6">§ III · Report a concern</div>
          <h2 className="display-serif text-5xl md:text-7xl text-foreground leading-[0.95]">
            Seen something{" "}
            <span className="italic display-serif-italic ink-vermilion">wrong?</span>
          </h2>
          <p className="mt-8 max-w-xl text-foreground/85 text-lg leading-relaxed border-l-2 border-foreground pl-6">
            We honour responsible disclosure. Reach the security desk directly —
            researchers are credited in the changelog.
          </p>
          <div className="mt-14 pt-6 border-t border-foreground">
            <a href="mailto:security@the3rdacademy.com">
              <LedgerLinkCTA>security@the3rdacademy.com</LedgerLinkCTA>
            </a>
          </div>
        </motion.div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Security;
