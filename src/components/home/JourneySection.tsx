import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import {
  FileText,
  Users,
  Award,
  BarChart3,
  GraduationCap,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const journeySteps = [
  {
    step: "01",
    title: "Basic Profile",
    description:
      "Non-credentialed snapshot created from your resume or project participation. Not a credential — purely descriptive.",
    icon: FileText,
    gradient: "from-gray-600 to-gray-700",
    highlight: false,
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=450&fit=crop&crop=faces",
  },
  {
    step: "02",
    title: "Growth Log",
    description:
      "Passive tracking of all your interactions. Captures behavioral patterns for system learning without manual input.",
    icon: BarChart3,
    gradient: "from-indigo-600 to-indigo-700",
    highlight: false,
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop&crop=faces",
  },
  {
    step: "03",
    title: "MentorLink",
    description:
      "MANDATORY gate. Every candidate must pass through mentor review. Mentors decide: proceed, redirect, or pause.",
    icon: Users,
    gradient: "from-purple-500 to-purple-600",
    highlight: true,
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=450&fit=crop&crop=faces",
  },
  {
    step: "04",
    title: "Skill Passport",
    description:
      "EARNED credential that emerges after sustained observation. Evidence-linked to mentor observations and behavioral data.",
    icon: Award,
    gradient: "from-emerald-500 to-emerald-600",
    highlight: false,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=450&fit=crop&crop=faces",
  },
  {
    step: "05",
    title: "TalentVisa",
    description:
      "Late-stage, conditional, rare. Silver / Gold / Platinum tiers based on evidence strength. Not guaranteed.",
    icon: GraduationCap,
    gradient: "from-amber-500 to-amber-600",
    highlight: false,
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=450&fit=crop&crop=faces",
  },
  {
    step: "06",
    title: "T3X Exchange",
    description:
      "You're listed for employers. They view your TalentVisa tier and Skill Passport evidence to make hiring decisions.",
    icon: Building2,
    gradient: "from-pink-500 to-pink-600",
    highlight: false,
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=450&fit=crop&crop=faces",
  },
];

// Animated stat counter component
function AnimatedStat({ to }: { to: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  useEffect(() => {
    if (inView) {
      animate(count, to, { duration: 2, ease: "easeOut" });
    }
  }, [inView, count, to]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export function JourneySection() {
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
        className="absolute top-20 right-20 w-80 h-80 bg-purple-600 rounded-full opacity-10 blur-[100px]"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-[100px]"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            The Credentialing Journey
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">
              From Profile to
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Placement
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            Every credential is earned through sustained mentor observation — no shortcuts,
            no self-assessments. Human judgment at every critical gate.
          </p>
        </motion.div>

        {/* Journey Steps - Alternating Layout */}
        <div className="max-w-6xl mx-auto space-y-6">
          {journeySteps.map((step, index) => (
            <motion.div
              key={step.step}
              variants={itemVariants}
              className={cn(
                "group relative flex flex-col md:flex-row gap-6 items-center",
                index % 2 === 1 && "md:flex-row-reverse"
              )}
            >
              {/* Image Side */}
              <motion.div
                className="w-full md:w-1/2 relative rounded-2xl overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative h-48 md:h-56">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  <div className={cn(
                    "absolute top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                    step.gradient,
                    step.highlight && "shadow-purple-500/40"
                  )}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  {step.highlight && (
                    <span className="absolute top-4 right-4 px-3 py-1 text-xs font-bold bg-purple-950 text-white rounded-full border border-purple-500/30 backdrop-blur-sm">
                      Required Gate
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Content Side */}
              <div className="w-full md:w-1/2">
                <motion.div
                  className={cn(
                    "relative p-6 md:p-8 rounded-2xl transition-all duration-500",
                    step.highlight
                      ? "bg-black backdrop-blur-xl border-2 border-purple-500/30 group-hover:border-purple-500/50"
                      : "bg-black/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20"
                  )}
                  whileHover={{ y: -5 }}
                >
                  {step.highlight && (
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-0 group-hover:opacity-15 blur-xl transition-all duration-500" />
                  )}
                  <div className="relative">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      step.highlight ? "text-purple-400" : "text-gray-500"
                    )}>
                      Step {step.step}
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-3">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Key Principles */}
        <motion.div
          variants={itemVariants}
          className="max-w-3xl mx-auto mt-20"
        >
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-15 blur-xl transition-all duration-500" />
            <div className="relative p-8 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all duration-500">
              <h3 className="text-lg font-bold text-white mb-6 text-center">
                Architectural Principles
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Mentor-gated — no bypass allowed",
                  "Credentials are earned, not generated",
                  "Observations inform, they don't gatekeep",
                  "All outcomes feed system learning",
                ].map((principle, index) => (
                  <motion.div
                    key={principle}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{principle}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
