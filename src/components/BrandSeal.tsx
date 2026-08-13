import { cn } from "@/lib/utils";

/**
 * BrandSeal — the T3A logo mark used across the site (Header,
 * Footer, Chatbot). Renders the source logo.png verbatim at the
 * requested size — no disc, no colour filter, no tinting.
 *
 * The `withDots` prop is retained for API compatibility but is now
 * a no-op: the raw logo does not need decorative dots.
 */
export function BrandSeal({
  size = 40,
  className,
  withDots: _withDots = false,
}: {
  size?: number;
  className?: string;
  withDots?: boolean;
}) {
  return (
    <img
      src="/logo.png"
      alt="The 3rd Academy"
      width={size}
      height={size}
      className={cn("inline-block flex-shrink-0 select-none", className)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
