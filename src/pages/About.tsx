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
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const values = [
  {
    icon: Users,
    title: "Human Judgment Above All",
    description: "Every credential is earned through rigorous mentor observation. AI assists, but humans make the final call—no automated shortcuts.",
  },
  {
    icon: Shield,
    title: "Credentials Must Be Earned",
    description: "Skill Passports emerge from sustained observation and documented evidence. No self-assessments, no gaming the system.",
  },
  {
    icon: Target,
    title: "Dignity in Every Outcome",
    description: "Rejection is delivered with respect. Exits are graceful. Re-entry is always an option. No permanent labels, no closed doors.",
  },
  {
    icon: BarChart3,
    title: "Continuous System Learning",
    description: "Every outcome strengthens the framework. The system evolves without judging individuals—data informs, never punishes.",
  },
];

const stats = [
  { value: "10K+", label: "Candidates Validated" },
  { value: "500+", label: "Employer Partners" },
  { value: "200+", label: "School Partners" },
  { value: "95%", label: "Satisfaction Rate" },
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
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black border border-white/30 text-sm text-white mb-6"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                The 3rd Academy
              </motion.div>
              <motion.h1
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              >
                <span className="text-white">
                  Bridging the Gap Between
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Credentials and Readiness
                </span>
              </motion.h1>
              <motion.p
                className="text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed"
              >
                Education tells employers what you studied. Certifications show what you passed.
                <span className="font-bold"> We prove what you can actually do.</span>
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="py-12 bg-black border-y border-white/10">
          <div className="container px-4 md:px-6">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
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

        {/* Mission */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div
                className="text-center mb-12 p-10 rounded-3xl bg-black border border-white/30"
              >
                <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                  Our Mission
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Making Behavioral Readiness Measurable
                </h2>
              </motion.div>

              <div className="relative p-10 rounded-3xl bg-black border border-white/30">
                <div className="space-y-6 text-lg text-white leading-relaxed">
                  <p>
                    Traditional credentials tell employers what you studied. Certifications show what tests you passed.
                    But <strong>neither reveals how you'll actually perform in the workplace.</strong>
                  </p>
                  <p>
                    The 3rd Academy fills this gap with a mentor-gated validation system that observes, documents,
                    and certifies behavioral readiness over time. Not through AI scores or self-assessments—
                    <strong> through sustained human observation by experienced professionals.</strong>
                  </p>
                  <p>
                    The result? <strong>Candidates with evidence-backed credentials.</strong> Employers with confidence in their hires.
                    Schools with tools to prepare students from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
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
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Our Principles
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Architecture as Philosophy
              </h2>
              <p className="text-lg text-white">
                Every technical decision reflects a human value. Our architecture is our ethics.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            >
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  className="group relative"
                >
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-black border border-white/30 hover:border-white/50 transition-all duration-300">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-600/30">
                      <value.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {value.title}
                    </h3>
                    <p className="text-white leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-950 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Built for Everyone
                </span>
              </h2>
              <p className="text-lg text-white">
                Three pathways, one ecosystem—designed for candidates, employers, and educators.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {[
                {
                  title: "For Candidates",
                  desc: "Earn validated credentials through mentor observation. Build a Skill Passport that proves workplace readiness.",
                  link: "/get-started",
                  icon: Users,
                  gradient: "from-indigo-600 to-indigo-700",
                },
                {
                  title: "For Employers",
                  desc: "Access pre-validated talent with evidence-backed behavioral profiles. Hire with confidence, reduce turnover.",
                  link: "/employers",
                  icon: TrendingUp,
                  gradient: "from-purple-600 to-purple-700",
                },
                {
                  title: "For Schools",
                  desc: "Prepare students early with career awareness tools. Build longitudinal profiles that transition seamlessly.",
                  link: "/schools",
                  icon: Target,
                  gradient: "from-pink-600 to-pink-700",
                },
              ].map((item) => (
                <motion.div key={item.title} className="group relative">
                  <div className={`absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 bg-gradient-to-r ${item.gradient}`} />
                  <div className="relative p-8 rounded-2xl bg-black border border-white/30 hover:border-white/50 transition-all duration-300 h-full flex flex-col">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-white mb-3 text-2xl text-center">{item.title}</h3>
                    <p className="text-white leading-relaxed text-center mb-6 flex-grow">{item.desc}</p>
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold"
                      asChild
                    >
                      <Link to={item.link}>
                        Learn More
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <motion.section
          className="py-24 md:py-32 relative overflow-hidden"
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
            >
              <span className="text-white">
                Ready to Join
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                The Movement?
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-white max-w-2xl mx-auto mb-12"
            >
              Whether you're seeking validation, hiring talent, or educating students—
              there's a place for you in our ecosystem.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-12 py-7 rounded-xl font-bold text-lg shadow-2xl" asChild>
                  <Link to="/get-started">
                    Get Started Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-12 py-7 rounded-xl text-lg" asChild>
                <Link to="/contact">
                  Contact Us
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
