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
  Play,
  Pause,
  Archive,
  Edit,
  ChevronDown,
  UserPlus,
  Star,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowRight,
  Lock,
  Unlock,
} from "lucide-react";

type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type LiveWorksProject = Database["public"]["Tables"]["liveworks_projects"]["Row"];
type LiveWorksMilestone = Database["public"]["Tables"]["liveworks_milestones"]["Row"];
type LiveWorksApplication = Database["public"]["Tables"]["liveworks_applications"]["Row"];
type T3XConnection = Database["public"]["Tables"]["t3x_connections"]["Row"];
type EmployerFeedback = Database["public"]["Tables"]["employer_feedback"]["Row"];
type EscrowTransaction = Database["public"]["Tables"]["escrow_transactions"]["Row"];

interface ProjectWithApplications extends LiveWorksProject {
  applications?: (LiveWorksApplication & { candidate?: CandidateProfile & { profile?: Profile } })[];
  milestones?: LiveWorksMilestone[];
  escrow_transactions?: EscrowTransaction[];
}

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
  { name: "Feedback", href: "/dashboard/employer/feedback", icon: MessageSquare },
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
            .eq("employer_id", ep.id);
          setConnectionCount(connCount || 0);

          // Count projects
          const { count: projCount } = await supabase
            .from("liveworks_projects")
            .select("*", { count: "exact", head: true })
            .eq("employer_id", ep.id)
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
  connectionStatus?: string | null;
}

const SearchTalent = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithProfile[]>([]);
  const [existingConnections, setExistingConnections] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    tier: "",
    skill: "",
  });

  // Connection modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithProfile | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isSendingConnection, setIsSendingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Get employer profile first
      const { data: ep } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();
      setEmployerProfile(ep);

      // Get existing connections for this employer
      if (ep) {
        const { data: connections } = await supabase
          .from("t3x_connections")
          .select("candidate_id, status")
          .eq("employer_id", ep.id);

        if (connections) {
          const connectionMap = new Map<string, string>();
          connections.forEach(c => connectionMap.set(c.candidate_id, c.status));
          setExistingConnections(connectionMap);
        }
      }

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

    fetchData();
  }, [user?.id, filters]);

  const openConnectModal = (candidate: CandidateWithProfile) => {
    setSelectedCandidate(candidate);
    setConnectionMessage("");
    setConnectionSuccess(false);
    setShowConnectModal(true);
  };

  const sendConnectionRequest = async () => {
    if (!employerProfile || !selectedCandidate) return;

    setIsSendingConnection(true);

    try {
      // Create connection request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

      const { error } = await supabase.from("t3x_connections").insert({
        employer_id: employerProfile.id,
        candidate_id: selectedCandidate.profile_id,
        message: connectionMessage || null,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error("Error sending connection:", error);
        return;
      }

      // Update employer stats
      await supabase
        .from("employer_profiles")
        .update({
          total_connections: (employerProfile.total_connections || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", employerProfile.id);

      // Create notification for candidate
      await supabase.from("notifications").insert({
        user_id: selectedCandidate.profile_id,
        title: "New Connection Request",
        message: `${employerProfile.company_name || "An employer"} wants to connect with you`,
        type: "connection_request",
      });

      // Update local state
      setExistingConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedCandidate.profile_id, "pending");
        return newMap;
      });

      setConnectionSuccess(true);
      setTimeout(() => {
        setShowConnectModal(false);
        setSelectedCandidate(null);
        setConnectionSuccess(false);
      }, 1500);

    } catch (error) {
      console.error("Error sending connection:", error);
    } finally {
      setIsSendingConnection(false);
    }
  };

  const getConnectionStatus = (candidateProfileId: string) => {
    return existingConnections.get(candidateProfileId) || null;
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
                {(() => {
                  const status = getConnectionStatus(candidate.profile_id);
                  if (status === "accepted") {
                    return (
                      <Button size="sm" disabled className="flex-1 bg-emerald-600/50">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Connected
                      </Button>
                    );
                  } else if (status === "pending") {
                    return (
                      <Button size="sm" disabled className="flex-1 bg-amber-600/50">
                        <Clock className="w-4 h-4 mr-1" />
                        Pending
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => openConnectModal(candidate)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Connect
                      </Button>
                    );
                  }
                })()}
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

      {/* Connection Request Modal */}
      {showConnectModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => !isSendingConnection && setShowConnectModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-gray-900 border border-white/10"
          >
            {connectionSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Request Sent!</h3>
                <p className="text-gray-400">
                  Your connection request has been sent to {selectedCandidate.profile?.first_name}.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Send Connection Request</h2>
                  <button
                    onClick={() => setShowConnectModal(false)}
                    disabled={isSendingConnection}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Candidate Preview */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold">
                    {selectedCandidate.profile?.first_name?.[0]}
                    {selectedCandidate.profile?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {selectedCandidate.profile?.first_name} {selectedCandidate.profile?.last_name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedCandidate.profile?.headline || "Skill Passport Holder"}
                    </p>
                  </div>
                </div>

                {/* Message Input */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 block mb-2">
                    Add a message (optional)
                  </label>
                  <textarea
                    value={connectionMessage}
                    onChange={(e) => setConnectionMessage(e.target.value)}
                    placeholder="Introduce yourself and explain why you'd like to connect..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConnectModal(false)}
                    disabled={isSendingConnection}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendConnectionRequest}
                    disabled={isSendingConnection}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {isSendingConnection ? (
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
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// Connections component with candidate details
interface ConnectionWithCandidate extends T3XConnection {
  candidate_profile?: CandidateProfile & { profile?: Profile };
}

const Connections = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [connections, setConnections] = useState<ConnectionWithCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "accepted" | "pending">("all");

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
        const { data: connectionData } = await supabase
          .from("t3x_connections")
          .select("*")
          .eq("employer_id", ep.id)
          .order("created_at", { ascending: false });

        if (connectionData && connectionData.length > 0) {
          // Get candidate details for each connection
          const enrichedConnections = await Promise.all(
            connectionData.map(async (conn) => {
              const { data: candidateProfile } = await supabase
                .from("candidate_profiles")
                .select("*")
                .eq("profile_id", conn.candidate_id)
                .single();

              let profile = null;
              if (candidateProfile) {
                const { data: p } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", candidateProfile.profile_id)
                  .single();
                profile = p;
              }

              return {
                ...conn,
                candidate_profile: candidateProfile ? { ...candidateProfile, profile } : undefined,
              };
            })
          );
          setConnections(enrichedConnections);
        } else {
          setConnections([]);
        }
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

  const filteredConnections = connections.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "accepted") return c.status === "accepted";
    if (activeTab === "pending") return c.status === "pending";
    return true;
  });

  const acceptedCount = connections.filter(c => c.status === "accepted").length;
  const pendingCount = connections.filter(c => c.status === "pending").length;

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

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "all"
              ? "bg-emerald-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          All ({connections.length})
        </button>
        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === "accepted"
              ? "bg-emerald-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          Accepted
          {acceptedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {acceptedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === "pending"
              ? "bg-emerald-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          Pending
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {pendingCount}
            </span>
          )}
        </button>
      </motion.div>

      {filteredConnections.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {filteredConnections.map((connection) => {
            const StatusIcon = getStatusIcon(connection.status);
            const candidateProfile = connection.candidate_profile;
            const profile = candidateProfile?.profile;

            return (
              <div
                key={connection.id}
                className={`p-6 rounded-xl border transition-colors ${
                  connection.status === "accepted"
                    ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white text-lg">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {profile?.headline || "Skill Passport Holder"}
                      </p>
                      {candidateProfile?.skills && candidateProfile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidateProfile.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                              {skill}
                            </span>
                          ))}
                          {candidateProfile.skills.length > 4 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                              +{candidateProfile.skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${getStatusColor(connection.status)}`}>
                      <StatusIcon className="w-4 h-4" />
                      {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      {connection.responded_at
                        ? `Responded ${new Date(connection.responded_at).toLocaleDateString()}`
                        : `Sent ${new Date(connection.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {connection.message && (
                  <p className="mt-4 text-sm text-gray-400 bg-black/20 p-3 rounded-lg">
                    <span className="text-gray-500">Your message: </span>
                    {connection.message}
                  </p>
                )}

                {/* Actions for accepted connections */}
                {connection.status === "accepted" && profile?.email && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Full Profile
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send Message
                    </Button>
                  </div>
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
type LiveWorksApplication = Database["public"]["Tables"]["liveworks_applications"]["Row"];
type LiveWorksMilestone = Database["public"]["Tables"]["liveworks_milestones"]["Row"];

interface ProjectWithApplications extends LiveWorksProject {
  applications?: (LiveWorksApplication & { candidate?: CandidateProfile & { profile?: Profile } })[];
  milestones?: LiveWorksMilestone[];
}

const Projects = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [projects, setProjects] = useState<ProjectWithApplications[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithApplications | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "", paymentAmount: "" });
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    category: "",
    duration_days: 14,
    skill_level: "intermediate" as "beginner" | "intermediate" | "advanced",
    budget_min: "",
    budget_max: "",
  });
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<LiveWorksMilestone | null>(null);
  const [escrowAction, setEscrowAction] = useState<"fund" | "release" | "verify" | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    method: "paypal",
    credentials: "",
    notes: "",
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
        const { data: projectsData } = await supabase
          .from("liveworks_projects")
          .select("*")
          .eq("employer_id", ep.id)
          .order("created_at", { ascending: false });

        if (projectsData) {
          // Fetch applications for each project
          const enrichedProjects = await Promise.all(
            projectsData.map(async (project) => {
              const { data: applications } = await supabase
                .from("liveworks_applications")
                .select("*")
                .eq("project_id", project.id);

              // Enrich with candidate data
              const enrichedApps = applications
                ? await Promise.all(
                    applications.map(async (app) => {
                      const { data: candidate } = await supabase
                        .from("candidate_profiles")
                        .select("*")
                        .eq("profile_id", app.candidate_id)
                        .single();

                      let profile = null;
                      if (candidate) {
                        const { data: p } = await supabase
                          .from("profiles")
                          .select("*")
                          .eq("id", candidate.profile_id)
                          .single();
                        profile = p;
                      }

                      return { ...app, candidate: candidate ? { ...candidate, profile } : undefined };
                    })
                  )
                : [];

              // Fetch milestones for this project
              const { data: milestones } = await supabase
                .from("liveworks_milestones")
                .select("*")
                .eq("project_id", project.id)
                .order("order_index");

              return { ...project, applications: enrichedApps, milestones: milestones || [] };
            })
          );
          setProjects(enrichedProjects);
        }
      }

      setIsLoading(false);
    };

    fetchProjects();
  }, [user?.id]);

  const addMilestone = async (projectId: string) => {
    if (!newMilestone.title) return;

    const project = projects.find(p => p.id === projectId);
    const orderIndex = (project?.milestones?.length || 0) + 1;

    const { data, error } = await supabase
      .from("liveworks_milestones")
      .insert({
        project_id: projectId,
        title: newMilestone.title,
        description: newMilestone.description || null,
        order_index: orderIndex,
        status: "pending",
        due_date: newMilestone.dueDate || null,
        payment_amount: newMilestone.paymentAmount ? parseFloat(newMilestone.paymentAmount) : null,
        escrow_status: newMilestone.paymentAmount ? "pending" : null,
      })
      .select()
      .single();

    if (!error && data) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, milestones: [...(p.milestones || []), data] }
            : p
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev ? { ...prev, milestones: [...(prev.milestones || []), data] } : null
        );
      }
      setNewMilestone({ title: "", description: "", dueDate: "", paymentAmount: "" });
      setShowMilestoneForm(false);
    }
  };

  // Share payment credentials for manual payment (no in-app payments)
  const sharePaymentCredentials = async (milestone: LiveWorksMilestone) => {
    if (!milestone.payment_amount || !employerProfile || !paymentDetails.credentials) return;

    const { error } = await supabase
      .from("liveworks_milestones")
      .update({
        escrow_status: "pending",
        payment_method: paymentDetails.method,
        payment_credentials: paymentDetails.credentials,
        payment_notes: paymentDetails.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestone.id);

    if (!error) {
      // Create escrow transaction record for tracking
      await supabase.from("escrow_transactions").insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        employer_id: employerProfile.id,
        amount: milestone.payment_amount,
        status: "pending",
        payment_method: paymentDetails.method,
        payment_credentials: paymentDetails.credentials,
        notes: `Payment credentials shared. Method: ${paymentDetails.method}`,
      });

      const updateMilestones = (milestones: LiveWorksMilestone[] | undefined) =>
        milestones?.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                escrow_status: "pending" as const,
                payment_method: paymentDetails.method,
                payment_credentials: paymentDetails.credentials,
              }
            : m
        );

      setProjects((prev) =>
        prev.map((p) => ({ ...p, milestones: updateMilestones(p.milestones) }))
      );
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev ? { ...prev, milestones: updateMilestones(prev.milestones) } : null
        );
      }

      // Notify candidate about payment details
      const project = projects.find((p) => p.id === milestone.project_id);
      if (project?.selected_candidate_id) {
        await supabase.from("notifications").insert({
          user_id: project.selected_candidate_id,
          type: "payment",
          title: "Payment Credentials Shared",
          message: `Payment details for milestone "${milestone.title}" have been shared. Amount: $${milestone.payment_amount}. Please complete the payment and submit proof.`,
          metadata: {
            milestone_id: milestone.id,
            amount: milestone.payment_amount,
            payment_method: paymentDetails.method,
          },
        });
      }
    }
    setShowEscrowModal(false);
    setSelectedMilestone(null);
    setPaymentDetails({ method: "paypal", credentials: "", notes: "" });
  };

  // Verify payment was received (manual confirmation)
  const verifyPaymentReceived = async (milestone: LiveWorksMilestone) => {
    if (!milestone.payment_amount || !employerProfile) return;

    const project = projects.find((p) => p.id === milestone.project_id);
    const candidateId = project?.selected_candidate_id;

    const { error } = await supabase
      .from("liveworks_milestones")
      .update({
        escrow_status: "released",
        payment_verified_at: new Date().toISOString(),
        escrow_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestone.id);

    if (!error) {
      // Update escrow transaction
      await supabase
        .from("escrow_transactions")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: employerProfile.profile_id,
          candidate_id: candidateId,
          notes: "Payment verified and confirmed by employer",
        })
        .eq("milestone_id", milestone.id);

      const updateMilestones = (milestones: LiveWorksMilestone[] | undefined) =>
        milestones?.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                escrow_status: "released" as const,
                payment_verified_at: new Date().toISOString(),
                escrow_released_at: new Date().toISOString(),
              }
            : m
        );

      setProjects((prev) =>
        prev.map((p) => ({ ...p, milestones: updateMilestones(p.milestones) }))
      );
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev ? { ...prev, milestones: updateMilestones(prev.milestones) } : null
        );
      }

      // Notify candidate
      if (candidateId) {
        await supabase.from("notifications").insert({
          user_id: candidateId,
          type: "payment",
          title: "Payment Verified!",
          message: `Your payment of $${milestone.payment_amount} for milestone "${milestone.title}" has been verified and confirmed.`,
          metadata: { milestone_id: milestone.id, amount: milestone.payment_amount },
        });
      }
    }
    setShowEscrowModal(false);
    setSelectedMilestone(null);
  };


  const getEscrowStatusBadge = (status: string | null) => {
    const badges: Record<string, { label: string; color: string; icon: typeof Lock }> = {
      pending: { label: "Not Funded", color: "text-gray-400 bg-gray-500/20", icon: Wallet },
      funded: { label: "In Escrow", color: "text-amber-400 bg-amber-500/20", icon: Lock },
      released: { label: "Released", color: "text-emerald-400 bg-emerald-500/20", icon: Unlock },
      refunded: { label: "Refunded", color: "text-red-400 bg-red-500/20", icon: ArrowRight },
    };
    return badges[status || "pending"] || badges.pending;
  };

  const updateMilestoneStatus = async (milestoneId: string, newStatus: string) => {
    const { error } = await supabase
      .from("liveworks_milestones")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", milestoneId);

    if (!error) {
      const updateMilestones = (milestones: LiveWorksMilestone[] | undefined) =>
        milestones?.map((m) => (m.id === milestoneId ? { ...m, status: newStatus as any } : m));

      setProjects((prev) =>
        prev.map((p) => ({ ...p, milestones: updateMilestones(p.milestones) }))
      );
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev ? { ...prev, milestones: updateMilestones(prev.milestones) } : null
        );
      }
    }
  };

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    const { error } = await supabase
      .from("liveworks_projects")
      .update({ status: newStatus })
      .eq("id", projectId);

    if (!error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );
    }
    setShowStatusMenu(null);
  };

  const getStatusActions = (currentStatus: string) => {
    const actions: { status: string; label: string; icon: typeof Play }[] = [];

    switch (currentStatus) {
      case "draft":
        actions.push({ status: "open", label: "Publish", icon: Play });
        actions.push({ status: "closed", label: "Archive", icon: Archive });
        break;
      case "open":
        actions.push({ status: "in_progress", label: "Start Review", icon: UserPlus });
        actions.push({ status: "draft", label: "Unpublish", icon: Pause });
        actions.push({ status: "closed", label: "Close", icon: Archive });
        break;
      case "in_progress":
        actions.push({ status: "completed", label: "Mark Complete", icon: CheckCircle });
        actions.push({ status: "open", label: "Reopen", icon: Play });
        break;
      case "completed":
        actions.push({ status: "closed", label: "Archive", icon: Archive });
        break;
      case "closed":
        actions.push({ status: "draft", label: "Reactivate", icon: Edit });
        break;
    }
    return actions;
  };

  const createProject = async () => {
    if (!employerProfile || !newProject.title || !newProject.description) return;

    const { data, error } = await supabase
      .from("liveworks_projects")
      .insert({
        employer_id: employerProfile.id,
        title: newProject.title,
        description: newProject.description,
        category: newProject.category || "General",
        duration_days: newProject.duration_days,
        skill_level: newProject.skill_level,
        status: "draft",
        budget_min: newProject.budget_min ? parseFloat(newProject.budget_min) : null,
        budget_max: newProject.budget_max ? parseFloat(newProject.budget_max) : null,
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
        budget_min: "",
        budget_max: "",
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

            {/* Budget Section */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-medium text-white">Project Budget</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Minimum Budget ($)</label>
                  <input
                    type="number"
                    value={newProject.budget_min}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="e.g., 500"
                    min={0}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Maximum Budget ($)</label>
                  <input
                    type="number"
                    value={newProject.budget_max}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="e.g., 1000"
                    min={0}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
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
          {projects.map((project) => {
            const applicationCount = project.applications?.length || 0;
            const pendingApps = project.applications?.filter((a) => a.status === "pending").length || 0;
            const statusActions = getStatusActions(project.status);

            return (
              <div
                key={project.id}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{project.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(project.status)}`}>
                        {project.status.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-500">{project.category}</span>
                      <span className="text-sm text-gray-500">{project.duration_days} days</span>
                      {applicationCount > 0 && (
                        <span className="text-sm text-emerald-400 flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          {applicationCount} applicant{applicationCount !== 1 ? "s" : ""}
                          {pendingApps > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs ml-1">
                              {pendingApps} new
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Actions Dropdown */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => setShowStatusMenu(showStatusMenu === project.id ? null : project.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Status
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                      {showStatusMenu === project.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-900 border border-white/10 shadow-xl z-10">
                          {statusActions.map((action) => (
                            <button
                              key={action.status}
                              onClick={() => updateProjectStatus(project.id, action.status)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                            >
                              <action.icon className="w-4 h-4" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedProject(project)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>

                {/* Show applicants preview if any */}
                {project.applications && project.applications.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-2">Recent Applicants:</p>
                    <div className="flex items-center gap-2">
                      {project.applications.slice(0, 4).map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center gap-2 px-2 py-1 rounded bg-white/5"
                        >
                          {app.candidate?.profile?.avatar_url ? (
                            <img
                              src={app.candidate.profile.avatar_url}
                              alt="Applicant"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs">
                              {app.candidate?.profile?.first_name?.[0]}
                            </div>
                          )}
                          <span className="text-xs text-gray-400">
                            {app.candidate?.profile?.first_name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            app.status === "pending"
                              ? "bg-amber-500/20 text-amber-400"
                              : app.status === "accepted"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                      {project.applications.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{project.applications.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Project Details Modal */}
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProject(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProject.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status.replace("_", " ")}
                    </span>
                    <span className="text-sm text-gray-500">{selectedProject.category}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h3 className="text-sm text-gray-400 mb-2">Description</h3>
                <p className="text-gray-300">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-white font-medium">{selectedProject.duration_days} days</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-500">Skill Level</p>
                  <p className="text-white font-medium capitalize">{selectedProject.skill_level}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-500">Applicants</p>
                  <p className="text-white font-medium">{selectedProject.applications?.length || 0}</p>
                </div>
              </div>

              {/* Applicants List */}
              <div>
                <h3 className="text-sm text-gray-400 mb-3">Applicants</h3>
                {selectedProject.applications && selectedProject.applications.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProject.applications.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {app.candidate?.profile?.avatar_url ? (
                              <img
                                src={app.candidate.profile.avatar_url}
                                alt="Applicant"
                                className="w-12 h-12 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                                {app.candidate?.profile?.first_name?.[0]}{app.candidate?.profile?.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">
                                {app.candidate?.profile?.first_name} {app.candidate?.profile?.last_name}
                              </p>
                              <p className="text-sm text-gray-400">
                                {app.candidate?.profile?.headline || "Candidate"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Applied {new Date(app.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {app.status === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await supabase
                                      .from("liveworks_applications")
                                      .update({ status: "accepted" })
                                      .eq("id", app.id);
                                    setSelectedProject((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            applications: prev.applications?.map((a) =>
                                              a.id === app.id ? { ...a, status: "accepted" } : a
                                            ),
                                          }
                                        : null
                                    );
                                    setProjects((prev) =>
                                      prev.map((p) =>
                                        p.id === selectedProject.id
                                          ? {
                                              ...p,
                                              applications: p.applications?.map((a) =>
                                                a.id === app.id ? { ...a, status: "accepted" } : a
                                              ),
                                            }
                                          : p
                                      )
                                    );
                                    // Notify candidate
                                    await supabase.from("notifications").insert({
                                      user_id: app.candidate_id,
                                      type: "application_accepted",
                                      title: "Application Accepted!",
                                      message: `Your application for "${selectedProject.title}" has been accepted.`,
                                    });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await supabase
                                      .from("liveworks_applications")
                                      .update({ status: "rejected" })
                                      .eq("id", app.id);
                                    setSelectedProject((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            applications: prev.applications?.map((a) =>
                                              a.id === app.id ? { ...a, status: "rejected" } : a
                                            ),
                                          }
                                        : null
                                    );
                                    setProjects((prev) =>
                                      prev.map((p) =>
                                        p.id === selectedProject.id
                                          ? {
                                              ...p,
                                              applications: p.applications?.map((a) =>
                                                a.id === app.id ? { ...a, status: "rejected" } : a
                                              ),
                                            }
                                          : p
                                      )
                                    );
                                  }}
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </Button>
                              </>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-sm ${
                                  app.status === "accepted"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        {app.cover_letter && (
                          <div className="mt-3 p-3 rounded bg-black/20">
                            <p className="text-xs text-gray-500 mb-1">Cover Letter</p>
                            <p className="text-sm text-gray-300">{app.cover_letter}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-white/5 text-center">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">No applicants yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applicants will appear here when candidates apply
                    </p>
                  </div>
                )}
              </div>

              {/* Milestones Section */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-400">Project Milestones</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>

                {/* Add Milestone Form */}
                {showMilestoneForm && (
                  <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Milestone title..."
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none text-sm"
                      />
                      <input
                        type="text"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)..."
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={newMilestone.dueDate}
                          onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        />
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            value={newMilestone.paymentAmount}
                            onChange={(e) => setNewMilestone(prev => ({ ...prev, paymentAmount: e.target.value }))}
                            placeholder="Payment amount"
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => addMilestone(selectedProject.id)}
                          disabled={!newMilestone.title}
                          className="bg-emerald-600 hover:bg-emerald-500"
                        >
                          Add Milestone
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowMilestoneForm(false);
                            setNewMilestone({ title: "", description: "", dueDate: "", paymentAmount: "" });
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestones List */}
                {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.milestones.map((milestone, index) => {
                      const getMilestoneStatusColor = (status: string) => {
                        switch (status) {
                          case "approved": return "bg-emerald-500/20 text-emerald-400";
                          case "submitted": return "bg-blue-500/20 text-blue-400";
                          case "in_progress": return "bg-amber-500/20 text-amber-400";
                          case "revision_requested": return "bg-red-500/20 text-red-400";
                          default: return "bg-gray-500/20 text-gray-400";
                        }
                      };

                      const escrowBadge = getEscrowStatusBadge(milestone.escrow_status);
                      const EscrowIcon = escrowBadge.icon;

                      return (
                        <div
                          key={milestone.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            milestone.status === "approved"
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                milestone.status === "approved"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-white/10 text-gray-400"
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-white">{milestone.title}</p>
                                {milestone.description && (
                                  <p className="text-sm text-gray-400 mt-1">{milestone.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {milestone.due_date && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {milestone.payment_amount && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      ${milestone.payment_amount.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs ${getMilestoneStatusColor(milestone.status)}`}>
                                  {milestone.status.replace("_", " ")}
                                </span>
                                {milestone.payment_amount && (
                                  <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${escrowBadge.color}`}>
                                    <EscrowIcon className="w-3 h-3" />
                                    {escrowBadge.label}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {milestone.status === "submitted" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateMilestoneStatus(milestone.id, "approved")}
                                      className="bg-emerald-600 hover:bg-emerald-500 h-7 px-2"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateMilestoneStatus(milestone.id, "revision_requested")}
                                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 px-2"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                                {/* Manual Payment Actions */}
                                {milestone.payment_amount && milestone.escrow_status === "pending" && !milestone.payment_credentials && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMilestone(milestone);
                                      setEscrowAction("fund");
                                      setShowEscrowModal(true);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 h-7 px-2"
                                  >
                                    <Wallet className="w-3 h-3 mr-1" />
                                    Share Payment
                                  </Button>
                                )}
                                {milestone.payment_amount &&
                                  milestone.payment_credentials &&
                                  milestone.escrow_status !== "released" &&
                                  milestone.status === "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMilestone(milestone);
                                      setEscrowAction("verify");
                                      setShowEscrowModal(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 h-7 px-2"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verify Payment
                                  </Button>
                                )}
                                {milestone.payment_amount && milestone.payment_credentials && milestone.escrow_status !== "released" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedMilestone(milestone);
                                      setEscrowAction(null);
                                      setShowEscrowModal(true);
                                    }}
                                    className="border-white/20 text-gray-400 hover:text-white h-7 px-2"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-white/5 text-center">
                    <Briefcase className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">No milestones yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Add milestones to track project progress
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Manual Payment Modal */}
      {showEscrowModal && selectedMilestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setShowEscrowModal(false);
            setSelectedMilestone(null);
            setPaymentDetails({ method: "paypal", credentials: "", notes: "" });
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {escrowAction === "fund" ? (
              <>
                {/* Share Payment Credentials */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Share Payment Details</h3>
                    <p className="text-sm text-gray-400">Provide payment credentials for the candidate</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Milestone</p>
                  <p className="text-white font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Payment Method</label>
                    <select
                      value={paymentDetails.method}
                      onChange={(e) => setPaymentDetails((prev) => ({ ...prev, method: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="paypal">PayPal</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="venmo">Venmo</option>
                      <option value="cashapp">Cash App</option>
                      <option value="zelle">Zelle</option>
                      <option value="wise">Wise (TransferWise)</option>
                      <option value="crypto">Cryptocurrency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">
                      Payment Credentials
                      <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={paymentDetails.credentials}
                      onChange={(e) => setPaymentDetails((prev) => ({ ...prev, credentials: e.target.value }))}
                      placeholder={
                        paymentDetails.method === "paypal"
                          ? "Enter your PayPal email..."
                          : paymentDetails.method === "bank_transfer"
                          ? "Enter bank name, account number, routing number..."
                          : paymentDetails.method === "crypto"
                          ? "Enter wallet address and network (e.g., BTC, ETH)..."
                          : "Enter payment details..."
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Additional Notes (Optional)</label>
                    <input
                      type="text"
                      value={paymentDetails.notes}
                      onChange={(e) => setPaymentDetails((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special instructions..."
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <p className="text-sm text-amber-300">
                      Payment is handled outside the platform. Share your payment details so the candidate can send payment. You'll verify receipt manually.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEscrowModal(false);
                      setSelectedMilestone(null);
                      setPaymentDetails({ method: "paypal", credentials: "", notes: "" });
                    }}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => sharePaymentCredentials(selectedMilestone)}
                    disabled={!paymentDetails.credentials.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Share Payment Details
                  </Button>
                </div>
              </>
            ) : escrowAction === "verify" ? (
              <>
                {/* Verify Payment Received */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Verify Payment</h3>
                    <p className="text-sm text-gray-400">Confirm you received the payment</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Milestone</p>
                  <p className="text-white font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                  {selectedMilestone.payment_method && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Payment Method</p>
                      <p className="text-white capitalize">{selectedMilestone.payment_method.replace("_", " ")}</p>
                    </div>
                  )}
                </div>

                {selectedMilestone.payment_proof_url && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                    <p className="text-sm text-gray-400 mb-2">Payment Proof Submitted</p>
                    <a
                      href={selectedMilestone.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Screenshot / Receipt
                    </a>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <p className="text-sm text-emerald-300">
                      By clicking "Confirm Payment Received", you verify that you have received the payment from the candidate.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEscrowModal(false);
                      setSelectedMilestone(null);
                    }}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => verifyPaymentReceived(selectedMilestone)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Payment Received
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* View Payment Status */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Payment Details</h3>
                    <p className="text-sm text-gray-400">Milestone payment information</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Milestone</p>
                  <p className="text-white font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                  {selectedMilestone.payment_method && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Payment Method</p>
                      <p className="text-white capitalize">{selectedMilestone.payment_method.replace("_", " ")}</p>
                    </div>
                  )}
                  {selectedMilestone.payment_credentials && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Payment Credentials</p>
                      <p className="text-white text-sm whitespace-pre-wrap">{selectedMilestone.payment_credentials}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEscrowModal(false);
                      setSelectedMilestone(null);
                    }}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Feedback component for 30/60/90 day reviews
interface HireWithCandidate {
  connection: T3XConnection;
  candidate?: CandidateProfile & { profile?: Profile };
  feedbacks?: EmployerFeedback[];
}

const Feedback = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [hires, setHires] = useState<HireWithCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedHire, setSelectedHire] = useState<HireWithCandidate | null>(null);
  const [feedbackType, setFeedbackType] = useState<"30_day" | "60_day" | "90_day">("30_day");
  const [feedbackForm, setFeedbackForm] = useState({
    performanceRating: 0,
    readinessAccuracy: 0,
    comments: "",
    wouldHireAgain: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data: ep } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setEmployerProfile(ep);

      if (ep) {
        // Get accepted connections (hired candidates)
        const { data: connections } = await supabase
          .from("t3x_connections")
          .select("*")
          .eq("employer_id", ep.id)
          .eq("status", "accepted")
          .order("responded_at", { ascending: false });

        if (connections) {
          const enrichedHires = await Promise.all(
            connections.map(async (conn) => {
              const { data: candidate } = await supabase
                .from("candidate_profiles")
                .select("*")
                .eq("profile_id", conn.candidate_id)
                .single();

              let profile = null;
              if (candidate) {
                const { data: p } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", candidate.profile_id)
                  .single();
                profile = p;
              }

              // Get existing feedback
              const { data: feedbacks } = await supabase
                .from("employer_feedback")
                .select("*")
                .eq("employer_id", ep.id)
                .eq("candidate_id", conn.candidate_id);

              return {
                connection: conn,
                candidate: candidate ? { ...candidate, profile } : undefined,
                feedbacks: feedbacks || [],
              };
            })
          );
          setHires(enrichedHires);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const submitFeedback = async () => {
    if (!employerProfile || !selectedHire) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("employer_feedback").insert({
      employer_id: employerProfile.id,
      candidate_id: selectedHire.connection.candidate_id,
      hire_date: selectedHire.connection.responded_at || selectedHire.connection.created_at,
      feedback_type: feedbackType,
      performance_rating: feedbackForm.performanceRating,
      readiness_accuracy: feedbackForm.readinessAccuracy,
      comments: feedbackForm.comments,
      would_hire_again: feedbackForm.wouldHireAgain,
    });

    if (!error) {
      // Update local state
      setHires((prev) =>
        prev.map((h) =>
          h.connection.id === selectedHire.connection.id
            ? {
                ...h,
                feedbacks: [
                  ...(h.feedbacks || []),
                  {
                    id: "",
                    employer_id: employerProfile.id,
                    candidate_id: selectedHire.connection.candidate_id,
                    hire_date: selectedHire.connection.responded_at || selectedHire.connection.created_at,
                    created_at: new Date().toISOString(),
                    feedback_type: feedbackType,
                    performance_rating: feedbackForm.performanceRating,
                    readiness_accuracy: feedbackForm.readinessAccuracy,
                    behavioral_alignment: null,
                    comments: feedbackForm.comments,
                    would_hire_again: feedbackForm.wouldHireAgain,
                  },
                ],
              }
            : h
        )
      );

      setShowFeedbackModal(false);
      setSelectedHire(null);
      setFeedbackForm({
        performanceRating: 0,
        readinessAccuracy: 0,
        comments: "",
        wouldHireAgain: true,
      });
    }

    setIsSubmitting(false);
  };

  const getDaysSinceHire = (hireDate: string) => {
    const days = Math.floor((Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getAvailableFeedbackTypes = (hire: HireWithCandidate): ("30_day" | "60_day" | "90_day")[] => {
    const existingTypes = hire.feedbacks?.map((f) => f.feedback_type) || [];
    const days = getDaysSinceHire(hire.connection.responded_at || hire.connection.created_at);
    const available: ("30_day" | "60_day" | "90_day")[] = [];

    if (days >= 30 && !existingTypes.includes("30_day")) available.push("30_day");
    if (days >= 60 && !existingTypes.includes("60_day")) available.push("60_day");
    if (days >= 90 && !existingTypes.includes("90_day")) available.push("90_day");

    return available;
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
        <h1 className="text-3xl font-bold text-white mb-2">Hire Feedback</h1>
        <p className="text-gray-400">
          Provide 30/60/90 day performance feedback for your hires.
        </p>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        variants={itemVariants}
        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4"
      >
        <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-400 font-medium">Why feedback matters</p>
          <p className="text-sm text-gray-400 mt-1">
            Your feedback helps improve the accuracy of Skill Passports and the overall
            quality of the talent pool. Share honest assessments at 30, 60, and 90 days.
          </p>
        </div>
      </motion.div>

      {/* Hires List */}
      <motion.div variants={itemVariants}>
        {hires.length > 0 ? (
          <div className="space-y-4">
            {hires.map((hire) => {
              const availableTypes = getAvailableFeedbackTypes(hire);
              const days = getDaysSinceHire(hire.connection.responded_at || hire.connection.created_at);

              return (
                <div
                  key={hire.connection.id}
                  className="p-6 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {hire.candidate?.profile?.avatar_url ? (
                        <img
                          src={hire.candidate.profile.avatar_url}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                          {hire.candidate?.profile?.first_name?.[0]}
                          {hire.candidate?.profile?.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white text-lg">
                          {hire.candidate?.profile?.first_name} {hire.candidate?.profile?.last_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          Hired {days} days ago
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {hire.candidate?.current_tier && (
                            <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400">
                              {hire.candidate.current_tier.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feedback Status */}
                    <div className="flex gap-2">
                      {["30_day", "60_day", "90_day"].map((type) => {
                        const feedback = hire.feedbacks?.find((f) => f.feedback_type === type);
                        const typeLabel = type.replace("_", " ");

                        return (
                          <div
                            key={type}
                            className={`px-3 py-2 rounded-lg text-center ${
                              feedback
                                ? "bg-emerald-500/20 border border-emerald-500/30"
                                : "bg-white/5 border border-white/10"
                            }`}
                          >
                            <p className="text-xs text-gray-500">{typeLabel}</p>
                            {feedback ? (
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <Star className="w-3 h-3 text-amber-400" />
                                <span className="text-sm text-emerald-400">
                                  {feedback.performance_rating}/5
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 mt-1">Pending</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {availableTypes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                      {availableTypes.map((type) => (
                        <Button
                          key={type}
                          onClick={() => {
                            setSelectedHire(hire);
                            setFeedbackType(type);
                            setShowFeedbackModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Submit {type.replace("_", " ")} Feedback
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Show completed feedback summary */}
                  {hire.feedbacks && hire.feedbacks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm text-gray-500 mb-2">Previous Feedback</p>
                      <div className="space-y-2">
                        {hire.feedbacks.map((fb) => (
                          <div
                            key={fb.id || fb.feedback_type}
                            className="flex items-center justify-between p-3 rounded-lg bg-black/20"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400">{fb.feedback_type.replace("_", " ")}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < fb.performance_rating
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span
                              className={`text-sm ${
                                fb.would_hire_again ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {fb.would_hire_again ? "Would hire again" : "Would not hire again"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hires yet</p>
            <p className="text-sm text-gray-500 mt-1">
              When candidates accept your connection requests, they'll appear here for feedback.
            </p>
          </div>
        )}
      </motion.div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedHire && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowFeedbackModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2">
              {feedbackType.replace("_", " ")} Feedback
            </h2>
            <p className="text-gray-400 mb-6">
              Share your experience with {selectedHire.candidate?.profile?.first_name}
            </p>

            {/* Performance Rating */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                Overall Performance Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() =>
                      setFeedbackForm((prev) => ({ ...prev, performanceRating: rating }))
                    }
                    className={`p-3 rounded-lg transition-colors ${
                      feedbackForm.performanceRating >= rating
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-white/5 text-gray-500 hover:bg-white/10"
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        feedbackForm.performanceRating >= rating ? "fill-amber-400" : ""
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Readiness Accuracy */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                How accurate was their Skill Passport tier?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() =>
                      setFeedbackForm((prev) => ({ ...prev, readinessAccuracy: rating }))
                    }
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      feedbackForm.readinessAccuracy === rating
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Not accurate</span>
                <span>Very accurate</span>
              </div>
            </div>

            {/* Would Hire Again */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                Would you hire this person again?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setFeedbackForm((prev) => ({ ...prev, wouldHireAgain: true }))
                  }
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    feedbackForm.wouldHireAgain
                      ? "bg-emerald-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  Yes
                </button>
                <button
                  onClick={() =>
                    setFeedbackForm((prev) => ({ ...prev, wouldHireAgain: false }))
                  }
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    !feedbackForm.wouldHireAgain
                      ? "bg-red-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  No
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={feedbackForm.comments}
                onChange={(e) =>
                  setFeedbackForm((prev) => ({ ...prev, comments: e.target.value }))
                }
                placeholder="Share specific observations about their work..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={submitFeedback}
                disabled={
                  isSubmitting ||
                  feedbackForm.performanceRating === 0 ||
                  feedbackForm.readinessAccuracy === 0
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

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
            <Route path="feedback" element={<Feedback />} />
            <Route path="company" element={<Company />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;
