import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  LedgerHero,
  LedgerSection,
  LedgerHeader,
  LedgerLinkCTA,
  rise,
} from "@/components/ledger";

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

/**
 * On-the-record subjects — the questions the founder will speak to on
 * the record. Per Post-Launch Edits 02, Note 3. Do not add subjects
 * that describe internal mechanism (rehearsal design, observation
 * architecture, agreement procedures, evidence-sufficiency logic).
 */
const onTheRecord = [
  "The difference between a credential, a person's own account of themselves, and observed conduct.",
  "What qualifications, interviews, references and work samples each show, and what remains less directly evidenced once they have done their respective jobs.",
  "Why training and behavioral evidence answer different questions, and why transfer from knowledge to conduct in context cannot simply be assumed.",
  "How conventional hiring signals become harder to interpret when a person is early in their career, changing markets, or bringing experience from another country.",
  "What behavioral evidence observed over time can and cannot support, including where its limits should be respected.",
  "Why a participant should review behavioral evidence about them, and control whether it is released to an employer.",
  "Published employer research on communication and professionalism, including the limits of that research.",
  "The founder's own transition into the Canadian labor market, and the questions it raised. Where broader labor-market claims are made, they rest on published evidence.",
];

const mediaKit: { item: string; note: string }[] = [
  { item: "Logo", note: "Approved marks in SVG and PNG." },
  { item: "Brand colors", note: "Hexadecimal values only." },
  { item: "Company description", note: "One short version and one extended version, both approved." },
  { item: "Founder biography", note: "Seventy-five to one hundred words, plus one approved photograph." },
  { item: "Fact sheet", note: "Dated, with source links for every figure on the page." },
  { item: "Glossary", note: "Public-facing terms only, restricted to language already approved for external use." },
  { item: "Version date", note: "Displayed on the page and inside the file, so you can tell whether the copy is current." },
];

const coverageHolding = ["Coverage 01", "Coverage 02", "Coverage 03"];

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
        lede="The 3rd Academy in the press — the editorial desk, materials for editors, and coverage as it appears."
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
          holds figure + label + supporting sentence. Source line beneath
          the strip, inside the same bordered rail so the top and bottom
          rules span the full width and align. Per Post-Launch Edits 02,
          Note 1. */}
      <LedgerSection first className="py-14 md:py-16">
        <div className="border-t border-b border-foreground">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 pt-8 pb-8">
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
        </div>
        <p className="mt-4 text-foreground/55 text-xs leading-relaxed max-w-4xl">
          Sources: National Association of Colleges and Employers,{" "}
          <em>Job Outlook 2026 Spring Update</em> (United States employers,
          recent graduates); World Economic Forum, <em>Future of Jobs
          Report 2025</em> (global employer survey).
        </p>
      </LedgerSection>

      {/* § I · Editorial desk — supersedes the removed announcements band.
          Contact, media kit, on-the-record subjects, scope statement, then
          the single announcements line. Per Post-Launch Edits 02, Note 3. */}
      <LedgerSection>
        <LedgerHeader
          eyebrow="§ I · Editorial desk"
          side="What the press page is here to do — contact, materials, and the subjects the founder will speak to on the record."
        >
          The <span className="italic display-serif-italic">editorial</span> desk.
        </LedgerHeader>

        <div className="border-t-2 border-foreground pt-10 grid md:grid-cols-2 gap-10 md:gap-14">
          {/* Block one — press contact */}
          <div>
            <div className="mono-label text-foreground/60 mb-4">§ Contact</div>
            <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground mb-4">
              Press and media inquiries.
            </h3>
            <p className="text-foreground/85 leading-relaxed mb-2">
              Dr. Tony Mofoke, Founder and Chief Executive Officer.
            </p>
            <p className="mb-6">
              <a
                href="mailto:press@the3rdacademy.com"
                className="text-foreground border-b border-foreground/60 hover:border-foreground pb-0.5 transition-all"
              >
                press@the3rdacademy.com
              </a>
            </p>
            <p className="text-foreground/80 leading-relaxed text-[0.9375rem]">
              Press inquiries are reviewed promptly. For time-sensitive
              requests, please include your publication, subject and deadline
              in your message.
            </p>
          </div>

          {/* Block two — media kit */}
          <div>
            <div className="mono-label text-foreground/60 mb-4">§ Media kit</div>
            <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground mb-6">
              A single dated package.
            </h3>
            <ul className="border-t border-foreground/25">
              {mediaKit.map((k) => (
                <li
                  key={k.item}
                  className="grid grid-cols-12 gap-4 py-3 border-b border-foreground/15"
                >
                  <span className="col-span-4 mono-label text-foreground/70">
                    {k.item}
                  </span>
                  <span className="col-span-8 text-foreground/80 text-[0.9375rem] leading-snug">
                    {k.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Block three — on the record */}
        <div className="mt-16">
          <div className="mono-label text-foreground/60 mb-4">§ On the record</div>
          <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground mb-8">
            Subjects the founder will speak to.
          </h3>
          <ol className="border-t-2 border-foreground">
            {onTheRecord.map((subject, i) => (
              <motion.li
                key={subject}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={rise}
                custom={i}
                className="grid grid-cols-12 gap-4 md:gap-6 py-6 border-b border-foreground/20"
              >
                <span className="col-span-2 md:col-span-1 mono-num text-foreground/50 text-xs pt-0.5 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="col-span-10 md:col-span-11 text-foreground text-[0.9375rem] md:text-[1rem] leading-[1.65]">
                  {subject}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Block four — scope statement.
            AC-61 exception: the four "denial" words (score, ranking,
            recommendation, predictor) are prohibited as product claims but
            are the safest sentence on the page when used as denials here.
            Whitelisted as the full sentence, not the individual words. */}
        <div className="mt-14 border-t border-foreground/40 pt-8">
          <div className="mono-label text-foreground/60 mb-4">§ Scope statement</div>
          <p
            className="text-foreground/85 leading-[1.75] max-w-4xl"
            data-vocab-exception="post-launch-02-note-3-scope-statement"
          >
            The 3rd Academy does not represent the Behavioral Evidence Report
            as a score, a ranking, a hiring recommendation, a personality
            profile, or a predictor of future job performance. It is a dated,
            context-bound record of observed conduct, open to challenge by
            the participant, and released only with the participant's
            consent. Employers remain responsible for their own employment
            decisions.
          </p>
        </div>

        {/* Announcements line — single line in place of the removed
            announcement rows. No numbered placeholder rows, no dates,
            no "coming soon" labels here. Per Post-Launch Edits 02, Note 3. */}
        <div className="mt-14 border-t border-foreground/40 pt-8">
          <p className="marginalia">
            Verified announcements and institutional developments will
            appear here as they occur.
          </p>
        </div>
      </LedgerSection>

      {/* § II · Coverage — three holding rows. AWAITING (not UPCOMING),
          no quotation marks, no italics, no publication names, no
          outbound links. Rows are inert. Per Post-Launch Edits 02, Note 2. */}
      <LedgerSection>
        <LedgerHeader
          eyebrow="§ II · Coverage"
          side="Independent coverage will be listed here once published, each with a link to the article."
        >
          As <span className="italic display-serif-italic">covered</span>.
        </LedgerHeader>

        <div className="border-t-2 border-foreground">
          {coverageHolding.map((label, i) => (
            <motion.div
              key={label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={rise}
              custom={i}
              className="grid grid-cols-12 gap-6 py-8 px-2 md:px-4 border-b border-foreground/25 items-baseline"
              aria-disabled="true"
            >
              <div className="col-span-12 md:col-span-3">
                <div className="display-serif text-2xl text-foreground/70">
                  {label}
                </div>
                <div className="mono-label text-foreground/50 mt-2">AWAITING</div>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-foreground/70 text-[1rem] leading-snug">
                  Independent coverage will be listed here once published.
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
