import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface PublicLayoutProps {
  children: ReactNode;
  /** Optional class merged onto the main element */
  mainClassName?: string;
}

/**
 * PublicLayout — T3A purple shell for every public/marketing page.
 * The old paper theme was rejected 2026-08-12; palette reverted to
 * dark purple with tech-feel accents. Fonts + layout kept intact
 * (see .pipilot/design.md). No `data-theme="paper"` wrapper.
 */
export function PublicLayout({ children, mainClassName }: PublicLayoutProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Scroll progress rule — indigo → purple gradient */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] gradient-accent z-[60] origin-left"
        style={{ scaleX }}
      />
      <Header />
      <main className={mainClassName}>{children}</main>
      <Footer />
    </div>
  );
}
