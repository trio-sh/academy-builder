import { motion } from "framer-motion";

/**
 * Full-screen ledger loading screen — paper-themed, with a slow-drawing
 * animated stamp that reads as an editor stamping a page rather than
 * a generic app spinner.
 */
export function LoadingScreen({ message = "Retrieving from the register" }: { message?: string }) {
  return (
    <div
     
      className="min-h-screen bg-background text-foreground paper-grain flex items-center justify-center px-6"
    >
      <div className="relative max-w-lg w-full">
        {/* Corner registration marks */}
        <Mark className="absolute -top-6 -left-6" />
        <Mark className="absolute -top-6 -right-6" />
        <Mark className="absolute -bottom-6 -left-6" />
        <Mark className="absolute -bottom-6 -right-6" />

        <div className="border-2 border-foreground p-8 md:p-12 bg-background/70 backdrop-blur-[1px]">
          {/* Meta strip */}
          <div className="flex items-center justify-between mono-label text-foreground/60 pb-4 mb-6 border-b border-foreground/25">
            <span>§ In progress</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>

          {/* Animated stamp */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative w-16 h-16 flex-shrink-0">
              {/* Rotating outer ring */}
              <motion.svg
                viewBox="0 0 64 64"
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                aria-hidden
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--vermilion))"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                />
              </motion.svg>
              {/* Inner static stamp */}
              <div className="absolute inset-3 flex items-center justify-center border-2 border-foreground bg-background">
                <span
                  className="display-serif text-2xl ink-vermilion leading-none pt-1"
                  style={{ fontVariationSettings: '"WONK" 1' }}
                >
                  §
                </span>
              </div>
            </div>

            <div>
              <div className="display-serif text-2xl md:text-3xl text-foreground leading-tight">
                <span className="italic display-serif-italic">One moment</span> —
              </div>
              <p className="text-foreground/70 text-[0.9375rem] mt-1">
                {message}…
              </p>
            </div>
          </div>

          {/* Ink progress bar */}
          <div className="relative h-[2px] bg-foreground/10 overflow-hidden mb-6">
            <motion.div
              className="absolute top-0 left-0 bottom-0 w-1/3 bg-foreground"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          </div>

          <div className="flex items-center justify-between mono-label text-foreground/50">
            <span>The 3rd Academy · Register</span>
            <span>please wait</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mark({ className }: { className?: string }) {
  return (
    <svg className={"w-4 h-4 text-foreground/40 " + (className || "")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <line x1="0" y1="8" x2="16" y2="8" />
      <line x1="8" y1="0" x2="8" y2="16" />
    </svg>
  );
}
