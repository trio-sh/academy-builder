import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessageCount, usePresence, isUserOnline, sendMessageNotification } from "@/hooks/useMessaging";
import { extractDocumentText } from "@/lib/documentExtractor";
import { uploadMessageAttachment, isImageFile, formatFileSize } from "@/lib/fileUpload";
import AIAgent from "@/pages/dashboard/AIAgent";
import T3XDiscovery from "@/pages/dashboard/employer/T3XDiscovery";
import { GoogleAuthLink } from "@/components/GoogleAuthLink";
import {
  DashboardLayout,
  type DashboardNavItem,
  type DashboardSection,
} from "@/components/dashboard/DashboardLayout";
import {
  DashboardPageHeader,
  DashSection,
  LedgerStat,
  LedgerBadge,
  LedgerLoading,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
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
  Target,
  Shield,
  Bot,
  PanelLeftClose,
  PanelLeft,
  Paperclip,
  FileText,
  Copy,
  Reply,
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
  { name: "T3X Discovery", href: "/dashboard/employer/t3x", icon: Eye },
  { name: "Connections", href: "/dashboard/employer/connections", icon: Users },
  { name: "Projects", href: "/dashboard/employer/projects", icon: Briefcase },
  { name: "Feedback", href: "/dashboard/employer/feedback", icon: MessageSquare },
  { name: "Messages", href: "/dashboard/employer/messages", icon: Send },
  { name: "Company", href: "/dashboard/employer/company", icon: Building2 },
  { name: "Praxis", href: "/dashboard/employer/agent", icon: Bot },
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

  if (isLoading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow={`§ Reading Room · ${profile?.first_name || "Employer"}'s desk`}
        title={
          <>
            Welcome back,{" "}
            <span className="italic display-serif-italic ink-vermilion">
              {profile?.first_name || "hiring desk"}
            </span>
            .
          </>
        }
        meta="You read what candidates have released to you — nothing more, nothing hidden."
        actions={
          employerProfile && !employerProfile.is_verified ? (
            <Link to="/dashboard/employer/company">
              <LedgerBadge variant="stamp">Verification pending</LedgerBadge>
            </Link>
          ) : (
            <LedgerBadge variant="outline">Verified</LedgerBadge>
          )
        }
      />

      <DashSection eyebrow="§ I · Standing figures" title="At the desk">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((s) => (
            <LedgerStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </DashSection>

      <DashSection eyebrow="§ II · Common entries" title="Where you likely wanted to go">
        <div className="grid md:grid-cols-2 border-t-2 border-foreground border-b border-foreground/40">
          {[
            {
              n: "01",
              title: "Search T3X Exchange",
              body: "Browse candidates who have released their Behavioral Evidence Report to your organization.",
              href: "/dashboard/employer/search",
            },
            {
              n: "02",
              title: "Post a LiveWorks project",
              body: "Offer a supervised project that generates evidence for the register.",
              href: "/dashboard/employer/projects",
            },
          ].map((q, i) => (
            <Link
              key={q.n}
              to={q.href}
              className={cn(
                "p-8 hover:bg-foreground/[0.025] transition-colors group",
                i > 0 && "border-t md:border-t-0 md:border-l border-foreground/25"
              )}
            >
              <div className="ledger-num text-4xl text-foreground mb-3">{q.n}</div>
              <h3 className="display-serif text-2xl md:text-3xl text-foreground mb-3 group-hover:italic transition-all">
                {q.title}
              </h3>
              <p className="text-foreground/75 text-[0.9375rem] mb-5 leading-relaxed">{q.body}</p>
              <span className="mono-label text-foreground group-hover:ink-vermilion transition-colors">
                Enter →
              </span>
            </Link>
          ))}
        </div>
      </DashSection>

      <DashSection eyebrow="§ III · Editorial note" title="What the report is">
        <div className="border-l-2 border-foreground pl-8 max-w-3xl">
          <p className="display-serif text-2xl md:text-3xl leading-[1.35] text-foreground mb-6">
            The Behavioral Evidence Report is <span className="italic display-serif-italic">an additional source of evidence</span> — not a hiring verdict, prediction, or pre-vetting mechanism.
          </p>
          <p className="mono-label text-foreground border-t border-foreground/25 pt-4">
            No scores. No rankings. No recommendations.
          </p>
        </div>
      </DashSection>
    </div>
  );
};

// T3X Search component
interface CandidateWithProfile extends CandidateProfile {
  profile?: Profile;
  connectionStatus?: string | null;
  behavioralScores?: Record<string, number>;
  verificationCode?: string;
}

const SearchTalent = () => {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithProfile[]>([]);
  const [existingConnections, setExistingConnections] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    tier: "",
    dimensions: [] as string[],
  });
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const MVP_DIMENSIONS = [
    { id: "integrity_ethics", label: "Integrity & Ethics" },
    { id: "accountability_ownership", label: "Accountability & Ownership" },
    { id: "execution_reliability", label: "Execution Reliability" },
    { id: "communication_pressure", label: "Communication Under Pressure" },
    { id: "collaboration_conflict", label: "Collaboration & Conflict Resolution" },
    { id: "resilience_recovery", label: "Resilience & Recovery" },
    { id: "learning_agility", label: "Learning Agility" },
  ];

  const getBarsLabel = (score: number) => {
    if (score >= 3.5) return "Strong";
    if (score >= 2.5) return "Competent";
    if (score >= 1.5) return "Emerging";
    return "Not Yet Demonstrated";
  };

  const getBarsColor = (score: number) => {
    if (score >= 3.5) return "text-foreground";
    if (score >= 2.5) return "text-foreground";
    if (score >= 1.5) return "ink-vermilion";
    return "ink-vermilion";
  };

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

      // Get candidates with Behavioral Evidence Report listed on T3X
      let query = supabase
        .from("candidate_profiles")
        .select("*")
        .eq("is_listed_on_t3x", true)
        .eq("has_skill_passport", true);

      // MVP: All candidates are Silver tier. Selecting "silver" shows all; no other tiers exist yet.
      // If a tier other than silver were selected we'd filter, but only silver is offered in the UI.

      const { data: candidateData } = await query.limit(20);

      if (candidateData && candidateData.length > 0) {
        // Get profile info and skill passport behavioral scores for each candidate
        const enhancedCandidates = await Promise.all(
          candidateData.map(async (cp) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", cp.profile_id)
              .single();
            // Get behavioral scores from skill passport
            const { data: passport } = await supabase
              .from("skill_passports")
              .select("behavioral_scores, verification_code")
              .eq("candidate_id", cp.id)
              .eq("is_active", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            return {
              ...cp,
              profile: profileData || undefined,
              behavioralScores: (passport?.behavioral_scores as Record<string, number>) || undefined,
              verificationCode: passport?.verification_code || undefined,
            };
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
        candidate_id: selectedCandidate.id,
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
        newMap.set(selectedCandidate.id, "pending");
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
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">T3X Talent Exchange</h1>
        <p className="text-foreground/60">
          Search for verified Behavioral Evidence Report holders.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="p-4 rounded-xl bg-background border border-foreground/15">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-foreground/60" />
            <span className="text-sm text-foreground/60">Filters:</span>
          </div>
          <select
            value={filters.tier}
            onChange={(e) => setFilters((prev) => ({ ...prev, tier: e.target.value }))}
            className="px-3 py-1.5 rounded-lg bg-background border border-foreground/25 text-foreground text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Tiers</option>
            <option value="silver">Silver</option>
          </select>
          {/* Dimension multi-select */}
          <div className="flex flex-wrap gap-1.5">
            {MVP_DIMENSIONS.map(dim => (
              <button
                key={dim.id}
                type="button"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  dimensions: prev.dimensions.includes(dim.id)
                    ? prev.dimensions.filter(d => d !== dim.id)
                    : [...prev.dimensions, dim.id],
                }))}
                className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  filters.dimensions.includes(dim.id)
                    ? "bg-foreground/[0.06] text-foreground border border-foreground/40"
                    : "bg-white/5 text-foreground/50 border border-foreground/15 hover:text-foreground/75"
                }`}
              >
                {dim.label}
              </button>
            ))}
          </div>
          {filters.dimensions.length > 0 && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, dimensions: [] }))}
              className="text-xs text-foreground/50 hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Results — List view by default */}
      {(() => {
        // Filter candidates by selected dimensions
        const filtered = filters.dimensions.length > 0
          ? candidates.filter(c => {
              if (!c.behavioralScores) return false;
              return filters.dimensions.every(d => c.behavioralScores?.[d] !== undefined && c.behavioralScores[d] > 0);
            })
          : candidates;

        return filtered.length > 0 ? (
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-foreground/60">{filtered.length} candidate{filtered.length !== 1 ? "s" : ""} found</p>
            </div>

            {/* List rows */}
            {filtered.map((candidate) => {
              const isExpanded = expandedCandidate === candidate.id;
              const connectionStatus = getConnectionStatus(candidate.id);

              return (
                <div key={candidate.id} className="rounded-xl bg-background border border-foreground/15 overflow-hidden">
                  {/* List row — always visible */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-foreground/5 transition-colors"
                    onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}
                  >
                    {candidate.profile?.avatar_url ? (
                      <img src={candidate.profile.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center text-background font-bold text-sm flex-shrink-0">
                        {candidate.profile?.first_name?.[0]}{candidate.profile?.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{candidate.profile?.first_name} {candidate.profile?.last_name}</span>
                        <Award className="w-3.5 h-3.5 text-foreground" />
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          candidate.current_tier === "platinum" ? "bg-foreground/[0.06] text-foreground" :
                          candidate.current_tier === "gold" ? "bg-vermilion/10 ink-vermilion" :
                          "bg-gray-500/20 text-foreground/60"
                        }`}>
                          Silver
                        </span>
                      </div>
                      <p className="text-xs text-foreground/50 truncate">{candidate.profile?.headline || "Behavioral Evidence Report Holder"}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-xs text-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {connectionStatus === "accepted" ? (
                        <span className="text-xs text-foreground">Connected</span>
                      ) : connectionStatus === "pending" ? (
                        <span className="text-xs ink-vermilion">Awaiting Response</span>
                      ) : (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-xs h-7" onClick={(e) => { e.stopPropagation(); openConnectModal(candidate); }}>
                          Connect
                        </Button>
                      )}
                      <ChevronRight className={`w-4 h-4 text-foreground/50 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded card — Behavioral Evidence Report view */}
                  {isExpanded && (
                    <div className="border-t border-foreground/10 p-5 bg-white/[0.02]">
                      <div className="flex items-start gap-4 mb-4">
                        {candidate.profile?.avatar_url ? (
                          <img src={candidate.profile.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center text-background font-bold text-lg">
                            {candidate.profile?.first_name?.[0]}{candidate.profile?.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{candidate.profile?.first_name} {candidate.profile?.last_name}</h3>
                          <p className="text-sm text-foreground/60">{candidate.profile?.headline || "Behavioral Evidence Report Holder"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-foreground/60 font-medium">Silver</span>
                            <span className="text-xs text-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> Verified Behavioral Evidence Report</span>
                          </div>
                        </div>
                      </div>

                      {/* BehaviourMatch™ — 7 MVP dimensions, BARS labels only */}
                      {candidate.behavioralScores && Object.keys(candidate.behavioralScores).length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-foreground font-medium mb-3 flex items-center gap-1">
                            <Target className="w-3 h-3" /> BehaviourMatch™ — Behavioral Readiness Profile
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {MVP_DIMENSIONS.map(dim => {
                              const score = candidate.behavioralScores?.[dim.id];
                              if (!score || score <= 0) return null;
                              const label = getBarsLabel(score);
                              const color = getBarsColor(score);
                              return (
                                <div key={dim.id} className="p-2.5 rounded-lg bg-background border border-foreground/15">
                                  <p className="text-[10px] text-foreground/50 mb-1">{dim.label}</p>
                                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {candidate.verificationCode ? (
                          <a href={`/verify/${candidate.verificationCode}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="border-foreground/25 text-foreground hover:bg-foreground/5">
                              <Shield className="w-4 h-4 mr-1" />
                              View Behavioral Evidence Report
                            </Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" className="border-foreground/25 text-foreground/40" disabled>
                            <Shield className="w-4 h-4 mr-1" />
                            View Behavioral Evidence Report
                          </Button>
                        )}
                        {connectionStatus !== "accepted" && connectionStatus !== "pending" && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => openConnectModal(candidate)}>
                            <Send className="w-4 h-4 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="p-8 rounded-2xl bg-background border border-foreground/15 text-center">
            <Search className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No candidates found</p>
            <p className="text-sm text-foreground/50 mt-1">Try adjusting your filters or check back later</p>
          </motion.div>
        );
      })()}

      {/* Connection Request Modal */}
      {showConnectModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80"
            onClick={() => !isSendingConnection && setShowConnectModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-background/50 border border-foreground/25"
          >
            {connectionSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-foreground/[0.06] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Request Sent!</h3>
                <p className="text-foreground/60">
                  Your connection request has been sent to {selectedCandidate.profile?.first_name}.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Send Connection Request</h2>
                  <button
                    onClick={() => setShowConnectModal(false)}
                    disabled={isSendingConnection}
                    className="text-foreground/60 hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Candidate Preview */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-background mb-6">
                  <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center text-background font-bold">
                    {selectedCandidate.profile?.first_name?.[0]}
                    {selectedCandidate.profile?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedCandidate.profile?.first_name} {selectedCandidate.profile?.last_name}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {selectedCandidate.profile?.headline || "Behavioral Evidence Report Holder"}
                    </p>
                  </div>
                </div>

                {/* Message Input */}
                <div className="mb-6">
                  <label className="text-sm text-foreground/60 block mb-2">
                    Add a message (optional)
                  </label>
                  <textarea
                    value={connectionMessage}
                    onChange={(e) => setConnectionMessage(e.target.value)}
                    placeholder="Introduce yourself and explain why you'd like to connect..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConnectModal(false)}
                    disabled={isSendingConnection}
                    className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
      case "accepted": return "bg-foreground/[0.06] text-foreground";
      case "pending": return "bg-vermilion/10 ink-vermilion";
      case "declined": return "bg-vermilion/15 ink-vermilion";
      default: return "bg-gray-500/20 text-foreground/60";
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
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Connections</h1>
        <p className="text-foreground/60">Manage your candidate connections.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "all"
              ? "bg-foreground text-background"
              : "bg-background text-foreground/60 hover:text-background"
          }`}
        >
          All ({connections.length})
        </button>
        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === "accepted"
              ? "bg-foreground text-background"
              : "bg-background text-foreground/60 hover:text-background"
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
              ? "bg-foreground text-background"
              : "bg-background text-foreground/60 hover:text-background"
          }`}
        >
          Awaiting Response
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
                    ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-foreground/40"
                    : "bg-background border-foreground/25 hover:border-foreground/25"
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
                      <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center text-background font-bold text-lg">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-lg">
                        {profile?.first_name || "Candidate"} {profile?.last_name || ""}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-foreground/60">
                          {profile?.headline || "Behavioral Evidence Report Holder"}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/20 text-foreground/60 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />Silver
                        </span>
                      </div>
                      {candidateProfile?.skills && candidateProfile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidateProfile.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-background text-foreground/60">
                              {skill}
                            </span>
                          ))}
                          {candidateProfile.skills.length > 4 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-background text-foreground/60">
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
                      {connection.status === "pending" ? "Awaiting Response" : connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                    </span>
                    <p className="text-xs text-foreground/50 mt-2">
                      {connection.responded_at
                        ? `Responded ${new Date(connection.responded_at).toLocaleDateString()}`
                        : `Sent ${new Date(connection.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {connection.message && (
                  <p className="mt-4 text-sm text-foreground/60 bg-background/20 p-3 rounded-lg">
                    <span className="text-foreground/50">Your message: </span>
                    {connection.message}
                  </p>
                )}

                {/* Actions for accepted connections */}
                {connection.status === "accepted" && profile?.email && (
                  <div className="mt-4 pt-4 border-t border-foreground/25 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-foreground/25 text-foreground hover:bg-foreground/5"
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
          className="p-8 rounded-2xl bg-background border border-foreground/25 text-center"
        >
          <Users className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
          <p className="text-foreground/60">No connections yet</p>
          <p className="text-sm text-foreground/50 mt-1">
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
      pending: { label: "Not Funded", color: "text-foreground/60 bg-gray-500/20", icon: Wallet },
      funded: { label: "In Escrow", color: "ink-vermilion bg-vermilion/10", icon: Lock },
      released: { label: "Released", color: "text-foreground bg-foreground/[0.06]", icon: Unlock },
      refunded: { label: "Refunded", color: "ink-vermilion bg-vermilion/15", icon: ArrowRight },
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
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus as ProjectWithApplications["status"] } : p))
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
      case "open": return "bg-foreground/[0.06] text-foreground";
      case "in_progress": return "bg-vermilion/10 ink-vermilion";
      case "completed": return "bg-foreground/[0.06] text-foreground";
      case "draft": return "bg-gray-500/20 text-foreground/60";
      default: return "bg-gray-500/20 text-foreground/60";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">LiveWorks Projects</h1>
          <p className="text-foreground/60">Create and manage project postings.</p>
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
          className="p-6 rounded-xl bg-background border border-foreground/25"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Create New Project</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Project Title</label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Build a Landing Page"
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the project requirements..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-foreground/60 block mb-2">Category</label>
                <input
                  type="text"
                  value={newProject.category}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Web Development"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-foreground/60 block mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={newProject.duration_days}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, duration_days: parseInt(e.target.value) || 14 }))}
                  min={7}
                  max={90}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-foreground/60 block mb-2">Skill Level</label>
                <select
                  value={newProject.skill_level}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, skill_level: e.target.value as "beginner" | "intermediate" | "advanced" }))}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-emerald-500 focus:outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Budget Section */}
            <div className="p-4 rounded-lg bg-foreground/[0.06] border border-foreground/40">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-foreground" />
                <h3 className="font-medium text-foreground">Project Budget</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground/60 block mb-2">Minimum Budget ($)</label>
                  <input
                    type="number"
                    value={newProject.budget_min}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="e.g., 500"
                    min={0}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground/60 block mb-2">Maximum Budget ($)</label>
                  <input
                    type="number"
                    value={newProject.budget_max}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="e.g., 1000"
                    min={0}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewProject(false)}
                className="border-foreground/25"
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
                className="p-6 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(project.status)}`}>
                        {project.status.replace("_", " ")}
                      </span>
                      <span className="text-sm text-foreground/50">{project.category}</span>
                      <span className="text-sm text-foreground/50">{project.duration_days} days</span>
                      {applicationCount > 0 && (
                        <span className="text-sm text-foreground flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          {applicationCount} applicant{applicationCount !== 1 ? "s" : ""}
                          {pendingApps > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-vermilion/10 ink-vermilion text-xs ml-1">
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
                        className="border-foreground/25 text-foreground hover:bg-foreground/5"
                        onClick={() => setShowStatusMenu(showStatusMenu === project.id ? null : project.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Status
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                      {showStatusMenu === project.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-background/50 border border-foreground/25 shadow-xl z-10">
                          {statusActions.map((action) => (
                            <button
                              key={action.status}
                              onClick={() => updateProjectStatus(project.id, action.status)}
                              className="w-full px-4 py-2 text-left text-sm text-foreground/75 hover:bg-foreground/5 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
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
                <p className="text-sm text-foreground/60 line-clamp-2">{project.description}</p>

                {/* Show applicants preview if any */}
                {project.applications && project.applications.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-foreground/25">
                    <p className="text-xs text-foreground/50 mb-2">Recent Applicants:</p>
                    <div className="flex items-center gap-2">
                      {project.applications.slice(0, 4).map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center gap-2 px-2 py-1 rounded bg-background"
                        >
                          {app.candidate?.profile?.avatar_url ? (
                            <img
                              src={app.candidate.profile.avatar_url}
                              alt="Applicant"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-foreground text-xs">
                              {app.candidate?.profile?.first_name?.[0]}
                            </div>
                          )}
                          <span className="text-xs text-foreground/60">
                            {app.candidate?.profile?.first_name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            app.status === "pending"
                              ? "bg-vermilion/10 ink-vermilion"
                              : app.status === "accepted"
                              ? "bg-foreground/[0.06] text-foreground"
                              : "bg-vermilion/15 ink-vermilion"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                      {project.applications.length > 4 && (
                        <span className="text-xs text-foreground/50">
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
            className="p-8 rounded-2xl bg-background border border-foreground/25 text-center"
          >
            <Briefcase className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No projects yet</p>
            <p className="text-sm text-foreground/50 mt-1">
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
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProject(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-foreground/25">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedProject.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status.replace("_", " ")}
                    </span>
                    <span className="text-sm text-foreground/50">{selectedProject.category}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProject(null)}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h3 className="text-sm text-foreground/60 mb-2">Description</h3>
                <p className="text-foreground/75">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-foreground/50">Duration</p>
                  <p className="text-foreground font-medium">{selectedProject.duration_days} days</p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-foreground/50">Skill Level</p>
                  <p className="text-foreground font-medium capitalize">{selectedProject.skill_level}</p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-foreground/50">Applicants</p>
                  <p className="text-foreground font-medium">{selectedProject.applications?.length || 0}</p>
                </div>
              </div>

              {/* Applicants List */}
              <div>
                <h3 className="text-sm text-foreground/60 mb-3">Applicants</h3>
                {selectedProject.applications && selectedProject.applications.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProject.applications.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-lg bg-background border border-foreground/25"
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
                              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-foreground font-bold">
                                {app.candidate?.profile?.first_name?.[0]}{app.candidate?.profile?.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {app.candidate?.profile?.first_name} {app.candidate?.profile?.last_name}
                              </p>
                              <p className="text-sm text-foreground/60">
                                {app.candidate?.profile?.headline || "Candidate"}
                              </p>
                              <p className="text-xs text-foreground/50 mt-1">
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
                                  className="border-vermilion ink-vermilion hover:bg-vermilion/15"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </Button>
                              </>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-sm ${
                                  app.status === "accepted"
                                    ? "bg-foreground/[0.06] text-foreground"
                                    : "bg-vermilion/15 ink-vermilion"
                                }`}
                              >
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        {app.cover_letter && (
                          <div className="mt-3 p-3 rounded bg-background/20">
                            <p className="text-xs text-foreground/50 mb-1">Cover Letter</p>
                            <p className="text-sm text-foreground/75">{app.cover_letter}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-background text-center">
                    <Users className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                    <p className="text-foreground/60">No applicants yet</p>
                    <p className="text-xs text-foreground/50 mt-1">
                      Applicants will appear here when candidates apply
                    </p>
                  </div>
                )}
              </div>

              {/* Milestones Section */}
              <div className="mt-6 pt-6 border-t border-foreground/25">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-foreground/60">Project Milestones</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                    variant="outline"
                    className="border-foreground/25 text-foreground hover:bg-foreground/5"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>

                {/* Add Milestone Form */}
                {showMilestoneForm && (
                  <div className="mb-4 p-4 rounded-lg bg-background border border-foreground/25">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Milestone title..."
                        className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none text-sm"
                      />
                      <input
                        type="text"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)..."
                        className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={newMilestone.dueDate}
                          onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="px-3 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-emerald-500 focus:outline-none text-sm"
                        />
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                          <input
                            type="number"
                            value={newMilestone.paymentAmount}
                            onChange={(e) => setNewMilestone(prev => ({ ...prev, paymentAmount: e.target.value }))}
                            placeholder="Payment amount"
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none text-sm"
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
                          className="text-foreground/60 hover:text-foreground"
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
                          case "approved": return "bg-foreground/[0.06] text-foreground";
                          case "submitted": return "bg-foreground/[0.06] text-foreground";
                          case "in_progress": return "bg-vermilion/10 ink-vermilion";
                          case "revision_requested": return "bg-vermilion/15 ink-vermilion";
                          default: return "bg-gray-500/20 text-foreground/60";
                        }
                      };

                      const escrowBadge = getEscrowStatusBadge(milestone.escrow_status);
                      const EscrowIcon = escrowBadge.icon;

                      return (
                        <div
                          key={milestone.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            milestone.status === "approved"
                              ? "bg-foreground/[0.06] border-foreground/40"
                              : "bg-background border-foreground/25"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                milestone.status === "approved"
                                  ? "bg-foreground/[0.06] text-foreground"
                                  : "bg-background text-foreground/60"
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{milestone.title}</p>
                                {milestone.description && (
                                  <p className="text-sm text-foreground/60 mt-1">{milestone.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {milestone.due_date && (
                                    <span className="text-xs text-foreground/50 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {milestone.payment_amount && (
                                    <span className="text-xs text-foreground flex items-center gap-1">
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
                                      className="border-vermilion ink-vermilion hover:bg-vermilion/10 h-7 px-2"
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
                                    className="border-foreground/25 text-foreground/60 hover:text-foreground h-7 px-2"
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
                  <div className="p-6 rounded-lg bg-background text-center">
                    <Briefcase className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                    <p className="text-foreground/60">No milestones yet</p>
                    <p className="text-xs text-foreground/50 mt-1">
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
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setShowEscrowModal(false);
            setSelectedMilestone(null);
            setPaymentDetails({ method: "paypal", credentials: "", notes: "" });
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {escrowAction === "fund" ? (
              <>
                {/* Share Payment Credentials */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 ink-vermilion" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Share Payment Details</h3>
                    <p className="text-sm text-foreground/60">Provide payment credentials for the candidate</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background border border-foreground/25 mb-4">
                  <p className="text-sm text-foreground/60 mb-1">Milestone</p>
                  <p className="text-foreground font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-foreground/25">
                    <p className="text-sm text-foreground/60 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-sm text-foreground/60 block mb-2">Payment Method</label>
                    <select
                      value={paymentDetails.method}
                      onChange={(e) => setPaymentDetails((prev) => ({ ...prev, method: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-indigo-500 focus:outline-none"
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
                    <label className="text-sm text-foreground/60 block mb-2">
                      Payment Credentials
                      <span className="ink-vermilion">*</span>
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
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground/60 block mb-2">Additional Notes (Optional)</label>
                    <input
                      type="text"
                      value={paymentDetails.notes}
                      onChange={(e) => setPaymentDetails((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special instructions..."
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-vermilion/10 border border-vermilion mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 ink-vermilion mt-0.5" />
                    <p className="text-sm ink-vermilion">
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
                    className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
                  <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Verify Payment</h3>
                    <p className="text-sm text-foreground/60">Confirm you received the payment</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background border border-foreground/25 mb-4">
                  <p className="text-sm text-foreground/60 mb-1">Milestone</p>
                  <p className="text-foreground font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-foreground/25">
                    <p className="text-sm text-foreground/60 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                  {selectedMilestone.payment_method && (
                    <div className="mt-3 pt-3 border-t border-foreground/25">
                      <p className="text-sm text-foreground/60 mb-1">Payment Method</p>
                      <p className="text-foreground capitalize">{selectedMilestone.payment_method.replace("_", " ")}</p>
                    </div>
                  )}
                </div>

                {selectedMilestone.payment_proof_url && (
                  <div className="p-4 rounded-lg bg-background border border-foreground/25 mb-4">
                    <p className="text-sm text-foreground/60 mb-2">Payment Proof Submitted</p>
                    <a
                      href={selectedMilestone.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 ink-vermilion hover:ink-vermilion"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Screenshot / Receipt
                    </a>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-foreground/[0.06] border border-foreground/40 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-foreground mt-0.5" />
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
                    className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
                  <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Payment Details</h3>
                    <p className="text-sm text-foreground/60">Milestone payment information</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background border border-foreground/25 mb-4">
                  <p className="text-sm text-foreground/60 mb-1">Milestone</p>
                  <p className="text-foreground font-medium">{selectedMilestone.title}</p>
                  <div className="mt-3 pt-3 border-t border-foreground/25">
                    <p className="text-sm text-foreground/60 mb-1">Payment Amount</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${selectedMilestone.payment_amount?.toLocaleString()}
                    </p>
                  </div>
                  {selectedMilestone.payment_method && (
                    <div className="mt-3 pt-3 border-t border-foreground/25">
                      <p className="text-sm text-foreground/60 mb-1">Payment Method</p>
                      <p className="text-foreground capitalize">{selectedMilestone.payment_method.replace("_", " ")}</p>
                    </div>
                  )}
                  {selectedMilestone.payment_credentials && (
                    <div className="mt-3 pt-3 border-t border-foreground/25">
                      <p className="text-sm text-foreground/60 mb-1">Payment Credentials</p>
                      <p className="text-foreground text-sm whitespace-pre-wrap">{selectedMilestone.payment_credentials}</p>
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
                    className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
      // Lock 1: Post-Hire Feedback Loop — log to candidate's growth log
      const feedbackLabel = feedbackType === "30_day" ? "30-Day" : feedbackType === "60_day" ? "60-Day" : "90-Day";
      await supabase.from("growth_log_entries").insert({
        candidate_id: selectedHire.connection.candidate_id,
        event_type: "assessment",
        title: `Post-Hire Feedback — ${feedbackLabel} Review (Lock 1)`,
        description: `Employer feedback received: Performance ${feedbackForm.performanceRating}/5, Readiness Accuracy ${feedbackForm.readinessAccuracy}/5. ${feedbackForm.wouldHireAgain ? "Would hire again." : "Would not hire again."}`,
        source_component: "PostHireFeedback",
      });

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
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Hire Feedback</h1>
        <p className="text-foreground/60">
          Provide 30/60/90 day performance feedback for your hires.
        </p>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        variants={itemVariants}
        className="p-4 rounded-xl bg-foreground/[0.06] border border-foreground/40 flex items-start gap-4"
      >
        <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground font-medium">Why feedback matters</p>
          <p className="text-sm text-foreground/60 mt-1">
            Your feedback helps improve the accuracy of Behavioral Evidence Reports and the overall
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
                  className="p-6 rounded-xl bg-background border border-foreground/25"
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
                        <div className="w-14 h-14 rounded-xl bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold text-lg">
                          {hire.candidate?.profile?.first_name?.[0]}
                          {hire.candidate?.profile?.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-lg">
                          {hire.candidate?.profile?.first_name} {hire.candidate?.profile?.last_name}
                        </p>
                        <p className="text-sm text-foreground/60">
                          Hired {days} days ago
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {hire.candidate?.current_tier && (
                            <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 ink-vermilion">
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
                                ? "bg-foreground/[0.06] border border-foreground/40"
                                : "bg-background border border-foreground/25"
                            }`}
                          >
                            <p className="text-xs text-foreground/50">{typeLabel}</p>
                            {feedback ? (
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <Star className="w-3 h-3 ink-vermilion" />
                                <span className="text-sm text-foreground">
                                  {feedback.performance_rating}/5
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-foreground/40 mt-1">Pending</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {availableTypes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-foreground/25 flex gap-2">
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
                    <div className="mt-4 pt-4 border-t border-foreground/25">
                      <p className="text-sm text-foreground/50 mb-2">Previous Feedback</p>
                      <div className="space-y-2">
                        {hire.feedbacks.map((fb) => (
                          <div
                            key={fb.id || fb.feedback_type}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/20"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-foreground/60">{fb.feedback_type.replace("_", " ")}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < fb.performance_rating
                                        ? "ink-vermilion fill-amber-400"
                                        : "text-foreground/40"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span
                              className={`text-sm ${
                                fb.would_hire_again ? "text-foreground" : "ink-vermilion"
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
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <Users className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No hires yet</p>
            <p className="text-sm text-foreground/50 mt-1">
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
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowFeedbackModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground mb-2">
              {feedbackType.replace("_", " ")} Feedback
            </h2>
            <p className="text-foreground/60 mb-6">
              Share your experience with {selectedHire.candidate?.profile?.first_name}
            </p>

            {/* Performance Rating */}
            <div className="mb-6">
              <label className="text-sm text-foreground/60 block mb-2">
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
                        ? "bg-vermilion/10 ink-vermilion"
                        : "bg-background text-foreground/50 hover:bg-foreground/5"
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
              <label className="text-sm text-foreground/60 block mb-2">
                How accurate was their Behavioral Evidence Report tier?
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
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground/60 hover:bg-foreground/5"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-foreground/50 mt-1">
                <span>Not accurate</span>
                <span>Very accurate</span>
              </div>
            </div>

            {/* Would Hire Again */}
            <div className="mb-6">
              <label className="text-sm text-foreground/60 block mb-2">
                Would you hire this person again?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setFeedbackForm((prev) => ({ ...prev, wouldHireAgain: true }))
                  }
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    feedbackForm.wouldHireAgain
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground/60 hover:bg-foreground/5"
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
                      ? "bg-red-600 text-foreground"
                      : "bg-background text-foreground/60 hover:bg-foreground/5"
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  No
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="mb-6">
              <label className="text-sm text-foreground/60 block mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={feedbackForm.comments}
                onChange={(e) =>
                  setFeedbackForm((prev) => ({ ...prev, comments: e.target.value }))
                }
                placeholder="Share specific observations about their work..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
// Messages Page for Employer Dashboard
const EmployerMessagesPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; size: number; type: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setIsProcessingFile(true);
    try {
      const result = await uploadMessageAttachment(file, user.id);
      if (!result) {
        toast({ title: "Attachment Failed", description: "File too large or unsupported type (max 10MB).", variant: "destructive" });
        setAttachedFile(null);
      } else {
        setAttachedFile({ url: result.url, name: result.name, size: result.size, type: result.type });
        toast({ title: "File Attached", description: `"${result.name}" ready to send.` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, role").neq("id", user?.id).or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`).limit(20);
      setSearchResults(data || []);
    } catch { setSearchResults([]); } finally { setIsSearching(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (userSearchQuery) searchUsers(userSearchQuery); else setSearchResults([]); }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const startConversation = async (targetUserId: string) => {
    if (!user?.id || isCreatingConversation) return;
    setIsCreatingConversation(true);
    try {
      const { data: myConvs } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
      if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map((c) => c.conversation_id);
        const { data: theirConvs } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", targetUserId).in("conversation_id", myConvIds);
        if (theirConvs && theirConvs.length > 0) {
          const existing = conversations.find((c) => c.id === theirConvs[0].conversation_id);
          if (existing) { setActiveConversation(existing); setShowNewChat(false); setUserSearchQuery(""); setSearchResults([]); setIsCreatingConversation(false); return; }
        }
      }
      const { data: conv } = await supabase.from("conversations").insert({ last_message_at: new Date().toISOString() }).select().single();
      if (conv) {
        // Sequential inserts: RLS requires self-seed before adding a counterparty.
        const { error: selfErr } = await supabase
          .from("conversation_participants")
          .insert({ conversation_id: conv.id, user_id: user.id });
        if (selfErr) throw selfErr;
        const { error: targetErr } = await supabase
          .from("conversation_participants")
          .insert({ conversation_id: conv.id, user_id: targetUserId });
        if (targetErr) throw targetErr;
        const { data: targetProfile } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, role").eq("id", targetUserId).single();
        const newConv = { ...conv, other_user: targetProfile };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversation(newConv);
        setShowNewChat(false); setUserSearchQuery(""); setSearchResults([]);
      }
    } catch (error) { console.error("Error creating conversation:", error); } finally { setIsCreatingConversation(false); }
  };

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.id) return;
      const { data: participantData } = await supabase.from("conversation_participants").select("conversation_id, last_read_at").eq("user_id", user.id);
      if (participantData && participantData.length > 0) {
        const conversationIds = participantData.map((p) => p.conversation_id);
        const { data: convData } = await supabase.from("conversations").select("*").in("id", conversationIds).order("last_message_at", { ascending: false });
        const enrichedConversations = await Promise.all((convData || []).map(async (conv) => {
          const { data: participants } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conv.id).neq("user_id", user.id);
          let otherUser = null;
          if (participants && participants.length > 0) {
            const { data: profileData } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, role, last_seen").eq("id", participants[0].user_id).single();
            otherUser = profileData;
            if (profileData?.last_seen) {
              setOnlineUsers((prev) => ({ ...prev, [profileData.id]: profileData.last_seen }));
            }
          }
          const myParticipant = participantData.find((p) => p.conversation_id === conv.id);
          return { ...conv, other_user: otherUser, last_read_at: myParticipant?.last_read_at };
        }));
        setConversations(enrichedConversations);
      }
      setIsLoading(false);
    };
    fetchConversations();

    // Poll the conversation list instead of holding a realtime channel open
    if (!user?.id) return;
    const convTimer = setInterval(() => {
      if (!document.hidden) void fetchConversations();
    }, 15000);

    return () => clearInterval(convTimer);
  }, [user?.id]);

  useEffect(() => {
    if (!activeConversation) { setMessages([]); return; }
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true });
      const enriched = (data || []).map((msg: any) => {
        if (msg.reply_to_id) {
          const repliedMsg = (data || []).find((m: any) => m.id === msg.reply_to_id);
          if (repliedMsg) return { ...msg, reply_to: { id: repliedMsg.id, content: repliedMsg.content, sender: repliedMsg.sender } };
        }
        return msg;
      });
      setMessages(enriched);
      await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", activeConversation.id).eq("user_id", user?.id);
    };
    fetchMessages();
    // Poll for inbound messages instead of a realtime channel
    let lastAt: string | null = null;
    const tick = async () => {
      let query = supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
        .eq("conversation_id", activeConversation.id)
        .neq("sender_id", user?.id ?? "")
        .order("created_at", { ascending: true })
        .limit(50);
      if (lastAt) query = query.gt("created_at", lastAt);
      const { data: incoming } = await query;
      if (incoming?.length) {
        lastAt = (incoming[incoming.length - 1] as { created_at: string }).created_at;
        setMessages((prev) => {
          const seen = new Set(prev.map((m: any) => m.id));
          const fresh = incoming.filter((m: any) => !seen.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      } else if (!lastAt) {
        lastAt = new Date().toISOString();
      }
    };
    const msgTimer = setInterval(() => {
      if (!document.hidden) void tick();
    }, 5000);
    return () => clearInterval(msgTimer);
  }, [activeConversation?.id, user?.id]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachedFile) || !activeConversation || !user?.id) return;
    setIsSending(true);
    const messageContent = newMessage.trim();
    const fileToSend = attachedFile;
    setNewMessage("");
    setAttachedFile(null);
    const replyMsg = replyTo;
    setReplyTo(null);
    try {
      await supabase.from("messages").insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content: messageContent || (fileToSend ? fileToSend.name : ""),
        message_type: fileToSend ? "file" : "text",
        ...(fileToSend ? { file_url: fileToSend.url, metadata: { file_name: fileToSend.name, file_size: fileToSend.size, file_type: fileToSend.type } } : {}),
        ...(replyMsg?.id ? { reply_to_id: replyMsg.id } : {}),
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: (messageContent || fileToSend?.name || "File").substring(0, 100), updated_at: new Date().toISOString() }).eq("id", activeConversation.id);
      // Send notification to the other user
      if (activeConversation.other_user?.id) {
        const senderName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
        await sendMessageNotification(user.id, senderName, activeConversation.other_user.id, messageContent || (fileToSend ? `📎 ${fileToSend.name}` : ""), activeConversation.id);
      }
    } catch (error) { console.error("Error sending message:", error); setNewMessage(messageContent); } finally { setIsSending(false); }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const otherName = `${c.other_user?.first_name || ""} ${c.other_user?.last_name || ""}`.toLowerCase();
    return otherName.includes(searchQuery.toLowerCase());
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-foreground" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="h-[calc(100vh-12rem)]">
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
        <p className="text-foreground/60">Connect with candidates, mentors, and other employers.</p>
      </motion.div>
      <motion.div variants={itemVariants} className="h-[calc(100%-5rem)] rounded-xl bg-background border border-foreground/25 overflow-hidden flex">
        <div className="w-80 border-r border-foreground/25 flex flex-col">
          <div className="p-4 border-b border-foreground/25 space-y-3">
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-background border border-foreground/25 rounded-lg px-4 py-2 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-emerald-500" />
              <Button onClick={() => setShowNewChat(!showNewChat)} className="bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-2 flex-shrink-0" title="New conversation"><Plus className="w-4 h-4" /></Button>
            </div>
            {showNewChat && (
              <div className="bg-background/90 border border-foreground/40 rounded-xl p-3 space-y-3">
                <p className="text-xs text-foreground font-medium">Find someone to message</p>
                <input type="text" placeholder="Search by name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} autoFocus className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-emerald-500" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {isSearching && <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-foreground" /></div>}
                  {!isSearching && searchResults.length === 0 && userSearchQuery.length >= 2 && <p className="text-xs text-foreground/50 text-center py-2">No users found</p>}
                  {!isSearching && userSearchQuery.length > 0 && userSearchQuery.length < 2 && <p className="text-xs text-foreground/50 text-center py-2">Type at least 2 characters</p>}
                  {searchResults.map((result) => (
                    <button key={result.id} onClick={() => startConversation(result.id)} disabled={isCreatingConversation} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.06] transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                        {result.avatar_url ? <img src={result.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-4 h-4 text-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.first_name} {result.last_name}</p>
                        <p className="text-xs text-foreground/50 capitalize">{result.role}</p>
                      </div>
                      <Send className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
                <p className="text-foreground/60">No conversations yet</p>
                <p className="text-sm text-foreground/50 mt-1">Click the <span className="text-foreground">+</span> button to find and message anyone</p>
              </div>
            ) : filteredConversations.map((conv) => {
              const hasUnread = conv.last_message_at && (!conv.last_read_at || new Date(conv.last_message_at) > new Date(conv.last_read_at));
              return (
                <button key={conv.id} onClick={() => setActiveConversation(conv)} className={`w-full p-4 flex items-start gap-3 hover:bg-foreground/5 transition-colors text-left ${activeConversation?.id === conv.id ? "bg-foreground/[0.06] border-l-2 border-emerald-500" : ""}`}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                      {conv.other_user?.avatar_url ? <img src={conv.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6 text-foreground" />}
                    </div>
                    {hasUnread ? (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500" />
                    ) : (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[conv.other_user?.id]) ? "bg-emerald-500" : "bg-gray-600"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate ${hasUnread ? "text-foreground" : "text-foreground/75"}`}>{conv.other_user?.first_name} {conv.other_user?.last_name}</p>
                      <span className="text-xs text-foreground/50">{conv.last_message_at ? formatMessageTime(conv.last_message_at) : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground/50 capitalize">{conv.other_user?.role}</span>
                      <span className="text-foreground/40">·</span>
                      <p className={`text-sm truncate ${hasUnread ? "text-foreground/75" : "text-foreground/50"}`}>{conv.last_message_preview || "No messages yet"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-foreground/25 flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    {activeConversation.other_user?.avatar_url ? <img src={activeConversation.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-foreground" />}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? "bg-emerald-500" : "bg-gray-600"}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}</p>
                  <p className="text-xs text-foreground/50">{isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? <span className="text-foreground">Online</span> : <span className="capitalize">{activeConversation.other_user?.role}</span>}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
                  const showActions = activeMsgId === msg.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`} onMouseEnter={() => setActiveMsgId(msg.id)} onMouseLeave={() => setActiveMsgId(null)}>
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                            {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-4 h-4 text-foreground" />}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div className="relative">
                          {/* Action buttons */}
                          <div className={`flex items-center gap-1 mb-1 transition-opacity duration-150 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"} ${isOwn ? "justify-end" : "justify-start"}`}>
                            <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setActiveMsgId(null); }} className="p-1.5 rounded-lg bg-background/80 border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors" title="Reply">
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content || ""); toast({ title: "Copied", description: "Message copied to clipboard." }); }} className="p-1.5 rounded-lg bg-background/80 border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors" title="Copy">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Reply quote */}
                          {msg.reply_to && (
                            <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 text-xs cursor-pointer ${isOwn ? "bg-foreground/[0.05] border-foreground/40 text-emerald-200" : "bg-white/5 border-foreground/40 text-foreground/60"}`} onClick={() => { const el = document.getElementById(`msg-${msg.reply_to.id}`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("ring-2", "ring-emerald-500/50"); setTimeout(() => el.classList.remove("ring-2", "ring-emerald-500/50"), 2000); } }}>
                              <p className="font-medium text-[11px] mb-0.5">{msg.reply_to.sender?.first_name || "User"}</p>
                              <p className="truncate opacity-80">{msg.reply_to.content?.substring(0, 80)}</p>
                            </div>
                          )}
                          <div id={`msg-${msg.id}`} onClick={() => setActiveMsgId(showActions ? null : msg.id)} className={`px-4 py-2 rounded-2xl cursor-pointer transition-all duration-300 ${isOwn ? "bg-foreground text-background rounded-br-md" : "bg-background text-foreground/80 rounded-bl-md"}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.file_url && (
                              <div className="mt-2">
                                {isImageFile(msg.file_url, msg.metadata) ? (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                    <img src={msg.file_url} alt={msg.metadata?.file_name || 'attachment'} className="max-w-xs rounded-lg border border-foreground/15" />
                                  </a>
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-foreground/15 hover:border-foreground/25 text-sm">
                                    <Paperclip className="w-4 h-4 text-foreground flex-shrink-0" />
                                    <span className="text-foreground truncate">{msg.metadata?.file_name || 'Attachment'}</span>
                                    {msg.metadata?.file_size && <span className="text-foreground/50 text-xs flex-shrink-0">{formatFileSize(msg.metadata.file_size)}</span>}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <p className={`text-xs text-foreground/50 mt-1 ${isOwn ? "text-right" : ""}`}>{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-foreground/25">
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.06] border border-foreground/40">
                    <Reply className="w-4 h-4 text-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 border-l-2 border-foreground/40 pl-2">
                      <p className="text-xs font-medium text-emerald-300">{replyTo.sender?.first_name || "User"}</p>
                      <p className="text-xs text-foreground/60 truncate">{replyTo.content?.substring(0, 100)}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-foreground/60 hover:text-foreground flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                )}
                {attachedFile && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.06] border border-foreground/40">
                    <Paperclip className="w-4 h-4 text-foreground flex-shrink-0" />
                    <span className="text-sm text-emerald-300 truncate flex-1">{attachedFile.name}</span>
                    <span className="text-xs text-foreground/50 flex-shrink-0">{formatFileSize(attachedFile.size)}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-foreground/60 hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileAttach} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingFile} className="p-3 rounded-xl border border-foreground/25 text-foreground/60 hover:text-foreground hover:border-emerald-500 transition-colors disabled:opacity-50" title="Attach document (PDF, DOC, DOCX, TXT - max 5MB)">
                    {isProcessingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} className="flex-1 bg-background border border-foreground/25 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-emerald-500" />
                  <Button onClick={sendMessage} disabled={(!newMessage.trim() && !attachedFile) || isSending} className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-6">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Select a Conversation</h3>
                <p className="text-foreground/60 max-w-sm mb-4">Choose a conversation or start a new one.</p>
                <Button onClick={() => setShowNewChat(true)} className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-6"><Plus className="w-4 h-4 mr-2" />New Conversation</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

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
      const allFieldsFilled = !!(formData.company_name && formData.industry && formData.company_size);

      if (employerProfile) {
        await supabase
          .from("employer_profiles")
          .update({
            company_name: formData.company_name,
            industry: formData.industry,
            company_size: formData.company_size,
            company_website: formData.company_website,
            is_verified: allFieldsFilled ? true : employerProfile.is_verified,
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
            is_verified: allFieldsFilled,
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Company Profile</h1>
          <p className="text-foreground/60">Manage your company information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-emerald-600 hover:bg-emerald-500">
            Edit Company
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-foreground/25">
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
        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-foreground/60">Contact Name</p>
              <p className="text-foreground">{profile?.first_name} {profile?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/60">Email</p>
              <p className="text-foreground">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h3 className="font-semibold text-foreground mb-4">Company Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-foreground">{formData.company_name || "Not set"}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-foreground/60 block mb-2">Industry</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Technology"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-foreground">{formData.industry || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-foreground/60 block mb-2">Company Size</label>
                {isEditing ? (
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_size: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                ) : (
                  <p className="text-foreground">{formData.company_size || "Not set"}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Company Website</label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.company_website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_website: e.target.value }))}
                  placeholder="https://yourcompany.com"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-emerald-500 focus:outline-none"
                />
              ) : formData.company_website ? (
                <a href={formData.company_website} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline flex items-center gap-1">
                  {formData.company_website} <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-foreground">Not set</p>
              )}
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className={`p-6 rounded-xl border ${
          employerProfile?.is_verified
            ? "bg-foreground/[0.06] border-foreground/40"
            : "bg-vermilion/10 border-vermilion"
        }`}>
          <div className="flex items-center gap-3">
            {employerProfile?.is_verified ? (
              <>
                <CheckCircle className="w-6 h-6 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Verified Company</p>
                  <p className="text-sm text-foreground/60">Your company has been verified</p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-6 h-6 ink-vermilion" />
                <div>
                  <p className="font-semibold ink-vermilion">Pending Verification</p>
                  <p className="text-sm text-foreground/60">Complete your profile to get verified</p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GoogleAuthLink />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-foreground/60">Manage your account preferences</p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground/60">Email Address</p>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/60">Account Created</p>
              <p className="text-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h2 className="text-lg font-semibold text-foreground mb-4">Security</h2>
          <Button variant="outline" className="border-foreground/25 text-foreground hover:bg-foreground/5">
            Change Password
          </Button>
        </div>

        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-foreground/60">Email notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-foreground/60">New candidate matches</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-foreground/60">Connection responses</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
            </label>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EmployerNotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setIsLoading(false);
    };
    fetchAll();
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-foreground" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <Button size="sm" variant="outline" onClick={markAllAsRead} className="border-foreground/25 text-foreground/60">
            Mark all as read
          </Button>
        )}
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-foreground/50 text-center py-8">No notifications yet</p>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${n.is_read ? "bg-background border-foreground/10" : "bg-foreground/[0.06] border-foreground/40"}`}
            onClick={() => markAsRead(n.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`font-medium ${n.is_read ? "text-foreground/60" : "text-foreground"}`}>{n.title}</p>
                <p className="text-sm text-foreground/50 mt-1">{n.message}</p>
              </div>
              <span className="text-xs text-foreground/40 flex-shrink-0">{new Date(n.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const EMPLOYER_SECTIONS: DashboardSection[] = [
  { id: "main", label: "§ I · Reading Room" },
];

const EmployerDashboard = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type?: string; created_at: string; is_read: boolean; user_id: string }[]>([]);
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount(user?.id);
  usePresence(user?.id);

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
      setNotifications((data as typeof notifications) || []);
    };
    fetchNotifications();
    const notifTimer = setInterval(() => {
      if (!document.hidden) void fetchNotifications();
    }, 15000);
    return () => clearInterval(notifTimer);
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications([]);
  };

  const navWithBadges: DashboardNavItem[] = navItems.map((n) => ({
    ...n,
    section: "main",
    badge: n.name === "Messages" ? unreadMessageCount : undefined,
  }));

  return (
    <DashboardLayout
      role="Employer"
      roleTagline="You read what candidates have released to you — nothing more, nothing hidden."
      nav={navWithBadges}
      sections={EMPLOYER_SECTIONS}
      notifications={notifications}
      onMarkNotificationRead={markAsRead}
      onMarkAllRead={markAllAsRead}
      notificationsHref="/dashboard/employer/notifications"
    >
      <Routes>
        <Route index element={<Overview />} />
        <Route path="search" element={<SearchTalent />} />
        <Route path="t3x" element={<T3XDiscovery />} />
        <Route path="connections" element={<Connections />} />
        <Route path="projects" element={<Projects />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="messages" element={<EmployerMessagesPage />} />
        <Route path="company" element={<Company />} />
        <Route path="agent" element={<AIAgent />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<EmployerNotificationsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

// legacy shell removed

export default EmployerDashboard;
