import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { allowsMotion } from "@/components/home/AmbientVideo";

/** A number that counts up from zero the first time it scrolls into view. Shows the final value straight away for readers who ask for reduced motion. */
export function CountUp({ to, secs = 1.4, testId }: { to: number; secs?: number; testId?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const [n, setN] = useState(() => (allowsMotion() ? 0 : to));
  useEffect(() => {
    if (!seen) return;
    if (!allowsMotion()) { setN(to); return; }
    const start = performance.now(); let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / (secs * 1000));
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, secs]);
  return <span ref={ref} data-testid={testId} data-final={to}>{n}</span>;
}
