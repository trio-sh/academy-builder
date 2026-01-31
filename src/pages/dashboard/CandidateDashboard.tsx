import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, updatePassword } from "@/lib/supabase";
import { MentorMatchingService, type MentorMatch } from "@/lib/mentorMatching";
import { Button } from "@/components/ui/button";
import { TrainingModuleViewer } from "@/components/training/TrainingModuleViewer";
import { AssessmentViewer } from "@/components/assessment/AssessmentViewer";
import { InteractiveSkillAssessment } from "@/components/assessment/InteractiveSkillAssessment";
import { INTERACTIVE_MODULES } from "@/data/interactiveTrainingModules";
import type { Database } from "@/types/database.types";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Award,
  BarChart3,
  Briefcase,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  BookOpen,
  Shield,
  ExternalLink,
  Play,
  Calendar,
  Star,
  Loader2,
  Save,
  Plus,
  Copy,
  QrCode,
  Download,
  Share2,
  Lock,
  Eye,
  EyeOff,
  Users,
  Building2,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  Target,
  GraduationCap,
  Send,
  ClipboardCheck,
  Sliders,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Image,
  Paperclip,
  Volume2,
  Mic,
  Brain,
  Zap,
} from "lucide-react";

type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type GrowthLogEntry = Database["public"]["Tables"]["growth_log_entries"]["Row"];
type BridgeFastModule = Database["public"]["Tables"]["bridgefast_modules"]["Row"];
type BridgeFastProgress = Database["public"]["Tables"]["bridgefast_progress"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type LiveWorksProject = Database["public"]["Tables"]["liveworks_projects"]["Row"];
type LiveWorksApplication = Database["public"]["Tables"]["liveworks_applications"]["Row"];
type SkillPassportRecord = Database["public"]["Tables"]["skill_passports"]["Row"];
type T3XConnection = Database["public"]["Tables"]["t3x_connections"]["Row"];
type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type MentorAssignment = Database["public"]["Tables"]["mentor_assignments"]["Row"];
type SelfAssessment = Database["public"]["Tables"]["candidate_self_assessments"]["Row"];

// Behavioral dimensions for display
const BEHAVIORAL_DIMENSIONS = [
  { id: "communication", label: "Communication", color: "from-blue-500 to-cyan-500" },
  { id: "problem_solving", label: "Problem Solving", color: "from-purple-500 to-pink-500" },
  { id: "adaptability", label: "Adaptability", color: "from-amber-500 to-orange-500" },
  { id: "collaboration", label: "Collaboration", color: "from-emerald-500 to-teal-500" },
  { id: "initiative", label: "Initiative", color: "from-red-500 to-rose-500" },
  { id: "time_management", label: "Time Management", color: "from-indigo-500 to-violet-500" },
  { id: "professionalism", label: "Professionalism", color: "from-sky-500 to-blue-500" },
  { id: "learning_agility", label: "Learning Agility", color: "from-lime-500 to-green-500" },
];

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

const navItems = [
  { name: "Overview", href: "/dashboard/candidate", icon: BarChart3 },
  { name: "Skill Passport", href: "/dashboard/candidate/passport", icon: Award },
  { name: "Growth Log", href: "/dashboard/candidate/growth", icon: TrendingUp },
  { name: "Self Assessment", href: "/dashboard/candidate/assessment", icon: ClipboardCheck },
  { name: "Training", href: "/dashboard/candidate/training", icon: BookOpen },
  { name: "Projects", href: "/dashboard/candidate/projects", icon: Briefcase },
  { name: "Find Mentor", href: "/dashboard/candidate/mentors", icon: GraduationCap },
  { name: "Connections", href: "/dashboard/candidate/connections", icon: Users },
  { name: "Messages", href: "/dashboard/candidate/messages", icon: MessageSquare },
  { name: "Notifications", href: "/dashboard/candidate/notifications", icon: Bell },
  { name: "Profile", href: "/dashboard/candidate/profile", icon: User },
  { name: "Settings", href: "/dashboard/candidate/settings", icon: Settings },
];

// Overview component with real data
const Overview = () => {
  const { profile, user } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [growthLogCount, setGrowthLogCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<GrowthLogEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Fetch candidate profile
        const { data: cp } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        setCandidateProfile(cp);

        // Fetch growth log count and recent entries
        const { count } = await supabase
          .from("growth_log_entries")
          .select("*", { count: "exact", head: true })
          .eq("candidate_id", user.id);
        setGrowthLogCount(count || 0);

        const { data: recent } = await supabase
          .from("growth_log_entries")
          .select("*")
          .eq("candidate_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentActivity(recent || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getTierDisplay = (tier: string | null | undefined) => {
    if (!tier) return "Not Assessed";
    const tierMap: Record<string, string> = {
      tier_1: "Tier 1 - Ready",
      tier_2: "Tier 2 - Developing",
      tier_3: "Tier 3 - Emerging",
    };
    return tierMap[tier] || tier;
  };

  const getDaysActive = () => {
    if (!profile?.created_at) return 1;
    const created = new Date(profile.created_at);
    const now = new Date();
    return Math.max(1, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const stats = [
    {
      label: "Current Tier",
      value: getTierDisplay(candidateProfile?.current_tier),
      icon: Award,
      color: "from-amber-500 to-orange-500"
    },
    {
      label: "Growth Log Entries",
      value: growthLogCount.toString(),
      icon: BarChart3,
      color: "from-indigo-500 to-purple-500"
    },
    {
      label: "Mentor Loops",
      value: (candidateProfile?.mentor_loops || 0).toString(),
      icon: Briefcase,
      color: "from-emerald-500 to-teal-500"
    },
    {
      label: "Days Active",
      value: getDaysActive().toString(),
      icon: Clock,
      color: "from-pink-500 to-rose-500"
    },
  ];

  const getNextSteps = () => {
    // Check if profile is reasonably complete (has name, headline or bio)
    const hasBasicProfile = !!(
      profile?.first_name &&
      profile?.last_name &&
      (profile?.headline || profile?.bio)
    );

    // Check if skills have been added
    const hasSkills = (candidateProfile?.skills?.length || 0) > 0;

    // Profile is complete if they have basic info AND skills
    const profileComplete = hasBasicProfile && hasSkills;

    const steps = [
      {
        title: "Complete your profile",
        description: "Add your info and skills",
        completed: profileComplete,
        href: "/dashboard/candidate/profile"
      },
      {
        title: "Upload your resume",
        description: "Start the credentialing process",
        completed: !!candidateProfile?.resume_url,
        href: "/dashboard/candidate/profile"
      },
      {
        title: "Get matched with a mentor",
        description: "Begin MentorLink observations",
        completed: (candidateProfile?.mentor_loops || 0) > 0,
        href: "/dashboard/candidate/passport"
      },
      {
        title: "Earn your Skill Passport",
        description: "Receive your behavioral credential",
        completed: candidateProfile?.has_skill_passport || false,
        href: "/dashboard/candidate/passport"
      },
    ];
    return steps;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "signup": return User;
      case "resume_upload": return Upload;
      case "training": return BookOpen;
      case "observation": return Star;
      case "tier_change": return Award;
      default: return TrendingUp;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {profile?.first_name || "Candidate"}
        </h1>
        <p className="text-gray-400">
          Track your progress and continue your credentialing journey.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative group p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity" />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Next Steps */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Your Journey</h2>
        <div className="space-y-3">
          {getNextSteps().map((step, index) => (
            <Link
              key={index}
              to={step.href}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/10 text-gray-400"
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.completed ? "text-gray-400 line-through" : "text-white"}`}>
                  {step.title}
                </p>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
              {!step.completed && (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((entry) => {
              const Icon = getEventIcon(entry.event_type);
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{entry.title}</p>
                    {entry.description && (
                      <p className="text-sm text-gray-400 mt-1">{entry.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete your profile to get started
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Skill Passport component
const SkillPassport = () => {
  const { user, profile } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [passportData, setPassportData] = useState<SkillPassportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Fetch candidate profile
      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();
      setCandidateProfile(cp);

      // If has passport, fetch passport data
      if (cp?.has_skill_passport) {
        const { data: passport } = await supabase
          .from("skill_passports")
          .select("*")
          .eq("candidate_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        setPassportData(passport);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const copyVerificationCode = () => {
    if (passportData?.verification_code) {
      navigator.clipboard.writeText(passportData.verification_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sharePassport = () => {
    const url = `${window.location.origin}/verify/${passportData?.verification_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = () => {
    const behavioralScores = (passportData?.behavioral_scores || {}) as Record<string, number>;
    const avgScore = Object.values(behavioralScores).length > 0
      ? (Object.values(behavioralScores).reduce((a, b) => a + b, 0) / Object.values(behavioralScores).length).toFixed(1)
      : "N/A";
    const tierLabel = getTierLabel(passportData?.readiness_tier || candidateProfile?.current_tier);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Skill Passport - ${profile?.first_name} ${profile?.last_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a2e;
            background: white;
          }
          .passport-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #10b981;
            border-radius: 16px;
            padding: 32px;
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #d1d5db;
          }
          .profile {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .avatar {
            width: 64px;
            height: 64px;
            border-radius: 12px;
            background: linear-gradient(135deg, #10b981, #14b8a6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          .name { font-size: 24px; font-weight: bold; color: #1a1a2e; }
          .headline { color: #10b981; font-weight: 500; }
          .verified-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 20px;
            color: #16a34a;
            font-size: 14px;
            font-weight: 500;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          .stat-card {
            padding: 16px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          }
          .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .stat-value { font-size: 18px; font-weight: bold; }
          .verification-box {
            padding: 16px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .verification-code {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .dimensions-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
          .dimensions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .dimension {
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .dimension-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .dimension-name { font-weight: 500; }
          .dimension-score { font-weight: bold; }
          .progress-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #14b8a6);
            border-radius: 4px;
          }
          .overall-score {
            padding: 24px;
            background: linear-gradient(135deg, #f3e8ff, #fce7f3);
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .overall-label { color: #6b7280; margin-bottom: 4px; }
          .overall-value { font-size: 32px; font-weight: bold; color: #1a1a2e; }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .verify-url { color: #10b981; font-family: monospace; }
          @media print {
            body { padding: 20px; }
            .passport-container { border-width: 1px; }
          }
        </style>
      </head>
      <body>
        <div class="passport-container">
          <div class="header">
            <div class="profile">
              <div class="avatar">${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}</div>
              <div>
                <div class="name">${profile?.first_name || ''} ${profile?.last_name || ''}</div>
                <div class="headline">${profile?.headline || 'Candidate'}</div>
              </div>
            </div>
            <div class="verified-badge">✓ Verified</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Readiness Tier</div>
              <div class="stat-value" style="color: ${tierLabel.color.includes('emerald') ? '#10b981' : tierLabel.color.includes('blue') ? '#3b82f6' : '#f59e0b'}">${tierLabel.label}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Mentor Loops</div>
              <div class="stat-value">${candidateProfile?.mentor_loops || 3}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Valid Until</div>
              <div class="stat-value">${passportData?.expires_at ? new Date(passportData.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</div>
            </div>
          </div>

          <div class="verification-box">
            <span style="font-size: 24px;">📋</span>
            <div>
              <div class="stat-label">Verification Code</div>
              <div class="verification-code">${passportData?.verification_code || 'N/A'}</div>
            </div>
          </div>

          <div class="dimensions-title">Behavioral Dimensions</div>
          <div class="dimensions-grid">
            ${BEHAVIORAL_DIMENSIONS.map(dim => {
              const score = behavioralScores[dim.id] || 0;
              const percentage = (score / 5) * 100;
              return `
                <div class="dimension">
                  <div class="dimension-header">
                    <span class="dimension-name">${dim.label}</span>
                    <span class="dimension-score">${score.toFixed(1)}/5</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="overall-score">
            <div>
              <div class="overall-label">Overall Behavioral Score</div>
              <div class="overall-value">${avgScore}/5</div>
            </div>
            <div style="font-size: 48px;">🏆</div>
          </div>

          <div class="footer">
            <span>Issued: ${passportData?.issued_at ? new Date(passportData.issued_at).toLocaleDateString() : 'N/A'}</span>
            <span>The 3rd Academy</span>
            <span class="verify-url">${window.location.origin}/verify/${passportData?.verification_code}</span>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getTierLabel = (tier: string | null) => {
    const labels: Record<string, { label: string; color: string }> = {
      developing: { label: "Developing", color: "text-amber-400" },
      emerging: { label: "Emerging", color: "text-blue-400" },
      ready: { label: "Job Ready", color: "text-emerald-400" },
      tier_1: { label: "Tier 1 - Developing", color: "text-amber-400" },
      tier_2: { label: "Tier 2 - Emerging", color: "text-blue-400" },
      tier_3: { label: "Tier 3 - Ready", color: "text-emerald-400" },
    };
    return labels[tier || "developing"] || { label: tier || "Unknown", color: "text-gray-400" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!candidateProfile?.has_skill_passport) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold text-white mb-2">Skill Passport</h1>
          <p className="text-gray-400">
            Your behavioral credential that proves workplace readiness.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Earn Your Skill Passport</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Complete the MentorLink process to receive your verified Skill Passport.
            This credential validates your behavioral readiness for the workplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>3 Mentor Observations</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Behavioral Endorsement</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Tier Assessment</span>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-2">Current Progress</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-white">{candidateProfile?.mentor_loops || 0}</span>
              <span className="text-gray-400">/ 3 Mentor Loops</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                title: "Get Matched",
                description: "We pair you with industry mentors based on your career goals."
              },
              {
                step: 2,
                title: "Be Observed",
                description: "Mentors observe your work behaviors across 3 sessions."
              },
              {
                step: 3,
                title: "Receive Endorsement",
                description: "Earn a proceed, redirect, or pause recommendation."
              }
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Has Skill Passport - Full Display
  const behavioralScores = (passportData?.behavioral_scores || {}) as Record<string, number>;
  const tierInfo = getTierLabel(passportData?.readiness_tier || candidateProfile?.current_tier);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Skill Passport</h1>
          <p className="text-gray-400">Your verified behavioral credential for employers.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={sharePassport}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Share Link"}
          </Button>
          <Button
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={downloadPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </motion.div>

      {/* Passport Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-gradient-to-tl from-white rounded-full blur-3xl" />
        </div>

        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-emerald-400 font-medium">{profile?.headline || "Candidate"}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium text-sm">Verified</span>
              </div>
            </div>
          </div>

          {/* Tier & Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 rounded-xl bg-black/20 backdrop-blur">
              <p className="text-sm text-gray-400 mb-1">Readiness Tier</p>
              <p className={`text-xl font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/20 backdrop-blur">
              <p className="text-sm text-gray-400 mb-1">Mentor Loops</p>
              <p className="text-xl font-bold text-white">{candidateProfile?.mentor_loops || 3}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/20 backdrop-blur">
              <p className="text-sm text-gray-400 mb-1">Valid Until</p>
              <p className="text-xl font-bold text-white">
                {passportData?.expires_at
                  ? new Date(passportData.expires_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Verification Code */}
          <div className="p-4 rounded-xl bg-black/20 backdrop-blur mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Verification Code</p>
                  <p className="text-lg font-mono font-bold text-white tracking-wider">
                    {passportData?.verification_code || "N/A"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyVerificationCode}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Issue Date */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Issued: {passportData?.issued_at
                ? new Date(passportData.issued_at).toLocaleDateString()
                : "N/A"}
            </span>
            <span>The 3rd Academy</span>
          </div>
        </div>
      </motion.div>

      {/* Behavioral Scores */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Behavioral Dimensions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {BEHAVIORAL_DIMENSIONS.map((dimension) => {
            const score = behavioralScores[dimension.id] || 0;
            const percentage = (score / 5) * 100;

            return (
              <div
                key={dimension.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{dimension.label}</span>
                  <span className="text-lg font-bold text-white">{score.toFixed(1)}/5</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${dimension.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Average Score */}
      <motion.div variants={itemVariants}>
        <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Overall Behavioral Score</p>
              <p className="text-3xl font-bold text-white">
                {Object.values(behavioralScores).length > 0
                  ? (Object.values(behavioralScores).reduce((a, b) => a + b, 0) / Object.values(behavioralScores).length).toFixed(1)
                  : "N/A"}/5
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Award className="w-10 h-10 text-purple-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Verification Info */}
      <motion.div variants={itemVariants}>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-gray-400">
              Employers can verify this credential at{" "}
              <span className="text-emerald-400 font-mono">
                {window.location.origin}/verify/{passportData?.verification_code}
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Growth Log component
const GrowthLog = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GrowthLogEntry[]>([]);
  const [passportData, setPassportData] = useState<SkillPassportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"timeline" | "charts">("charts");

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("growth_log_entries")
        .select("*")
        .eq("candidate_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch passport for behavioral scores
      const { data: passport } = await supabase
        .from("skill_passports")
        .select("*")
        .eq("candidate_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      setPassportData(passport);
      setEntries(data || []);
      setIsLoading(false);
    };

    fetchEntries();
  }, [user?.id]);

  const getEventIcon = (type: string) => {
    const icons: Record<string, typeof TrendingUp> = {
      signup: User,
      resume_upload: Upload,
      training: BookOpen,
      observation: Star,
      tier_change: Award,
      assessment: BarChart3,
      project: Briefcase,
      endorsement: Shield,
    };
    return icons[type] || TrendingUp;
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      signup: "from-blue-500 to-indigo-500",
      resume_upload: "from-purple-500 to-pink-500",
      training: "from-amber-500 to-orange-500",
      observation: "from-emerald-500 to-teal-500",
      tier_change: "from-rose-500 to-red-500",
      assessment: "from-cyan-500 to-blue-500",
      project: "from-indigo-500 to-purple-500",
      endorsement: "from-emerald-500 to-green-500",
    };
    return colors[type] || "from-gray-500 to-gray-600";
  };

  // Calculate activity trends data (last 30 days)
  const getActivityTrendsData = () => {
    const last30Days: Record<string, number> = {};
    const today = new Date();

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      last30Days[key] = 0;
    }

    // Count entries per day
    entries.forEach((entry) => {
      const entryDate = new Date(entry.created_at);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 30) {
        const key = entryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (last30Days[key] !== undefined) {
          last30Days[key]++;
        }
      }
    });

    return Object.entries(last30Days).map(([date, count]) => ({
      date,
      activities: count,
    }));
  };

  // Calculate behavioral radar data
  const getBehavioralRadarData = () => {
    const scores = (passportData?.behavioral_scores || {}) as Record<string, number>;
    return BEHAVIORAL_DIMENSIONS.map((dim) => ({
      dimension: dim.label,
      score: scores[dim.id] || 0,
      fullMark: 5,
    }));
  };

  // Calculate event type distribution
  const getEventDistribution = () => {
    const distribution: Record<string, number> = {};
    entries.forEach((entry) => {
      distribution[entry.event_type] = (distribution[entry.event_type] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({
      type: type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      count,
    }));
  };

  // Calculate growth stats
  const getGrowthStats = () => {
    const thisWeek = entries.filter((e) => {
      const daysDiff = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < 7;
    }).length;

    const lastWeek = entries.filter((e) => {
      const daysDiff = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 7 && daysDiff < 14;
    }).length;

    const growthRate = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

    return { thisWeek, lastWeek, growthRate };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const activityData = getActivityTrendsData();
  const radarData = getBehavioralRadarData();
  const eventDistribution = getEventDistribution();
  const growthStats = getGrowthStats();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Growth Log</h1>
          <p className="text-gray-400">
            Your complete behavioral development timeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "charts" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("charts")}
            className={viewMode === "charts" ? "bg-indigo-600" : "border-white/20 text-white"}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("timeline")}
            className={viewMode === "timeline" ? "bg-indigo-600" : "border-white/20 text-white"}
          >
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
          <p className="text-sm text-gray-400 mb-1">Total Activities</p>
          <p className="text-2xl font-bold text-white">{entries.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <p className="text-sm text-gray-400 mb-1">This Week</p>
          <p className="text-2xl font-bold text-white">{growthStats.thisWeek}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <p className="text-sm text-gray-400 mb-1">Growth Rate</p>
          <p className={`text-2xl font-bold ${growthStats.growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {growthStats.growthRate >= 0 ? "+" : ""}{growthStats.growthRate}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <p className="text-sm text-gray-400 mb-1">Event Types</p>
          <p className="text-2xl font-bold text-white">{eventDistribution.length}</p>
        </div>
      </motion.div>

      {viewMode === "charts" && (
        <>
          {/* Activity Trends Chart */}
          <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Activity Trends (Last 30 Days)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    tickLine={{ stroke: "#4b5563" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    tickLine={{ stroke: "#4b5563" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activities"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#activityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Behavioral Dimensions Radar */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Behavioral Profile</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "#9ca3af", fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 5]}
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Activity Breakdown</h2>
              <div className="space-y-3">
                {eventDistribution.map((item) => {
                  const maxCount = Math.max(...eventDistribution.map((e) => e.count));
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{item.type}</span>
                        <span className="text-white font-medium">{item.count}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {eventDistribution.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No activities recorded yet</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}

      {viewMode === "timeline" && (
        <>
          {entries.length > 0 ? (
            <motion.div variants={itemVariants} className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

              <div className="space-y-6">
                {entries.map((entry, index) => {
                  const Icon = getEventIcon(entry.event_type);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-14"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-10 h-10 rounded-xl bg-gradient-to-br ${getEventColor(entry.event_type)} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{entry.title}</h3>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {new Date(entry.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-400">{entry.description}</p>
                        )}
                        {entry.source_component && (
                          <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs bg-white/10 text-gray-400">
                            {entry.source_component}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No entries yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Your growth log will populate as you complete activities
              </p>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

// Quiz questions for each behavioral dimension
const QUIZ_QUESTIONS: Record<string, { question: string; options: string[]; correct: number }[]> = {
  communication: [
    { question: "Which approach is most effective for delivering critical feedback?", options: ["Publicly to set an example", "Via email only", "Privately and constructively", "Avoid it entirely"], correct: 2 },
    { question: "Active listening involves:", options: ["Thinking about your response while others speak", "Maintaining eye contact and asking clarifying questions", "Interrupting to show engagement", "Taking notes constantly"], correct: 1 },
    { question: "When presenting complex information, you should:", options: ["Use as much jargon as possible", "Break it into digestible chunks with examples", "Speak quickly to cover more ground", "Assume audience knowledge"], correct: 1 },
  ],
  problem_solving: [
    { question: "The first step in effective problem-solving is:", options: ["Implementing a quick fix", "Blaming the responsible party", "Clearly defining the problem", "Calling a meeting"], correct: 2 },
    { question: "Root cause analysis helps you:", options: ["Find someone to blame", "Address symptoms quickly", "Identify and fix underlying issues", "Avoid accountability"], correct: 2 },
    { question: "When facing a novel problem, you should:", options: ["Panic and escalate immediately", "Research similar cases and brainstorm options", "Ignore it until it resolves", "Make assumptions without data"], correct: 1 },
  ],
  adaptability: [
    { question: "How should you respond to unexpected changes in project scope?", options: ["Refuse to accept changes", "Assess impact and adjust plans accordingly", "Complain to colleagues", "Ignore the changes"], correct: 1 },
    { question: "Adaptable employees are characterized by:", options: ["Resistance to new ideas", "Flexibility and openness to change", "Strict adherence to routines", "Avoiding challenges"], correct: 1 },
    { question: "When learning new technology, you should:", options: ["Wait for formal training only", "Explore, practice, and ask questions", "Avoid it as long as possible", "Claim you can't learn it"], correct: 1 },
  ],
  collaboration: [
    { question: "Effective team collaboration requires:", options: ["Individual competition", "Clear communication and shared goals", "Working in isolation", "Avoiding disagreements"], correct: 1 },
    { question: "When a team member disagrees with your idea, you should:", options: ["Dismiss their opinion", "Listen and consider their perspective", "Escalate to management", "Stop contributing"], correct: 1 },
    { question: "Sharing credit for team success:", options: ["Makes you look weak", "Builds trust and morale", "Is unnecessary", "Should be avoided"], correct: 1 },
  ],
  initiative: [
    { question: "Taking initiative means:", options: ["Waiting to be told what to do", "Proactively identifying and addressing opportunities", "Only doing assigned tasks", "Avoiding extra work"], correct: 1 },
    { question: "When you notice a process improvement opportunity:", options: ["Ignore it - not your job", "Document and propose the improvement", "Complain about current process", "Wait for someone else to notice"], correct: 1 },
    { question: "Self-starters typically:", options: ["Need constant supervision", "Seek out challenges and learning opportunities", "Avoid responsibility", "Follow others only"], correct: 1 },
  ],
  time_management: [
    { question: "The best way to handle multiple deadlines is to:", options: ["Work on everything simultaneously", "Prioritize tasks by urgency and importance", "Miss some deadlines", "Only work on easy tasks"], correct: 1 },
    { question: "When estimating task duration, you should:", options: ["Always give shortest estimate", "Add buffer time for unexpected issues", "Avoid giving estimates", "Double all estimates"], correct: 1 },
    { question: "Effective time management includes:", options: ["Multitasking constantly", "Setting clear goals and minimizing distractions", "Working without breaks", "Checking email every 5 minutes"], correct: 1 },
  ],
  professionalism: [
    { question: "Professional workplace behavior includes:", options: ["Gossip and office politics", "Reliability, respect, and accountability", "Casual attitude to deadlines", "Avoiding difficult conversations"], correct: 1 },
    { question: "When you make a mistake at work, you should:", options: ["Hide it and hope no one notices", "Acknowledge it and work to fix it", "Blame others", "Ignore it"], correct: 1 },
    { question: "Professional communication means:", options: ["Using slang and emojis always", "Clear, respectful, and appropriate language", "Being overly casual", "Avoiding communication"], correct: 1 },
  ],
  learning_agility: [
    { question: "Learning agility is best described as:", options: ["Memorizing information quickly", "Ability to learn from experience and apply to new situations", "Avoiding new challenges", "Only learning from formal training"], correct: 1 },
    { question: "When you fail at something, you should:", options: ["Give up on similar tasks", "Analyze what went wrong and try again", "Blame external factors", "Avoid the topic forever"], correct: 1 },
    { question: "Continuous learning in the workplace means:", options: ["Only attending mandatory training", "Actively seeking new knowledge and skills", "Waiting for promotions to learn", "Learning stops after onboarding"], correct: 1 },
  ],
};

// Self Assessment Tool descriptions
const ASSESSMENT_DESCRIPTIONS: Record<string, { title: string; description: string; examples: string[] }> = {
  communication: {
    title: "Communication",
    description: "Your ability to express ideas clearly, listen actively, and adapt your message to different audiences.",
    examples: ["Written and verbal communication", "Active listening", "Presentation skills", "Giving and receiving feedback"],
  },
  problem_solving: {
    title: "Problem Solving",
    description: "Your approach to analyzing issues, identifying root causes, and developing creative solutions.",
    examples: ["Analytical thinking", "Creative solutions", "Root cause analysis", "Decision making"],
  },
  adaptability: {
    title: "Adaptability",
    description: "Your flexibility in responding to change and ability to thrive in dynamic environments.",
    examples: ["Embracing change", "Learning new technologies", "Adjusting to new situations", "Resilience"],
  },
  collaboration: {
    title: "Collaboration",
    description: "Your effectiveness in working with others, contributing to team goals, and building relationships.",
    examples: ["Team participation", "Conflict resolution", "Supporting colleagues", "Cross-functional work"],
  },
  initiative: {
    title: "Initiative",
    description: "Your tendency to take proactive action, seek opportunities, and drive improvements.",
    examples: ["Proactive behavior", "Self-starting", "Identifying opportunities", "Going beyond requirements"],
  },
  time_management: {
    title: "Time Management",
    description: "Your ability to prioritize tasks, meet deadlines, and efficiently manage your workload.",
    examples: ["Prioritization", "Meeting deadlines", "Planning ahead", "Managing multiple tasks"],
  },
  professionalism: {
    title: "Professionalism",
    description: "Your conduct, ethics, and reliability in professional settings.",
    examples: ["Reliability", "Workplace etiquette", "Accountability", "Ethical behavior"],
  },
  learning_agility: {
    title: "Learning Agility",
    description: "Your ability to learn quickly from experience and apply knowledge to new situations.",
    examples: ["Quick learning", "Applying lessons", "Curiosity", "Continuous improvement"],
  },
};

// Self Assessment component
const SelfAssessmentPage = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({
    communication: 3,
    problem_solving: 3,
    adaptability: 3,
    collaboration: 3,
    initiative: 3,
    time_management: 3,
    professionalism: 3,
    learning_agility: 3,
  });
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0=intro, 1=rate, 2=reflect, 3=goals, 4=review

  useEffect(() => {
    const fetchAssessments = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("candidate_self_assessments")
        .select("*")
        .eq("candidate_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setAssessments(data);
        // Load the most recent assessment
        const latest = data[0];
        if (latest.behavioral_scores) {
          setCurrentScores(latest.behavioral_scores as Record<string, number>);
        }
        setStrengths(latest.strengths || []);
        setImprovements(latest.areas_for_improvement || []);
        setGoals(latest.goals || "");
        setNotes(latest.notes || "");
      }
      setIsLoading(false);
    };

    fetchAssessments();
  }, [user?.id]);

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return "Excellent";
    if (score >= 3.5) return "Strong";
    if (score >= 2.5) return "Developing";
    if (score >= 1.5) return "Emerging";
    return "Beginning";
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-400";
    if (score >= 3.5) return "text-blue-400";
    if (score >= 2.5) return "text-amber-400";
    if (score >= 1.5) return "text-orange-400";
    return "text-red-400";
  };

  const getOverallScore = () => {
    const values = Object.values(currentScores);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getRadarData = () => {
    return BEHAVIORAL_DIMENSIONS.map((dim) => ({
      subject: dim.label,
      score: currentScores[dim.id] || 0,
      fullMark: 5,
    }));
  };

  const toggleStrength = (dimension: string) => {
    if (strengths.includes(dimension)) {
      setStrengths(strengths.filter((s) => s !== dimension));
    } else if (strengths.length < 3) {
      setStrengths([...strengths, dimension]);
    }
  };

  const toggleImprovement = (dimension: string) => {
    if (improvements.includes(dimension)) {
      setImprovements(improvements.filter((s) => s !== dimension));
    } else if (improvements.length < 3) {
      setImprovements([...improvements, dimension]);
    }
  };

  const saveAssessment = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      // Save assessment
      const { error } = await supabase.from("candidate_self_assessments").insert({
        candidate_id: user.id,
        behavioral_scores: currentScores,
        strengths,
        areas_for_improvement: improvements,
        goals,
        notes,
        completed: true,
      });

      if (error) throw error;

      // Create growth log entry
      await supabase.from("growth_log_entries").insert({
        candidate_id: user.id,
        event_type: "assessment",
        title: "Self Assessment Completed",
        description: `Completed behavioral self-assessment with overall score of ${getOverallScore().toFixed(1)}/5`,
        source_component: "SelfAssessment",
        metadata: {
          scores: currentScores,
          overall: getOverallScore(),
          strengths,
          areas_for_improvement: improvements,
        },
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Refresh assessments
      const { data } = await supabase
        .from("candidate_self_assessments")
        .select("*")
        .eq("candidate_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setAssessments(data);
    } catch (error) {
      console.error("Error saving assessment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Self Assessment</h1>
        <p className="text-gray-400">
          Reflect on your professional behavioral skills and identify areas for growth.
        </p>
      </motion.div>

      {/* Success Banner */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-300">Assessment saved successfully!</span>
        </motion.div>
      )}

      {/* Progress Steps */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
        {["Introduction", "Rate Skills", "Reflect", "Goals", "Review"].map((step, index) => (
          <div key={step} className="flex items-center">
            <button
              onClick={() => setActiveStep(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeStep === index
                  ? "bg-indigo-600 text-white"
                  : activeStep > index
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {activeStep > index ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  {index + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step}</span>
            </button>
            {index < 4 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />}
          </div>
        ))}
      </motion.div>

      {/* Step Content */}
      <motion.div
        key={activeStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Introduction Step */}
        {activeStep === 0 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Behavioral Self-Assessment</h1>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Discover your professional strengths and growth areas through guided self-reflection
              </p>
            </div>

            {/* Interactive Skill Test - Featured Option */}
            <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-emerald-600/20 via-cyan-600/10 to-emerald-600/20 border border-emerald-500/30">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white animate-pulse">
                  New! AI-Powered
                </span>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">Interactive Skill Test</h2>
                  <p className="text-gray-300 mb-4">
                    Go beyond self-rating — actually demonstrate your skills! Voice responses, written challenges,
                    prioritization tasks, role-play scenarios, and more, all analyzed by AI for real feedback.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {[
                      { icon: Mic, text: "Voice Challenges" },
                      { icon: Brain, text: "AI Analysis" },
                      { icon: Zap, text: "Real-Time Feedback" },
                      { icon: Clock, text: "~15 minutes" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm text-gray-300">
                        <item.icon className="w-4 h-4 text-emerald-400" />
                        {item.text}
                      </div>
                    ))}
                  </div>
                  <Link to="/dashboard/candidate/assessment/skill-test">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-lg shadow-emerald-500/25"
                    >
                      Start Skill Test
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Interactive Assessment - Secondary Option */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-indigo-600/10 border border-indigo-500/20">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Guided Self-Reflection</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    A guided, immersive journey through all 8 behavioral dimensions with narrative introductions,
                    thoughtful prompts, and voice narration. Rate yourself through self-reflection.
                  </p>
                  <Link to="/dashboard/candidate/assessment/interactive">
                    <Button
                      variant="outline"
                      className="border-indigo-500/30 text-gray-300 hover:bg-indigo-500/10"
                    >
                      Start Guided Assessment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Assessment - Secondary Option */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Sliders className="w-7 h-7 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Quick Assessment</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Rate all 8 dimensions directly with sliders. Best for quick updates or when you're already familiar
                    with the assessment process.
                  </p>
                  <Button
                    variant="outline"
                    className="border-white/20 text-gray-300 hover:bg-white/10"
                    onClick={() => setActiveStep(1)}
                  >
                    Start Quick Assessment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: Target, text: "Identify strengths & growth areas", color: "text-emerald-400" },
                { icon: TrendingUp, text: "Track progress over time", color: "text-blue-400" },
                { icon: Users, text: "Prepare for mentor feedback", color: "text-purple-400" },
                { icon: Award, text: "Enhance your Skill Passport", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <item.icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
                  <span className="text-sm text-gray-400">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Assessment History */}
            {assessments.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Your Assessment History</h3>
                <div className="space-y-3">
                  {assessments.slice(0, 3).map((assessment, i) => {
                    const scores = assessment.behavioral_scores as Record<string, number>;
                    const overall = scores ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length : 0;
                    return (
                      <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white">Self Assessment</p>
                            <p className="text-xs text-gray-500">
                              {new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(overall)}`}>{overall.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">{getScoreLabel(overall)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rate Skills Step */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-2">Rate Your Behavioral Skills</h2>
              <p className="text-gray-400 mb-6">
                Use the sliders to rate yourself on each dimension from 1 (Beginning) to 5 (Excellent).
              </p>

              <div className="grid gap-6">
                {BEHAVIORAL_DIMENSIONS.map((dim) => {
                  const info = ASSESSMENT_DESCRIPTIONS[dim.id];
                  const score = currentScores[dim.id] || 3;

                  return (
                    <div key={dim.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{info.title}</h3>
                          <p className="text-sm text-gray-400">{info.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
                          <p className={`text-xs ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={score}
                        onChange={(e) => setCurrentScores({ ...currentScores, [dim.id]: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />

                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Beginning</span>
                        <span>Emerging</span>
                        <span>Developing</span>
                        <span>Strong</span>
                        <span>Excellent</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {info.examples.map((ex) => (
                          <span key={ex} className="px-2 py-1 text-xs rounded-full bg-white/5 text-gray-400">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar Preview */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Your Skills Profile</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getRadarData()}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: "#9CA3AF" }} />
                    <Radar
                      name="Self Assessment"
                      dataKey="score"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <span className="text-3xl font-bold text-white">{getOverallScore().toFixed(1)}</span>
                <span className="text-gray-400 ml-2">/ 5.0 Overall</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" className="border-white/20" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => setActiveStep(2)}
              >
                Continue to Reflect
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Reflect Step */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-2">Identify Your Strengths</h2>
              <p className="text-gray-400 mb-6">
                Select up to 3 dimensions that you consider your strongest areas.
              </p>

              <div className="grid md:grid-cols-2 gap-3">
                {BEHAVIORAL_DIMENSIONS.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={() => toggleStrength(dim.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      strengths.includes(dim.id)
                        ? "bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          strengths.includes(dim.id) ? "bg-emerald-500" : "bg-white/10"
                        }`}
                      >
                        {strengths.includes(dim.id) ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Target className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</p>
                        <p className="text-sm text-gray-400">Score: {currentScores[dim.id].toFixed(1)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                {strengths.length}/3 selected
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-2">Areas for Improvement</h2>
              <p className="text-gray-400 mb-6">
                Select up to 3 dimensions you want to focus on improving.
              </p>

              <div className="grid md:grid-cols-2 gap-3">
                {BEHAVIORAL_DIMENSIONS.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={() => toggleImprovement(dim.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      improvements.includes(dim.id)
                        ? "bg-amber-500/20 border-amber-500/50 ring-2 ring-amber-500/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          improvements.includes(dim.id) ? "bg-amber-500" : "bg-white/10"
                        }`}
                      >
                        {improvements.includes(dim.id) ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</p>
                        <p className="text-sm text-gray-400">Score: {currentScores[dim.id].toFixed(1)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                {improvements.length}/3 selected
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Additional Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any reflections on your current skill levels..."
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" className="border-white/20" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => setActiveStep(3)}
              >
                Continue to Goals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Goals Step */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-2">Set Your Goals</h2>
              <p className="text-gray-400 mb-6">
                What do you want to achieve in your professional development journey?
              </p>

              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Example: I want to improve my communication skills by actively participating in team meetings and seeking feedback from my mentor. I also aim to develop better time management habits by using task prioritization techniques..."
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={6}
              />
            </div>

            {improvements.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Suggested Focus Areas</h3>
                <p className="text-gray-400 mb-4">Based on your areas for improvement:</p>

                <div className="space-y-4">
                  {improvements.map((imp) => {
                    const info = ASSESSMENT_DESCRIPTIONS[imp];
                    return (
                      <div key={imp} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-medium text-white mb-2">{info.title}</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {info.examples.map((ex) => (
                            <li key={ex} className="flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 text-indigo-400" />
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" className="border-white/20" onClick={() => setActiveStep(2)}>
                Back
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => setActiveStep(4)}
              >
                Review Assessment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-6">Review Your Assessment</h2>

              {/* Overall Score */}
              <div className="flex items-center justify-center gap-6 p-6 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 mb-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-white">{getOverallScore().toFixed(1)}</p>
                  <p className="text-gray-400">Overall Score</p>
                </div>
                <div className={`text-xl font-semibold ${getScoreColor(getOverallScore())}`}>
                  {getScoreLabel(getOverallScore())}
                </div>
              </div>

              {/* Skills Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {BEHAVIORAL_DIMENSIONS.map((dim) => (
                  <div key={dim.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-gray-300">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</span>
                    <span className={`font-semibold ${getScoreColor(currentScores[dim.id])}`}>
                      {currentScores[dim.id].toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-400" />
                    Strengths
                  </h3>
                  <div className="space-y-2">
                    {strengths.length > 0 ? (
                      strengths.map((s) => (
                        <div key={s} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 text-sm">
                          {ASSESSMENT_DESCRIPTIONS[s].title}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No strengths selected</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {improvements.length > 0 ? (
                      improvements.map((s) => (
                        <div key={s} className="p-2 rounded-lg bg-amber-500/10 text-amber-300 text-sm">
                          {ASSESSMENT_DESCRIPTIONS[s].title}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No areas selected</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Goals */}
              {goals && (
                <div className="mb-6">
                  <h3 className="font-semibold text-white mb-3">Goals</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{goals}</p>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div>
                  <h3 className="font-semibold text-white mb-3">Notes</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" className="border-white/20" onClick={() => setActiveStep(3)}>
                Back
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onClick={saveAssessment}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Previous Assessments */}
      {assessments.length > 0 && (
        <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Assessment History</h2>
          <div className="space-y-3">
            {assessments.slice(0, 5).map((assessment) => {
              const scores = assessment.behavioral_scores as Record<string, number>;
              const avgScore =
                Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
              return (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {new Date(assessment.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {assessment.strengths?.length || 0} strengths, {assessment.areas_for_improvement?.length || 0} areas to improve
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${getScoreColor(avgScore)}`}>
                      {avgScore.toFixed(1)}
                    </span>
                    <p className="text-xs text-gray-500">Overall</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Training (Interactive Modules) component
// Type for training progress derived from growth log entries
type TrainingProgressFromLog = {
  module_id: string;
  module_slug: string;
  score: number;
  completed_at: string;
};

const Training = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Record<string, TrainingProgressFromLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Fetch training completions from growth_log_entries (same source as Growth page)
      const { data: trainingLogs } = await supabase
        .from("growth_log_entries")
        .select("*")
        .eq("candidate_id", user.id)
        .eq("event_type", "training")
        .order("created_at", { ascending: false });

      // Build progress map from training logs
      const progressMap: Record<string, TrainingProgressFromLog> = {};
      (trainingLogs || []).forEach((log) => {
        const metadata = log.metadata as { module_id?: string; module_slug?: string; score?: number } | null;
        if (metadata?.module_id && !progressMap[metadata.module_id]) {
          // Only keep the latest (first due to desc order) completion per module
          progressMap[metadata.module_id] = {
            module_id: metadata.module_id,
            module_slug: metadata.module_slug || '',
            score: metadata.score || 0,
            completed_at: log.created_at,
          };
        }
      });
      setProgress(progressMap);

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const openModule = (moduleSlug: string) => {
    navigate(`/dashboard/candidate/training/module/${moduleSlug}`);
  };

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Shield': <Shield className="w-6 h-6" />,
      'Smartphone': <MessageSquare className="w-6 h-6" />,
      'Award': <Award className="w-6 h-6" />,
      'Users': <Users className="w-6 h-6" />,
      'UserX': <User className="w-6 h-6" />,
      'MessageSquare': <MessageSquare className="w-6 h-6" />,
      'AlertTriangle': <AlertCircle className="w-6 h-6" />,
      'Scale': <Sliders className="w-6 h-6" />,
      'FileCheck': <FileText className="w-6 h-6" />,
      'Handshake': <Users className="w-6 h-6" />,
    };
    return icons[iconName] || <BookOpen className="w-6 h-6" />;
  };

  // Calculate statistics from growth log entries
  const completedCount = Object.keys(progress).length;
  const inProgressCount = 0; // Growth log only tracks completions, not in-progress

  // Check if module is locked (requires previous modules to be completed for sequential unlocking)
  const isModuleLocked = (index: number): boolean => {
    if (index === 0) return false; // First module is always unlocked
    // For now, all modules are unlocked - can enable sequential locking by uncommenting:
    // const previousModule = INTERACTIVE_MODULES[index - 1];
    // return progress[previousModule.id]?.status !== 'completed';
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Interactive Training</h1>
        <p className="text-gray-400">
          Master workplace behaviors through immersive scenario-based learning modules.
        </p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <BookOpen className="w-8 h-8 text-indigo-400 mb-3" />
          <p className="text-3xl font-bold text-white">{INTERACTIVE_MODULES.length}</p>
          <p className="text-sm text-gray-400">Total Modules</p>
        </div>
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <Play className="w-8 h-8 text-amber-400 mb-3" />
          <p className="text-3xl font-bold text-white">{inProgressCount}</p>
          <p className="text-sm text-gray-400">In Progress</p>
        </div>
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <CheckCircle className="w-8 h-8 text-emerald-400 mb-3" />
          <p className="text-3xl font-bold text-white">{completedCount}</p>
          <p className="text-sm text-gray-400">Completed</p>
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Training Modules</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {INTERACTIVE_MODULES.map((module, index) => {
            const moduleProgress = progress[module.id];
            // If we have a log entry for this module, it's completed
            const isCompleted = !!moduleProgress;
            const locked = isModuleLocked(index);

            return (
              <motion.div
                key={module.id}
                whileHover={!locked ? { scale: 1.02 } : {}}
                className={`relative p-6 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  locked
                    ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
                onClick={() => !locked && openModule(module.slug)}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-5`} />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color}`}>
                      {getIconComponent(module.icon)}
                    </div>
                    <div className="flex items-center gap-2">
                      {locked ? (
                        <Lock className="w-5 h-5 text-gray-500" />
                      ) : isCompleted ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            {moduleProgress.score}pts
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs mb-2 bg-gradient-to-r ${module.color} bg-opacity-20 text-white`}>
                      {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
                    </span>
                    <h3 className="font-semibold text-white text-lg">{module.title}</h3>
                    <p className="text-sm text-gray-500">{module.subtitle}</p>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {module.description}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {module.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {module.scenes.length} scenes
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {module.totalPoints} pts
                    </span>
                  </div>

                  {/* Competencies */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {module.competencies.slice(0, 3).map((comp, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400"
                      >
                        {comp}
                      </span>
                    ))}
                    {module.competencies.length > 3 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400">
                        +{module.competencies.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Progress bar for in-progress */}
                  {status === 'in_progress' && moduleProgress?.progress_percent && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-amber-400">{moduleProgress.progress_percent}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${module.color} transition-all`}
                          style={{ width: `${moduleProgress.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  {!locked && (
                    <Button
                      size="sm"
                      className={`w-full ${
                        status === 'completed'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : status === 'in_progress'
                          ? 'bg-amber-600 hover:bg-amber-500'
                          : `bg-gradient-to-r ${module.color} hover:opacity-90`
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModule(module.slug);
                      }}
                    >
                      {status === 'completed' ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Review Module
                        </>
                      ) : status === 'in_progress' ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continue
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Module
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Info section */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/20">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Immersive Learning Experience</h3>
            <p className="text-sm text-gray-400">
              Each module features realistic workplace scenarios, interactive choices, reflection prompts,
              and knowledge checks. Navigate through multi-scene experiences that test and develop your
              professional judgment across key behavioral competencies.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// [Old Training code removed - see TrainingModuleViewer for new implementation]
// Projects (LiveWorks) component
const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<LiveWorksProject[]>([]);
  const [myApplications, setMyApplications] = useState<Map<string, LiveWorksApplication>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"browse" | "applied">("browse");

  // Application modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<LiveWorksProject | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Fetch open projects
      const { data: projectData } = await supabase
        .from("liveworks_projects")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);

      setProjects(projectData || []);

      // Fetch my applications
      const { data: applicationData } = await supabase
        .from("liveworks_applications")
        .select("*")
        .eq("candidate_id", user.id);

      if (applicationData) {
        const appMap = new Map<string, LiveWorksApplication>();
        applicationData.forEach(app => appMap.set(app.project_id, app));
        setMyApplications(appMap);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const openApplyModal = (project: LiveWorksProject) => {
    setSelectedProject(project);
    setCoverLetter("");
    setApplicationSuccess(false);
    setShowApplyModal(true);
  };

  const submitApplication = async () => {
    if (!selectedProject || !user?.id) return;

    setIsSubmitting(true);

    try {
      // Create application
      const { data: application, error } = await supabase
        .from("liveworks_applications")
        .insert({
          project_id: selectedProject.id,
          candidate_id: user.id,
          cover_letter: coverLetter || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error submitting application:", error);
        return;
      }

      // Create growth log entry
      await supabase.from("growth_log_entries").insert({
        candidate_id: user.id,
        event_type: "project",
        title: "Applied to LiveWorks Project",
        description: `Applied to: ${selectedProject.title}`,
        source_component: "LiveWorks",
        source_id: application.id,
      });

      // Update local state
      setMyApplications(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedProject.id, application);
        return newMap;
      });

      setApplicationSuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setSelectedProject(null);
        setApplicationSuccess(false);
      }, 1500);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApplicationStatus = (projectId: string) => {
    return myApplications.get(projectId);
  };

  const appliedProjects = projects.filter(p => myApplications.has(p.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">LiveWorks Projects</h1>
        <p className="text-gray-400">
          Apply to real projects with employer partners to build experience.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          Browse Projects
        </button>
        <button
          onClick={() => setActiveTab("applied")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === "applied"
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          My Applications
          {appliedProjects.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {appliedProjects.length}
            </span>
          )}
        </button>
      </motion.div>

      {activeTab === "browse" ? (
        projects.length > 0 ? (
          <motion.div variants={itemVariants} className="grid gap-4">
            {projects.map((project) => {
              const application = getApplicationStatus(project.id);
              const hasApplied = !!application;

              return (
                <div
                  key={project.id}
                  className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{project.title}</h3>
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 mt-1">
                        {project.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{project.duration_days} days</p>
                      {project.budget_min && project.budget_max && (
                        <p className="text-sm text-emerald-400">
                          ${project.budget_min} - ${project.budget_max}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.skill_level === 'beginner'
                        ? 'bg-green-500/20 text-green-400'
                        : project.skill_level === 'intermediate'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {project.skill_level}
                    </span>
                    {hasApplied ? (
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        application.status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : application.status === "rejected"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {application.status === "accepted" ? "Accepted" :
                         application.status === "rejected" ? "Not Selected" : "Application Pending"}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-500"
                        onClick={() => openApplyModal(project)}
                      >
                        Apply Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No open projects available</p>
            <p className="text-sm text-gray-500 mt-1">
              Check back soon for new opportunities
            </p>
          </motion.div>
        )
      ) : (
        appliedProjects.length > 0 ? (
          <motion.div variants={itemVariants} className="space-y-4">
            {appliedProjects.map((project) => {
              const application = getApplicationStatus(project.id)!;
              return (
                <div
                  key={project.id}
                  className="p-6 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{project.title}</h3>
                      <p className="text-sm text-gray-500">
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      application.status === "accepted"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : application.status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {application.status === "accepted" ? "Accepted" :
                       application.status === "rejected" ? "Not Selected" : "Pending"}
                    </span>
                  </div>
                  {application.cover_letter && (
                    <p className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg line-clamp-2">
                      {application.cover_letter}
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No applications yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Browse open projects and start applying
            </p>
            <Button
              className="mt-4 bg-indigo-600 hover:bg-indigo-500"
              onClick={() => setActiveTab("browse")}
            >
              Browse Projects
            </Button>
          </motion.div>
        )
      )}

      {/* Application Modal */}
      {showApplyModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => !isSubmitting && setShowApplyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg mx-4 p-6 rounded-2xl bg-gray-900 border border-white/10"
          >
            {applicationSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
                <p className="text-gray-400">
                  Your application has been sent to the employer.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Apply to Project</h2>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    disabled={isSubmitting}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Project Preview */}
                <div className="p-4 rounded-xl bg-white/5 mb-6">
                  <h3 className="font-semibold text-white">{selectedProject.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-purple-400">{selectedProject.category}</span>
                    <span className="text-gray-500">{selectedProject.duration_days} days</span>
                    <span className={`px-2 py-0.5 rounded ${
                      selectedProject.skill_level === 'beginner'
                        ? 'bg-green-500/20 text-green-400'
                        : selectedProject.skill_level === 'intermediate'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedProject.skill_level}
                    </span>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 block mb-2">
                    Cover Letter (optional)
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the employer why you're a great fit for this project..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowApplyModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitApplication}
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// Connections component - employer interest/requests
interface ConnectionWithEmployer extends T3XConnection {
  employer_profile?: EmployerProfile & { profile?: Profile };
}

const Connections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionWithEmployer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!user?.id) return;

      // Fetch connections for this candidate
      const { data: connectionData } = await supabase
        .from("t3x_connections")
        .select("*")
        .eq("candidate_id", user.id)
        .order("created_at", { ascending: false });

      if (connectionData && connectionData.length > 0) {
        // Get employer profiles for each connection
        const enrichedConnections = await Promise.all(
          connectionData.map(async (conn) => {
            const { data: employerProfile } = await supabase
              .from("employer_profiles")
              .select("*")
              .eq("id", conn.employer_id)
              .single();

            let profile = null;
            if (employerProfile) {
              const { data: p } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", employerProfile.profile_id)
                .single();
              profile = p;
            }

            return {
              ...conn,
              employer_profile: employerProfile ? { ...employerProfile, profile } : undefined,
            };
          })
        );
        setConnections(enrichedConnections);
      } else {
        setConnections([]);
      }

      setIsLoading(false);
    };

    fetchConnections();
  }, [user?.id]);

  const respondToConnection = async (connectionId: string, accept: boolean) => {
    setRespondingTo(connectionId);

    try {
      const newStatus = accept ? "accepted" : "declined";

      const { error } = await supabase
        .from("t3x_connections")
        .update({
          status: newStatus,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      if (error) {
        console.error("Error updating connection:", error);
        return;
      }

      // Update local state
      setConnections(prev =>
        prev.map(c => c.id === connectionId ? { ...c, status: newStatus, responded_at: new Date().toISOString() } : c)
      );

      // Create growth log entry
      await supabase.from("growth_log_entries").insert({
        candidate_id: user?.id,
        event_type: "tier_change",
        title: accept ? "Accepted Employer Connection" : "Declined Employer Connection",
        description: `Response sent to employer connection request`,
        source_component: "T3X",
        source_id: connectionId,
      });

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setRespondingTo(null);
    }
  };

  const pendingConnections = connections.filter(c => c.status === "pending");
  const respondedConnections = connections.filter(c => c.status !== "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Employer Connections</h1>
        <p className="text-gray-400">
          Manage connection requests from employers interested in your profile.
        </p>
      </motion.div>

      {/* Pending Requests */}
      {pendingConnections.length > 0 && (
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Pending Requests ({pendingConnections.length})
          </h2>
          <div className="space-y-4">
            {pendingConnections.map((connection) => (
              <div
                key={connection.id}
                className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-lg">
                      {connection.employer_profile?.company_name || "Unknown Company"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {connection.employer_profile?.industry || "Industry not specified"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {connection.message && (
                  <div className="mt-4 p-3 rounded-lg bg-black/20">
                    <p className="text-sm text-gray-300">{connection.message}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => respondToConnection(connection.id, true)}
                    disabled={respondingTo === connection.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {respondingTo === connection.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => respondToConnection(connection.id, false)}
                    disabled={respondingTo === connection.id}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Connection History */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Connection History</h2>
        {respondedConnections.length > 0 ? (
          <div className="space-y-3">
            {respondedConnections.map((connection) => (
              <div
                key={connection.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  connection.status === "accepted"
                    ? "bg-emerald-500/20"
                    : "bg-gray-500/20"
                }`}>
                  <Building2 className={`w-5 h-5 ${
                    connection.status === "accepted"
                      ? "text-emerald-400"
                      : "text-gray-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">
                    {connection.employer_profile?.company_name || "Unknown Company"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {connection.responded_at
                      ? `Responded ${new Date(connection.responded_at).toLocaleDateString()}`
                      : `Requested ${new Date(connection.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  connection.status === "accepted"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : connection.status === "declined"
                    ? "bg-gray-500/20 text-gray-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        ) : pendingConnections.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No connection requests yet</p>
            <p className="text-sm text-gray-500 mt-1">
              When employers are interested in your profile, you'll see their requests here
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No previous connections</p>
        )}
      </motion.div>
    </motion.div>
  );
};

// Profile component with edit functionality
const Profile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    headline: "",
    bio: "",
    location: "",
    skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        location: profile.location || "",
        // Preserve skills - they come from candidate_profiles, not profiles
      }));
    }
  }, [profile]);

  useEffect(() => {
    const fetchCandidateProfile = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (data) {
        setCandidateProfile(data);
        setFormData((prev) => ({
          ...prev,
          skills: data.skills || [],
        }));
      }
    };

    fetchCandidateProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      // Check if profile is reasonably complete
      const isProfileComplete = !!(
        formData.first_name &&
        formData.last_name &&
        (formData.headline || formData.bio) &&
        formData.skills.length > 0
      );

      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          headline: formData.headline,
          bio: formData.bio,
          location: formData.location,
          onboarding_completed: isProfileComplete,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      // Check if candidate_profile exists
      const { data: existingProfile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (existingProfile) {
        // Update existing candidate_profile
        const { error: updateError } = await supabase
          .from("candidate_profiles")
          .update({
            skills: formData.skills,
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", user.id);

        if (updateError) {
          console.error("Error updating candidate profile:", updateError);
        }
      } else {
        // Insert new candidate_profile (default to resume_upload entry path)
        const { error: insertError } = await supabase
          .from("candidate_profiles")
          .insert({
            profile_id: user.id,
            skills: formData.skills,
            entry_path: 'resume_upload',
          });

        if (insertError) {
          console.error("Error creating candidate profile:", insertError);
        }
      }

      // Refresh local state
      const { data: updatedCandidateProfile } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (updatedCandidateProfile) {
        setCandidateProfile(updatedCandidateProfile);
        // Update formData.skills to reflect saved data
        setFormData((prev) => ({
          ...prev,
          skills: updatedCandidateProfile.skills || [],
        }));
      }

      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_resume.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist, provide helpful message
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          setUploadError('Resume storage is being configured. Please try again later.');
          console.error('Storage bucket "resumes" may not exist:', uploadError);
        } else {
          setUploadError('Failed to upload resume. Please try again.');
          console.error('Upload error:', uploadError);
        }
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumeUrl = publicUrlData?.publicUrl || fileName;

      // Upsert candidate profile with resume URL
      const { data: updatedProfile } = await supabase
        .from("candidate_profiles")
        .upsert({
          profile_id: user.id,
          resume_url: resumeUrl,
          skills: candidateProfile?.skills || [],
          entry_path: candidateProfile?.entry_path || 'resume_upload',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id'
        })
        .select()
        .single();

      if (updatedProfile) {
        setCandidateProfile(updatedProfile);
      }

      // Create growth log entry for resume upload
      await supabase.from("growth_log_entries").insert({
        candidate_id: user.id,
        event_type: "resume_upload",
        title: "Resume Uploaded",
        description: `Uploaded resume: ${file.name}`,
        source_component: "Profile",
      });

      setUploadSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error("Error uploading resume:", error);
      setUploadError('An unexpected error occurred. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!user?.id || !candidateProfile?.resume_url) return;

    if (!confirm('Are you sure you want to delete your resume?')) return;

    try {
      // Extract filename from URL
      const urlParts = candidateProfile.resume_url.split('/');
      const fileName = urlParts.slice(-2).join('/'); // user_id/filename.ext

      // Delete from storage
      await supabase.storage.from('resumes').remove([fileName]);

      // Update candidate profile
      await supabase
        .from("candidate_profiles")
        .update({
          resume_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", user.id);

      setCandidateProfile({ ...candidateProfile, resume_url: null });
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please upload a JPG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const oldUrlParts = profile.avatar_url.split('/');
          const oldFileName = oldUrlParts.slice(-2).join('/');
          await supabase.storage.from('avatars').remove([oldFileName]);
        } catch (e) {
          // Ignore errors when deleting old avatar
        }
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          setAvatarError('Avatar storage is being configured. Please try again later.');
          console.error('Storage bucket "avatars" may not exist:', uploadError);
        } else {
          setAvatarError('Failed to upload avatar. Please try again.');
          console.error('Upload error:', uploadError);
        }
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData?.publicUrl || fileName;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile with avatar:", updateError);
        setAvatarError('Failed to save avatar. Please try again.');
        return;
      }

      // Refresh profile to get updated avatar
      await refreshProfile();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setAvatarError('An unexpected error occurred. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.id || !profile?.avatar_url) return;

    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    try {
      // Extract filename from URL
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage.from('avatars').remove([fileName]);

      // Update profile
      await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await refreshProfile();
    } catch (error) {
      console.error("Error deleting avatar:", error);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
          <p className="text-gray-400">Manage your personal information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-500">
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {/* Avatar and basic info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-20 h-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-3xl text-white font-bold">
                  {formData.first_name?.[0]}{formData.last_name?.[0]}
                </div>
              )}
              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
              {/* Delete button */}
              {profile?.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {formData.first_name} {formData.last_name}
              </h2>
              <p className="text-gray-400">{profile?.email}</p>
              <p className="text-xs text-gray-500 mt-1">Hover over photo to change</p>
            </div>
          </div>

          {avatarError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {avatarError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.first_name}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Resume Upload */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Resume</h3>
              <p className="text-sm text-gray-400">Upload your resume to start the credentialing process</p>
            </div>
            <FileText className="w-8 h-8 text-indigo-400" />
          </div>

          {candidateProfile?.resume_url ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">Resume Uploaded</p>
                  <p className="text-sm text-gray-400 truncate">
                    Your resume is on file and ready for review
                  </p>
                </div>
              </div>

              {/* Resume Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowResumeViewer(true)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Resume
                </button>
                <a
                  href={candidateProfile.resume_url}
                  download
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={candidateProfile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
                <button
                  onClick={handleDeleteResume}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>

              {/* Replace option */}
              <div className="pt-2 border-t border-white/10">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  Replace Resume
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 rounded-lg border-2 border-dashed border-white/20 text-center hover:border-indigo-500/50 transition-colors">
                <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">
                  Drop your resume here or click to upload
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supports PDF, DOC, DOCX (max 10MB)
                </p>
                <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Select File
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  Resume uploaded successfully!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Headline and Bio */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-2">Headline</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                placeholder="e.g., Software Developer | Career Changer"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-white">{formData.headline || "No headline set"}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">Bio</label>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{formData.bio || "No bio set"}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <label className="text-sm text-gray-400 block mb-2">Location</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="City, State"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          ) : (
            <p className="text-white">{formData.location || "Not specified"}</p>
          )}
        </div>

        {/* Skills */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <label className="text-sm text-gray-400 block mb-3">Skills</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-sm"
              >
                {skill}
                {isEditing && (
                  <button onClick={() => removeSkill(skill)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {formData.skills.length === 0 && !isEditing && (
              <p className="text-gray-500">No skills added</p>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add a skill..."
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              <Button onClick={addSkill} size="sm" className="bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Resume Viewer Modal */}
      {showResumeViewer && candidateProfile?.resume_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowResumeViewer(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-5xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Your Resume</h2>
                  <p className="text-sm text-gray-400">View and review your uploaded resume</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={candidateProfile.resume_url}
                  download
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={candidateProfile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
                <button
                  onClick={() => setShowResumeViewer(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Resume Viewer */}
            <div className="flex-1 overflow-hidden">
              {candidateProfile.resume_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${candidateProfile.resume_url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0"
                  title="Resume Viewer"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Document Preview</h3>
                  <p className="text-gray-400 mb-6 max-w-md">
                    This document format cannot be previewed directly in the browser.
                    You can download it or open it in a new tab to view the contents.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={candidateProfile.resume_url}
                      download
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Resume
                    </a>
                    <a
                      href={`https://docs.google.com/viewer?url=${encodeURIComponent(candidateProfile.resume_url)}&embedded=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Open with Google Docs
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Settings component
const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // Would implement account deletion here
      alert("Account deletion would be implemented here");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);

    // Validation
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await updatePassword(passwordForm.newPassword);

      if (error) {
        setPasswordError(error.message || "Failed to update password");
        return;
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
      }, 1500);

    } catch (error) {
      setPasswordError("An unexpected error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account preferences</p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {/* Account */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Email Address</p>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Account Created</p>
              <p className="text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              setPasswordForm({ newPassword: "", confirmPassword: "" });
              setPasswordError(null);
              setPasswordSuccess(false);
              setShowPasswordModal(true);
            }}
          >
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </Button>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Email notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Progress updates</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Project opportunities</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <p className="text-sm text-gray-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={handleDeleteAccount}
          >
            Delete Account
          </Button>
        </div>
      </motion.div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => !isChangingPassword && setShowPasswordModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-gray-900 border border-white/10"
          >
            {passwordSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Password Updated!</h3>
                <p className="text-gray-400">
                  Your password has been successfully changed.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Change Password</h2>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    disabled={isChangingPassword}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full px-4 py-2.5 pr-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2.5 pr-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Password must be at least 8 characters long.
                </p>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={isChangingPassword}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// Find Mentor component
interface MentorWithProfile extends MentorProfile {
  profile?: Profile;
}

const FindMentor = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<MentorWithProfile[]>([]);
  const [myAssignments, setMyAssignments] = useState<MentorAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<MentorWithProfile | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [recommendedMatches, setRecommendedMatches] = useState<MentorMatch[]>([]);
  const [showRecommended, setShowRecommended] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MentorMatch | null>(null);

  useEffect(() => {
    const fetchMentors = async () => {
      if (!user?.id) return;

      // Fetch intelligent mentor matches
      try {
        const matches = await MentorMatchingService.findMentorMatches(user.id, 5);
        setRecommendedMatches(matches);
      } catch (error) {
        console.log("Mentor matching unavailable:", error);
      }

      // Fetch mentors who are accepting
      const { data: mentorsData } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("is_accepting", true)
        .order("total_observations", { ascending: false });

      if (mentorsData) {
        // Enrich with profile data
        const enrichedMentors = await Promise.all(
          mentorsData.map(async (mentor) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", mentor.profile_id)
              .single();

            return { ...mentor, profile: profileData };
          })
        );
        setMentors(enrichedMentors);
      }

      // Fetch my current assignments
      const { data: assignmentsData } = await supabase
        .from("mentor_assignments")
        .select("*")
        .eq("candidate_id", user.id);

      setMyAssignments(assignmentsData || []);

      setIsLoading(false);
    };

    fetchMentors();
  }, [user?.id]);

  const getCompatibilityBadgeColor = (level: string) => {
    switch (level) {
      case "excellent":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "good":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "fair":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const requestMentor = async () => {
    if (!user?.id || !selectedMentor) return;

    setIsRequesting(true);

    // Create mentor assignment request
    const { error } = await supabase.from("mentor_assignments").insert({
      mentor_id: selectedMentor.id,
      candidate_id: user.id,
      status: "active",
      loop_number: 1,
    });

    if (!error) {
      // Send notification to mentor
      await supabase.from("notifications").insert({
        user_id: selectedMentor.profile_id,
        type: "mentee_request",
        title: "New Mentee Request",
        message: requestMessage || "A candidate has requested you as their mentor.",
      });

      setRequestSent((prev) => new Set(prev).add(selectedMentor.id));
      setSelectedMentor(null);
      setRequestMessage("");
    }

    setIsRequesting(false);
  };

  const industries = [...new Set(mentors.map((m) => m.industry))];
  const filteredMentors =
    industryFilter === "all"
      ? mentors
      : mentors.filter((m) => m.industry === industryFilter);

  const activeMentor = myAssignments.find((a) => a.status === "active");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Find a Mentor</h1>
        <p className="text-gray-400">
          Connect with experienced professionals who can guide your career growth.
        </p>
      </motion.div>

      {/* Active Mentor Status */}
      {activeMentor && (
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-emerald-400">Active Mentorship</h3>
          </div>
          <p className="text-gray-300">
            You currently have an active mentor. Complete your mentor loops to progress.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Loop Progress: {activeMentor.loop_number} / 3
          </p>
        </motion.div>
      )}

      {/* Recommended Matches Section */}
      {recommendedMatches.length > 0 && !activeMentor && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Recommended For You</h2>
                <p className="text-sm text-gray-400">Based on your skills and goals</p>
              </div>
            </div>
            <button
              onClick={() => setShowRecommended(!showRecommended)}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              {showRecommended ? "Hide" : "Show"} recommendations
            </button>
          </div>

          {showRecommended && (
            <div className="grid gap-4">
              {recommendedMatches.map((match) => {
                const mentor = match.mentor;
                const isAssigned = myAssignments.some((a) => a.mentor_id === mentor.id);
                const hasSentRequest = requestSent.has(mentor.id);
                const spotsAvailable = mentor.max_mentees - mentor.current_mentees;

                return (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                  >
                    {/* Match Score Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getCompatibilityBadgeColor(
                          match.compatibilityLevel
                        )}`}
                      >
                        {match.score.total}% Match
                      </span>
                    </div>

                    <div className="flex items-start gap-4">
                      {mentor.profile?.avatar_url ? (
                        <img
                          src={mentor.profile.avatar_url}
                          alt="Mentor"
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                          {mentor.profile?.first_name?.[0]}
                          {mentor.profile?.last_name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg">
                          {mentor.profile?.first_name} {mentor.profile?.last_name}
                        </h3>
                        <p className="text-sm text-indigo-400">
                          {mentor.job_title} {mentor.company && `at ${mentor.company}`}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{mentor.years_experience} years exp</span>
                          <span className="px-2 py-0.5 rounded bg-white/10">
                            {mentor.industry}
                          </span>
                          {mentor.avg_rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" />
                              {mentor.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Match Reasons */}
                    {match.matchReasons.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {match.matchReasons.map((reason, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-full text-xs bg-white/5 text-gray-300 border border-white/10"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Score Breakdown */}
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {[
                        { label: "Skills", value: match.score.skillMatch, color: "bg-blue-500" },
                        { label: "Industry", value: match.score.industryMatch, color: "bg-purple-500" },
                        { label: "Available", value: match.score.availabilityScore, color: "bg-emerald-500" },
                        { label: "Experience", value: match.score.experienceScore, color: "bg-amber-500" },
                        { label: "Rating", value: match.score.ratingScore, color: "bg-rose-500" },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <div className="h-1 rounded-full bg-white/10 mb-1">
                            <div
                              className={`h-full rounded-full ${item.color}`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {isAssigned ? (
                        <Button disabled className="w-full bg-emerald-600/50 cursor-not-allowed">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Currently Assigned
                        </Button>
                      ) : hasSentRequest ? (
                        <Button disabled className="w-full bg-indigo-600/50 cursor-not-allowed">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Request Sent
                        </Button>
                      ) : spotsAvailable > 0 ? (
                        <Button
                          onClick={() =>
                            setSelectedMentor({ ...mentor, profile: mentor.profile })
                          }
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Request This Mentor
                        </Button>
                      ) : (
                        <Button disabled className="w-full bg-gray-600/50 cursor-not-allowed">
                          No Spots Available
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Industry Filter */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        <button
          onClick={() => setIndustryFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            industryFilter === "all"
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          All Industries
        </button>
        {industries.map((industry) => (
          <button
            key={industry}
            onClick={() => setIndustryFilter(industry)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              industryFilter === industry
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {industry}
          </button>
        ))}
      </motion.div>

      {/* Mentors Grid */}
      <motion.div variants={itemVariants}>
        {filteredMentors.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredMentors.map((mentor) => {
              const isAssigned = myAssignments.some((a) => a.mentor_id === mentor.id);
              const hasSentRequest = requestSent.has(mentor.id);
              const spotsAvailable = mentor.max_mentees - mentor.current_mentees;

              return (
                <motion.div
                  key={mentor.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-6 rounded-xl border transition-colors ${
                    isAssigned
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {mentor.profile?.avatar_url ? (
                      <img
                        src={mentor.profile.avatar_url}
                        alt="Mentor"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {mentor.profile?.first_name?.[0]}{mentor.profile?.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-lg">
                        {mentor.profile?.first_name} {mentor.profile?.last_name}
                      </h3>
                      <p className="text-sm text-indigo-400">
                        {mentor.job_title} {mentor.company && `at ${mentor.company}`}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{mentor.years_experience} years exp</span>
                        <span className="px-2 py-0.5 rounded bg-white/10">
                          {mentor.industry}
                        </span>
                      </div>
                    </div>
                    {isAssigned && (
                      <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                        Your Mentor
                      </span>
                    )}
                  </div>

                  {/* Specializations */}
                  {mentor.specializations && mentor.specializations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {mentor.specializations.slice(0, 3).map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400"
                        >
                          {spec}
                        </span>
                      ))}
                      {mentor.specializations.length > 3 && (
                        <span className="px-2 py-1 rounded text-xs bg-white/10 text-gray-400">
                          +{mentor.specializations.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {mentor.total_observations} observations
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {spotsAvailable} spot{spotsAvailable !== 1 ? "s" : ""} available
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    {isAssigned ? (
                      <Button disabled className="w-full bg-emerald-600/50 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Currently Assigned
                      </Button>
                    ) : hasSentRequest ? (
                      <Button disabled className="w-full bg-indigo-600/50 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Request Sent
                      </Button>
                    ) : spotsAvailable > 0 ? (
                      <Button
                        onClick={() => setSelectedMentor(mentor)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500"
                        disabled={!!activeMentor}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {activeMentor ? "Complete Current Mentorship" : "Request Mentorship"}
                      </Button>
                    ) : (
                      <Button disabled className="w-full bg-gray-600/50 cursor-not-allowed">
                        No Spots Available
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No mentors available</p>
            <p className="text-sm text-gray-500 mt-1">
              Check back later for available mentors
            </p>
          </div>
        )}
      </motion.div>

      {/* Request Mentor Modal */}
      {selectedMentor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMentor(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              {selectedMentor.profile?.avatar_url ? (
                <img
                  src={selectedMentor.profile.avatar_url}
                  alt="Mentor"
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {selectedMentor.profile?.first_name?.[0]}{selectedMentor.profile?.last_name?.[0]}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  Request {selectedMentor.profile?.first_name} as your mentor
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedMentor.job_title} {selectedMentor.company && `at ${selectedMentor.company}`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                Introduction Message (Optional)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Tell the mentor why you'd like them to guide you..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedMentor(null)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={requestMentor}
                disabled={isRequesting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Messages Page component
const MessagesPage = () => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.id) return;

      // Get conversation IDs where user is a participant
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (participantData && participantData.length > 0) {
        const conversationIds = participantData.map((p) => p.conversation_id);

        // Get conversation details
        const { data: convData } = await supabase
          .from("conversations")
          .select("*")
          .in("id", conversationIds)
          .order("last_message_at", { ascending: false });

        // For each conversation, get the other participant's info
        const enrichedConversations = await Promise.all(
          (convData || []).map(async (conv) => {
            const { data: participants } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", conv.id)
              .neq("user_id", user.id);

            let otherUser = null;
            if (participants && participants.length > 0) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, avatar_url, role")
                .eq("id", participants[0].user_id)
                .single();
              otherUser = profileData;
            }

            const myParticipant = participantData.find((p) => p.conversation_id === conv.id);

            return {
              ...conv,
              other_user: otherUser,
              last_read_at: myParticipant?.last_read_at,
            };
          })
        );

        setConversations(enrichedConversations);
      }

      setIsLoading(false);
    };

    fetchConversations();
  }, [user?.id]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
        .eq("conversation_id", activeConversation.id)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      // Mark as read
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", activeConversation.id)
        .eq("user_id", user?.id);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        async (payload) => {
          // Fetch the new message with sender info
          const { data: newMsg } = await supabase
            .from("messages")
            .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user?.id) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      // Insert message
      await supabase.from("messages").insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content: messageContent,
        message_type: "text",
      });

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConversation.id);
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const otherName = `${c.other_user?.first_name || ""} ${c.other_user?.last_name || ""}`.toLowerCase();
    return otherName.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-[calc(100vh-12rem)]"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Messages</h1>
        <p className="text-gray-400">Connect with mentors and employers.</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="h-[calc(100%-5rem)] rounded-xl bg-white/5 border border-white/10 overflow-hidden flex"
      >
        {/* Conversations List */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No conversations yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Start a conversation from your connections
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const hasUnread = conv.last_message_at && (!conv.last_read_at || new Date(conv.last_message_at) > new Date(conv.last_read_at));

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors text-left ${
                      activeConversation?.id === conv.id ? "bg-indigo-500/10 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        {conv.other_user?.avatar_url ? (
                          <img
                            src={conv.other_user.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-indigo-400" />
                        )}
                      </div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${hasUnread ? "text-white" : "text-gray-300"}`}>
                          {conv.other_user?.first_name} {conv.other_user?.last_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {conv.last_message_at ? formatMessageTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${hasUnread ? "text-gray-300" : "text-gray-500"}`}>
                        {conv.last_message_preview || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  {activeConversation.other_user?.avatar_url ? (
                    <img
                      src={activeConversation.other_user.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {activeConversation.other_user?.role}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                            {msg.sender?.avatar_url ? (
                              <img
                                src={msg.sender.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-purple-400" />
                            )}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-br-md"
                                : "bg-white/10 text-gray-200 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isOwn ? "text-right" : ""}`}>
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a Conversation</h3>
                <p className="text-gray-400 max-w-sm">
                  Choose a conversation from the list or start a new one from your connections.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Notifications Page component
const NotificationsPage = () => {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    const fetchAllNotifications = async () => {
      if (!user?.id) return;

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "unread") {
        query = query.eq("is_read", false);
      } else if (filter === "read") {
        query = query.eq("is_read", true);
      }

      const { data } = await query;
      setAllNotifications(data || []);
      setIsLoading(false);
    };

    fetchAllNotifications();
  }, [user?.id, filter]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setAllNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase.from("notifications").delete().eq("id", notificationId);
    setAllNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "connection_request":
        return Users;
      case "connection_accepted":
        return CheckCircle;
      case "application_accepted":
        return CheckCircle;
      case "endorsement":
        return Award;
      case "passport_issued":
        return Shield;
      case "training_assigned":
        return BookOpen;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "connection_request":
        return "text-blue-400 bg-blue-500/20";
      case "connection_accepted":
      case "application_accepted":
        return "text-emerald-400 bg-emerald-500/20";
      case "endorsement":
      case "passport_issued":
        return "text-purple-400 bg-purple-500/20";
      case "training_assigned":
        return "text-amber-400 bg-amber-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-gray-400">
            Stay updated on your activity.
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-sm">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </motion.div>

      {/* Notifications List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {allNotifications.length > 0 ? (
          allNotifications.map((notification) => {
            const IconComponent = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border transition-colors ${
                  notification.is_read
                    ? "bg-white/5 border-white/10"
                    : "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`font-medium ${notification.is_read ? "text-gray-300" : "text-white"}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No notifications</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === "unread"
                ? "You're all caught up!"
                : filter === "read"
                ? "No read notifications yet"
                : "Notifications will appear here"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const CandidateDashboard = () => {
  const { profile, signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setNotifications(data || []);
    };

    fetchNotifications();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications([]);
    setShowNotifications(false);
  };

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-black/90 backdrop-blur-xl border-r border-white/10 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="https://api.a0.dev/assets/image?text=Futuristic AI-powered academy logo with glowing blue circuit patterns and neural networks&aspect=1:1&seed=academy_logo"
                alt="Logo"
                className="w-8 h-8 rounded-full"
              />
              <span className="font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                The 3rd Academy
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - scrollable */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium">
                  {profile?.first_name?.[0]}
                  {profile?.last_name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <button
              className="relative text-gray-400 hover:text-white"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-xs flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 rounded-xl bg-black/95 border border-white/10 shadow-xl overflow-hidden">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 hover:bg-white/5 border-b border-white/5 flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-500 hover:text-white p-1"
                          title="Mark as read"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No new notifications</p>
                  </div>
                )}
                <div className="p-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/dashboard/candidate/notifications");
                    }}
                    className="w-full px-3 py-2 text-sm text-center text-indigo-400 hover:bg-white/5 rounded-lg"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="passport" element={<SkillPassport />} />
            <Route path="growth" element={<GrowthLog />} />
            <Route path="assessment" element={<SelfAssessmentPage />} />
            <Route path="assessment/interactive" element={<AssessmentViewer />} />
            <Route path="assessment/skill-test" element={<InteractiveSkillAssessment />} />
            <Route path="training" element={<Training />} />
            <Route path="training/module/:moduleId" element={<TrainingModuleViewer />} />
            <Route path="projects" element={<Projects />} />
            <Route path="mentors" element={<FindMentor />} />
            <Route path="connections" element={<Connections />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default CandidateDashboard;
