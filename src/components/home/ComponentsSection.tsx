import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  Users,
  Rocket,
  Briefcase,
  GraduationCap,
  Shield,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const components = [
  {
    id: "skill-passport",
    name: "Skill Passport",
    tagline: "Earned Credential",
    description:
      "Evidence-linked credential documenting assessed behavioral performance. Generated ONLY after MentorLink 'Proceed' endorsement.",
    icon: Award,
    gradient: "from-emerald-500 to-emerald-600",
    hoverGlow: "group-hover:shadow-emerald-500/30",
    features: ["Behavioral Scores", "Evidence Links", "Mentor Endorsements", "Verification QR"],
  },
  {
    id: "growth-log",
    name: "Growth Log",
    tagline: "System Spine",
    description:
      "Continuous log of behavioral growth, training completions, project outcomes, and mentor observations. Passive and append-only.",
    icon: BarChart3,
    gradient: "from-indigo-500 to-indigo-600",
    hoverGlow: "group-hover:shadow-indigo-500/30",
    features: ["Timeline View", "Auto-Logging", "Behavioral Trends", "Export History"],
  },
  {
    id: "mentorlink",
    name: "MentorLink",
    tagline: "Mandatory Gate",
    description:
      "Human validation layer where experienced professionals observe candidates. Decisions: Proceed / Redirect / Pause. No bypass allowed.",
    icon: Users,
    gradient: "from-purple-500 to-purple-600",
    hoverGlow: "group-hover:shadow-purple-500/30",
    features: ["Mentor Dashboard", "Observation Interface", "Referral System", "Quality Assurance"],
  },
  {
    id: "bridgefast",
    name: "BridgeFast",
    tagline: "Targeted Training",
    description:
      "Short-form training modules (2-4 hours) addressing specific behavioral gaps identified by mentors. Max 2 loops per candidate.",
    icon: Rocket,
    gradient: "from-orange-500 to-red-500",
    hoverGlow: "group-hover:shadow-orange-500/30",
    features: ["Module Library", "Mentor-Directed", "Interactive Content", "Completion Certificates"],
  },
  {
    id: "liveworks",
    name: "LiveWorks Studio",
    tagline: "Project Marketplace",
    description:
      "Supervised project marketplace where candidates gain real-world experience. All credentialing-path projects require mentor supervision.",
    icon: Briefcase,
    gradient: "from-pink-500 to-pink-600",
    hoverGlow: "group-hover:shadow-pink-500/30",
    features: ["Project Marketplace", "Milestone Tracking", "Payment Integration", "Dispute Resolution"],
  },
  {
    id: "civic-access",
    name: "Civic Access Lab",
    tagline: "Institutional Track",
    description:
      "'Catch them young' — engaging students in school to build career awareness. SEPARATE track that does NOT directly produce credentials.",
    icon: GraduationCap,
    gradient: "from-cyan-500 to-cyan-600",
    hoverGlow: "group-hover:shadow-cyan-500/30",
    features: ["Student Dashboard", "Career Planning", "Teacher Observation", "Cohort Analytics"],
  },
  {
    id: "talentvisa",
    name: "TalentVisa",
    tagline: "Premium Credential",
    description:
      "Late-stage, conditional, RARE credential. Tiers: Silver / Gold / Platinum. System-enforced cap at <5% of Skill Passport holders.",
    icon: Shield,
    gradient: "from-amber-400 to-amber-500",
    hoverGlow: "group-hover:shadow-amber-500/30",
    features: ["Nomination System", "Committee Review", "Premium Badge", "Rarity Controls"],
  },
  {
    id: "t3x",
    name: "T3X Talent Exchange",
    tagline: "Employer Marketplace",
    description:
      "Employer-facing marketplace where verified candidates are listed. Captures post-hire outcomes with 30/60/90-day feedback.",
    icon: Building2,
    gradient: "from-slate-400 to-slate-500",
    hoverGlow: "group-hover:shadow-slate-500/30",
    features: ["Candidate Listings", "Advanced Search", "Hiring Confirmation", "Feedback System"],
  },
];

export function ComponentsSection() {
  return (
    <motion.section
      className="py-32 relative overflow-hidden bg-black"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />

      {/* Animated background blobs */}
      <motion.div
        className="absolute top-40 left-10 w-80 h-80 bg-indigo-900 rounded-full opacity-10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-40 right-10 w-96 h-96 bg-purple-900 rounded-full opacity-10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            Platform Components
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
              8 Interconnected
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Systems
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            Every component serves two purposes: a visible function for users and
            an invisible function for system intelligence.
          </p>
        </motion.div>

        {/* Components Grid */}
        <motion.div
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {components.map((component, index) => (
            <ComponentCard key={component.id} component={component} index={index} />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={itemVariants} className="text-center mt-16">
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.4)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 rounded-xl font-bold text-lg shadow-2xl shadow-indigo-600/40 transition-all duration-300"
              asChild
            >
              <Link to="/platform">
                Explore Full Platform
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

interface ComponentCardProps {
  component: (typeof components)[0];
  index: number;
}

function ComponentCard({ component, index }: ComponentCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative"
      whileHover={{ y: -10, rotateY: 5, rotateX: 5 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Glow effect on hover */}
      <div
        className={cn(
          "absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-40 blur-xl transition-all duration-500 bg-gradient-to-r",
          component.gradient
        )}
      />

      {/* Glass card */}
      <div className="relative h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 group-hover:border-white/30 transition-all duration-500 overflow-hidden">
        {/* Icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br",
            component.gradient
          )}
        >
          <component.icon className="w-7 h-7 text-white" />
        </div>

        {/* Tagline */}
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 group-hover:text-gray-300 transition-colors">
          {component.tagline}
        </span>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white mt-1 mb-3 transition-colors">
          {component.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-300 group-hover:text-gray-300 leading-relaxed mb-6 transition-colors">
          {component.description}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {component.features.slice(0, 2).map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 text-xs rounded-full bg-white/10 text-gray-300 group-hover:bg-white/20 group-hover:text-white transition-colors"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
