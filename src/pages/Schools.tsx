import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  GraduationCap, 
  Users, 
  BarChart3, 
  Target, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  BookOpen,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Target,
    title: "Career Exploration",
    description: "Interactive tools for students to discover interests, explore pathways, and set meaningful goals.",
  },
  {
    icon: Users,
    title: "Teacher Observations",
    description: "Structured forms for logging observed behaviors. Developmental, not evaluative. Building awareness, not judgment.",
  },
  {
    icon: BarChart3,
    title: "Cohort Analytics",
    description: "School-wide behavioral patterns and insights. Aggregate data to inform programming decisions.",
  },
  {
    icon: BookOpen,
    title: "Curriculum Integration",
    description: "Tools that complement existing programs. Career awareness woven into regular activities.",
  },
  {
    icon: LineChart,
    title: "Progress Tracking",
    description: "Longitudinal view of student development. Activity logs and engagement metrics over time.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "COPPA/FERPA compliant by design. Student data protected with strict access controls.",
  },
];

const benefits = [
  "Early career awareness builds better outcomes",
  "Behavioral documentation transitions to credential pathway",
  "Teacher insights inform student development",
  "Data-driven school improvement",
  "Parent visibility options",
  "Seamless graduation transition",
];

const Schools = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 gradient-hero text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-6">
                <GraduationCap className="w-4 h-4" />
                Civic Access Lab
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Catch Them Young.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-academy-gold to-white">
                  Build Career Awareness Early.
                </span>
              </h1>
              <p className="text-lg text-white/70 mb-10">
                Engage students in career exploration and behavioral documentation 
                that transitions seamlessly to the credential pathway after graduation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                  Request Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                  Download Overview
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Important Note */}
        <section className="py-8 bg-academy-gold/10 border-y border-academy-gold/20">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto flex items-center gap-4 text-center md:text-left">
              <Shield className="w-8 h-8 text-academy-gold flex-shrink-0 hidden md:block" />
              <p className="text-foreground">
                <strong className="text-academy-gold">Important:</strong> Civic Access Lab is a 
                <strong> separate institutional track</strong>. It feeds system learning but 
                <strong> does NOT directly produce credentials</strong>. Students must enter the 
                main pathway after graduation for Skill Passport eligibility.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                Platform Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Tools for Modern Career Education
              </h2>
              <p className="text-lg text-muted-foreground">
                A complete platform for engaging students, empowering teachers, and 
                informing school leadership.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-academy-royal/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-academy-emerald/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-academy-emerald" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* User Types */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Built for Everyone in the School
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  title: "Students",
                  desc: "Career exploration, activity logs, self-assessments, goal setting",
                  icon: Users,
                  color: "bg-academy-royal",
                },
                {
                  title: "Teachers",
                  desc: "Observation tools, activity assignment, behavioral logging",
                  icon: BookOpen,
                  color: "bg-academy-emerald",
                },
                {
                  title: "Administrators",
                  desc: "Aggregate analytics, account management, cohort insights",
                  icon: BarChart3,
                  color: "bg-academy-gold",
                },
                {
                  title: "Parents",
                  desc: "Optional read-only access to student progress (school-configured)",
                  icon: Shield,
                  color: "bg-slate-600",
                },
              ].map((user) => (
                <div key={user.title} className="text-center p-6">
                  <div className={`w-16 h-16 rounded-2xl ${user.color} flex items-center justify-center mx-auto mb-4`}>
                    <user.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{user.title}</h3>
                  <p className="text-sm text-muted-foreground">{user.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <div>
                <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
                  Why Civic Access Lab
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Preparing Students for Real-World Success
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Early behavioral documentation creates a foundation that follows 
                  students into the workforce. Build awareness now, validate later.
                </p>

                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-academy-emerald flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-academy-emerald/20 to-academy-royal/20 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <GraduationCap className="w-24 h-24 text-academy-royal mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Graduation Transition
                    </h3>
                    <p className="text-muted-foreground">
                      Student data ports seamlessly to the main credentialing 
                      pathway upon graduation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Career Education?
            </h2>
            <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-8">
              Join schools across the country using Civic Access Lab to prepare 
              students for workplace success.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Schedule a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Download Brochure
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Schools;
