import { motion } from "framer-motion";
import { ArrowRight, User, Building2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

const stakeholders = [
  {
    icon: User,
    title: "For Job Seekers",
    description:
      "Go beyond your resume. Build an evidence-based behavioral profile through real observation, mentorship, and project experience.",
    benefits: [
      "Resume enhancement without bias",
      "Assigned mentor guidance",
      "Skill Passport credential",
      "Direct employer access via T3X",
    ],
    cta: "Start Your Journey",
    href: "/join",
    gradient: "from-indigo-600 to-indigo-700",
    glowColor: "indigo",
  },
  {
    icon: Building2,
    title: "For Employers",
    description:
      "Access pre-validated candidates with proven behavioral readiness. Real evidence, not just keywords. Outcome-tracked hiring.",
    benefits: [
      "Mentor-vetted candidates",
      "Behavioral evidence, not just resumes",
      "TalentVisa premium tier access",
      "30/60/90-day outcome tracking",
    ],
    cta: "Explore T3X Exchange",
    href: "/employers",
    gradient: "from-purple-600 to-purple-700",
    glowColor: "purple",
  },
  {
    icon: GraduationCap,
    title: "For Schools",
    description:
      "Engage students early with career awareness. Build behavioral documentation that transitions seamlessly to the credential pathway.",
    benefits: [
      "Civic Access Lab platform",
      "Teacher observation tools",
      "Cohort analytics",
      "Graduation transition path",
    ],
    cta: "Learn About Civic Access",
    href: "/schools",
    gradient: "from-pink-600 to-pink-700",
    glowColor: "pink",
  },
];

export function StakeholdersSection() {
  return (
    <motion.section
      className="py-32 relative overflow-hidden bg-black"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />

      {/* Animated background blobs */}
      <motion.div
        className="absolute top-1/3 left-1/4 w-64 h-64 bg-indigo-900 rounded-full opacity-10 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-900 rounded-full opacity-10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            Who We Serve
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
              Three Pathways,
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              One Ecosystem
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            Whether you're seeking your next opportunity, hiring talent, or preparing
            students for the workforce — we've built a pathway for you.
          </p>
        </motion.div>

        {/* Stakeholder Cards */}
        <motion.div variants={containerVariants} className="grid lg:grid-cols-3 gap-8">
          {stakeholders.map((stakeholder, index) => (
            <motion.div
              key={stakeholder.title}
              variants={itemVariants}
              className="group relative"
              whileHover={{ y: -10 }}
            >
              {/* Glow effect on hover */}
              <div
                className={`absolute -inset-2 bg-gradient-to-r ${stakeholder.gradient} rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500`}
              />

              {/* Glass card */}
              <div className="relative h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 group-hover:border-white/30 transition-all duration-500 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
                  <stakeholder.icon className="w-full h-full text-white" />
                </div>

                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stakeholder.gradient} flex items-center justify-center mb-8`}
                >
                  <stakeholder.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {stakeholder.title}
                </h3>
                <p className="text-gray-300 leading-relaxed mb-8">
                  {stakeholder.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-4 mb-10">
                  {stakeholder.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className={`w-full bg-gradient-to-r ${stakeholder.gradient} text-white py-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-300`}
                    asChild
                  >
                    <Link to={stakeholder.href}>
                      {stakeholder.cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
