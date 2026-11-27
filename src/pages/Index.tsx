import { MotionConfig } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { RecordTicker } from "@/components/home/RecordTicker";
import { YearEndStrip } from "@/components/home/YearEndStrip";
import { YearInRecord } from "@/components/home/YearInRecord";
import { JourneySection } from "@/components/home/JourneySection";
import { DifferentiatorSection } from "@/components/home/DifferentiatorSection";
import { StakeholdersSection } from "@/components/home/StakeholdersSection";
import { CTASection } from "@/components/home/CTASection";
import { ScrollRail } from "@/components/home/ScrollRail";
import { PointerSpotlight } from "@/components/home/PointerSpotlight";

const Index = () => {
  return (
    <MotionConfig reducedMotion="user">
      <PublicLayout>
        <PointerSpotlight />
        <ScrollRail />
        <HeroSection />
        <RecordTicker />
        <YearEndStrip />
        <YearInRecord />
        <JourneySection />
        <DifferentiatorSection />
        <StakeholdersSection />
        <CTASection />
      </PublicLayout>
    </MotionConfig>
  );
};

export default Index;
