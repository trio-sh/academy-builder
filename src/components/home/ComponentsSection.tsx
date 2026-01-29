import { 
  Award, 
  BarChart3, 
  Users, 
  Rocket, 
  Briefcase, 
  GraduationCap, 
  Shield, 
  Building2,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const components = [
  {
    id: "skill-passport",
    name: "Skill Passport",
    tagline: "Earned Credential",
    description: "Evidence-linked credential documenting assessed behavioral performance. Generated ONLY after MentorLink 'Proceed' endorsement.",
    icon: Award,
    gradient: "from-academy-emerald to-emerald-600",
    features: ["Behavioral Scores", "Evidence Links", "Mentor Endorsements", "Verification QR"],
  },
  {
    id: "growth-log",
    name: "Growth Log",
    tagline: "System Spine",
    description: "Continuous log of behavioral growth, training completions, project outcomes, and mentor observations. Passive and append-only.",
    icon: BarChart3,
    gradient: "from-academy-royal to-blue-600",
    features: ["Timeline View", "Auto-Logging", "Behavioral Trends", "Export History"],
  },
  {
    id: "mentorlink",
    name: "MentorLink",
    tagline: "Mandatory Gate",
    description: "Human validation layer where experienced professionals observe candidates. Decisions: Proceed / Redirect / Pause. No bypass allowed.",
    icon: Users,
    gradient: "from-academy-gold to-amber-600",
    features: ["Mentor Dashboard", "Observation Interface", "Referral System", "Quality Assurance"],
  },
  {
    id: "bridgefast",
    name: "BridgeFast",
    tagline: "Targeted Training",
    description: "Short-form training modules (2-4 hours) addressing specific behavioral gaps identified by mentors. Max 2 loops per candidate.",
    icon: Rocket,
    gradient: "from-orange-500 to-red-500",
    features: ["Module Library", "Mentor-Directed", "Interactive Content", "Completion Certificates"],
  },
  {
    id: "liveworks",
    name: "LiveWorks Studio",
    tagline: "Project Marketplace",
    description: "Supervised project marketplace where candidates gain real-world experience. All credentialing-path projects require mentor supervision.",
    icon: Briefcase,
    gradient: "from-purple-500 to-indigo-600",
    features: ["Project Marketplace", "Milestone Tracking", "Payment Integration", "Dispute Resolution"],
  },
  {
    id: "civic-access",
    name: "Civic Access Lab",
    tagline: "Institutional Track",
    description: "'Catch them young' — engaging students in school to build career awareness. SEPARATE track that does NOT directly produce credentials.",
    icon: GraduationCap,
    gradient: "from-teal-500 to-cyan-600",
    features: ["Student Dashboard", "Career Planning", "Teacher Observation", "Cohort Analytics"],
  },
  {
    id: "talentvisa",
    name: "TalentVisa",
    tagline: "Premium Credential",
    description: "Late-stage, conditional, RARE credential. Tiers: Silver / Gold / Platinum. System-enforced cap at <5% of Skill Passport holders.",
    icon: Shield,
    gradient: "from-academy-gold to-yellow-500",
    features: ["Nomination System", "Committee Review", "Premium Badge", "Rarity Controls"],
  },
  {
    id: "t3x",
    name: "T3X Talent Exchange",
    tagline: "Employer Marketplace",
    description: "Employer-facing marketplace where verified candidates are listed. Captures post-hire outcomes with 30/60/90-day feedback.",
    icon: Building2,
    gradient: "from-slate-600 to-slate-800",
    features: ["Candidate Listings", "Advanced Search", "Hiring Confirmation", "Feedback System"],
  },
];

export function ComponentsSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
            Platform Components
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            8 Interconnected Systems
          </h2>
          <p className="text-lg text-muted-foreground">
            Every component serves two purposes: a visible function for users and 
            an invisible function for system intelligence.
          </p>
        </div>

        {/* Components Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {components.map((component, index) => (
            <ComponentCard key={component.id} component={component} index={index} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link to="/platform">
              Explore Full Platform
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

interface ComponentCardProps {
  component: typeof components[0];
  index: number;
}

function ComponentCard({ component, index }: ComponentCardProps) {
  return (
    <div 
      className="group relative p-6 rounded-2xl bg-card border border-border hover:border-transparent hover:shadow-xl transition-all duration-300 animate-fade-in overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Gradient Hover Background */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br",
        component.gradient
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 bg-gradient-to-br",
          component.gradient
        )}>
          <component.icon className="w-6 h-6 text-white" />
        </div>

        {/* Tagline */}
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-white/70 transition-colors">
          {component.tagline}
        </span>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-white mt-1 mb-2 transition-colors">
          {component.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground group-hover:text-white/80 leading-relaxed mb-4 transition-colors">
          {component.description}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {component.features.slice(0, 2).map((feature) => (
            <span 
              key={feature}
              className="px-2 py-1 text-xs rounded-full bg-secondary group-hover:bg-white/20 text-muted-foreground group-hover:text-white/90 transition-colors"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
