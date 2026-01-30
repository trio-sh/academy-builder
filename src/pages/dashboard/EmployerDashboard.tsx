import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
import {
  Search,
  Users,
  Briefcase,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  TrendingUp,
  Building2,
  UserCheck,
  AlertCircle,
  Loader2,
  ChevronRight,
  Award,
  Eye,
  Send,
  Plus,
  Save,
  ExternalLink,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type LiveWorksProject = Database["public"]["Tables"]["liveworks_projects"]["Row"];
type T3XConnection = Database["public"]["Tables"]["t3x_connections"]["Row"];

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
  { name: "Overview", href: "/dashboard/employer", icon: TrendingUp },
  { name: "Find Talent", href: "/dashboard/employer/search", icon: Search },
  { name: "Connections", href: "/dashboard/employer/connections", icon: Users },
  { name: "Projects", href: "/dashboard/employer/projects", icon: Briefcase },
  { name: "Messages", href: "/dashboard/employer/messages", icon: MessageSquare },
  { name: "Company", href: "/dashboard/employer/company", icon: Building2 },
  { name: "Settings", href: "/dashboard/employer/settings", icon: Settings },
];

// Overview component with real data
const Overview = () => {
  const { profile, user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Fetch employer profile
        const { data: ep } = await supabase
          .from("employer_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        setEmployerProfile(ep);

        if (ep) {
          // Count connections
          const { count: connCount } = await supabase
            .from("t3x_connections")
            .select("*", { count: "exact", head: true })
            .eq("employer_profile_id", ep.id);
          setConnectionCount(connCount || 0);

          // Count projects
          const { count: projCount } = await supabase
            .from("liveworks_projects")
            .select("*", { count: "exact", head: true })
            .eq("employer_profile_id", ep.id)
            .in("status", ["draft", "open", "in_progress"]);
          setProjectCount(projCount || 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const stats = [
    {
      label: "Active Connections",
      value: connectionCount.toString(),
      icon: Users,
      color: "from-indigo-500 to-purple-500"
    },
    {
      label: "Total Hires",
      value: (employerProfile?.total_hires || 0).toString(),
      icon: UserCheck,
      color: "from-emerald-500 to-teal-500"
    },
    {
      label: "Open Projects",
      value: projectCount.toString(),
      icon: Briefcase,
      color: "from-amber-500 to-orange-500"
    },
    {
      label: "Company Status",
      value: employerProfile?.is_verified ? "Verified" : "Pending",
      icon: Building2,
      color: "from-pink-500 to-rose-500"
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {profile?.first_name || "Employer"}
        </h1>
        <p className="text-gray-400">
          Find verified talent and manage your hiring pipeline.
        </p>
      </motion.div>

      {/* Verification status */}
      {employerProfile && !employerProfile.is_verified && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <p className="text-amber-400">
            Your company is pending verification. Complete your company profile to get verified.
            <Link to="/dashboard/employer/company" className="underline ml-2">
              Update profile
            </Link>
          </p>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative group p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl bg-gradient-to-r from-emerald-600 to-teal-600 transition-opacity" />
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

      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/dashboard/employer/search"
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">Search T3X Exchange</p>
                <p className="text-sm text-gray-500">Browse verified candidates</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400" />
            </Link>
            <Link
              to="/dashboard/employer/projects"
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">Post a Project</p>
                <p className="text-sm text-gray-500">Create a LiveWorks project</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400" />
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Platform Benefits</h2>
          <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <h3 className="font-semibold text-white mb-4">Why Use The 3rd Academy?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                <span className="text-gray-400">Pre-vetted candidates with verified Skill Passports</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                <span className="text-gray-400">Mentor-validated behavioral readiness</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                <span className="text-gray-400">Real work samples through LiveWorks projects</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// T3X Search component
interface CandidateWithProfile extends CandidateProfile {
  profile?: Profile;
}

const SearchTalent = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<CandidateWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    tier: "",
    skill: "",
  });

  useEffect(() => {
    const fetchCandidates = async () => {
      // Get candidates with Skill Passport listed on T3X
      let query = supabase
        .from("candidate_profiles")
        .select("*")
        .eq("is_listed_on_t3x", true)
        .eq("has_skill_passport", true);

      if (filters.tier) {
        query = query.eq("current_tier", filters.tier);
      }

      const { data: candidateData } = await query.limit(20);

      if (candidateData && candidateData.length > 0) {
        // Get profile info for each candidate
        const enhancedCandidates = await Promise.all(
          candidateData.map(async (cp) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", cp.profile_id)
              .single();
            return { ...cp, profile: profileData || undefined };
          })
        );
        setCandidates(enhancedCandidates);
      } else {
        setCandidates([]);
      }

      setIsLoading(false);
    };

    fetchCandidates();
  }, [filters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">T3X Talent Exchange</h1>
        <p className="text-gray-400">
          Search for verified Skill Passport holders.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>
        <select
          value={filters.tier}
          onChange={(e) => setFilters((prev) => ({ ...prev, tier: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Tiers</option>
          <option value="tier_1">Tier 1 - Ready</option>
          <option value="tier_2">Tier 2 - Developing</option>
          <option value="tier_3">Tier 3 - Emerging</option>
        </select>
        <input
          type="text"
          placeholder="Search skills..."
          value={filters.skill}
          onChange={(e) => setFilters((prev) => ({ ...prev, skill: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
        />
      </motion.div>

      {/* Results */}
      {candidates.length > 0 ? (
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {candidate.profile?.first_name?.[0]}
                  {candidate.profile?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">
                      {candidate.profile?.first_name} {candidate.profile?.last_name}
                    </h3>
                    <Award className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-400">{candidate.profile?.headline || "Skill Passport Holder"}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${
                      candidate.current_tier === "tier_1"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : candidate.current_tier === "tier_2"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {candidate.current_tier?.replace("_", " ").toUpperCase() || "TIER 3"}
                    </span>
                    {candidate.experience_years && (
                      <span className="text-gray-500">{candidate.experience_years} years exp</span>
                    )}
                  </div>
                </div>
              </div>

              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 5).map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 5 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                      +{candidate.skills.length - 5} more
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Profile
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Connect
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
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No candidates found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your filters or check back later
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

// Connections component
const Connections = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [connections, setConnections] = useState<T3XConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!user?.id) return;

      // Get employer profile
      const { data: ep } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setEmployerProfile(ep);

      if (ep) {
        const { data } = await supabase
          .from("t3x_connections")
          .select("*")
          .eq("employer_profile_id", ep.id)
          .order("created_at", { ascending: false });

        setConnections(data || []);
      }

      setIsLoading(false);
    };

    fetchConnections();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-emerald-500/20 text-emerald-400";
      case "pending": return "bg-amber-500/20 text-amber-400";
      case "declined": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted": return CheckCircle;
      case "pending": return Clock;
      case "declined": return XCircle;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">Connections</h1>
        <p className="text-gray-400">Manage your candidate connections.</p>
      </motion.div>

      {connections.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {connections.map((connection) => {
            const StatusIcon = getStatusIcon(connection.status);
            return (
              <div
                key={connection.id}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Connection Request</p>
                      <p className="text-sm text-gray-400">
                        Sent {new Date(connection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${getStatusColor(connection.status)}`}>
                    <StatusIcon className="w-4 h-4" />
                    {connection.status}
                  </span>
                </div>
                {connection.message && (
                  <p className="mt-4 text-sm text-gray-400 bg-white/5 p-3 rounded-lg">
                    {connection.message}
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
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No connections yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Search for candidates and send connection requests
          </p>
          <Link to="/dashboard/employer/search">
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-500">
              <Search className="w-4 h-4 mr-2" />
              Find Talent
            </Button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
};

// Projects component
const Projects = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [projects, setProjects] = useState<LiveWorksProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    category: "",
    duration_days: 14,
    skill_level: "intermediate" as "beginner" | "intermediate" | "advanced",
  });

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) return;

      const { data: ep } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setEmployerProfile(ep);

      if (ep) {
        const { data } = await supabase
          .from("liveworks_projects")
          .select("*")
          .eq("employer_profile_id", ep.id)
          .order("created_at", { ascending: false });

        setProjects(data || []);
      }

      setIsLoading(false);
    };

    fetchProjects();
  }, [user?.id]);

  const createProject = async () => {
    if (!employerProfile || !newProject.title || !newProject.description) return;

    const { data, error } = await supabase
      .from("liveworks_projects")
      .insert({
        employer_profile_id: employerProfile.id,
        title: newProject.title,
        description: newProject.description,
        category: newProject.category || "General",
        duration_days: newProject.duration_days,
        skill_level: newProject.skill_level,
        status: "draft",
      })
      .select()
      .single();

    if (!error && data) {
      setProjects((prev) => [data, ...prev]);
      setShowNewProject(false);
      setNewProject({
        title: "",
        description: "",
        category: "",
        duration_days: 14,
        skill_level: "intermediate",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-emerald-500/20 text-emerald-400";
      case "in_progress": return "bg-amber-500/20 text-amber-400";
      case "completed": return "bg-blue-500/20 text-blue-400";
      case "draft": return "bg-gray-500/20 text-gray-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">LiveWorks Projects</h1>
          <p className="text-gray-400">Create and manage project postings.</p>
        </div>
        <Button
          onClick={() => setShowNewProject(true)}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </motion.div>

      {/* New Project Form */}
      {showNewProject && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-white/5 border border-white/10"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Create New Project</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Project Title</label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Build a Landing Page"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the project requirements..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Category</label>
                <input
                  type="text"
                  value={newProject.category}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Web Development"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={newProject.duration_days}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, duration_days: parseInt(e.target.value) || 14 }))}
                  min={7}
                  max={90}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Skill Level</label>
                <select
                  value={newProject.skill_level}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, skill_level: e.target.value as "beginner" | "intermediate" | "advanced" }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewProject(false)}
                className="border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={createProject}
                disabled={!newProject.title || !newProject.description}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Create Project
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Projects List */}
      {projects.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-lg">{project.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="text-sm text-gray-500">{project.category}</span>
                    <span className="text-sm text-gray-500">{project.duration_days} days</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Manage
                </Button>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
            </div>
          ))}
        </motion.div>
      ) : (
        !showNewProject && (
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No projects yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a LiveWorks project to find candidates
            </p>
          </motion.div>
        )
      )}
    </motion.div>
  );
};

// Messages component (placeholder)
const Messages = () => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="space-y-8"
  >
    <motion.div variants={itemVariants}>
      <h1 className="text-3xl font-bold text-white mb-2">Messages</h1>
      <p className="text-gray-400">Communicate with candidates.</p>
    </motion.div>

    <motion.div
      variants={itemVariants}
      className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
    >
      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <p className="text-gray-400">No messages yet</p>
      <p className="text-sm text-gray-500 mt-1">
        Messages will appear here when candidates respond to your connections
      </p>
    </motion.div>
  </motion.div>
);

// Company Profile component
const Company = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    industry: "",
    company_size: "",
    company_website: "",
  });

  useEffect(() => {
    const fetchEmployerProfile = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (data) {
        setEmployerProfile(data);
        setFormData({
          company_name: data.company_name || "",
          industry: data.industry || "",
          company_size: data.company_size || "",
          company_website: data.company_website || "",
        });
      }
    };

    fetchEmployerProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      if (employerProfile) {
        await supabase
          .from("employer_profiles")
          .update({
            company_name: formData.company_name,
            industry: formData.industry,
            company_size: formData.company_size,
            company_website: formData.company_website,
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", user.id);
      } else {
        await supabase
          .from("employer_profiles")
          .insert({
            profile_id: user.id,
            company_name: formData.company_name,
            industry: formData.industry,
            company_size: formData.company_size,
            company_website: formData.company_website,
          });
      }

      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving company profile:", error);
    } finally {
      setIsSaving(false);
    }
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
          <h1 className="text-3xl font-bold text-white mb-2">Company Profile</h1>
          <p className="text-gray-400">Manage your company information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-emerald-600 hover:bg-emerald-500">
            Edit Company
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {/* Contact Info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Contact Name</p>
              <p className="text-white">{profile?.first_name} {profile?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">Company Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.company_name || "Not set"}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Industry</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Technology"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-white">{formData.industry || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Company Size</label>
                {isEditing ? (
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_size: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                ) : (
                  <p className="text-white">{formData.company_size || "Not set"}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Company Website</label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.company_website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_website: e.target.value }))}
                  placeholder="https://yourcompany.com"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              ) : formData.company_website ? (
                <a href={formData.company_website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                  {formData.company_website} <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-white">Not set</p>
              )}
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className={`p-6 rounded-xl border ${
          employerProfile?.is_verified
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <div className="flex items-center gap-3">
            {employerProfile?.is_verified ? (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-400">Verified Company</p>
                  <p className="text-sm text-gray-400">Your company has been verified</p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-6 h-6 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-400">Pending Verification</p>
                  <p className="text-sm text-gray-400">Complete your profile to get verified</p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Settings component
const SettingsPage = () => {
  const { user } = useAuth();

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

        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Change Password
          </Button>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Email notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">New candidate matches</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Connection responses</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EmployerDashboard = () => {
  const { profile, signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, title, message")
        .eq("profile_id", user.id)
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
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-black/90 backdrop-blur-xl border-r border-white/10 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="https://api.a0.dev/assets/image?text=Futuristic AI-powered academy logo with glowing blue circuit patterns and neural networks&aspect=1:1&seed=academy_logo"
                alt="Logo"
                className="w-8 h-8 rounded-full"
              />
              <span className="font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
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

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-white border border-emerald-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-medium">
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </div>
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

      <div className="lg:pl-64">
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
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-xs flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>

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

        <main className="p-4 md:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="search" element={<SearchTalent />} />
            <Route path="connections" element={<Connections />} />
            <Route path="projects" element={<Projects />} />
            <Route path="messages" element={<Messages />} />
            <Route path="company" element={<Company />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;
