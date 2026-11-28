import { useState } from "react";
import { ADVERTS, altText, caption, type Advert } from "@/content/adverts";
import { AdvertPoster, type PosterFormat } from "@/components/adverts/AdvertPoster";
import { AdvertCard } from "@/components/adverts/AdvertCard";

/**
 * Staging for the four approved advertisements. For the administrator only: the posters exactly as they are exported, the caption and the alt text to paste,
 * the links, and how the advertisement would look on a page of the platform. Nothing here is published; Dr. Mofoke releases each advertisement.
 */
const SIZE: Record<PosterFormat, [number, number]> = { portrait: [1080, 1350], landscape: [1200, 630] };

function Preview({ advert, format, width }: { advert: Advert; format: PosterFormat; width: number }) {
  const [w, h] = SIZE[format], k = width / w;
  return (
    <div style={{ width, height: h * k }} className="relative shrink-0 overflow-hidden border border-foreground/25" data-testid={`preview-${advert.id}-${format}`}>
      <div style={{ transform: `scale(${k})`, transformOrigin: "top left", width: w, height: h, position: "absolute", left: 0, top: 0 }}>
        <AdvertPoster advert={advert} format={format} />
      </div>
    </div>
  );
}

function CopyBox({ label, text, testId }: { label: string; text: string; testId: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono-label text-foreground/70">{label}</span>
        <button type="button" className="mono-label border border-foreground/40 px-3 py-1 hover:bg-foreground/10" onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1500); }); }}>{done ? "Copied" : "Copy"}</button>
      </div>
      <textarea readOnly value={text} rows={Math.min(14, text.split("\n").length + 1)} data-testid={testId} className="w-full resize-y border border-foreground/25 bg-background/60 p-3 font-mono text-sm leading-relaxed text-foreground/90" />
    </div>
  );
}

export default function AdvertsStaging() {
  return (
    <div className="space-y-12" data-testid="adverts-staging">
      <header className="space-y-3">
        <div className="mono-label text-foreground/60">§ Advertisements · approved copy of 27 November 2026</div>
        <h1 className="display-serif text-4xl md:text-5xl">Four advertisements, <span className="italic ink-vermilion">staged</span>.</h1>
        <p className="max-w-3xl text-foreground/80">Built from Dr. Mofoke's approved copy, word for word. Nothing here is published. Each advertisement shows only once he releases it.</p>
      </header>
      {ADVERTS.map((a) => (
        <section key={a.id} className="space-y-6 border-t-2 border-foreground pt-6" data-testid={`staged-${a.id}`} aria-label={a.name}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-serif text-2xl md:text-3xl">{a.name}</h2>
            <span className="stamp" data-testid={`status-${a.id}`}>{a.released ? "Released" : "Staged · not published"}</span>
          </div>
          <div className="flex flex-wrap items-start gap-8">
            <Preview advert={a} format="portrait" width={340} />
            <Preview advert={a} format="landscape" width={520} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <CopyBox label="Post caption (full text, ending with the fine print)" text={caption(a)} testId={`caption-${a.id}`} />
            <CopyBox label="Alt text for every image of this advertisement" text={altText(a)} testId={`alt-${a.id}`} />
          </div>
          <div className="space-y-2">
            <div className="mono-label text-foreground/70">Call to action link</div>
            <code className="block break-all border border-foreground/25 bg-background/60 p-3 text-sm" data-testid={`href-${a.id}`}>{a.cta.href}</code>
          </div>
          <div className="space-y-2">
            <div className="mono-label text-foreground/70">As it would appear on a page of the platform</div>
            <div className="max-w-3xl"><AdvertCard advert={a} /></div>
          </div>
        </section>
      ))}
    </div>
  );
}
