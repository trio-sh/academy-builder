import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container px-4 md:px-6">
        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 gradient-hero" />
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-academy-royal/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-academy-gold/20 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 p-8 md:p-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-6">
              <Sparkles className="w-4 h-4 text-academy-gold" />
              Begin Your Credential Journey
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to Prove Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-academy-gold to-white">
                Workplace Readiness?
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join The 3rd Academy today. Upload your resume, get matched with a mentor, 
              and start building your Skill Passport through evidence-based observation.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-xl"
                asChild
              >
                <Link to="/get-started">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                asChild
              >
                <Link to="/platform">Learn More</Link>
              </Button>
            </div>

            {/* Trust Signal */}
            <p className="mt-8 text-sm text-white/50">
              No credit card required · Mentor-matched within 48 hours
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
