import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { JourneySection } from "@/components/home/JourneySection";
import { ComponentsSection } from "@/components/home/ComponentsSection";
import { DifferentiatorSection } from "@/components/home/DifferentiatorSection";
import { StakeholdersSection } from "@/components/home/StakeholdersSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <JourneySection />
        <ComponentsSection />
        <DifferentiatorSection />
        <StakeholdersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
