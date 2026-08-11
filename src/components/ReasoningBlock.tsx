import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronDown, Loader2 } from "lucide-react";

/**
 * Reasoning accordion — renders <thinking>…</thinking> content the
 * assistant emits before its user-facing reply. Opens by default
 * while streaming so the reader can watch reasoning arrive; the
 * moment the parser reports the closing tag, we auto-collapse.
 * Manual toggling still works either way.
 *
 * Kept at module scope + shared between Praxis (dashboard/AIAgent)
 * and the site-wide Chatbot so its `open` state survives parent
 * re-renders.
 */
export function ReasoningBlock({
  reasoning,
  closed,
}: {
  reasoning: string;
  closed: boolean;
}) {
  const [open, setOpen] = useState(!closed);
  const prevClosed = useRef(closed);
  useEffect(() => {
    if (!prevClosed.current && closed) setOpen(false);
    prevClosed.current = closed;
  }, [closed]);
  if (!reasoning) return null;
  return (
    <div className="mb-2 rounded-md border border-foreground/15 bg-foreground/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] mono-label text-foreground/60 hover:text-foreground"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          {closed ? (
            <Brain className="w-3 h-3" />
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          {closed ? "Reasoning" : "Reasoning…"}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-foreground/10"
          >
            <div className="px-3 py-2 text-[12.5px] text-foreground/70 whitespace-pre-wrap font-serif leading-relaxed">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
