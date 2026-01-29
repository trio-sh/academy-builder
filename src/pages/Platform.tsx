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

const components = [
  {
    id: "skill-passport",
    name: "Skill Passport",
    tagline: "Earned Credential",
    description: "Evidence-linked credential documenting assessed behavioral performance, validated through the MentorLink process.",
    icon: Award,
    gradient: "from-academy-emerald to-emerald-600",
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
    gradient: "from-academy-royal to-blue-600",
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
    gradient: "from-academy-gold to-amber-600",
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
    gradient: "from-purple-500 to-indigo-600",
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
    gradient: "from-teal-500 to-cyan-600",
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
    gradient: "from-academy-gold to-yellow-500",
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
    gradient: "from-slate-600 to-slate-800",
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 gradient-hero text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block text-sm font-medium uppercase tracking-wider text-white/60 mb-4">
                Platform Architecture
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                8 Components. One Ecosystem.
              </h1>
              <p className="text-lg text-white/70 leading-relaxed">
                Every component serves two purposes: a visible function for users 
                and an invisible function for system intelligence. The defensibility 
                is in the connections, not the boxes.
              </p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="space-y-16">
              {components.map((component, index) => (
                <div 
                  key={component.id}
                  id={component.id}
                  className="scroll-mt-24"
                >
                  <div className={cn(
                    "rounded-3xl border border-border overflow-hidden",
                    index % 2 === 0 ? "bg-card" : "bg-secondary/30"
                  )}>
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
                      <div className="mb-8 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Flowchart Position
                        </h3>
                        <p className="text-foreground leading-relaxed">
                          {component.purpose}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        {/* Features */}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-4">
                            Key Features
                          </h3>
                          <ul className="space-y-3">
                            {component.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-academy-emerald flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Rules */}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-4">
                            Business Rules
                          </h3>
                          <ul className="space-y-3">
                            {component.rules.map((rule) => (
                              <li key={rule} className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-academy-gold flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* User Types */}
                      <div className="mt-8 pt-6 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          User Types
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {component.userTypes.map((user) => (
                            <span 
                              key={user}
                              className="px-3 py-1.5 text-sm rounded-full bg-secondary text-secondary-foreground"
                            >
                              {user}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Experience the Platform?
            </h2>
            <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-8">
              Join The 3rd Academy and start your mentor-gated credentialing journey today.
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/get-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Platform;
