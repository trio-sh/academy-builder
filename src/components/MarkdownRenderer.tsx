import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Copy, Check, Download } from "lucide-react";

const LANG_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  jsx: "jsx",
  python: "py",
  py: "py",
  rust: "rs",
  rs: "rs",
  go: "go",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  ruby: "rb",
  rb: "rb",
  php: "php",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  zsh: "sh",
  html: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
  json: "json",
  yaml: "yml",
  yml: "yml",
  toml: "toml",
  markdown: "md",
  md: "md",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  cs: "cs",
};

function extForLang(lang: string): string {
  return LANG_EXTENSIONS[lang.toLowerCase()] || "txt";
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlockAccordion({
  lang,
  className,
  children,
}: {
  lang: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const source =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.join("")
        : String(children ?? "");

  const copyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const downloadCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ext = extForLang(lang);
      const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snippet.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 250);
    } catch {
      /* ignore */
    }
  };

  const lineCount = source.split("\n").filter((l) => l.length > 0).length;

  return (
    <div className="my-3 border border-foreground/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border-b border-foreground/15 text-[10px] text-foreground/60 font-mono uppercase tracking-widest bg-foreground/[0.03] hover:bg-foreground/[0.06]"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          <span>{lang || "code"}</span>
          <span className="normal-case tracking-normal text-foreground/40">· {lineCount} line{lineCount === 1 ? "" : "s"}</span>
        </span>
        <span className="inline-flex items-center gap-1 normal-case tracking-normal">
          <span
            onClick={copyCode}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-foreground/10 text-foreground/60 hover:text-foreground"
            role="button"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </span>
          <span
            onClick={downloadCode}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-foreground/10 text-foreground/60 hover:text-foreground"
            role="button"
            aria-label="Download code"
          >
            <Download className="w-3 h-3" />
            Download
          </span>
        </span>
      </button>
      {open && (
        <pre className="p-3 overflow-x-auto bg-foreground/[0.02] max-h-96 overflow-y-auto">
          <code className={`text-[0.8125rem] font-mono leading-relaxed text-foreground ${className || ""}`}>
            {children}
          </code>
        </pre>
      )}
    </div>
  );
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

          code: ({ className, children }) => {
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
              <CodeBlockAccordion lang={lang} className={className}>
                {children}
              </CodeBlockAccordion>
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
