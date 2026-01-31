import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import {
  Target,
  Shield,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2
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

const values = [
  {
    icon: Target,
    title: "Human Judgment First",
    description: "Every credential is earned through mentor observation. AI supports, but humans decide. No automated credentialing.",
  },
  {
    icon: Shield,
    title: "Earned, Not Generated",
    description: "Skill Passports emerge from sustained observation and evidence. No shortcuts, no self-assessments, no gaming.",
  },
  {
    icon: Users,
    title: "Dignity in Every Outcome",
    description: "Rejection preserves dignity. Exits are graceful. Re-entry is optional. No permanent failure labels.",
  },
  {
    icon: BarChart3,
    title: "System Learning",
    description: "Every outcome feeds the framework. The system improves without judging individuals. Data informs, never intervenes.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-black">
      <BackgroundVideo />
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
            className="absolute top-20 right-20 w-96 h-96 bg-indigo-900 rounded-full opacity-20 blur-3xl"
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
              <motion.h1
                className="text-3xl md:text-4xl font-display font-normal mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Bridging Credentials
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  and Workplace Readiness
                </span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-300 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                The 3rd Academy addresses the gap between what education provides (Layer 1 & 2)
                and what employers actually need (Layer 3) — through mentor-gated behavioral validation.
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* Mission */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                Our Mission
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Making Behavioral Readiness Observable
                </span>
              </h2>
              <div className="space-y-4 text-lg text-gray-300">
                <p>
                  Education credentials tell employers what you studied. Certifications show
                  what you passed. But neither reveals how you'll actually perform in the workplace.
                </p>
                <p>
                  The 3rd Academy fills this gap with a mentor-gated system that observes,
                  documents, and validates behavioral readiness over time. Not through AI scores
                  or self-assessments, but through sustained human observation.
                </p>
                <p>
                  The result? Candidates with evidence-backed credentials. Employers with
                  confidence in their hires. Schools with tools to prepare students early.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values */}
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
              <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                Our Values
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Architecture as Philosophy
                </span>
              </h2>
              <p className="text-lg text-gray-300">
                Every technical decision reflects a human value. Our architecture is our ethics.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  variants={itemVariants}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {value.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* The Moat */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Our Competitive Moat
                </span>
              </h2>
              <p className="text-lg text-gray-300">
                A competitor can replicate our interface in weeks. They cannot replicate
                years of judgment-outcome correlations.
              </p>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div
                variants={itemVariants}
                className="group relative"
              >
                <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="relative p-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Mentor Decision Patterns
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Every proceed/redirect/pause decision correlated with eventual hiring outcomes.
                    We learn which mentor judgments actually predict workplace success.
                  </p>
                  <p className="text-sm text-amber-400 font-medium">
                    Requires years of data to replicate.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="group relative"
              >
                <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />
                <div className="relative p-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Behavioral Fingerprint
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Passive interaction patterns correlated with real employment outcomes.
                    We learn which behaviors predict success, dropout, and even gaming attempts.
                  </p>
                  <p className="text-sm text-indigo-400 font-medium">
                    Requires scale + time to build.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="max-w-2xl mx-auto mt-12 relative group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="absolute -inset-2 rounded-3xl opacity-20 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
              <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-xl">
                <blockquote className="text-lg font-medium text-white italic">
                  "The flowchart is the map. The data is the territory.
                  We share the map selectively. We never share the territory."
                </blockquote>
              </div>
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
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Join the Movement
              </span>
            </motion.h2>
            <motion.p
              className="text-lg text-gray-300 max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Whether you're a candidate seeking validation, an employer seeking confidence,
              or an educator preparing students — there's a place for you.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 rounded-xl font-bold text-lg shadow-2xl" asChild>
                <Link to="/join">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
