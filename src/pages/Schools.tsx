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

const features = [
  {
    n: "01",
    title: "Career discovery",
    body: "Interactive tools that help students explore interests and discover meaningful career pathways early — before it is too late to build habits around them.",
  },
  {
    n: "02",
    title: "Teacher observation desk",
    body: "A streamlined observation tool for documenting student behaviours and developmental notes. Structured, but not standardised.",
  },
  {
    n: "03",
    title: "Cohort analytics",
    body: "Comprehensive views of student growth and readiness development over time — at the level of the class, not the individual grade.",
  },
  {
    n: "04",
    title: "Transition-ready evidence",
    body: "Students graduate with a portfolio of behavioural evidence that carries forward into the post-graduation register.",
  },
];

const benefits = [
  { n: "I", label: "Free for schools", body: "No cost to enroll your institution — funded through the platform's employer subscriptions." },
  { n: "II", label: "Curriculum-integrated", body: "Slots into existing career readiness classes without requiring a new syllabus." },
  { n: "III", label: "Longitudinal profile", body: "Every entry a student earns in school follows them into working life." },
  { n: "IV", label: "Named institutional page", body: "Your school gets a public entry in the register — visible to your alumni and their employers." },
];

const Schools = () => {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ For Schools · Sheet"
        meta="Institutional programme"
        stamp="Free for Schools"
        title={
          <>
            <span className="block">Prepare</span>
            <span className="block italic display-serif-italic">before</span>
            <span className="block">
              the <span className="ink-vermilion">work</span> begins.
            </span>
          </>
        }
        lede={
          <>
            Engage students early with career awareness. Build behavioural documentation
            that supports transition into the workforce.
          </>
        }
        ledeSide={
          <>
            <p className="mb-4">
              The Civic Access Lab lets schools begin the record before the first job —
              observing conduct in classroom-work moments, then carrying that log forward
              into the professional register at graduation.
            </p>
            <p className="marginalia">
              For teachers, counsellors, and college-readiness programmes.
            </p>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-6 text-base font-medium"
          >
            <Link to="/contact">
              Register your institution
              <span className="ml-3">→</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-6 text-base font-medium underline underline-offset-8 decoration-1"
          >
            <Link to="/platform">Read the platform notes</Link>
          </Button>
        </div>
      </LedgerHero>

      <LedgerSection first>
        <LedgerHeader
          eyebrow="§ I · What the Civic Access Lab holds"
          side="Four instruments for the classroom-work bridge."
        >
          Four <span className="italic display-serif-italic">tools</span> for the{" "}
          <span className="ink-vermilion">classroom</span>.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {features.map((f, i) => (
            <LedgerRow
              key={f.n}
              n={f.n}
              meta="Instrument"
              title={f.title}
              index={i}
              isLast={i === features.length - 1}
            >
              {f.body}
            </LedgerRow>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection>
        <LedgerHeader eyebrow="§ II · Terms of participation">
          Four <span className="italic display-serif-italic">benefits</span> to the
          institution.
        </LedgerHeader>

        <div className="grid md:grid-cols-4 border-t-2 border-foreground border-b border-foreground/40">
          {benefits.map((b, i) => (
            <motion.div
              key={b.n}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "p-8 " +
                (i > 0 ? "border-t md:border-t-0 md:border-l border-foreground/25 " : "")
              }
            >
              <div className="ledger-num text-5xl text-foreground leading-none mb-4">
                {b.n}
              </div>
              <div className="mono-label text-foreground/60 mb-3">{b.label}</div>
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
          <div className="mono-label text-foreground/60 mb-6">§ III · Begin the programme</div>
          <h2 className="display-serif text-5xl md:text-7xl text-foreground leading-[0.95]">
            Start the record{" "}
            <span className="italic display-serif-italic">before</span> the{" "}
            <span className="ink-vermilion">résumé.</span>
          </h2>
          <div className="mt-14 pt-6 border-t border-foreground">
            <Link to="/contact">
              <LedgerLinkCTA>Enrol your school</LedgerLinkCTA>
            </Link>
          </div>
        </motion.div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Schools;
