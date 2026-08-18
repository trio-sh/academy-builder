import { motion } from "framer-motion";
import { rise } from "./index";

export type PageFigure = {
  src: string;
  alt: string;
  caption: string; // e.g. "Fig. I · at the candidate desk"
  aspect?: string; // Tailwind aspect class (default aspect-[4/3])
};

/**
 * PageFigureRow — a strip of framed figures with mono captions, in the
 * same paper-editorial voice as the landing sections. Sits below the
 * page hero to give each public page at least one anchored image plus
 * a companion, so the pages don't read as flat text walls.
 *
 * Hidden on mobile — copy is the subject at 390px; images return at md+.
 */
export function PageFigureRow({ figures }: { figures: PageFigure[] }) {
  return (
    <section className="paper-grain border-b border-foreground/40 py-10 md:py-14">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="hidden md:grid grid-cols-12 gap-6 md:gap-8">
          {figures.map((f, i) => (
            <motion.figure
              key={f.src + i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rise}
              custom={i}
              className={
                "col-span-12 md:col-span-6 border border-foreground/25 bg-background/40 " +
                (i === 1 ? "md:mt-6" : "")
              }
            >
              <div className={"w-full overflow-hidden " + (f.aspect ?? "aspect-[4/3]")}>
                <img
                  src={f.src}
                  alt={f.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="mono-label text-foreground/60 px-3 py-2 border-t border-foreground/25 flex items-baseline justify-between">
                <span>{f.caption}</span>
                <span className="text-foreground/40">§ {String(i + 1).padStart(2, "0")}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
