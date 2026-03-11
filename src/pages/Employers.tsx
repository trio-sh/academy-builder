import { Header } from "@/components/layout/Header";
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
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-600 border border-indigo-500 text-sm text-white mb-6">
                <Building2 className="w-4 h-4" />
                T3X Talent Exchange
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-white">
                  Hire Smarter.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Scale Faster.
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                Access a curated marketplace of pre-validated, workplace-ready candidates.
                Every profile backed by mentor observations and behavioral evidence—not just resumes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 text-base font-semibold" asChild>
                  <Link to="/get-started">
                    Start Hiring Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-700 text-white hover:bg-gray-900 px-10 py-6 text-base" asChild>
                  <Link to="/contact">
                    <Clock className="mr-2 h-5 w-5" />
                    Schedule Demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-y border-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 md:py-28 bg-black">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Why Leading Companies Choose T3X
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                The Future of Talent Acquisition
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Traditional hiring relies on resumes and gut feelings. We deliver
                data-backed insights from real-world behavioral validation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="p-8 rounded-2xl bg-gray-950 border border-gray-800 hover:border-indigo-500"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-5">
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-base">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28 border-t border-gray-800">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Simple & Streamlined
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Your Hiring Journey
              </h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { step: "1", icon: Target, title: "Search & Filter", desc: "Use advanced filters to find candidates matching your exact requirements" },
                  { step: "2", icon: Award, title: "Review Evidence", desc: "Explore detailed Skill Passports with mentor endorsements and behavioral data" },
                  { step: "3", icon: Users, title: "Connect & Interview", desc: "Send connection requests and schedule interviews with pre-qualified talent" },
                  { step: "4", icon: Zap, title: "Hire & Track", desc: "Confirm hires and provide feedback to improve future recommendations" },
                ].map((item) => (
                  <div key={item.step} className="relative text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-3 text-lg">{item.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 md:py-28 bg-black border-t border-gray-800">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                Transparent Pricing
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Plans That Scale With You
              </h2>
              <p className="text-lg text-gray-300">
                Start free, upgrade when ready. No hidden fees, cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    "p-8 rounded-2xl border h-full flex flex-col",
                    tier.popular
                      ? "border-indigo-500 bg-gray-950"
                      : "border-gray-800 bg-gray-950 hover:border-indigo-500"
                  )}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mb-8">
                    <span className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray-400 text-lg">{tier.period}</span>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full text-base font-semibold py-6",
                      tier.popular
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        : "border-gray-700 text-white hover:bg-gray-900"
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
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28 border-t border-gray-800">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Trusted by Industry Leaders
                </span>
              </h2>
              <p className="text-lg text-gray-300">
                See what hiring professionals are saying about T3X
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.author}
                  className="p-8 rounded-2xl bg-gray-950 border border-gray-800 hover:border-indigo-500"
                >
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-300 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-white">{testimonial.author}</p>
                      <p className="text-sm text-gray-400">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 md:py-32 border-t border-gray-800">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">
                Ready to Transform
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Hiring Process?
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
              Join 500+ companies hiring smarter with evidence-based talent validation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 px-12 py-7 rounded-xl font-bold text-lg" asChild>
                <Link to="/get-started">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-900 px-12 py-7 rounded-xl text-lg" asChild>
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
