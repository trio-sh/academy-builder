import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  GraduationCap,
  Users,
  BarChart3,
  Target,
  Shield,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const features = [
  {
    icon: Target,
    title: "Career Exploration",
    description: "Interactive tools for students to discover interests, explore pathways, and set meaningful goals.",
  },
  {
    icon: Users,
    title: "Teacher Observations",
    description: "Structured forms for logging observed behaviors. Developmental, not evaluative. Building awareness, not judgment.",
  },
  {
    icon: BarChart3,
    title: "Cohort Analytics",
    description: "School-wide behavioral patterns and insights. Aggregate data to inform programming decisions.",
  },
  {
    icon: BookOpen,
    title: "Curriculum Integration",
    description: "Tools that complement existing programs. Career awareness woven into regular activities.",
  },
  {
    icon: LineChart,
    title: "Progress Tracking",
    description: "Longitudinal view of student development. Activity logs and engagement metrics over time.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "COPPA/FERPA compliant by design. Student data protected with strict access controls.",
  },
];

const benefits = [
  "Early career awareness builds better outcomes",
  "Behavioral documentation transitions to credential pathway",
  "Teacher insights inform student development",
  "Data-driven school improvement",
  "Parent visibility options",
  "Seamless graduation transition",
];

const Schools = () => {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <motion.section
          className="py-24 md:py-32 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-black to-black" />
          <motion.div
            className="absolute top-20 right-20 w-96 h-96 bg-cyan-900 rounded-full opacity-20 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 left-20 w-80 h-80 bg-purple-900 rounded-full opacity-20 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-gray-300 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                Civic Access Lab
              </motion.div>
              <motion.h1
                className="text-4xl md:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Shape Future Talent.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Build Career Awareness Early.
                </span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-400 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Engage students in career exploration and behavioral documentation
                that transitions seamlessly to the credential pathway after graduation.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-8">
                    Request Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                  Download Overview
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Important Note */}
        <motion.section
          className="py-8 relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-y border-amber-500/20" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto flex items-center gap-4 text-center md:text-left">
              <Shield className="w-8 h-8 text-amber-400 flex-shrink-0 hidden md:block" />
              <p className="text-gray-300">
                <strong className="text-amber-400">Important:</strong> Civic Access Lab is a
                <strong className="text-white"> separate institutional track</strong>. It feeds system learning but
                <strong className="text-white"> does NOT directly produce credentials</strong>. Students must enter the
                main pathway after graduation for Skill Passport eligibility.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Features */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                Platform Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Tools for Modern Career Education
                </span>
              </h2>
              <p className="text-lg text-gray-400">
                A complete platform for engaging students, empowering teachers, and
                informing school leadership.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-cyan-600 to-indigo-600" />

                  <div className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* User Types */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-900/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Built for Everyone in the School
                </span>
              </h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                {
                  title: "Students",
                  desc: "Career exploration, activity logs, self-assessments, goal setting",
                  icon: Users,
                  gradient: "from-indigo-600 to-indigo-700",
                },
                {
                  title: "Teachers",
                  desc: "Observation tools, activity assignment, behavioral logging",
                  icon: BookOpen,
                  gradient: "from-cyan-600 to-cyan-700",
                },
                {
                  title: "Administrators",
                  desc: "Aggregate analytics, account management, cohort insights",
                  icon: BarChart3,
                  gradient: "from-purple-600 to-purple-700",
                },
                {
                  title: "Parents",
                  desc: "Optional read-only access to student progress (school-configured)",
                  icon: Shield,
                  gradient: "from-pink-600 to-pink-700",
                },
              ].map((user) => (
                <motion.div key={user.title} variants={itemVariants} className="text-center p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <user.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{user.title}</h3>
                  <p className="text-sm text-gray-400">{user.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                  Why Civic Access Lab
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                    Preparing Students for Real-World Success
                  </span>
                </h2>
                <p className="text-lg text-gray-400 mb-8">
                  Early behavioral documentation creates a foundation that follows
                  students into the workforce. Build awareness now, validate later.
                </p>

                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="absolute -inset-4 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-cyan-600 to-indigo-600" />
                <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 border border-white/10 p-8 flex items-center justify-center backdrop-blur-xl">
                  <div className="text-center">
                    <GraduationCap className="w-24 h-24 text-indigo-400 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Graduation Transition
                    </h3>
                    <p className="text-gray-400">
                      Student data ports seamlessly to the main credentialing
                      pathway upon graduation.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <motion.section
          className="py-24 md:py-32 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 text-center relative z-10">
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Ready to Transform
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Career Education?
              </span>
            </motion.h2>
            <motion.p
              className="text-lg text-gray-400 max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Join schools across the country using Civic Access Lab to prepare
              students for workplace success.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 rounded-xl font-bold text-lg shadow-2xl">
                  Schedule a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Download Brochure
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
};

export default Schools;
