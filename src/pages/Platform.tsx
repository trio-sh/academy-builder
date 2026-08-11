import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import {
  Award,
  Users,
  Briefcase,
  GraduationCap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Award,
    title: "Behavioral Evidence Report",
    description: "Evidence-based credentials that showcase your verified workplace readiness to employers.",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Users,
    title: "Mentor Validation",
    description: "Work with experienced professionals who observe and validate your behavioral competencies.",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Briefcase,
    title: "Real-World Projects",
    description: "Build your skills through hands-on projects and live work experiences with mentor guidance.",
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    icon: GraduationCap,
    title: "Growth Tracking",
    description: "Monitor your progress and development with comprehensive behavioral analytics and insights.",
    gradient: "from-amber-500 to-amber-600",
  },
];

const benefits = [
  {
    icon: Target,
    title: "For Job Seekers",
    description: "Stand out with verified credentials that prove your workplace readiness beyond a resume.",
    points: [
      "Build evidence-based credentials",
      "Get matched with mentors",
      "Access exclusive opportunities",
      "Track your career growth",
    ],
  },
  {
    icon: Shield,
    title: "For Employers",
    description: "Hire with confidence using behavioral credentials that predict real workplace performance.",
    points: [
      "Verified candidate credentials",
      "Reduce hiring risks",
      "Access pre-vetted talent",
      "Improve retention rates",
    ],
  },
  {
    icon: GraduationCap,
    title: "For Schools",
    description: "Prepare students for career success with tools that bridge the gap between education and employment.",
    points: [
      "Student readiness programs",
      "Career preparation tools",
      "Progress tracking",
      "Evidence-based outcomes",
    ],
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Get Started",
    description: "Choose your path and create your account to begin building your behavioral credential.",
  },
  {
    step: "2",
    title: "Work with Mentors",
    description: "Get paired with experienced professionals who observe and validate your competencies.",
  },
  {
    step: "3",
    title: "Build Evidence",
    description: "Complete real projects and assessments that generate verified evidence of your capabilities.",
  },
  {
    step: "4",
    title: "Earn Your Credential",
    description: "Receive your Behavioral Evidence Report and showcase it to employers seeking qualified candidates.",
  },
];

const Platform = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-black to-black" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 border border-indigo-500 text-white text-sm">
                <Zap className="w-4 h-4" />
                Our Platform
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-white">The Future of </span>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Career Readiness
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              A comprehensive platform connecting job seekers, mentors, and employers through evidence-based behavioral credentials.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Link to="/get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-900"
              >
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to build, validate, and showcase your workplace readiness
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-gray-950 border border-gray-800 hover:border-indigo-500"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Your journey to earning a verified behavioral credential
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits by User Type */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for Everyone
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Solutions tailored for job seekers, employers, and educational institutions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="p-8 rounded-2xl bg-gray-950 border border-gray-800"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-6">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400 mb-6">{benefit.description}</p>
                <ul className="space-y-3">
                  {benefit.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-gray-950 border border-gray-800">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent mb-2">
                3.2x
              </div>
              <p className="text-gray-400">Higher success rate in 90-day reviews</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gray-950 border border-gray-800">
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-600 bg-clip-text text-transparent mb-2">
                48hrs
              </div>
              <p className="text-gray-400">Average mentor matching time</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gray-950 border border-gray-800">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">
                8,000+
              </div>
              <p className="text-gray-400">Students using our platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="p-12 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Get Started?
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Join thousands of job seekers building evidence-based credentials
              </p>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Link to="/get-started">
                  Create Your Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Platform;
