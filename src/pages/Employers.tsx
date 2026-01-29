import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  CheckCircle2, 
  Users, 
  Award, 
  BarChart3, 
  Shield, 
  Building2,
  ArrowRight,
  Star,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Users,
    title: "Mentor-Vetted Candidates",
    description: "Every candidate has been observed by experienced professionals. No self-assessments or AI-generated credentials.",
  },
  {
    icon: Award,
    title: "Evidence-Based Profiles",
    description: "See actual behavioral evidence, not just resume keywords. Each Skill Passport links to real observations and outcomes.",
  },
  {
    icon: BarChart3,
    title: "Outcome Tracking",
    description: "Your 30/60/90-day feedback improves the system. Better candidates over time, calibrated to your actual needs.",
  },
  {
    icon: Shield,
    title: "TalentVisa Premium Access",
    description: "Access the top <5% of candidates with exceptional behavioral performance. Rare, conditional, and verified.",
  },
];

const tiers = [
  {
    name: "Standard",
    description: "Access Skill Passport holders",
    price: "Free",
    features: [
      "Browse candidate listings",
      "View behavioral scores",
      "Send connection requests",
      "Basic search filters",
      "Hiring confirmation",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    description: "Full platform access",
    price: "$499",
    period: "/month",
    features: [
      "Everything in Standard",
      "TalentVisa candidate access",
      "Advanced search & filters",
      "Priority connection requests",
      "Dedicated account manager",
      "API access",
    ],
    cta: "Contact Sales",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Custom solutions",
    price: "Custom",
    features: [
      "Everything in Premium",
      "Custom integrations",
      "Bulk hiring tools",
      "White-label options",
      "On-site training",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "The quality of candidates from T3X is remarkable. The behavioral evidence gives us confidence before we even interview.",
    author: "Sarah Chen",
    role: "VP of Talent",
    company: "TechCorp Inc.",
  },
  {
    quote: "We've reduced our bad-hire rate by 60% since switching to T3X. The mentor-gated process actually works.",
    author: "Marcus Johnson",
    role: "Head of HR",
    company: "Growth Dynamics",
  },
];

const Employers = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 gradient-hero text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-6">
                <Building2 className="w-4 h-4" />
                T3X Talent Exchange
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Hire with Confidence.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-academy-gold to-white">
                  Evidence, Not Guesswork.
                </span>
              </h1>
              <p className="text-lg text-white/70 mb-10">
                Access pre-validated candidates with proven behavioral readiness. 
                Every listing backed by mentor observations, not self-reported skills.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                  Start Hiring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                  See Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                Why T3X
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Hiring That Actually Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Traditional hiring relies on resumes and interviews. We provide 
                sustained behavioral evidence from mentor observation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={benefit.title}
                  className="p-8 rounded-2xl bg-card border border-border hover:border-academy-royal/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-academy-royal/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-academy-royal" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                How It Works
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Hiring Process
              </h2>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: "1", title: "Search", desc: "Filter by skills, experience, and readiness tier" },
                  { step: "2", title: "Review", desc: "View Skill Passport evidence and mentor endorsements" },
                  { step: "3", title: "Connect", desc: "Send connection requests to candidates" },
                  { step: "4", title: "Hire", desc: "Confirm hire and provide 30/60/90-day feedback" },
                ].map((item, index) => (
                  <div key={item.step} className="relative text-center">
                    <div className="w-12 h-12 rounded-full bg-academy-royal text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                    {index < 3 && (
                      <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                Pricing
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Plans for Every Organization
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {tiers.map((tier) => (
                <div 
                  key={tier.name}
                  className={cn(
                    "relative p-8 rounded-2xl border",
                    tier.popular 
                      ? "border-academy-royal bg-academy-royal/5 shadow-xl" 
                      : "border-border bg-card"
                  )}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 text-xs font-medium bg-academy-royal text-white rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {tier.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground">{tier.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={cn(
                      "w-full",
                      tier.popular 
                        ? "bg-academy-royal hover:bg-academy-royal/90 text-white" 
                        : ""
                    )}
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Employers Say
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.author}
                  className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-academy-gold text-academy-gold" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-primary-foreground/60">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Join leading companies who trust T3X for evidence-based hiring decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Schedule Demo
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Employers;
