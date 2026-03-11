import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
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
  TrendingUp,
  Award,
  Globe,
  Lightbulb
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
    icon: Lightbulb,
    title: "Career Discovery",
    description: "Interactive tools that help students explore interests, discover pathways, and build meaningful career awareness early.",
  },
  {
    icon: Users,
    title: "Teacher Dashboard",
    description: "Streamlined observation tools for documenting student behaviors—developmental insights, not evaluative judgments.",
  },
  {
    icon: BarChart3,
    title: "School Analytics",
    description: "Aggregate behavioral trends and cohort insights to inform programming decisions and improve student outcomes.",
  },
  {
    icon: Shield,
    title: "Privacy & Compliance",
    description: "Built with COPPA and FERPA compliance at the core. Student data is protected with enterprise-grade security.",
  },
  {
    icon: Globe,
    title: "Seamless Integration",
    description: "Works alongside your existing curriculum and student information systems—no disruption, just enhancement.",
  },
  {
    icon: TrendingUp,
    title: "Graduation Pathway",
    description: "Student data transitions seamlessly to The 3rd Academy's credentialing pathway upon graduation.",
  },
];

const stats = [
  { value: "15K+", label: "Students Enrolled" },
  { value: "200+", label: "Partner Schools" },
  { value: "95%", label: "Teacher Satisfaction" },
  { value: "3.5x", label: "Career Awareness Increase" },
];

const benefits = [
  "Prepare students for real-world workplace expectations",
  "Build longitudinal behavioral profiles from day one",
  "Empower teachers with structured observation tools",
  "Gain data-driven insights for program improvement",
  "Enable optional parent visibility into student progress",
  "Create seamless transitions from school to workforce",
];

const Schools = () => {
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
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black border border-white/30 text-sm text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                Civic Access Lab
              </motion.div>
              <motion.h1
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-white">
                  Prepare Students.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Transform Futures.
                </span>
              </motion.h1>
              <motion.p
                className="text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Build career awareness early with tools that engage students, empower teachers,
                and create pathways from classroom to workplace.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 text-base font-semibold shadow-2xl" asChild>
                    <Link to="/contact">
                      Schedule a Tour
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 px-10 py-6 text-base" asChild>
                  <Link to="/contact">
                    Download Brochure
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Important Note */}
        <motion.section
          className="py-8 relative border-y border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto flex items-start gap-4">
              <Shield className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div className="text-white">
                <strong className="text-amber-400">Important:</strong> Civic Access Lab operates as a
                <strong> separate institutional track</strong> designed for K-12 schools. While student data
                contributes to system learning, it <strong>does not directly produce credentials</strong>. Students
                must transition to the main pathway after graduation to pursue Skill Passport certification.
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="py-16 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Comprehensive Platform
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-white max-w-2xl mx-auto">
                A complete ecosystem designed for students, teachers, and administrators
                to foster career readiness from the ground up.
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
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 bg-gradient-to-r from-cyan-600 to-indigo-600" />

                  <div className="relative p-8 rounded-2xl bg-black border border-white/30 hover:border-white/50 transition-all duration-300 h-full">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-cyan-600/30">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-white leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* User Roles */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-900/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                For Everyone
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Built for Your Entire Community
              </h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                {
                  title: "Students",
                  desc: "Explore careers, track progress, set goals, build awareness for future success",
                  icon: Users,
                  gradient: "from-indigo-600 to-indigo-700",
                },
                {
                  title: "Teachers",
                  desc: "Document observations, assign activities, support student development",
                  icon: BookOpen,
                  gradient: "from-cyan-600 to-cyan-700",
                },
                {
                  title: "Administrators",
                  desc: "View analytics, manage accounts, track cohort trends, measure outcomes",
                  icon: BarChart3,
                  gradient: "from-purple-600 to-purple-700",
                },
                {
                  title: "Parents",
                  desc: "Optional read-only access to student progress and development milestones",
                  icon: Shield,
                  gradient: "from-pink-600 to-pink-700",
                },
              ].map((user) => (
                <motion.div key={user.title} variants={itemVariants} className="text-center p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.gradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                    <user.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-3 text-lg">{user.title}</h3>
                  <p className="text-sm text-white leading-relaxed">{user.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative p-10 rounded-3xl bg-black border border-white/30"
              >
                <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                  The Civic Access Lab Advantage
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                  Preparing Tomorrow's Workforce Today
                </h2>
                <p className="text-lg text-white mb-8 leading-relaxed">
                  Early behavioral documentation creates a foundation that follows students
                  throughout their careers. Build awareness now, validate competency later.
                </p>

                <ul className="space-y-4 mb-10">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white text-base">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-6 text-base font-semibold shadow-lg shadow-indigo-600/30" asChild>
                    <Link to="/contact">
                      Learn More
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="absolute -inset-4 rounded-3xl opacity-40 blur-xl bg-gradient-to-r from-cyan-600 to-indigo-600" />
                <div className="relative rounded-3xl bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 border border-white/30 p-12">
                  <div className="text-center">
                    <Award className="w-20 h-20 text-indigo-400 mx-auto mb-6" />
                    <h3 className="text-3xl font-bold text-white mb-4">
                      Seamless Transition
                    </h3>
                    <p className="text-white leading-relaxed text-lg">
                      Upon graduation, student profiles and behavioral data transfer
                      directly to The 3rd Academy's credentialing pathway—creating
                      a continuous journey from school to workforce.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-950 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative p-12 rounded-3xl bg-black border border-white/30">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                </div>
                <blockquote className="text-2xl text-white mb-8 leading-relaxed text-center italic">
                  "Civic Access Lab has transformed how we approach career education. Our students
                  are more engaged, teachers have better insights, and we're seeing measurable
                  improvements in post-graduation outcomes."
                </blockquote>
                <div className="text-center">
                  <p className="font-bold text-white text-lg">Dr. Jennifer Martinez</p>
                  <p className="text-white/70">
                    Principal, Washington Heights Academy
                  </p>
                </div>
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-950 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 text-center relative z-10">
            <motion.h2
              className="text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-white">
                Ready to Empower
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Students?
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-white max-w-2xl mx-auto mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Join 200+ schools building the workforce of tomorrow with
              evidence-based career readiness education.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-12 py-7 rounded-xl font-bold text-lg shadow-2xl" asChild>
                  <Link to="/contact">
                    Schedule a Tour
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-12 py-7 rounded-xl text-lg" asChild>
                <Link to="/contact">
                  Download Materials
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

export default Schools;
