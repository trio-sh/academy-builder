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
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Lightbulb,
    title: "Career Discovery",
    description: "Interactive tools that help students explore interests and discover meaningful career pathways early.",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    icon: Users,
    title: "Teacher Dashboard",
    description: "Streamlined observation tools for documenting student behaviors and developmental insights.",
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Comprehensive analytics showing student growth and readiness development over time.",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Award,
    title: "Evidence Building",
    description: "Students build portfolios of behavioral evidence that transition into post-graduation credentials.",
    gradient: "from-emerald-500 to-emerald-600",
  },
];

const benefits = [
  {
    title: "Free for Schools",
    description: "Civic Access Lab is completely free for educational institutions and their students.",
    icon: Shield,
  },
  {
    title: "Easy Integration",
    description: "Works seamlessly with existing curricula and classroom activities.",
    icon: Target,
  },
  {
    title: "Teacher Support",
    description: "Comprehensive training and ongoing support for educators.",
    icon: Users,
  },
  {
    title: "Student Outcomes",
    description: "Measurable improvements in career readiness and engagement.",
    icon: TrendingUp,
  },
];

const stats = [
  {
    value: "47",
    label: "Schools Partnered",
  },
  {
    value: "8,000+",
    label: "Students Reached",
  },
  {
    value: "89%",
    label: "Teacher Satisfaction",
  },
  {
    value: "12",
    label: "States Active",
  },
];

const Schools = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Coming Soon overlay */}
      <div className="relative">
        <div className="blur-[6px] select-none pointer-events-none">

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-black to-black" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 border border-indigo-500 text-white text-sm">
                <GraduationCap className="w-4 h-4" />
                For Schools & Institutions
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-white">Prepare Students for </span>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Career Success
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Civic Access Lab brings behavioral awareness and career readiness tools directly into your classrooms—completely free.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Link to="/contact">
                  Partner With Us
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

      {/* Features */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Civic Access Lab Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything teachers and students need to build career readiness
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

      {/* Benefits */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Schools Choose Us
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Designed specifically for educational institutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="p-6 rounded-2xl bg-gray-950 border border-gray-800 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Impact
            </h2>
            <p className="text-xl text-gray-400">
              Making a difference in schools nationwide
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl bg-gray-950 border border-gray-800">
                <div className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Getting Started
              </h2>
              <p className="text-xl text-gray-400">
                Simple steps to bring Civic Access Lab to your school
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Contact Us</h3>
                <p className="text-gray-400">Reach out to discuss your school's needs and goals.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Teacher Training</h3>
                <p className="text-gray-400">We provide comprehensive onboarding for your educators.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Launch & Support</h3>
                <p className="text-gray-400">Go live with ongoing support from our team.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="p-12 rounded-2xl bg-gray-950 border border-gray-800">
              <div className="flex items-center justify-center mb-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
              <blockquote className="text-xl text-gray-300 text-center mb-6">
                "Civic Access Lab has transformed how we approach career readiness. Our students are more engaged with career planning than ever before."
              </blockquote>
              <div className="text-center">
                <p className="font-medium text-white">Principal Jennifer Martinez</p>
                <p className="text-sm text-gray-500">Lincoln High School, California</p>
              </div>
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
                  Ready to Partner?
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Join 47 schools already using Civic Access Lab to prepare students for success
              </p>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Link to="/contact">
                  Contact Us Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

        </div>{/* end blur inner */}
        {/* Coming Soon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <span className="px-6 py-3 rounded-full bg-black/80 text-gray-400 text-lg font-medium">Coming Soon</span>
        </div>
      </div>{/* end relative wrapper */}

      <Footer />
    </div>
  );
};

export default Schools;
