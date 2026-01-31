import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Search,
  ChevronDown,
  BookOpen,
  Users,
  Award,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Mail,
  ArrowRight,
  Play,
  FileText,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const helpCategories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics of The 3rd Academy platform",
    articles: 12,
  },
  {
    icon: Award,
    title: "Skill Passport",
    description: "Understanding your behavioral credentials",
    articles: 8,
  },
  {
    icon: Users,
    title: "MentorLink",
    description: "Working with mentors and validation sessions",
    articles: 15,
  },
  {
    icon: Briefcase,
    title: "For Employers",
    description: "Using T3X Exchange and hiring verified candidates",
    articles: 10,
  },
  {
    icon: GraduationCap,
    title: "For Schools",
    description: "Civic Access Lab implementation guides",
    articles: 7,
  },
  {
    icon: FileText,
    title: "Account & Billing",
    description: "Manage your account and subscription",
    articles: 9,
  },
];

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is The 3rd Academy?",
        a: "The 3rd Academy is a behavioral readiness platform that bridges the gap between credentials and workplace readiness through mentor-gated behavioral validation. We help candidates prove their real-world capabilities to employers through observed evidence rather than traditional test scores.",
      },
      {
        q: "How is this different from traditional certifications?",
        a: "Unlike traditional certifications that rely on exams, our Skill Passport is earned through actual mentor observation of your professional behaviors in real or simulated work scenarios. This provides employers with evidence of how you actually perform, not just what you know.",
      },
      {
        q: "How long does it take to earn a Skill Passport?",
        a: "The timeline varies based on your current readiness level and the specific credentials you're pursuing. Most candidates complete their initial validation within 4-8 weeks, though some may progress faster with prior experience.",
      },
    ],
  },
  {
    category: "Candidates",
    questions: [
      {
        q: "How do I get started as a candidate?",
        a: "You can start by uploading your resume through Entry A, which will assess your current behavioral readiness level. From there, you'll be matched with appropriate mentors and training modules through BridgeFast to address any gaps before your validation sessions.",
      },
      {
        q: "What happens during a MentorLink session?",
        a: "During a MentorLink session, you'll work on realistic tasks or scenarios while a qualified mentor observes and evaluates your professional behaviors. These observations are logged in your Growth Log and contribute to your Skill Passport credential.",
      },
      {
        q: "Is there a cost for candidates?",
        a: "We offer multiple entry points. Civic Access Lab is free for students through participating schools. For professionals, pricing varies based on the credential track. TalentVisa, our premium credential, requires additional investment but provides priority placement with employers.",
      },
    ],
  },
  {
    category: "Employers",
    questions: [
      {
        q: "How do I access verified candidates?",
        a: "Employers can access our talent pool through T3X Exchange, our employer marketplace. You'll see candidates with verified Skill Passports that include specific behavioral observations and mentor endorsements relevant to your roles.",
      },
      {
        q: "What makes your verification reliable?",
        a: "Our verification is based on direct human observation by trained industry mentors, not self-reported claims or automated assessments. Each behavior is documented with specific evidence, giving you confidence in candidate capabilities.",
      },
      {
        q: "Can we integrate with our ATS?",
        a: "Yes, T3X Exchange offers API integrations with major applicant tracking systems. Our team will work with you to ensure seamless data flow between platforms.",
      },
    ],
  },
  {
    category: "Schools",
    questions: [
      {
        q: "What is Civic Access Lab?",
        a: "Civic Access Lab is our free program for schools that brings career readiness and behavioral awareness to students before they enter the workforce. It includes curriculum resources, mentor connections, and early credential pathways.",
      },
      {
        q: "How do we implement Civic Access Lab?",
        a: "Implementation starts with a partnership agreement and training for your staff. We provide all curriculum materials, platform access, and ongoing support. Most schools can launch within one semester.",
      },
      {
        q: "What grade levels are supported?",
        a: "Civic Access Lab is designed for high school students (grades 9-12) and community college programs. We have adapted modules for different developmental stages and career interests.",
      },
    ],
  },
];

const popularArticles = [
  "Complete Guide to Your First MentorLink Session",
  "Understanding Your Behavioral Readiness Score",
  "How to Prepare for Validation Observations",
  "BridgeFast Training Module Walkthrough",
  "Interpreting Your Growth Log Feedback",
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
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

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <HelpCircle className="w-4 h-4" />
                Help Center
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                How Can We
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Help You?
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-300 mb-8"
            >
              Search our knowledge base or browse categories to find answers
              to your questions about The 3rd Academy.
            </motion.p>

            {/* Search */}
            <motion.div
              variants={itemVariants}
              className="max-w-xl mx-auto relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="w-full pl-12 pr-4 py-6 text-lg bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Browse by Category
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {helpCategories.map((category, index) => (
              <motion.a
                key={index}
                href="#"
                variants={itemVariants}
                className="group block"
              >
                <div className="relative h-full">
                  <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                  <div className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/30 transition-colors h-full">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mb-4">
                      <category.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      {category.description}
                    </p>
                    <span className="text-xs text-gray-500">
                      {category.articles} articles
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Popular Articles */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Popular Articles
              </h2>
              <div className="space-y-3">
                {popularArticles.map((article, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors">
                      {article}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors ml-auto" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Video Tutorials */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" />
                Video Tutorials
              </h2>
              <div className="relative group">
                <div className="absolute -inset-2 rounded-2xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
                <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src="https://api.a0.dev/assets/image?text=Video tutorial thumbnail showing platform walkthrough&aspect=16:9&seed=help_video"
                    alt="Platform Tutorial"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <motion.button
                      className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="w-6 h-6 text-white ml-1" />
                    </motion.button>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm mt-4">
                Watch our comprehensive platform walkthrough to get started quickly.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-300">
              Quick answers to common questions about The 3rd Academy.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-8">
            {faqs.map((section, sectionIndex) => (
              <motion.div
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIndex * 0.1 }}
              >
                <h3 className="text-lg font-semibold text-indigo-400 mb-4">
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.questions.map((faq, faqIndex) => {
                    const faqId = `${sectionIndex}-${faqIndex}`;
                    return (
                      <div
                        key={faqId}
                        className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFaq(faqId)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <span className="font-medium text-white">{faq.q}</span>
                          <motion.div
                            animate={{ rotate: openFaq === faqId ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-5 h-5 text-gray-300" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {openFaq === faqId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-4 pb-4 text-gray-300 text-sm">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Still Need Help?
              </span>
            </h2>
            <p className="text-gray-300 mb-8">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  asChild
                >
                  <Link to="/contact">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
              </motion.div>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Live Chat
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Help;
