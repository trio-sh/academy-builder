import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const comparisons = [
  {
    criteria: "Who judges readiness?",
    t3a: "Human mentor (mandatory)",
    competitors: "AI algorithms or self-assessment",
  },
  {
    criteria: "What gets validated?",
    t3a: "Behavioral patterns over time",
    competitors: "Knowledge tests or course completion",
  },
  {
    criteria: "When is credential issued?",
    t3a: "Late-stage, after sustained observation",
    competitors: "Immediately after passing test/course",
  },
  {
    criteria: "Can candidates game it?",
    t3a: "No — mentor-gated",
    competitors: "Yes — study for test, get badge",
  },
  {
    criteria: "Data moat",
    t3a: "Mentor judgment + behavioral fingerprint",
    competitors: "Content library (easily copied)",
  },
];

export function DifferentiatorSection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-3">
            Why We're Different
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Not a Feature Difference.
            <br />
            <span className="text-gradient">A Category Difference.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Competitors are doing point-in-time AI assessments. We're doing sustained 
            human-gated observation with outcome learning.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            {/* Header */}
            <div className="grid grid-cols-3 bg-secondary/50">
              <div className="p-4 md:p-6 border-r border-border">
                <span className="text-sm font-medium text-muted-foreground">Criteria</span>
              </div>
              <div className="p-4 md:p-6 border-r border-border bg-academy-emerald/5">
                <span className="text-sm font-semibold text-academy-emerald">The 3rd Academy</span>
              </div>
              <div className="p-4 md:p-6">
                <span className="text-sm font-medium text-muted-foreground">Traditional Platforms</span>
              </div>
            </div>

            {/* Rows */}
            {comparisons.map((row, index) => (
              <div 
                key={row.criteria}
                className={cn(
                  "grid grid-cols-3",
                  index !== comparisons.length - 1 && "border-b border-border"
                )}
              >
                <div className="p-4 md:p-6 border-r border-border flex items-center">
                  <span className="text-sm font-medium text-foreground">{row.criteria}</span>
                </div>
                <div className="p-4 md:p-6 border-r border-border bg-academy-emerald/5 flex items-center gap-2">
                  <Check className="w-4 h-4 text-academy-emerald flex-shrink-0" />
                  <span className="text-sm text-foreground">{row.t3a}</span>
                </div>
                <div className="p-4 md:p-6 flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive/50 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.competitors}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <blockquote className="text-xl md:text-2xl font-medium text-foreground italic">
            "The flowchart is the map. The data is the territory. 
            <br />
            We share the map selectively. We never share the territory."
          </blockquote>
        </div>
      </div>
    </section>
  );
}
