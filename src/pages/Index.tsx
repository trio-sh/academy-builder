import { PublicLayout } from "@/components/layout/PublicLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { JourneySection } from "@/components/home/JourneySection";
import { DifferentiatorSection } from "@/components/home/DifferentiatorSection";
import { StakeholdersSection } from "@/components/home/StakeholdersSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <PublicLayout>
      <HeroSection />
      <JourneySection />
      <DifferentiatorSection />
      <StakeholdersSection />
      <CTASection />
    </PublicLayout>
  );
};

export default Index;
