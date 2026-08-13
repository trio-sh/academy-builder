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
      "Behavioral Evidence Report",
      "Direct employer access via T3X",
    ],
    cta: "Start Your Journey",
    href: "/get-started",
    gradient: "from-indigo-600 to-indigo-700",
    image: "https://api.a0.dev/assets/image?text=confident%20young%20professional%20preparing%20for%20career%20with%20digital%20tools%20and%20mentor%20guidance%20modern%20vibrant%20setting&aspect=16:9&seed=stake_jobseeker",
  },
  {
    icon: Building2,
    title: "For Employers",
    description:
      "Access pre-validated candidates with proven behavioral readiness. Real results, not just keywords. Hiring supported by post-placement insights.",
    benefits: [
      "Mentor-vetted candidates",
      "Behavioral evidence, not just resumes",
      "TalentVisa access",
      "Follow-through insights after hiring",
    ],
    cta: "Explore T3X Exchange",
    href: "/employers",
    gradient: "from-purple-600 to-purple-700",
    image: "https://api.a0.dev/assets/image?text=hiring%20manager%20reviewing%20verified%20candidate%20profiles%20on%20modern%20dashboard%20with%20trust%20scores%20professional%20office&aspect=16:9&seed=stake_employer",
  },
  {
    icon: GraduationCap,
    title: "For Schools",
    description:
      "Engage students early with career awareness. Build behavioral documentation that supports students' transition into the workforce.",
    benefits: [
      "Civic Access Lab platform",
      "Teacher observation tools",
      "Cohort analytics",
      "Graduation transition path",
    ],
    cta: "Learn About Civic Access",
    href: "/schools",
    gradient: "from-pink-600 to-pink-700",
    image: "https://api.a0.dev/assets/image?text=students%20in%20modern%20school%20using%20career%20readiness%20platform%20teacher%20guiding%20interactive%20learning%20bright%20future&aspect=16:9&seed=stake_school",
  },
];

export function StakeholdersSection() {
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
        className="absolute top-1/3 left-1/4 w-80 h-80 bg-indigo-600 rounded-full opacity-10 blur-[100px]"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-[100px]"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center mb-20">
          <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
            Who We Serve
          </span>
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">
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
          {stakeholders.map((stakeholder) => {
            const isComingSoon = false;
            return (
              <motion.div
                key={stakeholder.title}
                variants={itemVariants}
                className="group relative"
                whileHover={{ y: isComingSoon ? 0 : -10 }}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute -inset-2 bg-gradient-to-r ${stakeholder.gradient} rounded-3xl opacity-0 ${isComingSoon ? "" : "group-hover:opacity-25"} blur-xl transition-all duration-500`}
                />

                {/* Glass card */}
                <div className="relative h-full bg-black/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden group-hover:border-white/20 transition-all duration-500">
                  {isComingSoon ? (
                    /* Coming Soon blur wrapper */
                    <div className="relative">
                      <div className="blur-[6px] select-none pointer-events-none">
                        {/* Image Header */}
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={stakeholder.image}
                            alt={stakeholder.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                          <div className="absolute bottom-4 left-6">
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stakeholder.gradient} flex items-center justify-center shadow-xl`}
                            >
                              <stakeholder.icon className="w-7 h-7 text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="p-6 pt-4">
                          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            {stakeholder.title}
                          </h3>
                          <p className="text-gray-400 leading-relaxed mb-6">
                            {stakeholder.description}
                          </p>
                          <ul className="space-y-3 mb-8">
                            {stakeholder.benefits.map((benefit) => (
                              <li key={benefit} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span className="text-gray-300 text-sm">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="w-full py-6 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700" />
                        </div>
                      </div>
                      {/* Coming Soon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                        <span className="px-4 py-2 rounded-full bg-black/80 text-gray-400 text-sm font-medium">Coming Soon</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Image Header */}
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={stakeholder.image}
                          alt={stakeholder.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                        {/* Icon overlay */}
                        <div className="absolute bottom-4 left-6">
                          <div
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stakeholder.gradient} flex items-center justify-center shadow-xl`}
                          >
                            <stakeholder.icon className="w-7 h-7 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 pt-4">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                          {stakeholder.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed mb-6">
                          {stakeholder.description}
                        </p>

                        {/* Benefits */}
                        <ul className="space-y-3 mb-8">
                          {stakeholder.benefits.map((benefit) => (
                            <li key={benefit} className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <span className="text-gray-300 text-sm">{benefit}</span>
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
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
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
