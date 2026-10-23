/**
 * The founder's one condition on delivery (email of 23 October 2026): every Behavioral Evidence Report the platform produces carries a visible "TEST" tag.
 * Every face of a report (printable one page, multi page package, accessible version, employer reader, recipient page) renders this and nothing else
 * decides whether it shows. The tag is text, so a screen reader, a copy and a printout all carry it; the colours are forced on in print.
 */
import type { CSSProperties } from "react";

const BASE: CSSProperties = {
  padding: "2px 10px", border: "2px solid #B00020", color: "#B00020", background: "#FFFFFF",
  font: "700 14px/1.3 Arial, Helvetica, sans-serif", letterSpacing: "0.2em",
  WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
};

export default function TestTag({ inline = false }: { inline?: boolean }) {
  const style: CSSProperties = inline
    ? { ...BASE, display: "inline-block", marginBottom: 12 }
    : { ...BASE, position: "absolute", top: 8, right: 8, zIndex: 5 };
  return <div role="note" data-testid="test-tag" style={style}>TEST</div>;
}
