import "@/components/adverts/advert.css";
import { splitEmphasis, type Advert } from "@/content/adverts";

export type PosterFormat = "portrait" | "landscape";

/** The advertisement as an image: 1080 x 1350 for feed posts, 1200 x 630 for link posts. The words come from the advert's lines and nothing else. */
export function AdvertPoster({ advert, format }: { advert: Advert; format: PosterFormat }) {
  return (
    <div className="advert-poster" data-testid={`poster-${advert.id}-${format}`} data-advert={advert.id} data-format={format} data-audience={advert.audience}>
      <div className="advert-bg" aria-hidden="true" />
      <div className="advert-veil" aria-hidden="true" />
      <div className="advert-grid" aria-hidden="true" />
      <div className="advert-inner">
        <div className="advert-eyebrow">{advert.eyebrow}</div>
        <div className="advert-main">
          {advert.lines.map((l) => {
            const [a, em, b] = splitEmphasis(l);
            return <p key={l.text} className="advert-line" data-role={l.role}>{a}{em && <span className="advert-em">{em}</span>}{b}</p>;
          })}
          <div className="advert-cta">
            <span className="advert-cta-main">{advert.cta.lines[0]}</span>
            <span className="advert-cta-sub">{advert.cta.lines[1]}</span>
          </div>
        </div>
        <p className="advert-fine">{advert.finePrint}</p>
      </div>
    </div>
  );
}
