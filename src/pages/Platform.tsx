import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Award,
  BarChart3,
  Users,
  Rocket,
  Briefcase,
  GraduationCap,
  Shield,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle
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
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const components = [
  {
    id: "skill-passport",
    name: "Skill Passport",
    tagline: "Earned Credential",
    description: "Evidence-linked credential documenting assessed behavioral performance, validated through the MentorLink process.",
    icon: Award,
    gradient: "from-emerald-500 to-emerald-600",
    purpose: "Primary earned credential. Generated ONLY after MentorLink 'Proceed' endorsement. NOT auto-generated at entry.",
    userTypes: ["Candidate (owner)", "Employer (viewer)", "System Admin"],
    features: [
      "Behavioral Scores — Aggregated scores from assessments",
      "Evidence Links — Direct links to scenarios, projects, mentor observations",
      "Mentor Endorsements — Proceed/redirect/pause decisions with context",
      "Verification QR Code — Unique code for employers",
      "Readiness Tier — Tier 1 (Ready), Tier 2 (Near Ready), Tier 3 (Development)",
      "Export Options — PDF, shareable link, LinkedIn integration",
    ],
    rules: [
      "Cannot be created at entry — emerges after sustained observation",
      "Requires MentorLink 'Proceed' endorsement",
      "Cannot guarantee employment or readiness",
      "Can be withdrawn or updated",
    ],
  },
  {
    id: "growth-log",
    name: "Growth Log",
    tagline: "System Spine",
    description: "Continuous log of behavioral growth, training completions, project outcomes, and mentor observations. Passive and append-only.",
    icon: BarChart3,
    gradient: "from-indigo-500 to-indigo-600",
    purpose: "Captures longitudinal data throughout the candidate journey from all sources: Resume Enhancer, MentorLink, BridgeFast, LiveWorks.",
    userTypes: ["Candidate (view only)", "Mentor (can add notes)", "System (auto-logs)"],
    features: [
      "Timeline View — Chronological display of all logged events",
      "Event Categories — Assessment, Training, Project, Observation, Tier change",
      "Auto-Logging — System automatically logs from integrated components",
      "Mentor Notes — Free-text observation field for mentors",
      "Behavioral Trends — Graphs showing score changes over time",
      "Export History — Candidate can export for personal records",
    ],
    rules: [
      "System events are immutable — cannot be edited or deleted",
      "Mentor observations editable within 24 hours, then locked",
      "Candidates cannot add entries — passive capture only",
      "Data retained permanently for active accounts",
    ],
  },
  {
    id: "mentorlink",
    name: "MentorLink",
    tagline: "Mandatory Gate",
    description: "Human validation layer where experienced professionals observe candidates and provide endorsements. No bypass allowed.",
    icon: Users,
    gradient: "from-purple-500 to-purple-600",
    purpose: "MANDATORY — no candidate can earn Skill Passport without passing through MentorLink. Decisions: Proceed/Redirect/Pause. Max 2 redirects.",
    userTypes: ["Mentor (observes)", "Candidate/Mentee", "Mentor Coordinator"],
    features: [
      "Mentor Dashboard — View assigned mentees, sessions, pending endorsements",
      "Candidate Assignment — System assigns based on industry alignment",
      "Observation Interface — Structured form for behavioral dimensions",
      "Endorsement Decision — Proceed, Redirect, or Pause options",
      "Referral System — Direct referral to BridgeFast or LiveWorks",
      "Quality Assurance — Random audit of decisions, bias detection",
    ],
    rules: [
      "MANDATORY — no bypass path to Skill Passport exists",
      "Candidates cannot choose or request specific mentors",
      "Maximum 2 Redirect loops — 3rd redirect triggers escalation",
      "Observations must be completed within 48 hours of session",
    ],
  },
  {
    id: "bridgefast",
    name: "BridgeFast",
    tagline: "Targeted Training",
    description: "Short-form training modules (2-4 hours) addressing specific behavioral gaps identified by mentors.",
    icon: Rocket,
    gradient: "from-orange-500 to-red-500",
    purpose: "Training module reached via MentorLink Redirect. After completion, candidates loop back to MentorLink for re-assessment.",
    userTypes: ["Candidate", "Mentor (refers)", "Employer (corporate licensing)"],
    features: [
      "Module Library — Categorized by behavioral dimensions",
      "Mentor-Directed Enrollment — Access only via mentor referral",
      "Interactive Content — Video lessons, simulations, knowledge checks",
      "Completion Certificate — Issued upon completion, logged to Growth Log",
      "Corporate Licensing — Employers can purchase bulk access",
    ],
    rules: [
      "Credentialing-path candidates access only via mentor referral",
      "Module completion requires 70% score on final assessment",
      "Completion deadline is 14 days — extensions require approval",
      "Maximum 2 BridgeFast loops per candidate",
    ],
  },
  {
    id: "liveworks",
    name: "LiveWorks Studio",
    tagline: "Project Marketplace",
    description: "Supervised project marketplace where candidates gain real-world experience on actual business projects.",
    icon: Briefcase,
    gradient: "from-pink-500 to-pink-600",
    purpose: "Dual purpose: Entry Point C for freelancers AND Redirect destination for project experience. All projects mentor-supervised.",
    userTypes: ["Candidate", "Mentor/Supervisor", "Project Poster (Employer)"],
    features: [
      "Project Marketplace — Browse by category, skill level, duration",
      "Mentor Assignment — Each project has assigned mentor supervisor",
      "Milestone Tracking — Projects divided into milestones with check-ins",
      "Payment Integration — Escrow-based payment on milestone completion",
      "Dispute Resolution — Structured process for quality disputes",
    ],
    rules: [
      "All credentialing-path projects require mentor supervision",
      "Entry C freelancers still require MentorLink for Skill Passport",
      "Platform fee: 15% of project value",
      "Candidates limited to 2 concurrent projects",
    ],
  },
  {
    id: "civic-access",
    name: "Civic Access Lab",
    tagline: "Institutional Track",
    description: "'Catch them young' — engaging students in school to build career awareness and early behavioral documentation.",
    icon: GraduationCap,
    gradient: "from-cyan-500 to-cyan-600",
    purpose: "Entry Point B — institutional track for schools. SEPARATE track that feeds Framework but does NOT directly produce credentials.",
    userTypes: ["Student", "Teacher", "School Admin", "Parent (optional)"],
    features: [
      "Student Dashboard — Career exploration, activity log, self-assessments",
      "Career Planning Tools — Interest inventories, pathway explorer",
      "Teacher Observation — Structured forms for logging behaviors",
      "Cohort Analytics — School-wide behavioral patterns",
      "Graduation Transition — Port data to main credentialing pathway",
    ],
    rules: [
      "Data feeds Framework but does NOT generate credentials",
      "Students must enter main pathway after graduation",
      "Teacher observations are developmental, not evaluative",
      "COPPA/FERPA compliance required",
    ],
  },
  {
    id: "talentvisa",
    name: "TalentVisa",
    tagline: "Premium Credential",
    description: "Late-stage, conditional, RARE credential for exceptional candidates. Nomination-only, system-enforced rarity.",
    icon: Shield,
    gradient: "from-amber-400 to-amber-500",
    purpose: "Premium credential layer reserved for candidates demonstrating consistently outstanding behavioral performance.",
    userTypes: ["Candidate (receives)", "Mentor (nominates)", "Review Committee"],
    features: [
      "Nomination System — Mentors nominate with justification",
      "Committee Review — Internal review against strict criteria",
      "Enhanced Verification — Additional reference checks, portfolio review",
      "Premium Badge — Visual distinction on T3X and Skill Passport",
      "Rarity Controls — Capped at <5% of Skill Passport holders",
    ],
    rules: [
      "System-enforced cap at <5% of Skill Passport holders",
      "Cannot be purchased or requested — nomination only",
      "Negative employer feedback triggers review",
      "Expires after 18 months — renewal requires new nomination",
    ],
  },
  {
    id: "t3x",
    name: "T3X Talent Exchange",
    tagline: "Employer Marketplace",
    description: "Employer-facing marketplace where verified, Skill Passport-holding candidates are listed for hire.",
    icon: Building2,
    gradient: "from-slate-500 to-slate-600",
    purpose: "Final destination in credentialing pathway. Skill Passport holders listed for employers. Captures post-hire outcomes (30/60/90 feedback).",
    userTypes: ["Candidate (listed)", "Employer (Standard)", "Employer (Premium)"],
    features: [
      "Candidate Listings — Searchable directory with behavioral scores",
      "Advanced Search — Filter by dimensions, experience, location, tier",
      "Connection Requests — Employers request, candidates accept/decline",
      "Hiring Confirmation — Employers confirm hire, triggers tracking",
      "30/60/90-Day Feedback — Structured employer feedback at checkpoints",
    ],
    rules: [
      "Only Skill Passport holders appear — no exceptions",
      "Employers must be verified businesses",
      "Connection requests expire after 14 days",
      "30/60/90-day feedback is mandatory for employers",
    ],
  },
];

const Platform = () => {
  return (
    <div className="min-h-screen bg-black">
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
              <motion.span
                className="inline-block text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Platform Architecture
              </motion.span>
              <motion.h1
                className="text-5xl md:text-7xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  8 Components.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  One Ecosystem.
                </span>
              </motion.h1>
              <motion.p
                className="text-xl text-gray-400 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Every component serves two purposes: a visible function for users
                and an invisible function for system intelligence. The defensibility
                is in the connections, not the boxes.
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* Components */}
        <section className="py-16 md:py-24 bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="space-y-16"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
            >
              {components.map((component, index) => (
                <motion.div
                  key={component.id}
                  id={component.id}
                  className="scroll-mt-24"
                  variants={itemVariants}
                >
                  <div className="group relative">
                    {/* Glow effect */}
                    <div className={cn(
                      "absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 bg-gradient-to-r",
                      component.gradient
                    )} />

                    <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-xl group-hover:border-white/20 transition-all duration-500">
                      {/* Header */}
                      <div className={cn(
                        "p-8 md:p-10 bg-gradient-to-r",
                        component.gradient
                      )}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <component.icon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-white/70 uppercase tracking-wider">
                              {component.tagline}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">
                              {component.name}
                            </h2>
                          </div>
                        </div>
                        <p className="text-lg text-white/80 max-w-2xl">
                          {component.description}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="p-8 md:p-10">
                        {/* Purpose */}
                        <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Flowchart Position
                          </h3>
                          <p className="text-gray-300 leading-relaxed">
                            {component.purpose}
                          </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          {/* Features */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Key Features
                            </h3>
                            <ul className="space-y-3">
                              {component.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-400">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Rules */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Business Rules
                            </h3>
                            <ul className="space-y-3">
                              {component.rules.map((rule) => (
                                <li key={rule} className="flex items-start gap-3">
                                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-400">{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* User Types */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            User Types
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {component.userTypes.map((user) => (
                              <span
                                key={user}
                                className="px-3 py-1.5 text-sm rounded-full bg-white/10 text-gray-300"
                              >
                                {user}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
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
                Ready to Experience
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                the Platform?
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Join The 3rd Academy and start your mentor-gated credentialing journey today.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="bg-white text-indigo-900 hover:bg-gray-100 px-10 py-6 rounded-xl font-bold text-lg shadow-2xl"
                asChild
              >
                <Link to="/get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
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

export default Platform;
