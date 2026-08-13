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
    criteria: "The question asked",
    t3a: "How does conduct show up when the job goes sideways?",
    competitors: "Can this person demonstrate the capability required for the role or task?",
    note: "Doing the job well and being trusted at work are not the same thing.",
  },
  {
    criteria: "Practice",
    t3a: "Private rehearsal is kept separate from evidence",
    competitors: "Practice and evaluation happen inside the same exercise",
    note: "If practising is being judged, people perform instead of learning.",
  },
  {
    criteria: "What you receive",
    t3a: "A dated record of observed conduct",
    competitors: "Evidence of capability or proficiency",
    note: "A result requires people to accept a conclusion. A record lets them see what happened.",
  },
  {
    criteria: "How evidence builds",
    t3a: "Evidence accumulates across situations and over time",
    competitors: "The result reflects a defined occasion",
    note: "A single response shows a moment. A pattern needs more than one.",
  },
  {
    criteria: "When evidence differs",
    t3a: "Differences remain visible in the record",
    competitors: "Differences are resolved into a single result",
    note: "One number hides the moment you struggled inside the ones you did not.",
  },
  {
    criteria: "Limits",
    t3a: "The record says what the evidence supports, and where it stops",
    competitors: "The result stands on its own terms",
    note: "When limits go unstated, absence of evidence looks like evidence.",
  },
  {
    criteria: "If it is wrong",
    t3a: "You read every line and can challenge it",
    competitors: "The result goes to whoever commissioned it",
    note: "An error nobody can see is an error nobody can correct.",
  },
];

export function DifferentiatorSection() {
  return (
    <motion.section
      className="py-32 relative overflow-hidden bg-black"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
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
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            A Different Question
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
            Others test a moment. We document behaviour across workplace pressure moments —
            with accountable human confirmation.
          </p>
          <p className="text-base md:text-lg text-gray-400 leading-relaxed mt-6 max-w-2xl mx-auto">
            We do not ask only whether someone can perform the task. We govern how observed
            conduct becomes evidence.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: Image */}
          <motion.div variants={itemVariants} className="relative">
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
          <motion.div variants={itemVariants}>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />

              <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-black/60 backdrop-blur-xl">
                {/* Desktop Table - Hidden on Mobile */}
                <div className="hidden md:block">
                  {/* Header */}
                  <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr] bg-black">
                    <div className="p-4 border-r border-white/10">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria</span>
                    </div>
                    <div className="p-4 border-r border-white/10 bg-emerald-500/10">
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
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        index !== comparisons.length - 1 && "border-b border-white/10"
                      )}
                    >
                      <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr]">
                        <div className="p-4 border-r border-white/10 flex items-start">
                          <span className="text-sm font-medium text-white leading-relaxed">{row.criteria}</span>
                        </div>
                        <div className="p-4 border-r border-white/10 bg-emerald-500/5 flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300 leading-relaxed">{row.t3a}</span>
                        </div>
                        <div className="p-4 flex items-start gap-3">
                          <X className="w-5 h-5 text-red-400/50 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-500 leading-relaxed">{row.competitors}</span>
                        </div>
                      </div>
                      {row.note && (
                        <div className="px-4 pb-4 pt-0 text-xs italic text-gray-400 leading-relaxed">
                          {row.note}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Cards - Shown on Mobile */}
                <div className="md:hidden space-y-4 p-4">
                  {comparisons.map((row, index) => (
                    <motion.div
                      key={row.criteria}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-2xl border border-white/10 overflow-hidden bg-black/40"
                    >
                      {/* Criteria Header */}
                      <div className="p-4 bg-black border-b border-white/10">
                        <span className="text-sm font-semibold text-white">{row.criteria}</span>
                      </div>

                      {/* The 3rd Academy */}
                      <div className="p-4 bg-emerald-500/5 border-b border-white/10">
                        <div className="flex items-start gap-3 mb-2">
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">The 3rd Academy</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed ml-8">{row.t3a}</p>
                      </div>

                      {/* Traditional */}
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-2">
                          <X className="w-5 h-5 text-red-400/50 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Traditional</span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed ml-8">{row.competitors}</p>
                      </div>
                      {row.note && (
                        <div className="px-4 py-3 border-t border-white/10 text-xs italic text-gray-400 leading-relaxed">
                          {row.note}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quote */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto mt-20 text-center">
          <blockquote className="text-2xl md:text-3xl font-medium text-white italic leading-relaxed">
            A badge says what you completed. A score says how you were rated.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              A Behavioral Evidence Report shows how you conducted yourself when the work stopped going to plan.
            </span>
          </blockquote>
        </motion.div>
      </div>
    </motion.section>
  );
}
