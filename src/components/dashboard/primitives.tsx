import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Dashboard primitives in the ledger voice.
 * These are for use inside DashboardLayout; they use paper-theme tokens.
 */

// ─── Page header ──────────────────────────────────────────────────
export function DashboardPageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className="mb-10 pb-6 border-b border-foreground"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="mono-label text-foreground/60 mb-3">{eyebrow}</div>
          <h1 className="display-serif text-4xl md:text-5xl lg:text-6xl leading-[0.98] text-foreground">
            {title}
          </h1>
          {meta && <div className="mt-4 marginalia">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </motion.div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────
export function LedgerCard({
  children,
  className,
  interactive,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
} & React.HTMLAttributes<HTMLElement>) {
  const Component = Tag as React.ElementType;
  return (
    <Component
      className={cn(
        "relative bg-background border border-foreground/30 p-6",
        interactive && "hover:border-foreground hover:shadow-[3px_3px_0_rgba(29,24,21,0.10)] transition-all cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

// ─── Stat block ───────────────────────────────────────────────────
export function LedgerStat({
  label,
  value,
  meta,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  meta?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  className?: string;
}) {
  return (
    <div className={cn("border-t border-foreground/60 pt-4", className)}>
      <div className="mono-label text-foreground/60 mb-2">{label}</div>
      <div className="ledger-num text-4xl md:text-5xl text-foreground leading-none">
        {value}
      </div>
      {(meta || trend) && (
        <div className="flex items-center gap-3 mt-3">
          {trend && (
            <span
              className={cn(
                "mono-label",
                trend.direction === "up" && "ink-vermilion",
                trend.direction === "down" && "text-foreground/60",
                trend.direction === "flat" && "text-foreground/50"
              )}
            >
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.text}
            </span>
          )}
          {meta && <span className="marginalia text-[0.8125rem]">{meta}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────
export function DashSection({
  eyebrow,
  title,
  children,
  actions,
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-12", className)}>
      {(title || eyebrow) && (
        <div className="flex items-end justify-between gap-4 mb-6 pb-3 border-b border-foreground/40">
          <div>
            {eyebrow && <div className="mono-label text-foreground/60 mb-2">{eyebrow}</div>}
            {title && (
              <h2 className="display-serif text-2xl md:text-3xl leading-tight text-foreground">
                {title}
              </h2>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ─── Table row ────────────────────────────────────────────────────
export function LedgerTableHeader({ columns }: { columns: string[] }) {
  return (
    <div
      className="grid gap-4 border-t-2 border-foreground pt-3 pb-3 border-b border-foreground/25 mono-label text-foreground/60"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );
}

export function LedgerTableRow({
  children,
  onClick,
  className,
  columns = 3,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  columns?: number;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid gap-4 py-4 border-b border-foreground/20 items-center",
        onClick && "row-hover cursor-pointer",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
export function EmptyState({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-20 px-6 border-2 border-dashed border-foreground/25">
      {eyebrow && <div className="mono-label text-foreground/50 mb-3">{eyebrow}</div>}
      <h3 className="display-serif text-3xl md:text-4xl text-foreground leading-tight mb-4">
        {title}
      </h3>
      {body && (
        <div className="text-foreground/70 max-w-md mx-auto leading-relaxed mb-6">
          {body}
        </div>
      )}
      {action}
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────
export function LedgerLoading({ text = "Retrieving from the register…" }: { text?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mb-4" />
      <p className="mono-label text-foreground/60">{text}</p>
    </div>
  );
}

// ─── Chip / Badge ────────────────────────────────────────────────
export function LedgerBadge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "stamp" | "outline" | "vermilion";
  className?: string;
}) {
  const styles = {
    default: "bg-foreground text-background px-2 py-0.5",
    outline: "border border-foreground/40 text-foreground px-2 py-0.5",
    vermilion: "border border-vermilion text-vermilion px-2 py-0.5",
    stamp: "border-2 border-vermilion text-vermilion px-2 py-1 -rotate-2 bg-vermilion/[0.04]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 mono-label uppercase text-[0.65rem]",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Two-column split for editorial layouts ──────────────────────
export function LedgerSplit({
  main,
  side,
  className,
}: {
  main: ReactNode;
  side: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid md:grid-cols-12 gap-8 md:gap-12", className)}>
      <div className="md:col-span-8">{main}</div>
      <div className="md:col-span-4">{side}</div>
    </div>
  );
}

// ─── Rule ────────────────────────────────────────────────────────
export function LedgerRule({ className }: { className?: string }) {
  return <div className={cn("border-t border-foreground/25", className)} />;
}
