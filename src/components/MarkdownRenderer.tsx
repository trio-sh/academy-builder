import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-1.5 text-white">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2.5 mb-1 text-gray-100">{children}</h3>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="text-[13px] leading-relaxed mb-2 last:mb-0">{children}</p>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/40 hover:decoration-indigo-300/60 transition-colors"
          >
            {children}
          </a>
        ),

        // Strong / emphasis
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-300">{children}</em>
        ),

        // Code blocks
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 text-xs font-mono border border-white/[0.06]">
                {children}
              </code>
            );
          }
          const lang = className?.replace("language-", "") || "";
          return (
            <div className="my-2.5 rounded-xl overflow-hidden border border-white/[0.06]">
              {lang && (
                <div className="px-3 py-1 bg-white/[0.04] border-b border-white/[0.06] text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                  {lang}
                </div>
              )}
              <pre className="p-3 bg-black/40 overflow-x-auto">
                <code className={`text-xs font-mono leading-relaxed text-gray-300 ${className || ""}`} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        },

        // Pre (wrapper for code blocks)
        pre: ({ children }) => <>{children}</>,

        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5 text-[13px]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5 text-[13px]">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed pl-1">{children}</li>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-indigo-500/40 pl-3 my-2 text-gray-400 italic text-[13px]">
            {children}
          </blockquote>
        ),

        // Horizontal rules
        hr: () => <hr className="border-white/[0.06] my-3" />,

        // Tables (GFM)
        table: ({ children }) => (
          <div className="overflow-x-auto my-2.5 rounded-lg border border-white/[0.06]">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-white/[0.04] border-b border-white/[0.06]">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-white/[0.04]">{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-1.5 text-left font-semibold text-gray-300 whitespace-nowrap">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 text-gray-400">{children}</td>
        ),

        // Images
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt || ""}
            className="rounded-lg max-w-full my-2 border border-white/[0.06]"
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
