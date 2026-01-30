import { motion } from "framer-motion";
import { ArrowRight, FileText, Users, Briefcase, Sparkles } from "lucide-react";
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

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-40"
        >
          <source
            src="https://bloujipdkyjsgzwxnoej.supabase.co/storage/v1/object/public/storage/homelivebg.mp4"
            type="video/mp4"
          />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Animated Background Blobs */}
      <motion.div
        className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-900 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-900 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-950 rounded-full opacity-30 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <motion.div
        className="relative container px-4 md:px-6 pt-32 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-gray-300 mb-8"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Mentor-Gated Behavioral Validation
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-3xl md:text-5xl font-display font-normal leading-tight mb-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Beyond Credentials.
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Workplace Ready.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-serif"
          >
            The 3rd Academy bridges the gap between what your resume says and what
            employers actually need — through sustained mentor observation and
            evidence-based behavioral validation.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 rounded-xl font-bold text-lg shadow-2xl shadow-indigo-600/40 transition-all duration-300"
                asChild
              >
                <Link to="/join">
                  Start Your Journey
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
                className="w-full sm:w-auto border-2 border-white/20 text-white px-10 py-6 rounded-xl font-bold text-lg hover:bg-white hover:text-indigo-900 transition-all duration-300 backdrop-blur-xl"
                asChild
              >
                <Link to="/employers">For Employers</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Entry Points Cards */}
          <motion.div
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-6"
          >
            <EntryPointCard
              icon={<FileText className="w-6 h-6" />}
              title="Resume Upload"
              description="Start with your resume. Our enhancer identifies areas for mentor focus."
              entry="Entry A"
              delay={0}
            />
            <EntryPointCard
              icon={<Users className="w-6 h-6" />}
              title="Civic Access Lab"
              description="For schools — engage students early in career awareness."
              entry="Entry B"
              delay={0.1}
            />
            <EntryPointCard
              icon={<Briefcase className="w-6 h-6" />}
              title="LiveWorks Studio"
              description="Complete real projects under mentor supervision."
              entry="Entry C"
              delay={0.2}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

interface EntryPointCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  entry: string;
  delay: number;
}

function EntryPointCard({ icon, title, description, entry, delay }: EntryPointCardProps) {
  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 + delay }}
      whileHover={{ y: -10, rotateY: 5, rotateX: 5 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />

      {/* Glass card */}
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 group-hover:border-white/30 transition-all duration-500 text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400">
            {icon}
          </div>
          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {entry}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
