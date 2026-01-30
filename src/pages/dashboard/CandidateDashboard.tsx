import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
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
} from "lucide-react";

type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type GrowthLogEntry = Database["public"]["Tables"]["growth_log_entries"]["Row"];
type BridgeFastModule = Database["public"]["Tables"]["bridgefast_modules"]["Row"];
type BridgeFastProgress = Database["public"]["Tables"]["bridgefast_progress"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type LiveWorksProject = Database["public"]["Tables"]["liveworks_projects"]["Row"];

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
  { name: "Training", href: "/dashboard/candidate/training", icon: BookOpen },
  { name: "Projects", href: "/dashboard/candidate/projects", icon: Briefcase },
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
    const steps = [
      {
        title: "Complete your profile",
        description: "Add your skills and experience",
        completed: profile?.onboarding_completed || false,
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
  const { user } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();
      setCandidateProfile(data);
      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

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

  // Has Skill Passport
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Your Skill Passport</h1>
        <p className="text-gray-400">
          Your verified behavioral credential.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <Award className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-emerald-400 font-medium">Verified</p>
            <h2 className="text-2xl font-bold text-white">Skill Passport Active</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Readiness Tier</p>
            <p className="text-xl font-semibold text-white">
              {candidateProfile?.current_tier?.replace("_", " ").toUpperCase() || "TIER 1"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Mentor Loops Completed</p>
            <p className="text-xl font-semibold text-white">{candidateProfile?.mentor_loops || 0}</p>
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("growth_log_entries")
        .select("*")
        .eq("candidate_id", user.id)
        .order("created_at", { ascending: false });

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
        <h1 className="text-3xl font-bold text-white mb-2">Growth Log</h1>
        <p className="text-gray-400">
          Your complete behavioral development timeline.
        </p>
      </motion.div>

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
    </motion.div>
  );
};

// Training (BridgeFast) component
const Training = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<BridgeFastModule[]>([]);
  const [progress, setProgress] = useState<Record<string, BridgeFastProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Fetch all active modules
      const { data: modulesData } = await supabase
        .from("bridgefast_modules")
        .select("*")
        .eq("is_active", true)
        .order("order_index");

      setModules(modulesData || []);

      // Fetch user's progress
      const { data: progressData } = await supabase
        .from("bridgefast_progress")
        .select("*")
        .eq("candidate_id", user.id);

      const progressMap: Record<string, BridgeFastProgress> = {};
      (progressData || []).forEach((p) => {
        progressMap[p.module_id] = p;
      });
      setProgress(progressMap);

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const startModule = async (moduleId: string) => {
    if (!user?.id) return;

    const { error } = await supabase.from("bridgefast_progress").insert({
      candidate_id: user.id,
      module_id: moduleId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      progress_percent: 0,
    });

    if (!error) {
      setProgress((prev) => ({
        ...prev,
        [moduleId]: {
          id: "",
          candidate_id: user.id,
          module_id: moduleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: null,
          progress_percent: 0,
          final_score: null,
          status: "in_progress",
          deadline: null,
        },
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const completedCount = Object.values(progress).filter(p => p.status === "completed").length;
  const inProgressCount = Object.values(progress).filter(p => p.status === "in_progress").length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">BridgeFast Training</h1>
        <p className="text-gray-400">
          Develop workplace-ready behaviors through targeted training modules.
        </p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <BookOpen className="w-8 h-8 text-indigo-400 mb-3" />
          <p className="text-3xl font-bold text-white">{modules.length}</p>
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
          {modules.map((module) => {
            const moduleProgress = progress[module.id];
            const status = moduleProgress?.status || "not_started";

            return (
              <div
                key={module.id}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400 mb-2">
                      {module.behavioral_dimension}
                    </span>
                    <h3 className="font-semibold text-white">{module.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    {module.duration_hours}h
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {module.description}
                </p>

                {status === "completed" ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Completed</span>
                    {moduleProgress?.final_score && (
                      <span className="ml-auto text-sm">Score: {moduleProgress.final_score}%</span>
                    )}
                  </div>
                ) : status === "in_progress" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-400">In Progress</span>
                      <span className="text-gray-400">{moduleProgress?.progress_percent || 0}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                        style={{ width: `${moduleProgress?.progress_percent || 0}%` }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => startModule(module.id)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Module
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Projects (LiveWorks) component
const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<LiveWorksProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("liveworks_projects")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10);

      setProjects(data || []);
      setIsLoading(false);
    };

    fetchProjects();
  }, []);

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

      {projects.length > 0 ? (
        <motion.div variants={itemVariants} className="grid gap-4">
          {projects.map((project) => (
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
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">
                  Apply Now
                </Button>
              </div>
            </div>
          ))}
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
      )}
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
      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          headline: formData.headline,
          bio: formData.bio,
          location: formData.location,
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
        // Insert new candidate_profile
        const { error: insertError } = await supabase
          .from("candidate_profiles")
          .insert({
            profile_id: user.id,
            skills: formData.skills,
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
                <div className="flex gap-2">
                  <a
                    href={candidateProfile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors text-sm flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                  <button
                    onClick={handleDeleteResume}
                    className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>

              {/* Replace option */}
              <div>
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
    </motion.div>
  );
};

// Settings component
const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // Would implement account deletion here
      alert("Account deletion would be implemented here");
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
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
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
    </motion.div>
  );
};

const CandidateDashboard = () => {
  const { profile, signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
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
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-black/95 border border-white/10 shadow-xl overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 hover:bg-white/5 border-b border-white/5">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No new notifications</p>
                  </div>
                )}
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
            <Route path="training" element={<Training />} />
            <Route path="projects" element={<Projects />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default CandidateDashboard;
