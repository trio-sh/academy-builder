import { PublicLayout } from "@/components/layout/PublicLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { RecordTicker } from "@/components/home/RecordTicker";
import { YearEndStrip } from "@/components/home/YearEndStrip";
import { JourneySection } from "@/components/home/JourneySection";
import { DifferentiatorSection } from "@/components/home/DifferentiatorSection";
import { StakeholdersSection } from "@/components/home/StakeholdersSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <PublicLayout>
      <HeroSection />
      <RecordTicker />
      <YearEndStrip />
      <JourneySection />
      <DifferentiatorSection />
      <StakeholdersSection />
      <CTASection />
    </PublicLayout>
  );
};

export default Index;
