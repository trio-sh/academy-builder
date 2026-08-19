import { motion } from "framer-motion";
import { rise } from "./index";

export type PageValueCard = {
  n: string; // e.g. "I", "01"
  eyebrow: string; // e.g. "Instrument", "Reader's right"
  title: string;
  body: string;
};

/**
 * PageValueCards — a strip of numbered content cards sitting below the
 * page hero on public pages. Replaces the earlier photo strip so each
 * page anchors below the hero with real informational content instead
 * of stock imagery. Same slot, same responsive rules: hidden on mobile
 * (copy is the subject at 390px), stacked at md+.
 */
export function PageValueCards({ cards }: { cards: PageValueCard[] }) {
  return (
    <section className="paper-grain border-b border-foreground/40 py-10 md:py-14">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-0 border-t-2 border-foreground border-b border-foreground/40">
          {cards.map((c, i) => (
            <motion.article
              key={c.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "p-6 md:p-8 " +
                (i > 0 ? "md:border-l border-foreground/25 " : "")
              }
            >
              <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-foreground/20">
                <span className="ledger-num text-4xl text-foreground leading-none">{c.n}</span>
                <span className="mono-label text-foreground/50">{c.eyebrow}</span>
              </div>
              <h3 className="display-serif text-2xl leading-tight text-foreground mb-3">
                {c.title}
              </h3>
              <p className="text-foreground/80 text-[0.9375rem] leading-relaxed">
                {c.body}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
