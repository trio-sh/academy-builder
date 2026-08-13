import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Newspaper,
  Download,
  ExternalLink,
  Calendar,
  ArrowRight,
  Mail,
  Award,
  TrendingUp,
  Users,
} from "lucide-react";

const pressReleases = [
  {
    date: "January 15, 2026",
    title: "The 3rd Academy Raises $25M Series B to Scale Mentor-Validated Credentialing",
    excerpt:
      "Funding will accelerate expansion of MentorLink network and T3X Exchange employer marketplace.",
    link: "#",
  },
  {
    date: "December 8, 2025",
    title: "Partnership Announcement: The 3rd Academy Joins Forces with Major Tech Employers",
    excerpt:
      "Leading companies commit to prioritizing Behavioral Evidence Report holders in hiring decisions.",
    link: "#",
  },
  {
    date: "November 20, 2025",
    title: "Civic Access Lab Launches in 50 School Districts Nationwide",
    excerpt:
      "Free behavioral readiness program brings career awareness to underserved students.",
    link: "#",
  },
  {
    date: "October 5, 2025",
    title: "The 3rd Academy Surpasses 100,000 Validated Credentials",
    excerpt:
      "Milestone demonstrates growing demand for mentor-gated behavioral validation.",
    link: "#",
  },
  {
    date: "September 12, 2025",
    title: "New Study: Behavioral Evidence Report Holders Show 40% Higher Retention Rates",
    excerpt:
      "Independent research validates effectiveness of behavioral credentialing approach.",
    link: "#",
  },
];

const mediaFeatures = [
  {
    outlet: "TechCrunch",
    title: "How The 3rd Academy is Fixing the Broken Credentialing System",
    date: "January 2026",
  },
  {
    outlet: "Forbes",
    title: "The Future of Hiring: Why Behavioral Validation Matters",
    date: "December 2025",
  },
  {
    outlet: "Harvard Business Review",
    title: "Rethinking Credentials in the Age of Skills-Based Hiring",
    date: "November 2025",
  },
  {
    outlet: "The Wall Street Journal",
    title: "Startups Tackle the $400B Credential Gap",
    date: "October 2025",
  },
];

const stats = [
  { value: "100K+", label: "Credentials Issued" },
  { value: "5,000+", label: "Active Mentors" },
  { value: "500+", label: "Employer Partners" },
  { value: "50", label: "School Districts" },
];

const Press = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-black to-black" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 border border-indigo-500 text-indigo-100 text-sm">
                <Newspaper className="w-4 h-4" />
                Press Room
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-normal mb-6">
              <span className="text-white">
                News &
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Media Coverage
              </span>
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Stay updated on The 3rd Academy's mission to transform credentialing
              through mentor-validated behavioral assessment.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-950 border border-gray-800"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Press Releases
              </span>
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Official announcements from The 3rd Academy.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {pressReleases.map((release, index) => (
              <a
                key={index}
                href={release.link}
                className="group block relative"
              >
                <div className="relative p-6 rounded-2xl bg-gray-950 border border-gray-800 hover:border-indigo-500">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Calendar className="w-4 h-4" />
                    {release.date}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-400">
                    {release.title}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">{release.excerpt}</p>
                  <span className="inline-flex items-center text-sm text-indigo-400">
                    Read More <ArrowRight className="ml-1 w-4 h-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Media Features */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Featured In
              </span>
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Media coverage and thought leadership features.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {mediaFeatures.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gray-950 border border-gray-800 h-full hover:border-indigo-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-indigo-400">
                    {feature.outlet}
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500">{feature.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="relative p-8 md:p-12 rounded-2xl bg-gray-950 border border-gray-800">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">
                      <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Media Kit
                      </span>
                    </h2>
                    <p className="text-gray-300 mb-6">
                      Download our press kit including logos, brand guidelines,
                      executive headshots, and fact sheets.
                    </p>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" asChild>
                      <Link to="/contact">
                        <Download className="mr-2 h-4 w-4" />
                        Download Media Kit
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Award, label: "Logos" },
                      { icon: Users, label: "Team Photos" },
                      { icon: TrendingUp, label: "Fact Sheet" },
                      { icon: Newspaper, label: "Boilerplate" },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="w-24 h-24 rounded-xl bg-gray-900 border border-gray-800 flex flex-col items-center justify-center gap-2"
                      >
                        <item.icon className="w-6 h-6 text-indigo-400" />
                        <span className="text-xs text-gray-300">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 relative border-t border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Media Inquiries
              </span>
            </h2>
            <p className="text-gray-300 mb-8">
              For press inquiries, interview requests, or media partnerships,
              please contact our communications team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                asChild
              >
                <a href="mailto:press@the3rdacademy.com">
                  <Mail className="mr-2 h-4 w-4" />
                  press@the3rdacademy.com
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-900"
                asChild
              >
                <Link to="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4" />
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

export default Press;
