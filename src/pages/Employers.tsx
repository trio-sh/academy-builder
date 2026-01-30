import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import {
  CheckCircle2,
  Users,
  Award,
  BarChart3,
  Shield,
  Building2,
  ArrowRight,
  Star,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

const benefits = [
  {
    icon: Users,
    title: "Mentor-Vetted Candidates",
    description: "Every candidate has been observed by experienced professionals. No self-assessments or AI-generated credentials.",
  },
  {
    icon: Award,
    title: "Evidence-Based Profiles",
    description: "See actual behavioral evidence, not just resume keywords. Each Skill Passport links to real observations and outcomes.",
  },
  {
    icon: BarChart3,
    title: "Outcome Tracking",
    description: "Your 30/60/90-day feedback improves the system. Better candidates over time, calibrated to your actual needs.",
  },
  {
    icon: Shield,
    title: "TalentVisa Premium Access",
    description: "Access the top <5% of candidates with exceptional behavioral performance. Rare, conditional, and verified.",
  },
];

const tiers = [
  {
    name: "Standard",
    description: "Access Skill Passport holders",
    price: "Free",
    features: [
      "Browse candidate listings",
      "View behavioral scores",
      "Send connection requests",
      "Basic search filters",
      "Hiring confirmation",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    description: "Full platform access",
    price: "$499",
    period: "/month",
    features: [
      "Everything in Standard",
      "TalentVisa candidate access",
      "Advanced search & filters",
      "Priority connection requests",
      "Dedicated account manager",
      "API access",
    ],
    cta: "Contact Sales",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Custom solutions",
    price: "Custom",
    features: [
      "Everything in Premium",
      "Custom integrations",
      "Bulk hiring tools",
      "White-label options",
      "On-site training",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "The quality of candidates from T3X is remarkable. The behavioral evidence gives us confidence before we even interview.",
    author: "Sarah Chen",
    role: "VP of Talent",
    company: "TechCorp Inc.",
  },
  {
    quote: "We've reduced our bad-hire rate by 60% since switching to T3X. The mentor-gated process actually works.",
    author: "Marcus Johnson",
    role: "Head of HR",
    company: "Growth Dynamics",
  },
];

const Employers = () => {
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
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-gray-300 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                T3X Talent Exchange
              </motion.div>
              <motion.h1
                className="text-3xl md:text-4xl font-display font-normal mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Hire with Confidence.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Evidence, Not Guesswork.
                </span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-400 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Access pre-validated candidates with proven behavioral readiness.
                Every listing backed by mentor observations, not self-reported skills.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-8">
                    Start Hiring
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                  See Demo
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Benefits */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                Why T3X
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Hiring That Actually Works
                </span>
              </h2>
              <p className="text-lg text-gray-400">
                Traditional hiring relies on resumes and interviews. We provide
                sustained behavioral evidence from mentor observation.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  variants={itemVariants}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
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
                How It Works
              </span>
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Your Hiring Process
                </span>
              </h2>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: "1", title: "Search", desc: "Filter by skills, experience, and readiness tier" },
                  { step: "2", title: "Review", desc: "View Skill Passport evidence and mentor endorsements" },
                  { step: "3", title: "Connect", desc: "Send connection requests to candidates" },
                  { step: "4", title: "Hire", desc: "Confirm hire and provide 30/60/90-day feedback" },
                ].map((item, index) => (
                  <motion.div key={item.step} variants={itemVariants} className="relative text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4 shadow-lg shadow-indigo-600/30">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                    {index < 3 && (
                      <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-gradient-to-r from-indigo-600/50 to-purple-600/50" />
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 md:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-3">
                Pricing
              </span>
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Plans for Every Organization
                </span>
              </h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {tiers.map((tier) => (
                <motion.div
                  key={tier.name}
                  variants={itemVariants}
                  className="group relative"
                >
                  {/* Glow effect */}
                  {tier.popular && (
                    <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
                  )}

                  <div className={cn(
                    "relative p-8 rounded-2xl border transition-all duration-300",
                    tier.popular
                      ? "border-indigo-500/50 bg-white/10 backdrop-blur-xl"
                      : "border-white/10 bg-white/5 backdrop-blur-xl hover:border-white/20"
                  )}>
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <h3 className="text-xl font-semibold text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {tier.description}
                    </p>

                    <div className="mb-6">
                      <span className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{tier.price}</span>
                      {tier.period && (
                        <span className="text-gray-400">{tier.period}</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full",
                        tier.popular
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                          : "border-white/20 text-white hover:bg-white/10"
                      )}
                      variant={tier.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link to={tier.cta === "Get Started" ? "/join" : "/contact"}>
                        {tier.cta}
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  What Employers Say
                </span>
              </h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.author}
                  variants={itemVariants}
                  className="group relative"
                >
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-lg text-gray-300 mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    <div>
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-sm text-gray-400">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
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
                Your Hiring?
              </span>
            </motion.h2>
            <motion.p
              className="text-lg text-gray-400 max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Join leading companies who trust T3X for evidence-based hiring decisions.
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
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Clock className="mr-2 h-4 w-4" />
                Schedule Demo
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
};

export default Employers;
