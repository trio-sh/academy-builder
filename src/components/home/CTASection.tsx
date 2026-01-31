import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
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
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

export function CTASection() {
  return (
    <motion.section
      className="py-32 bg-black relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div variants={itemVariants} className="relative max-w-4xl mx-auto">
          {/* Outer glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-[40px] opacity-20 blur-2xl" />

          {/* Main card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-black" />

            {/* Decorative Elements */}
            <motion.div
              className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <div className="relative z-10 p-12 md:p-20 text-center">
              {/* Badge */}
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-sm text-white mb-8"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Begin Your Credential Journey
              </motion.div>

              {/* Headline */}
              <motion.h2
                variants={itemVariants}
                className="text-3xl md:text-4xl font-display font-normal mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Ready to Prove Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Workplace Readiness?
                </span>
              </motion.h2>

              {/* Description */}
              <motion.p
                variants={itemVariants}
                className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed font-serif"
              >
                Join The 3rd Academy today. Upload your resume, get matched with a mentor,
                and start building your Skill Passport through evidence-based observation.
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300"
                    asChild
                  >
                    <Link to="/join">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-white/30 text-white px-10 py-6 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-xl"
                    asChild
                  >
                    <Link to="/platform">Learn More</Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Trust Signal */}
              <motion.p variants={itemVariants} className="mt-10 text-gray-300">
                No credit card required · Mentor-matched within 48 hours
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
