import { ArrowRight, FileText, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />
      
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Content */}
      <div className="relative container px-4 md:px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-academy-gold animate-pulse" />
            Mentor-Gated Behavioral Validation
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Beyond Credentials.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-academy-gold to-academy-royal">
              Workplace Ready.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            The 3rd Academy bridges the gap between what your resume says and what 
            employers actually need — through sustained mentor observation and 
            evidence-based behavioral validation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-xl"
              asChild
            >
              <Link to="/get-started">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
              asChild
            >
              <Link to="/employers">For Employers</Link>
            </Button>
          </div>

          {/* Entry Points Cards */}
          <div className="grid md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <EntryPointCard
              icon={<FileText className="w-5 h-5" />}
              title="Resume Upload"
              description="Start with your resume. Our enhancer identifies areas for mentor focus."
              entry="Entry A"
            />
            <EntryPointCard
              icon={<Users className="w-5 h-5" />}
              title="Civic Access Lab"
              description="For schools — engage students early in career awareness."
              entry="Entry B"
            />
            <EntryPointCard
              icon={<Briefcase className="w-5 h-5" />}
              title="LiveWorks Studio"
              description="Complete real projects under mentor supervision."
              entry="Entry C"
            />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

interface EntryPointCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  entry: string;
}

function EntryPointCard({ icon, title, description, entry }: EntryPointCardProps) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-left">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-academy-royal/20 text-academy-royal">
          {icon}
        </div>
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {entry}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}
