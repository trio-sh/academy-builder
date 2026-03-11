import { motion } from "framer-motion";
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
    <section
      className="py-32 relative overflow-hidden bg-black"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />

      {/* Animated background blobs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-600 rounded-full opacity-8 blur-[120px]"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-600 rounded-full opacity-8 blur-[100px]"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            Why We're Different
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">
              Not a Feature Difference.
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              A Category Difference.
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            Competitors are doing point-in-time AI assessments. We're doing sustained
            human-gated observation with outcome learning.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: Image */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 to-indigo-600/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-3xl overflow-hidden border border-white/10">
              <img
                src="https://api.a0.dev/assets/image?text=split%20screen%20comparison%20showing%20traditional%20AI%20assessment%20vs%20human%20mentor%20observation%20based%20validation%20futuristic%20dark%20theme%20with%20green%20and%20red%20indicators&aspect=4:3&seed=diff_compare"
                alt="Traditional vs Mentor-Gated Approach"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          </motion.div>

          {/* Right: Comparison Table */}
          <div>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />

              <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-black">
                {/* Header */}
                <div className="grid grid-cols-3 bg-black">
                  <div className="p-4 border-r border-white/10">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria</span>
                  </div>
                  <div className="p-4 border-r border-white/10 bg-emerald-950">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">The 3rd Academy</span>
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Traditional</span>
                  </div>
                </div>

                {/* Rows */}
                {comparisons.map((row, index) => (
                  <motion.div
                    key={row.criteria}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "grid grid-cols-3",
                      index !== comparisons.length - 1 && "border-b border-white/10"
                    )}
                  >
                    <div className="p-4 border-r border-white/10 flex items-center">
                      <span className="text-sm font-medium text-white">{row.criteria}</span>
                    </div>
                    <div className="p-4 border-r border-white/10 bg-emerald-500/5 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{row.t3a}</span>
                    </div>
                    <div className="p-4 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400/50 flex-shrink-0" />
                      <span className="text-sm text-gray-500">{row.competitors}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quote */}
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <blockquote className="text-2xl md:text-3xl font-medium text-white italic leading-relaxed">
            "The flowchart is the map. The data is the territory.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              We share the map selectively. We never share the territory.
            </span>
            "
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
