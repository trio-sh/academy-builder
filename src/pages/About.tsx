import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  Target, 
  Shield, 
  Users, 
  BarChart3,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const values = [
  {
    icon: Target,
    title: "Human Judgment First",
    description: "Every credential is earned through mentor observation. AI supports, but humans decide. No automated credentialing.",
  },
  {
    icon: Shield,
    title: "Earned, Not Generated",
    description: "Skill Passports emerge from sustained observation and evidence. No shortcuts, no self-assessments, no gaming.",
  },
  {
    icon: Users,
    title: "Dignity in Every Outcome",
    description: "Rejection preserves dignity. Exits are graceful. Re-entry is optional. No permanent failure labels.",
  },
  {
    icon: BarChart3,
    title: "System Learning",
    description: "Every outcome feeds the framework. The system improves without judging individuals. Data informs, never intervenes.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 gradient-hero text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Bridging Credentials
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-academy-gold to-white">
                  and Workplace Readiness
                </span>
              </h1>
              <p className="text-lg text-white/70 mb-8">
                The 3rd Academy addresses the gap between what education provides (Layer 1 & 2) 
                and what employers actually need (Layer 3) — through mentor-gated behavioral validation.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                Our Mission
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Making Behavioral Readiness Observable
              </h2>
              <div className="prose prose-lg text-muted-foreground">
                <p>
                  Education credentials tell employers what you studied. Certifications show 
                  what you passed. But neither reveals how you'll actually perform in the workplace.
                </p>
                <p>
                  The 3rd Academy fills this gap with a mentor-gated system that observes, 
                  documents, and validates behavioral readiness over time. Not through AI scores 
                  or self-assessments, but through sustained human observation.
                </p>
                <p>
                  The result? Candidates with evidence-backed credentials. Employers with 
                  confidence in their hires. Schools with tools to prepare students early.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                Our Values
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Architecture as Philosophy
              </h2>
              <p className="text-lg text-muted-foreground">
                Every technical decision reflects a human value. Our architecture is our ethics.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {values.map((value, index) => (
                <div 
                  key={value.title}
                  className="p-8 rounded-2xl bg-card border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-academy-royal/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-academy-royal" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Moat */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Competitive Moat
              </h2>
              <p className="text-lg text-muted-foreground">
                A competitor can replicate our interface in weeks. They cannot replicate 
                years of judgment-outcome correlations.
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-academy-gold/5 border border-academy-gold/20">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Mentor Decision Patterns
                </h3>
                <p className="text-muted-foreground mb-4">
                  Every proceed/redirect/pause decision correlated with eventual hiring outcomes. 
                  We learn which mentor judgments actually predict workplace success.
                </p>
                <p className="text-sm text-academy-gold font-medium">
                  Requires years of data to replicate.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-academy-royal/5 border border-academy-royal/20">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Behavioral Fingerprint
                </h3>
                <p className="text-muted-foreground mb-4">
                  Passive interaction patterns correlated with real employment outcomes. 
                  We learn which behaviors predict success, dropout, and even gaming attempts.
                </p>
                <p className="text-sm text-academy-royal font-medium">
                  Requires scale + time to build.
                </p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/10 text-center">
              <blockquote className="text-lg font-medium text-foreground italic">
                "The flowchart is the map. The data is the territory. 
                We share the map selectively. We never share the territory."
              </blockquote>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join the Movement
            </h2>
            <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-8">
              Whether you're a candidate seeking validation, an employer seeking confidence, 
              or an educator preparing students — there's a place for you.
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/get-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
