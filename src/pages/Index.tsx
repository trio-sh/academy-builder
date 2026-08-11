import { motion, useScroll, useTransform } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { JourneySection } from "@/components/home/JourneySection";
import { DifferentiatorSection } from "@/components/home/DifferentiatorSection";
import { StakeholdersSection } from "@/components/home/StakeholdersSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div
      data-theme="paper"
      className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background"
    >
      {/* Ink progress rule */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-foreground z-[60] origin-left"
        style={{ scaleX }}
      />

      <Header />
      <main>
        <HeroSection />
        <JourneySection />
        <DifferentiatorSection />
        <StakeholdersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
