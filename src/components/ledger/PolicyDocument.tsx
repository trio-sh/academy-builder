import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LedgerHero, LedgerSection, rise } from "@/components/ledger";

interface PolicySection {
  title: string;
  content: string;
}

interface PolicyDocumentProps {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  lastUpdated: string;
  sections: PolicySection[];
  contact?: string;
}

/**
 * Simple markdown-ish renderer for our policy content:
 * splits paragraphs on blank lines, treats **bold**, and lets a leading
 * `- ` create bulleted list items. No third-party MD needed for these docs.
 */
function renderContent(content: string) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((p, i) => {
    const lines = p.split("\n");
    // Bullet block
    if (lines.every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i} className="my-4 space-y-2 pl-0">
          {lines.map((l, j) => (
            <li key={j} className="flex items-baseline gap-3 border-b border-foreground/10 pb-2">
              <span className="ink-vermilion mt-0.5">§</span>
              <span className="text-foreground/85 leading-[1.75]" dangerouslySetInnerHTML={renderInline(l.replace(/^- /, ""))} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        className="my-4 text-foreground/85 leading-[1.9] text-[1.0625rem]"
        dangerouslySetInnerHTML={renderInline(p)}
      />
    );
  });
}

function renderInline(text: string) {
  // Bold **text** → <strong>
  let html = text.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-foreground font-semibold">$1</strong>'
  );
  // Simple [label](href) → link
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-foreground underline underline-offset-4 hover:text-vermilion">$1</a>'
  );
  return { __html: html };
}

export function PolicyDocument({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  contact,
}: PolicyDocumentProps) {
  return (
    <PublicLayout>
      <LedgerHero
        eyebrow={eyebrow}
        meta={`Last revised · ${lastUpdated}`}
        title={title}
        lede={<>{intro}</>}
      />

      <LedgerSection first className="py-20 md:py-24">
        <div className="grid md:grid-cols-12 gap-10 md:gap-16">
          {/* Table of contents (sticky) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="md:sticky md:top-32">
              <div className="mono-label text-foreground/60 mb-4 pb-3 border-b border-foreground/25">
                Contents
              </div>
              <ol className="space-y-2 text-sm">
                {sections.map((s, i) => {
                  const id = s.title.replace(/^\d+\.\s+/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  return (
                    <li key={i} className="flex items-baseline gap-3">
                      <span className="mono-num text-foreground/40 text-xs">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <a
                        href={`#${id}`}
                        className="text-foreground/80 hover:text-foreground hover:italic transition-all"
                      >
                        {s.title.replace(/^\d+\.\s+/, "")}
                      </a>
                    </li>
                  );
                })}
                {contact && (
                  <li className="flex items-baseline gap-3 pt-3 mt-3 border-t border-foreground/15">
                    <span className="mono-label text-foreground/50">Editor</span>
                    <a
                      href={`mailto:${contact}`}
                      className="text-foreground underline underline-offset-4 normal-case"
                    >
                      {contact}
                    </a>
                  </li>
                )}
              </ol>
            </div>
          </aside>

          {/* Sections */}
          <div className="md:col-span-8 lg:col-span-9">
            <div className="border-t-2 border-foreground">
              {sections.map((s, i) => {
                const id = s.title.replace(/^\d+\.\s+/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <motion.section
                    key={s.title}
                    id={id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.05 }}
                    variants={rise}
                    custom={0}
                    className="py-10 md:py-14 border-b border-foreground/25 scroll-mt-32"
                  >
                    <div className="flex items-baseline gap-4 mb-6">
                      <span className="ledger-num text-4xl md:text-6xl text-foreground/80 leading-none">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1">
                        <div className="mono-label text-foreground/50 mb-1">Article</div>
                        <h2 className="display-serif text-2xl md:text-4xl text-foreground leading-tight">
                          {s.title.replace(/^\d+\.\s+/, "")}
                        </h2>
                      </div>
                    </div>
                    <div className="max-w-3xl">{renderContent(s.content)}</div>
                  </motion.section>
                );
              })}
            </div>
          </div>
        </div>
      </LedgerSection>
    </PublicLayout>
  );
}
