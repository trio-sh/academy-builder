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

const openPositions = [
  { title: "Senior Full-Stack Engineer", dept: "Engineering", location: "Remote (US)", type: "Full-time", body: "Build and scale the register. React, Node.js, and quiet infrastructure." },
  { title: "Product Designer", dept: "Design", location: "Remote (Global)", type: "Full-time", body: "Shape the ergonomics of the record — for candidates, mentors, and employers." },
  { title: "Mentor Success Manager", dept: "Operations", location: "New York, NY", type: "Full-time", body: "Recruit, train, and support the network of industry mentors who keep the register." },
  { title: "Content & Curriculum Developer", dept: "Education", location: "Remote (US)", type: "Full-time", body: "Author the BridgeFast preparation modules and assessment frameworks." },
  { title: "Enterprise Sales Representative", dept: "Sales", location: "San Francisco, CA", type: "Full-time", body: "Introduce the register to hiring desks. Long conversations, honest ones." },
  { title: "Data Scientist — Behavioral Analytics", dept: "Engineering", location: "Remote (US)", type: "Full-time", body: "Instruments for reading the register at scale. No prediction dressed as evidence." },
];

const benefits = [
  { label: "Health & Wellness", body: "Full medical, dental, and vision for you and your family." },
  { label: "Growth Budget", body: "$2,000 annual for books, courses, conferences, retreats." },
  { label: "Remote-First", body: "Work from anywhere. Flexible hours. We trust you to deliver." },
  { label: "The Register", body: "Free platform access — earn your own Behavioral Evidence Report." },
];

const Careers = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Careers · Notices"
        meta="Positions currently open"
        stamp="We are hiring"
        title={
          <>
            <span className="block">Keep the</span>
            <span className="block italic display-serif-italic">register</span>
            <span className="block">
              with <span className="ink-vermilion">us.</span>
            </span>
          </>
        }
        lede="Help us build the thing that measures what résumés never could — carefully, with a level of craft that matches the ambition."
        ledeSide={
          <>
            <p className="mb-4">
              We hire people who care about the difference between a record and a
              rating, and are willing to defend it in code, copy, and policy.
            </p>
            <p className="marginalia">
              Applications are read by a human. Every one.
            </p>
          </>
        }
      />

      <LedgerSection first>
        <LedgerHeader
          eyebrow="§ I · Open positions"
          side={`${openPositions.length} roles currently listed for public reading`}
        >
          Open <span className="italic display-serif-italic">positions</span>.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {openPositions.map((p, i) => (
            <motion.a
              key={p.title}
              href="mailto:careers@the3rdacademy.com"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={rise}
              custom={i}
              className={
                "row-hover grid grid-cols-12 gap-4 md:gap-8 py-8 md:py-10 px-2 md:px-4 border-b border-foreground/25 transition-colors group items-baseline"
              }
            >
              <div className="col-span-2 md:col-span-1 ledger-num text-3xl text-foreground/60">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-span-10 md:col-span-5">
                <h3 className="display-serif text-2xl md:text-3xl text-foreground group-hover:italic transition-all">
                  {p.title}
                </h3>
                <div className="mono-label text-foreground/50 mt-2">{p.dept} · {p.location}</div>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-foreground/80 leading-[1.7] text-[0.95rem]">{p.body}</p>
              </div>
              <div className="col-span-12 md:col-span-1 md:text-right">
                <span className="mono-label text-foreground group-hover:ink-vermilion transition-colors">
                  Apply →
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection>
        <LedgerHeader eyebrow="§ II · Benefits">
          What we <span className="italic display-serif-italic">provide</span>.
        </LedgerHeader>

        <div className="grid md:grid-cols-4 border-t-2 border-foreground border-b border-foreground/40">
          {benefits.map((b, i) => (
            <motion.div
              key={b.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={rise}
              custom={i}
              className={
                "p-8 " +
                (i > 0 ? "border-t md:border-t-0 md:border-l border-foreground/25" : "")
              }
            >
              <div className="mono-label text-foreground/60 mb-3">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="display-serif text-2xl text-foreground mb-3">{b.label}</h3>
              <p className="text-foreground/80 text-[0.9375rem] leading-relaxed">{b.body}</p>
            </motion.div>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection className="pt-24 pb-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={rise}
          className="max-w-4xl"
        >
          <div className="mono-label text-foreground/60 mb-6">§ III · Write to us</div>
          <h2 className="display-serif text-5xl md:text-7xl text-foreground leading-[0.95]">
            Don't see your role?{" "}
            <span className="italic display-serif-italic ink-vermilion">Write anyway.</span>
          </h2>
          <p className="mt-8 max-w-xl text-foreground/85 text-lg leading-relaxed border-l-2 border-foreground pl-6">
            We hire ahead of listings when the person is right. Tell us what you would
            build here.
          </p>
          <div className="mt-14 pt-6 border-t border-foreground">
            <a href="mailto:careers@the3rdacademy.com">
              <LedgerLinkCTA>careers@the3rdacademy.com</LedgerLinkCTA>
            </a>
          </div>
        </motion.div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Careers;
