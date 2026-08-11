import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Theme-aware markdown renderer.
 * Uses foreground / background tokens so it reads correctly in both
 * the paper ledger theme and the (legacy) dark theme.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body text-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              className="display-serif text-xl leading-tight mt-4 mb-2 text-foreground"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className="display-serif text-lg leading-tight mt-3 mb-1.5 text-foreground"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className="text-[0.9375rem] font-semibold mt-2.5 mb-1 text-foreground"
            >
              {children}
            </h3>
          ),

          p: ({ children }) => (
            <p className="text-[0.9375rem] leading-[1.65] mb-2.5 last:mb-0 text-foreground">
              {children}
            </p>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-vermilion hover:text-vermilion transition-colors"
            >
              {children}
            </a>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em
              className="italic text-foreground"
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontVariationSettings: '"SOFT" 100',
              }}
            >
              {children}
            </em>
          ),

          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-foreground/[0.06] text-foreground text-[0.8125rem] font-mono border border-foreground/15">
                  {children}
                </code>
              );
            }
            const lang = className?.replace("language-", "") || "";
            return (
              <div className="my-3 border border-foreground/25">
                {lang && (
                  <div className="px-3 py-1 border-b border-foreground/15 text-[10px] text-foreground/60 font-mono uppercase tracking-widest bg-foreground/[0.03]">
                    {lang}
                  </div>
                )}
                <pre className="p-3 overflow-x-auto bg-foreground/[0.02]">
                  <code
                    className={`text-[0.8125rem] font-mono leading-relaxed text-foreground ${className || ""}`}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          pre: ({ children }) => <>{children}</>,

          ul: ({ children }) => (
            <ul className="list-none pl-0 mb-2.5 space-y-1 text-[0.9375rem]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-2.5 space-y-1 text-[0.9375rem]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-[1.6] text-foreground flex items-baseline gap-2 [ol_&]:list-item [ol_&]:block">
              <span className="text-vermilion flex-shrink-0 [ol_&]:hidden">§</span>
              <span className="flex-1">{children}</span>
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 border-vermilion pl-4 my-3 italic text-foreground/85 text-[0.9375rem]"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              {children}
            </blockquote>
          ),

          hr: () => <hr className="border-foreground/25 my-4" />,

          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-foreground/25">
              <table className="w-full text-[0.8125rem]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-foreground/[0.04] border-b border-foreground/25">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-foreground/15">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap uppercase text-[0.65rem] tracking-widest font-mono">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-foreground/85">{children}</td>
          ),

          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full my-3 border border-foreground/25"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
