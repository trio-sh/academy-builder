import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   LEDGER PRIMITIVES
   Small building blocks that keep every page in the same paper-
   themed editorial voice without re-implementing the layout.
   ───────────────────────────────────────────────────────────── */

export const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: 0.05 + i * 0.06, ease: [0.19, 1, 0.22, 1] },
  }),
};

/* Full-width section with paper grain and hairline border */
export function LedgerSection({
  children,
  className,
  first,
}: {
  children: ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <section
      className={cn(
        "paper-grain relative py-24 md:py-32",
        !first && "border-t border-foreground/40",
        className
      )}
    >
      <div className="max-w-[1400px] mx-auto px-6">{children}</div>
    </section>
  );
}

/* Section masthead: § eyebrow + big serif headline + optional right column */
export function LedgerHeader({
  eyebrow,
  children,
  side,
  align = "end",
}: {
  eyebrow: string;
  children: ReactNode;
  side?: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={rise}
      custom={0}
      className={cn("grid md:grid-cols-12 gap-6 md:gap-10 mb-16 md:mb-20", align === "end" ? "items-end" : "items-start")}
    >
      <div className={cn(side ? "md:col-span-8" : "md:col-span-12")}>
        <div className="mono-label text-foreground/60 mb-4">{eyebrow}</div>
        <h2 className="display-serif text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] text-foreground leading-[0.98]">
          {children}
        </h2>
      </div>
      {side && (
        <div className="md:col-span-4">
          <div className="border-l-2 border-foreground pl-5 text-foreground/80 text-base md:text-lg leading-relaxed">
            {side}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* Editorial pull quote */
export function LedgerPullQuote({
  children,
  meta,
}: {
  children: ReactNode;
  meta?: string;
}) {
  return (
    <div className="max-w-4xl mx-auto text-center">
      {meta && <div className="mono-label text-foreground/50 mb-6">{meta}</div>}
      <blockquote className="display-serif text-2xl md:text-4xl leading-[1.2] text-foreground">
        {children}
      </blockquote>
    </div>
  );
}

/* Ledger row — the "01 | Title | body | aside" pattern */
export function LedgerRow({
  n,
  meta,
  title,
  children,
  aside,
  highlight,
  index = 0,
  isLast,
}: {
  n: string;
  meta?: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  highlight?: boolean;
  index?: number;
  isLast?: boolean;
}) {
  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={rise}
      custom={index}
      className={cn(
        "row-hover grid grid-cols-12 gap-4 md:gap-8 py-10 md:py-12 px-2 md:px-4 transition-colors group",
        !isLast && "border-b border-foreground/25",
        highlight && "bg-foreground/[0.025]"
      )}
    >
      <div className="col-span-2 md:col-span-1">
        <div className="ledger-num text-5xl md:text-7xl text-foreground leading-none">{n}</div>
      </div>
      <div className="col-span-10 md:col-span-4">
        {meta && <div className="mono-label text-foreground/50 mb-2">{meta}</div>}
        <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className={cn("col-span-12 md:col-span-5 md:pl-4 md:border-l md:border-foreground/25", !aside && "md:col-span-7")}>
        <p className="text-foreground/85 text-base md:text-[1.0625rem] leading-[1.75]">{children}</p>
      </div>
      {aside && (
        <div className="col-span-12 md:col-span-2">
          <p className="marginalia">↳ {aside}</p>
        </div>
      )}
    </motion.article>
  );
}

/* Roman numeral column card (for stakeholder-style three-columns) */
export function LedgerColumn({
  n,
  role,
  title,
  lede,
  entries,
  cta,
  index = 0,
  isFirst,
}: {
  n: string;
  role: string;
  title: string;
  lede: string;
  entries?: string[];
  cta?: ReactNode;
  index?: number;
  isFirst?: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={rise}
      custom={index}
      className={cn(
        "flex flex-col p-8 md:p-10 group hover:bg-foreground/[0.025] transition-colors",
        !isFirst && "border-t md:border-t-0 md:border-l border-foreground/25"
      )}
    >
      <div className="flex items-baseline justify-between mb-8 pb-6 border-b border-foreground/20">
        <div className="ledger-num text-6xl md:text-7xl text-foreground leading-none">{n}</div>
        <div className="mono-label text-foreground/50">{role}</div>
      </div>
      <h3 className="display-serif text-3xl md:text-[2.25rem] leading-tight mb-5 text-foreground">
        {title}
      </h3>
      <p className="text-foreground/80 leading-relaxed mb-8 text-[0.9375rem]">{lede}</p>
      {entries && (
        <ul className="mb-10 flex-1 space-y-3">
          {entries.map((entry, j) => (
            <li key={entry} className="flex items-baseline gap-4 py-2 border-b border-foreground/10">
              <span className="mono-num text-foreground/40 text-xs pt-0.5">
                {String(j + 1).padStart(2, "0")}
              </span>
              <span className="text-foreground text-[0.9375rem] leading-snug flex-1">{entry}</span>
            </li>
          ))}
        </ul>
      )}
      {cta}
    </motion.div>
  );
}

/* Underlined link in the ledger voice */
export function LedgerLinkCTA({ children }: { children: ReactNode }) {
  return (
    <span className="group/link inline-flex items-baseline gap-3 text-base font-medium tracking-wide">
      <span className="border-b border-foreground pb-1 group-hover/link:border-b-2 transition-all">
        {children}
      </span>
      <span className="transition-transform group-hover/link:translate-x-1">→</span>
    </span>
  );
}

/* Corner registration marks — printed-press sheet feel */
export function RegistrationMarks({ className }: { className?: string }) {
  const mark = (
    <svg className="w-4 h-4 text-foreground/40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <line x1="0" y1="8" x2="16" y2="8" />
      <line x1="8" y1="0" x2="8" y2="16" />
    </svg>
  );
  return (
    <>
      <div className={cn("absolute top-24 left-4 hidden md:block", className)}>{mark}</div>
      <div className={cn("absolute top-24 right-4 hidden md:block", className)}>{mark}</div>
    </>
  );
}

/* Page hero — masthead metadata + giant serif title */
export function LedgerHero({
  eyebrow,
  meta,
  stamp,
  title,
  lede,
  ledeSide,
  children,
}: {
  eyebrow: string;
  meta?: string;
  stamp?: string;
  title: ReactNode;
  lede?: ReactNode;
  ledeSide?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative paper-grain pt-40 pb-24 md:pt-44 md:pb-32 border-b border-foreground/40 overflow-hidden">
      <RegistrationMarks />
      <div className="relative max-w-[1400px] mx-auto px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={0}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 md:mb-16 items-end"
        >
          <div className="col-span-2 md:col-span-1">
            <span className="mono-label text-foreground/60 block">{eyebrow}</span>
            {meta && <span className="mono-label text-foreground/40 mt-1 block">{meta}</span>}
          </div>
          <div className="hidden md:block text-center">
            {stamp && <div className="stamp">{stamp}</div>}
          </div>
          <div className="text-right">
            <span className="mono-label text-foreground/60 block">MMXXVI — Q3</span>
            <span className="mono-label text-foreground/40 mt-1 block">Iss. 04 · Register</span>
          </div>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={rise}
          custom={1}
          className="display-serif text-[3rem] sm:text-[4.5rem] md:text-[6.5rem] lg:text-[8rem] text-foreground leading-[0.95]"
        >
          {title}
        </motion.h1>

        {(lede || ledeSide) && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={2}
            className="mt-14 grid md:grid-cols-2 gap-10"
          >
            {lede && (
              <div className="display-serif text-2xl md:text-[1.75rem] leading-[1.35] text-foreground border-l-2 border-foreground pl-6">
                {lede}
              </div>
            )}
            {ledeSide && (
              <div className="text-foreground/80 text-base md:text-lg leading-[1.75] md:pt-2">
                {ledeSide}
              </div>
            )}
          </motion.div>
        )}

        {children && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rise}
            custom={3}
            className="mt-12 pt-6 border-t border-foreground"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
