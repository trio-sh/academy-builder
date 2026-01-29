import { ArrowRight, User, Building2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stakeholders = [
  {
    icon: User,
    title: "For Job Seekers",
    description: "Go beyond your resume. Build an evidence-based behavioral profile through real observation, mentorship, and project experience.",
    benefits: [
      "Resume enhancement without bias",
      "Assigned mentor guidance",
      "Skill Passport credential",
      "Direct employer access via T3X",
    ],
    cta: "Start Your Journey",
    href: "/get-started",
    gradient: "from-academy-royal/10 to-blue-500/10",
    iconBg: "bg-academy-royal",
  },
  {
    icon: Building2,
    title: "For Employers",
    description: "Access pre-validated candidates with proven behavioral readiness. Real evidence, not just keywords. Outcome-tracked hiring.",
    benefits: [
      "Mentor-vetted candidates",
      "Behavioral evidence, not just resumes",
      "TalentVisa premium tier access",
      "30/60/90-day outcome tracking",
    ],
    cta: "Explore T3X Exchange",
    href: "/employers",
    gradient: "from-academy-gold/10 to-amber-500/10",
    iconBg: "bg-academy-gold",
  },
  {
    icon: GraduationCap,
    title: "For Schools",
    description: "Engage students early with career awareness. Build behavioral documentation that transitions seamlessly to the credential pathway.",
    benefits: [
      "Civic Access Lab platform",
      "Teacher observation tools",
      "Cohort analytics",
      "Graduation transition path",
    ],
    cta: "Learn About Civic Access",
    href: "/schools",
    gradient: "from-academy-emerald/10 to-emerald-500/10",
    iconBg: "bg-academy-emerald",
  },
];

export function StakeholdersSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
            Who We Serve
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Three Pathways, One Ecosystem
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you're seeking your next opportunity, hiring talent, or preparing 
            students for the workforce — we've built a pathway for you.
          </p>
        </div>

        {/* Stakeholder Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {stakeholders.map((stakeholder, index) => (
            <div 
              key={stakeholder.title}
              className={`relative rounded-2xl bg-gradient-to-br ${stakeholder.gradient} p-8 border border-border overflow-hidden animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <stakeholder.icon className="w-full h-full" />
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${stakeholder.iconBg} flex items-center justify-center mb-6`}>
                <stakeholder.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {stakeholder.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {stakeholder.description}
              </p>

              {/* Benefits */}
              <ul className="space-y-3 mb-8">
                {stakeholder.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-academy-royal" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                <Link to={stakeholder.href}>
                  {stakeholder.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
