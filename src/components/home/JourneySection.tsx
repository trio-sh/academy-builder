import { 
  FileText, 
  Users, 
  Award, 
  BarChart3, 
  GraduationCap, 
  Building2,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const journeySteps = [
  {
    step: "01",
    title: "Basic Profile",
    description: "Non-credentialed snapshot created from your resume or project participation. Not a credential — purely descriptive.",
    icon: FileText,
    color: "bg-academy-slate/10 text-academy-slate",
    highlight: false,
  },
  {
    step: "02",
    title: "Growth Log",
    description: "Passive tracking of all your interactions. Captures behavioral patterns for system learning without manual input.",
    icon: BarChart3,
    color: "bg-academy-royal/10 text-academy-royal",
    highlight: false,
  },
  {
    step: "03",
    title: "MentorLink",
    description: "MANDATORY gate. Every candidate must pass through mentor review. Mentors decide: proceed, redirect, or pause.",
    icon: Users,
    color: "bg-academy-gold/10 text-academy-gold",
    highlight: true,
  },
  {
    step: "04",
    title: "Skill Passport",
    description: "EARNED credential that emerges after sustained observation. Evidence-linked to mentor observations and behavioral data.",
    icon: Award,
    color: "bg-academy-emerald/10 text-academy-emerald",
    highlight: false,
  },
  {
    step: "05",
    title: "TalentVisa",
    description: "Late-stage, conditional, rare. Silver / Gold / Platinum tiers based on evidence strength. Not guaranteed.",
    icon: GraduationCap,
    color: "bg-academy-gold/10 text-academy-gold",
    highlight: false,
  },
  {
    step: "06",
    title: "T3X Exchange",
    description: "You're listed for employers. They view your TalentVisa tier and Skill Passport evidence to make hiring decisions.",
    icon: Building2,
    color: "bg-academy-royal/10 text-academy-royal",
    highlight: false,
  },
];

export function JourneySection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
            The Credentialing Journey
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            From Profile to Placement
          </h2>
          <p className="text-lg text-muted-foreground">
            Every credential is earned through sustained mentor observation — no shortcuts, 
            no self-assessments. Human judgment at every critical gate.
          </p>
        </div>

        {/* Journey Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-border via-academy-royal/30 to-border" />

            {/* Steps */}
            <div className="space-y-8">
              {journeySteps.map((step, index) => (
                <div 
                  key={step.step}
                  className={cn(
                    "relative flex gap-6 md:gap-8 animate-fade-in",
                    step.highlight && "scale-[1.02]"
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Step Number Circle */}
                  <div className={cn(
                    "relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center",
                    step.highlight 
                      ? "bg-academy-gold text-white shadow-lg shadow-academy-gold/25" 
                      : "bg-card border border-border"
                  )}>
                    <step.icon className={cn(
                      "w-5 h-5 md:w-6 md:h-6",
                      step.highlight ? "text-white" : "text-muted-foreground"
                    )} />
                  </div>

                  {/* Content Card */}
                  <div className={cn(
                    "flex-1 p-6 rounded-2xl transition-all duration-300",
                    step.highlight 
                      ? "bg-academy-gold/5 border-2 border-academy-gold/20" 
                      : "bg-card border border-border hover:border-academy-royal/20 hover:shadow-md"
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        step.highlight ? "text-academy-gold" : "text-muted-foreground"
                      )}>
                        Step {step.step}
                      </span>
                      {step.highlight && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-academy-gold/20 text-academy-gold rounded-full">
                          Required Gate
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Principles */}
        <div className="max-w-3xl mx-auto mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/10">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Architectural Principles
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Mentor-gated — no bypass allowed",
              "Credentials are earned, not generated",
              "Observations inform, they don't gatekeep",
              "All outcomes feed system learning",
            ].map((principle) => (
              <div key={principle} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-academy-emerald flex-shrink-0" />
                <span className="text-sm text-foreground">{principle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
