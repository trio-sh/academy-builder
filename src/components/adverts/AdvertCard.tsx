import { splitEmphasis, releasedAdverts, ADVERTS, type Advert } from "@/content/adverts";

/**
 * The advertisement as it appears on a page of the platform. Its call to action is a button that opens a pre-filled email (Table 4.1); the button carries the
 * advertisement's own call-to-action lines and nothing added. (When the landing pages are built the buttons point to those pages, with the email link kept as the second option, his 4.2.)
 */
export function AdvertCard({ advert }: { advert: Advert }) {
  return (
    <article className="relative overflow-hidden border-2 border-vermilion bg-background/80 p-6 md:p-8" data-testid={`advert-${advert.id}`} aria-label={advert.eyebrow}>
      <div className="mono-label text-foreground/70 tracking-[0.2em]">{advert.eyebrow}</div>
      <div className="mt-6 space-y-4">
        {advert.lines.map((l) => {
          const [a, em, b] = splitEmphasis(l);
          const cls = l.role === "lead" ? "display-serif text-3xl md:text-5xl leading-[1.05]" : l.role === "sub" ? "display-serif text-xl md:text-3xl leading-tight text-foreground/90" : l.role === "body" ? "text-base md:text-lg leading-relaxed text-foreground/85" : "display-serif text-lg md:text-2xl leading-snug border-l-2 border-vermilion pl-4";
          return <p key={l.text} className={cls}>{a}{em && <span className="italic ink-vermilion">{em}</span>}{b}</p>;
        })}
      </div>
      <a href={advert.cta.href} className="mt-8 inline-flex flex-col gap-1 border-2 border-vermilion bg-vermilion/15 px-5 py-3 text-foreground no-underline hover:bg-vermilion/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" data-testid={`advert-${advert.id}-cta`}>
        <span className="font-semibold">{advert.cta.lines[0]}</span>
        <span className="mono-label text-foreground/70">{advert.cta.lines[1]}</span>
      </a>
      <p className="mt-6 border-t border-foreground/25 pt-3 text-sm text-foreground/70">{advert.finePrint}</p>
    </article>
  );
}

/** Where an advertisement is placed on a public page: it shows only once Dr. Mofoke has released it. Nothing is released today, so nothing shows. */
export function AdvertSlot({ id, adverts = ADVERTS }: { id: Advert["id"]; adverts?: Advert[] }) {
  const a = releasedAdverts(adverts).find((x) => x.id === id);
  return a ? <AdvertCard advert={a} /> : null;
}
