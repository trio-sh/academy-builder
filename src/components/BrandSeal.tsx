import { cn } from "@/lib/utils";

/**
 * BrandSeal — the wax-seal-style logo mark used across the site
 * (Header, Footer, Chatbot). The logo image sits inside a vermilion
 * disc, tinted to read as ink on parchment.
 */
export function BrandSeal({
  size = 40,
  className,
  withDots = false,
}: {
  size?: number;
  className?: string;
  withDots?: boolean;
}) {
  return (
    <span
      className={cn("relative inline-block flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full bg-vermilion flex items-center justify-center shadow-[inset_1px_-2px_3px_rgba(0,0,0,0.25)]"
        style={{ transform: "rotate(-6deg)" }}
      >
        <img
          src="/logo.png"
          alt=""
          className="rounded-full object-cover opacity-90"
          style={{
            width: size * 0.72,
            height: size * 0.72,
            filter: "grayscale(1) brightness(1.8) contrast(0.9)",
          }}
        />
      </span>
      {withDots && (
        <>
          <span className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-vermilion" />
          <span className="absolute -bottom-1 right-0 w-1 h-1 rounded-full bg-vermilion/70" />
        </>
      )}
    </span>
  );
}
