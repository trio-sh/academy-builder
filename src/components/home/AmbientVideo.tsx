import { useEffect, useRef, useState } from "react";

/**
 * A muted, looping background video that stays out of the way: still frame only for people who ask for reduced motion or have data saving on,
 * paused while off screen, and never read out by a screen reader. The poster is what shows before the video starts and in place of it.
 */
export function allowsMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !conn?.saveData;
}

interface Props {
  src: string;
  poster: string;
  className?: string;
  /** above the fold: load straight away instead of when it scrolls near */
  priority?: boolean;
}

export function AmbientVideo({ src, poster, className = "", priority = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(allowsMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setMotion(allowsMotion());
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.05 });
    io.observe(v);
    return () => io.disconnect();
  }, [motion]);

  if (!motion) return <img src={poster} alt="" aria-hidden="true" loading="lazy" className={className} data-ambient="still" />;
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload={priority ? "auto" : "metadata"}
      aria-hidden="true"
      tabIndex={-1}
      data-ambient="video"
    />
  );
}
