import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.19, 1, 0.22, 1] },
  }),
};

type Reader = {
  n: string;
  title: string;
  role: string;
  lede: string;
  entries: string[];
  cta: string;
  href: string;
};

const readers: Reader[] = [
  {
    n: "I",
    title: "For Job Seekers",
    role: "The candidate",
    lede: "Go beyond your résumé. Build an evidence-based behavioral profile through real observation, mentorship, and project experience.",
    entries: [
      "Résumé enhancement without bias",
      "Assigned mentor guidance",
      "Behavioral Evidence Report",
      "Direct employer access via T3X",
    ],
    cta: "Start your journey",
    href: "/get-started",
  },
  {
    n: "II",
    title: "For Employers",
    role: "The hiring desk",
    lede: "Access pre-validated candidates with proven behavioral readiness. Real results, not just keywords. Hiring supported by post-placement insights.",
    entries: [
      "Mentor-vetted candidates",
      "Behavioral evidence, not just résumés",
      "TalentVisa access",
      "Follow-through insights after hiring",
    ],
    cta: "Explore T3X Exchange",
    href: "/employers",
  },
  {
    n: "III",
    title: "For Schools",
    role: "The institution",
    lede: "Engage students early with career awareness. Build behavioral documentation that supports transition into the workforce.",
    entries: [
      "Civic Access Lab platform",
      "Teacher observation tools",
      "Cohort analytics",
      "Graduation transition path",
    ],
    cta: "Learn about Civic Access",
    href: "/schools",
  },
];

export function StakeholdersSection() {
  return (
    <section className="paper-grain relative py-24 md:py-32 border-t border-foreground/50">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={rise}
          custom={0}
          className="grid md:grid-cols-12 gap-6 items-end mb-16 md:mb-24"
        >
          <div className="md:col-span-8">
            <div className="mono-label text-foreground/60 mb-4">
              § IV · Who is served
            </div>
            <h2 className="display-serif text-5xl md:text-7xl lg:text-[5.5rem] text-foreground leading-[0.95]">
              Three <span className="italic display-serif-italic">reading rooms</span>.
              <br />
              One <span className="ink-vermilion">register</span>.
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed border-l-2 border-foreground pl-5">
              Whether you are seeking your next opportunity, hiring talent, or preparing
              students for the workforce — the record has been kept with you in mind.
            </p>
          </div>
        </motion.div>

        {/* Three columns */}
        <div className="grid md:grid-cols-3 border-t-2 border-foreground border-b border-foreground/40">
          {readers.map((r, i) => (
            <motion.div
              key={r.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "flex flex-col p-8 md:p-10 group hover:bg-foreground/[0.025] transition-colors " +
                (i > 0 ? "border-t md:border-t-0 md:border-l border-foreground/25" : "")
              }
            >
              {/* Roman numeral + role */}
              <div className="flex items-baseline justify-between mb-8 pb-6 border-b border-foreground/20">
                <div className="ledger-num text-6xl md:text-7xl text-foreground leading-none">
                  {r.n}
                </div>
                <div className="mono-label text-foreground/50">{r.role}</div>
              </div>

              {/* Title */}
              <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight mb-5 text-foreground">
                {r.title}
              </h3>

              {/* Lede */}
              <p className="text-foreground/80 leading-relaxed mb-8 text-[0.9375rem]">
                {r.lede}
              </p>

              {/* Entries — numbered list */}
              <ul className="mb-10 flex-1 space-y-3">
                {r.entries.map((entry, j) => (
                  <li key={entry} className="flex items-baseline gap-4 py-2 border-b border-foreground/10">
                    <span className="mono-num text-foreground/40 text-xs pt-0.5">
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground text-[0.9375rem] leading-snug flex-1">
                      {entry}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                asChild
                variant="ghost"
                className="justify-start rounded-none px-0 py-6 text-foreground hover:bg-transparent hover:text-foreground text-base font-medium tracking-wide group/btn"
              >
                <Link to={r.href}>
                  <span className="border-b border-foreground pb-1 group-hover/btn:border-b-2 transition-all">
                    {r.cta}
                  </span>
                  <span className="ml-3 transition-transform group-hover/btn:translate-x-1">→</span>
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
