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
  TrendingUp,
  Clock,
  Zap,
  Target,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Shield,
    title: "Pre-Validated Talent",
    description: "Every candidate has been rigorously assessed by experienced industry mentors—no guesswork, no resume inflation.",
  },
  {
    icon: Award,
    title: "Evidence-Based Credentials",
    description: "Access detailed behavioral profiles backed by real observations, project work, and mentor endorsements.",
  },
  {
    icon: TrendingUp,
    title: "Reduced Turnover",
    description: "Behavioral screening reduces bad hires by up to 60%, saving your organization time and recruitment costs.",
  },
  {
    icon: BarChart3,
    title: "Continuous Intelligence",
    description: "Your hiring feedback improves our algorithm, delivering increasingly better-matched candidates over time.",
  },
];

const stats = [
  { value: "60%", label: "Reduction in Bad Hires" },
  { value: "10K+", label: "Verified Candidates" },
  { value: "500+", label: "Hiring Partners" },
  { value: "4.8/5", label: "Employer Satisfaction" },
];

const tiers = [
  {
    name: "Starter",
    description: "Perfect for small teams testing the platform",
    price: "Free",
    features: [
      "Browse up to 50 candidate profiles/month",
      "Basic behavioral score visibility",
      "Standard search filters",
      "5 connection requests/month",
      "Email support",
    ],
    cta: "Start Free",
    href: "/get-started",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing teams hiring regularly",
    price: "$799",
    period: "/month",
    features: [
      "Unlimited candidate browsing",
      "Advanced behavioral insights & analytics",
      "TalentVisa premium candidate access",
      "Unlimited connection requests",
      "Priority candidate responses",
      "Dedicated account manager",
      "API integration access",
    ],
    cta: "Get Started",
    href: "/contact",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price: "Custom",
    features: [
      "Everything in Professional",
      "White-label platform options",
      "Custom behavioral assessments",
      "Bulk hiring workflows",
      "On-site mentor training",
      "SLA with 99.9% uptime guarantee",
      "Dedicated success team",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "We've slashed our time-to-hire by 40% and virtually eliminated first-year turnover. The behavioral data is a game-changer.",
    author: "Sarah Mitchell",
    role: "Chief People Officer",
    company: "Vertex Technologies",
    rating: 5,
  },
  {
    quote: "The quality of T3X candidates is unmatched. These aren't just skilled workers—they're workplace-ready professionals who integrate seamlessly.",
    author: "David Chen",
    role: "VP of Talent Acquisition",
    company: "Quantum Dynamics",
    rating: 5,
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
              <div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black border border-white/30 text-sm text-white mb-6"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                T3X Talent Exchange
              </div>
              <h1
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              >
                <span className="text-white">
                  Hire Smarter.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Scale Faster.
                </span>
              </h1>
              <p
                className="text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed"
              >
                Access a curated marketplace of pre-validated, workplace-ready candidates.
                Every profile backed by mentor observations and behavioral evidence—not just resumes.
              </p>
              <div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 text-base font-semibold shadow-2xl" asChild>
                    <Link to="/get-started">
                      Start Hiring Today
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 px-10 py-6 text-base" asChild>
                  <Link to="/contact">
                    <Clock className="mr-2 h-5 w-5" />
                    Schedule Demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="py-12 bg-black border-y border-white/10">
          <div className="container px-4 md:px-6">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Why Leading Companies Choose T3X
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                The Future of Talent Acquisition
              </h2>
              <p className="text-lg text-white max-w-2xl mx-auto">
                Traditional hiring relies on resumes and gut feelings. We deliver
                data-backed insights from real-world behavioral validation.
              </p>
            </div>

            <div
              className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            >
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="group relative"
                >
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-black border border-white/30 hover:border-white/50 transition-all duration-300">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-600/30">
                      <benefit.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-white leading-relaxed text-base">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-900/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Simple & Streamlined
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Your Hiring Journey
              </h2>
            </div>

            <div
              className="max-w-5xl mx-auto"
            >
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { step: "1", icon: Target, title: "Search & Filter", desc: "Use advanced filters to find candidates matching your exact requirements" },
                  { step: "2", icon: Award, title: "Review Evidence", desc: "Explore detailed Skill Passports with mentor endorsements and behavioral data" },
                  { step: "3", icon: Users, title: "Connect & Interview", desc: "Send connection requests and schedule interviews with pre-qualified talent" },
                  { step: "4", icon: Zap, title: "Hire & Track", desc: "Confirm hires and provide feedback to improve future recommendations" },
                ].map((item, index) => (
                  <div key={item.step} className="relative text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-3 text-lg">{item.title}</h3>
                    <p className="text-sm text-white leading-relaxed">{item.desc}</p>
                    {index < 3 && (
                      <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-gradient-to-r from-indigo-600/50 to-purple-600/50" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
            >
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Transparent Pricing
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Plans That Scale With You
              </h2>
              <p className="text-lg text-white">
                Start free, upgrade when ready. No hidden fees, cancel anytime.
              </p>
            </div>

            <div
              className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className="group relative"
                >
                  {tier.popular && (
                    <div className="absolute -inset-2 rounded-3xl opacity-40 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
                  )}

                  <div className={cn(
                    "relative p-8 rounded-2xl border transition-all duration-300 h-full flex flex-col",
                    tier.popular
                      ? "border-indigo-500/60 bg-black"
                      : "border-white/30 bg-black hover:border-white/50"
                  )}>
                    {tier.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {tier.name}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {tier.description}
                      </p>
                    </div>

                    <div className="mb-8">
                      <span className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-white/70 text-lg">{tier.period}</span>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8 flex-grow">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-white text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full text-base font-semibold py-6",
                        tier.popular
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
                          : "border-white/30 text-white hover:bg-white/10"
                      )}
                      variant={tier.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link to={tier.href}>
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-950 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <div
              className="max-w-3xl mx-auto text-center mb-16 p-10 rounded-3xl bg-black border border-white/30"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Trusted by Industry Leaders
                </span>
              </h2>
              <p className="text-lg text-white">
                See what hiring professionals are saying about T3X
              </p>
            </div>

            <div
              className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            >
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.author}
                  className="group relative"
                >
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-600" />

                  <div className="relative p-8 rounded-2xl bg-black border border-white/30 hover:border-white/50 transition-all duration-300">
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-lg text-white mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-white">{testimonial.author}</p>
                        <p className="text-sm text-white/70">
                          {testimonial.role}, {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="py-24 md:py-32 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-950 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 text-center relative z-10">
            <h2
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              <span className="text-white">
                Ready to Transform
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Hiring Process?
              </span>
            </h2>
            <p
              className="text-xl text-white max-w-2xl mx-auto mb-12"
            >
              Join 500+ companies hiring smarter with evidence-based talent validation.
            </p>
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-12 py-7 rounded-xl font-bold text-lg shadow-2xl" asChild>
                  <Link to="/get-started">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-12 py-7 rounded-xl text-lg" asChild>
                <Link to="/contact">
                  <Clock className="mr-2 h-5 w-5" />
                  Schedule Demo
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Employers;
