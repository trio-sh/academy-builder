import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

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
    <motion.section
      className="py-32 relative overflow-hidden bg-black"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />

      {/* Animated background blobs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-72 h-72 bg-emerald-900 rounded-full opacity-10 blur-3xl"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            Why We're Different
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
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

        {/* Comparison Table */}
        <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />

            <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-xl">
              {/* Header */}
              <div className="grid grid-cols-3 bg-white/5">
                <div className="p-4 md:p-6 border-r border-white/10">
                  <span className="text-sm font-medium text-gray-300">Criteria</span>
                </div>
                <div className="p-4 md:p-6 border-r border-white/10 bg-emerald-500/10">
                  <span className="text-sm font-bold text-emerald-400">The 3rd Academy</span>
                </div>
                <div className="p-4 md:p-6">
                  <span className="text-sm font-medium text-gray-300">Traditional Platforms</span>
                </div>
              </div>

              {/* Rows */}
              {comparisons.map((row, index) => (
                <motion.div
                  key={row.criteria}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "grid grid-cols-3",
                    index !== comparisons.length - 1 && "border-b border-white/10"
                  )}
                >
                  <div className="p-4 md:p-6 border-r border-white/10 flex items-center">
                    <span className="text-sm font-medium text-white">{row.criteria}</span>
                  </div>
                  <div className="p-4 md:p-6 border-r border-white/10 bg-emerald-500/5 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{row.t3a}</span>
                  </div>
                  <div className="p-4 md:p-6 flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400/50 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{row.competitors}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quote */}
        <motion.div variants={itemVariants} className="max-w-2xl mx-auto mt-16 text-center">
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
    </motion.section>
  );
}
