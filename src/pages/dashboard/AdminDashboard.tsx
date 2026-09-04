import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import AIAgent from "@/pages/dashboard/AIAgent";
import EvidenceReview from "@/pages/dashboard/admin/EvidenceReview";
import D1IssuanceCoordinator from "@/pages/dashboard/admin/D1IssuanceCoordinator";
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
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  Building2,
  GraduationCap,
  Award,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Activity,
  FileText,
  ShieldCheck,
  Briefcase,
  UserCheck,
  AlertCircle,
  Crown,
  Medal,
  Star,
  Percent,
  Lock,
  Target,
  Mail,
  Send,
  MessageSquare,
  Save,
  ChevronDown,
  MapPin,
  User,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Globe,
  Palette,
  Bot,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type TalentVisaNomination = Database["public"]["Tables"]["talentvisa_nominations"]["Row"];
type TalentVisaQuota = Database["public"]["Tables"]["talentvisa_quotas"]["Row"];
type SchoolProfile = Database["public"]["Tables"]["school_profiles"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type TalentVisaTier = "gold" | "silver" | "bronze";

// Tier configuration
const TIER_CONFIG = {
  gold: {
    label: "Gold",
    icon: Crown,
    color: "ink-vermilion",
    bgColor: "bg-vermilion/10",
    borderColor: "border-vermilion",
    minScore: 4.5,
    description: "Top 5% - Exceptional candidates",
  },
  silver: {
    label: "Silver",
    icon: Medal,
    color: "text-slate-300",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/30",
    minScore: 4.0,
    description: "Top 15% - Outstanding candidates",
  },
  bronze: {
    label: "Bronze",
    icon: Star,
    color: "ink-vermilion",
    bgColor: "bg-vermilion/10",
    borderColor: "border-vermilion",
    minScore: 3.5,
    description: "Top 30% - Strong candidates",
  },
};

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
  { name: "Overview", href: "/dashboard/admin", icon: BarChart3 },
  { name: "Users", href: "/dashboard/admin/users", icon: Users },
  { name: "TalentVisa", href: "/dashboard/admin/talentvisa", icon: Award },
  { name: "Employers", href: "/dashboard/admin/employers", icon: Building2 },
  { name: "Schools", href: "/dashboard/admin/schools", icon: GraduationCap },
  { name: "Communications", href: "/dashboard/admin/communications", icon: Mail },
  { name: "Reports", href: "/dashboard/admin/reports", icon: FileText },
  { name: "Evidence Review", href: "/dashboard/admin/evidence-review", icon: ShieldCheck },
  { name: "D1 Issuance", href: "/dashboard/admin/d1-issuance", icon: ShieldCheck },
  { name: "Praxis", href: "/dashboard/admin/agent", icon: Bot },
  { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

// Chart colors
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// Overview component
const Overview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCandidates: 0,
    totalMentors: 0,
    totalEmployers: 0,
    totalPassports: 0,
    pendingTalentVisas: 0,
    activeProjects: 0,
    totalConnections: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ date: string; users: number }[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [activityData, setActivityData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch counts
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: candidateCount } = await supabase
        .from("candidate_profiles")
        .select("*", { count: "exact", head: true });

      const { count: mentorCount } = await supabase
        .from("mentor_profiles")
        .select("*", { count: "exact", head: true });

      const { count: employerCount } = await supabase
        .from("employer_profiles")
        .select("*", { count: "exact", head: true });

      const { count: passportCount } = await supabase
        .from("skill_passports")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: talentVisaCount } = await supabase
        .from("talentvisa_nominations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: projectCount } = await supabase
        .from("liveworks_projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      const { count: connectionCount } = await supabase
        .from("t3x_connections")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: userCount || 0,
        totalCandidates: candidateCount || 0,
        totalMentors: mentorCount || 0,
        totalEmployers: employerCount || 0,
        totalPassports: passportCount || 0,
        pendingTalentVisas: talentVisaCount || 0,
        activeProjects: projectCount || 0,
        totalConnections: connectionCount || 0,
      });

      // Set role distribution for pie chart
      setRoleDistribution([
        { name: "Candidates", value: candidateCount || 0 },
        { name: "Mentors", value: mentorCount || 0 },
        { name: "Employers", value: employerCount || 0 },
      ]);

      // Fetch all users to calculate growth over time
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });

      if (allUsers && allUsers.length > 0) {
        // Calculate user growth by week for last 12 weeks
        const weeklyGrowth: Record<string, number> = {};
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - i * 7);
          const weekKey = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          weeklyGrowth[weekKey] = 0;
        }

        let runningTotal = 0;
        allUsers.forEach((user) => {
          const userDate = new Date(user.created_at);
          const weeksSinceCreation = Math.floor((now.getTime() - userDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

          if (weeksSinceCreation < 12) {
            runningTotal++;
          }
        });

        // Simulate cumulative growth (in real app, would calculate properly)
        const growthData = Object.keys(weeklyGrowth).map((date, index) => ({
          date,
          users: Math.round((userCount || 0) * ((index + 1) / 12) + Math.random() * 5),
        }));

        setUserGrowthData(growthData);
      }

      // Fetch activity metrics
      const { count: observationCount } = await supabase
        .from("mentor_observations")
        .select("*", { count: "exact", head: true });

      const { count: trainingCount } = await supabase
        .from("bridgefast_progress")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      const { count: endorsementCount } = await supabase
        .from("endorsements")
        .select("*", { count: "exact", head: true });

      setActivityData([
        { name: "Observations", value: observationCount || 0 },
        { name: "Training Completed", value: trainingCount || 0 },
        { name: "Endorsements", value: endorsementCount || 0 },
        { name: "Connections", value: connectionCount || 0 },
        { name: "Projects", value: projectCount || 0 },
      ]);

      // Fetch recent profiles
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(recentUsers || []);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) return <LedgerLoading />;

  const chartAxis = { fill: "hsl(30 6% 32%)", fontSize: 11 };
  const chartLine = "hsl(30 12% 10% / 0.15)";
  const chartTooltip = {
    backgroundColor: "hsl(40 33% 92%)",
    border: "2px solid hsl(30 12% 10%)",
    borderRadius: 0,
    color: "hsl(30 12% 10%)",
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
  };
  const inkFill = "hsl(30 12% 10%)";
  const vermFill = "hsl(12 76% 42%)";

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Administration · Platform"
        title={
          <>
            Register <span className="italic display-serif-italic ink-vermilion">management.</span>
          </>
        }
        meta="Governance for the governance — you keep the register itself in good order."
        actions={
          stats.pendingTalentVisas > 0 ? (
            <Link to="/dashboard/admin/talentvisa">
              <LedgerBadge variant="stamp">
                {stats.pendingTalentVisas} pending TalentVisa
              </LedgerBadge>
            </Link>
          ) : null
        }
      />

      <DashSection eyebrow="§ I · Standing figures" title="Roll call">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { label: "Total users", value: stats.totalUsers.toLocaleString() },
            { label: "Candidates", value: stats.totalCandidates.toLocaleString() },
            { label: "Mentors", value: stats.totalMentors.toLocaleString() },
            { label: "Employers", value: stats.totalEmployers.toLocaleString() },
          ].map((s) => (
            <LedgerStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mt-10">
          {[
            { label: "Active reports", value: stats.totalPassports.toLocaleString() },
            { label: "Pending TalentVisa", value: stats.pendingTalentVisas.toLocaleString() },
            { label: "Active projects", value: stats.activeProjects.toLocaleString() },
            { label: "Total connections", value: stats.totalConnections.toLocaleString() },
          ].map((s) => (
            <LedgerStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </DashSection>

      <DashSection eyebrow="§ II · Analytics" title="Movement across the register">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="border-2 border-foreground p-6">
            <div className="mono-label text-foreground/60 pb-3 mb-4 border-b border-foreground/25">
              User growth · Last 12 weeks
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={inkFill} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={inkFill} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="1 3" stroke={chartLine} />
                  <XAxis dataKey="date" tick={chartAxis} tickLine={{ stroke: chartLine }} />
                  <YAxis tick={chartAxis} tickLine={{ stroke: chartLine }} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Area type="monotone" dataKey="users" stroke={inkFill} strokeWidth={1.5} fill="url(#userGrowthGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-2 border-foreground p-6">
            <div className="mono-label text-foreground/60 pb-3 mb-4 border-b border-foreground/25">
              Role distribution
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} · ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: chartLine }}
                    stroke="hsl(40 33% 92%)"
                    strokeWidth={2}
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? inkFill : index === 1 ? vermFill : "hsl(30 12% 10% / 0.55)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="border-2 border-foreground p-6 mt-8">
          <div className="mono-label text-foreground/60 pb-3 mb-4 border-b border-foreground/25">
            Platform activity · Cumulative
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical">
                <CartesianGrid strokeDasharray="1 3" stroke={chartLine} />
                <XAxis type="number" tick={chartAxis} />
                <YAxis type="category" dataKey="name" tick={chartAxis} width={140} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="value" fill={inkFill} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DashSection>

      <DashSection eyebrow="§ III · Common entries" title="Where you likely wanted to go">
        <div className="grid md:grid-cols-3 border-t-2 border-foreground border-b border-foreground/40">
          {[
            { n: "01", title: "Manage users", body: "View, edit, and moderate user accounts.", href: "/dashboard/admin/users" },
            { n: "02", title: "TalentVisa review", body: "Review and approve premium nominations.", href: "/dashboard/admin/talentvisa" },
            { n: "03", title: "View reports", body: "Platform analytics and insights.", href: "/dashboard/admin/reports" },
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
              <h3 className="display-serif text-2xl text-foreground mb-3 group-hover:italic transition-all">
                {q.title}
              </h3>
              <p className="text-foreground/75 text-[0.9375rem] mb-5">{q.body}</p>
              <span className="mono-label text-foreground group-hover:ink-vermilion transition-colors">
                Enter →
              </span>
            </Link>
          ))}
        </div>
      </DashSection>

      <DashSection
        eyebrow="§ IV · Recent users"
        title="Newest entries in the register"
        actions={
          <Link to="/dashboard/admin/users">
            <span className="mono-label text-foreground hover:ink-vermilion underline underline-offset-4">
              View all →
            </span>
          </Link>
        }
      >
        <div className="border-t-2 border-foreground">
          {recentActivity.map((user, i) => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 py-4 px-2 md:px-4 border-b border-foreground/20 items-center row-hover"
            >
              <div className="col-span-1 mono-label text-foreground/40">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-foreground/25" />
                ) : (
                  <div className="w-9 h-9 rounded-full border border-foreground flex items-center justify-center display-serif text-foreground">
                    {user.first_name?.[0]}
                    {user.last_name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="display-serif text-base text-foreground truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="mono-label text-foreground/50 truncate normal-case">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="col-span-3 md:col-span-4">
                <LedgerBadge variant="outline">{user.role}</LedgerBadge>
              </div>
              <div className="col-span-3 mono-num text-foreground/50 text-xs text-right">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      </DashSection>
    </div>
  );
};

// Users Management component
interface UserWithProfile extends Profile {
  candidate_profile?: CandidateProfile;
  mentor_profile?: MentorProfile;
  employer_profile?: EmployerProfile;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    headline: "",
    bio: "",
    location: "",
  });
  const [newRole, setNewRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setUsers(data || []);
      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u))
    );
  };

  const openViewModal = (user: UserWithProfile) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const openEditModal = (user: UserWithProfile) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      headline: user.headline || "",
      bio: user.bio || "",
      location: user.location || "",
    });
    setShowEditModal(true);
  };

  const openRoleModal = (user: UserWithProfile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const saveProfile = async () => {
    if (!selectedUser) return;
    setIsSaving(true);

    await supabase
      .from("profiles")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        headline: editForm.headline || null,
        bio: editForm.bio || null,
        location: editForm.location || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedUser.id);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? { ...u, ...editForm, headline: editForm.headline || null, bio: editForm.bio || null, location: editForm.location || null }
          : u
      )
    );

    setIsSaving(false);
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const changeRole = async () => {
    if (!selectedUser || newRole === selectedUser.role) return;
    setIsSaving(true);

    await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", selectedUser.id);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, role: newRole as Profile["role"] } : u
      )
    );

    setIsSaving(false);
    setShowRoleModal(false);
    setSelectedUser(null);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      candidate: "bg-foreground/[0.06] text-foreground",
      mentor: "bg-foreground/[0.06] ink-vermilion",
      employer: "bg-vermilion/10 ink-vermilion",
      admin: "bg-vermilion/15 ink-vermilion",
      school_admin: "bg-foreground/[0.06] text-foreground",
    };
    return styles[role] || "bg-gray-500/20 text-foreground/60";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-foreground/60">View, edit, and manage all platform users.</p>
        </div>
        <div className="text-sm text-foreground/60">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-background border border-foreground/25 text-foreground focus:border-red-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="candidate">Candidates</option>
          <option value="mentor">Mentors</option>
          <option value="employer">Employers</option>
          <option value="school_admin">School Admins</option>
          <option value="admin">Admins</option>
        </select>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl border border-foreground/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-vermilion/15 flex items-center justify-center ink-vermilion text-sm font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-foreground/50">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${getRoleBadge(user.role)}`}>
                        {user.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active ? "bg-foreground/[0.06] text-foreground" : "bg-vermilion/15 ink-vermilion"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground/60">
                      {user.location || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground/60">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewModal(user)}
                          className="text-foreground/60 hover:text-foreground"
                          title="View user"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(user)}
                          className="text-foreground hover:text-foreground"
                          title="Edit profile"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRoleModal(user)}
                          className="ink-vermilion hover:text-purple-300"
                          title="Change role"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={user.is_active ? "ink-vermilion hover:ink-vermilion" : "text-foreground hover:text-emerald-300"}
                          title={user.is_active ? "Deactivate" : "Activate"}
                        >
                          {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setShowViewModal(false); setSelectedUser(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">User Details</h3>
              <button onClick={() => { setShowViewModal(false); setSelectedUser(null); }} className="text-foreground/60 hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-vermilion/15 flex items-center justify-center ink-vermilion font-bold text-xl">
                  {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-foreground">{selectedUser.first_name} {selectedUser.last_name}</p>
                <p className="text-sm text-foreground/60">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${getRoleBadge(selectedUser.role)}`}>
                    {selectedUser.role?.replace("_", " ")}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${selectedUser.is_active ? "bg-foreground/[0.06] text-foreground" : "bg-vermilion/15 ink-vermilion"}`}>
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {selectedUser.headline && (
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Headline</p>
                  <p className="text-sm text-foreground/75">{selectedUser.headline}</p>
                </div>
              )}
              {selectedUser.bio && (
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Bio</p>
                  <p className="text-sm text-foreground/75">{selectedUser.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Location</p>
                  <p className="text-sm text-foreground/75">{selectedUser.location || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Onboarding</p>
                  <p className="text-sm text-foreground/75">{selectedUser.onboarding_completed ? "Completed" : "Incomplete"}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Joined</p>
                  <p className="text-sm text-foreground/75">{new Date(selectedUser.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Last Updated</p>
                  <p className="text-sm text-foreground/75">{new Date(selectedUser.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowViewModal(false); openEditModal(selectedUser); }}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowViewModal(false); openRoleModal(selectedUser); }}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
              >
                <Shield className="w-4 h-4 mr-2" />
                Change Role
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Edit Profile</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-foreground/60 hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Headline</label>
                <input
                  type="text"
                  value={editForm.headline}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="e.g. Software Engineer"
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. New York, NY"
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  placeholder="Short bio..."
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfile}
                disabled={isSaving || !editForm.first_name || !editForm.last_name || !editForm.email}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setShowRoleModal(false); setSelectedUser(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Change Role</h3>
              <button onClick={() => { setShowRoleModal(false); setSelectedUser(null); }} className="text-foreground/60 hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-foreground/60 mb-4">
              Change the role for <span className="text-foreground font-medium">{selectedUser.first_name} {selectedUser.last_name}</span>
            </p>

            <div className="space-y-2 mb-6">
              {[
                { value: "candidate", label: "Candidate", desc: "Job seeker building their profile", icon: UserCheck, color: "emerald" },
                { value: "mentor", label: "Mentor", desc: "Guides and evaluates candidates", icon: GraduationCap, color: "purple" },
                { value: "employer", label: "Employer", desc: "Hiring manager or recruiter", icon: Building2, color: "amber" },
                { value: "school_admin", label: "School Admin", desc: "Manages school cohorts", icon: GraduationCap, color: "blue" },
                { value: "admin", label: "Admin", desc: "Full platform access", icon: Shield, color: "red" },
              ].map((role) => (
                <button
                  key={role.value}
                  onClick={() => setNewRole(role.value)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    newRole === role.value
                      ? `bg-${role.color}-500/20 border-${role.color}-500/50`
                      : "bg-background border-foreground/15 hover:border-foreground/25"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-${role.color}-500/20 flex items-center justify-center`}>
                    <role.icon className={`w-4 h-4 text-${role.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${newRole === role.value ? "text-foreground" : "text-foreground/75"}`}>{role.label}</p>
                    <p className="text-xs text-foreground/50">{role.desc}</p>
                  </div>
                  {newRole === role.value && <CheckCircle className="w-5 h-5 text-foreground" />}
                  {selectedUser.role === role.value && newRole !== role.value && (
                    <span className="text-xs text-foreground/50">Current</span>
                  )}
                </button>
              ))}
            </div>

            {newRole !== selectedUser.role && (
              <div className="p-3 rounded-lg bg-vermilion/10 border border-vermilion mb-4">
                <p className="text-xs ink-vermilion">
                  Changing role from <span className="font-bold capitalize">{selectedUser.role?.replace("_", " ")}</span> to <span className="font-bold capitalize">{newRole.replace("_", " ")}</span>. This will affect the user's dashboard and permissions.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowRoleModal(false); setSelectedUser(null); }}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
              >
                Cancel
              </Button>
              <Button
                onClick={changeRole}
                disabled={isSaving || newRole === selectedUser.role}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Update Role
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// TalentVisa Review component
interface NominationWithDetails extends TalentVisaNomination {
  candidate?: Profile;
  mentor?: Profile;
}

const TalentVisaReview = () => {
  const { user } = useAuth();
  const [nominations, setNominations] = useState<NominationWithDetails[]>([]);
  const [quotas, setQuotas] = useState<TalentVisaQuota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedNomination, setSelectedNomination] = useState<NominationWithDetails | null>(null);
  const [selectedTier, setSelectedTier] = useState<TalentVisaTier>("bronze");
  const [showQuotaSettings, setShowQuotaSettings] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch nominations
      let query = supabase
        .from("talentvisa_nominations")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;

      if (data) {
        const enriched = await Promise.all(
          data.map(async (nom) => {
            const { data: candidate } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", nom.candidate_id)
              .single();

            const { data: mentor } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", nom.nominating_mentor_id)
              .single();

            // Fetch behavioral score
            const { data: passport } = await supabase
              .from("skill_passports")
              .select("behavioral_scores")
              .eq("candidate_id", nom.candidate_id)
              .eq("is_active", true)
              .maybeSingle();

            let avgScore = 0;
            if (passport?.behavioral_scores) {
              const scores = Object.values(passport.behavioral_scores as Record<string, number>);
              avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            }

            return { ...nom, candidate, mentor, behavioral_score: avgScore };
          })
        );
        setNominations(enriched);
      }

      // Fetch current month quotas
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: quotaData } = await supabase
        .from("talentvisa_quotas")
        .select("*")
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd);

      if (quotaData) {
        setQuotas(quotaData);
      } else {
        // Create default quotas if none exist
        const defaultQuotas: Omit<TalentVisaQuota, "id" | "created_at" | "updated_at">[] = [
          { period: "monthly", tier: "gold", max_approvals: 5, current_approvals: 0, period_start: monthStart, period_end: monthEnd },
          { period: "monthly", tier: "silver", max_approvals: 15, current_approvals: 0, period_start: monthStart, period_end: monthEnd },
          { period: "monthly", tier: "bronze", max_approvals: 30, current_approvals: 0, period_start: monthStart, period_end: monthEnd },
        ];

        for (const q of defaultQuotas) {
          await supabase.from("talentvisa_quotas").insert(q);
        }

        const { data: newQuotas } = await supabase
          .from("talentvisa_quotas")
          .select("*")
          .gte("period_start", monthStart);
        setQuotas(newQuotas || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [filter]);

  const getQuotaForTier = (tier: TalentVisaTier) => {
    return quotas.find(q => q.tier === tier) || { max_approvals: 0, current_approvals: 0 };
  };

  const isQuotaExceeded = (tier: TalentVisaTier) => {
    const quota = getQuotaForTier(tier);
    return quota.current_approvals >= quota.max_approvals;
  };

  const getSuggestedTier = (score: number): TalentVisaTier => {
    if (score >= TIER_CONFIG.gold.minScore) return "gold";
    if (score >= TIER_CONFIG.silver.minScore) return "silver";
    return "bronze";
  };

  const openApprovalModal = (nomination: NominationWithDetails) => {
    setSelectedNomination(nomination);
    setSelectedTier(getSuggestedTier(nomination.behavioral_score || 0));
    setShowApprovalModal(true);
  };

  const reviewNomination = async (nominationId: string, decision: "approved" | "rejected", tier?: TalentVisaTier) => {
    if (!user?.id) return;

    const updateData: any = {
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (decision === "approved" && tier) {
      updateData.tier = tier;

      // Update quota
      const quota = getQuotaForTier(tier);
      if (quota) {
        await supabase
          .from("talentvisa_quotas")
          .update({ current_approvals: (quota.current_approvals || 0) + 1 })
          .eq("tier", tier)
          .gte("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        setQuotas(prev =>
          prev.map(q => q.tier === tier ? { ...q, current_approvals: (q.current_approvals || 0) + 1 } : q)
        );
      }
    }

    await supabase
      .from("talentvisa_nominations")
      .update(updateData)
      .eq("id", nominationId);

    // If approved, update candidate
    const nomination = nominations.find(n => n.id === nominationId);
    if (decision === "approved" && nomination) {
      await supabase
        .from("candidate_profiles")
        .update({ has_talentvisa: true })
        .eq("profile_id", nomination.candidate_id);

      // Send notification with tier info
      await supabase.from("notifications").insert({
        user_id: nomination.candidate_id,
        type: "talentvisa_approved",
        title: `TalentVisa ${TIER_CONFIG[tier || "bronze"].label} Approved!`,
        message: `Congratulations! You've been awarded a ${TIER_CONFIG[tier || "bronze"].label} TalentVisa. You now have access to premium opportunities.`,
        metadata: { tier },
      });
    }

    setNominations((prev) =>
      prev.map((n) => (n.id === nominationId ? { ...n, status: decision, tier } : n))
    );

    setShowApprovalModal(false);
    setSelectedNomination(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">TalentVisa Review</h1>
          <p className="text-foreground/60">Review and approve TalentVisa nominations with tier assignment.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowQuotaSettings(!showQuotaSettings)}
          className="border-foreground/25 text-foreground hover:bg-foreground/5"
        >
          <Target className="w-4 h-4 mr-2" />
          Quota Settings
        </Button>
      </motion.div>

      {/* Quota Overview */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        {(["gold", "silver", "bronze"] as TalentVisaTier[]).map((tier) => {
          const config = TIER_CONFIG[tier];
          const quota = getQuotaForTier(tier);
          const TierIcon = config.icon;
          const percentage = quota.max_approvals > 0
            ? Math.round((quota.current_approvals / quota.max_approvals) * 100)
            : 0;
          const isExceeded = isQuotaExceeded(tier);

          return (
            <div
              key={tier}
              className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <TierIcon className={`w-6 h-6 ${config.color}`} />
                <div>
                  <p className={`font-semibold ${config.color}`}>{config.label} Tier</p>
                  <p className="text-xs text-foreground/60">{config.description}</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/60">Monthly Quota</span>
                  <span className={isExceeded ? "ink-vermilion" : "text-foreground"}>
                    {quota.current_approvals} / {quota.max_approvals}
                  </span>
                </div>
                <div className="h-2 bg-background/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExceeded ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
              {isExceeded && (
                <p className="text-xs ink-vermilion flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Quota reached for this month
                </p>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filter === f
                ? "bg-red-600 text-foreground"
                : "bg-background text-foreground/60 hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </motion.div>

      {/* Nominations List */}
      <motion.div variants={itemVariants}>
        {nominations.length > 0 ? (
          <div className="space-y-4">
            {nominations.map((nomination) => {
              const suggestedTier = getSuggestedTier(nomination.behavioral_score || 0);
              const tierConfig = nomination.tier ? TIER_CONFIG[nomination.tier as TalentVisaTier] : null;
              const TierIcon = tierConfig?.icon;

              return (
                <div
                  key={nomination.id}
                  className={`p-6 rounded-xl border transition-colors ${
                    nomination.status === "pending"
                      ? "bg-vermilion/10 border-vermilion"
                      : nomination.status === "approved"
                      ? "bg-foreground/[0.06] border-foreground/40"
                      : "bg-vermilion/15 border-vermilion"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {nomination.candidate?.avatar_url ? (
                        <img
                          src={nomination.candidate.avatar_url}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-vermilion/10 flex items-center justify-center ink-vermilion font-bold text-lg">
                          {nomination.candidate?.first_name?.[0]}{nomination.candidate?.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-lg">
                          {nomination.candidate?.first_name} {nomination.candidate?.last_name}
                        </p>
                        <p className="text-sm text-foreground/60">
                          Nominated by {nomination.mentor?.first_name} {nomination.mentor?.last_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-foreground/50">
                            {new Date(nomination.created_at).toLocaleDateString()}
                          </span>
                          {nomination.behavioral_score !== undefined && nomination.behavioral_score > 0 && (
                            <span className="text-xs ink-vermilion flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Score: {nomination.behavioral_score.toFixed(1)}/5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        nomination.status === "pending"
                          ? "bg-vermilion/10 ink-vermilion"
                          : nomination.status === "approved"
                          ? "bg-foreground/[0.06] text-foreground"
                          : "bg-vermilion/15 ink-vermilion"
                      }`}>
                        {nomination.status}
                      </span>
                      {nomination.tier && tierConfig && TierIcon && (
                        <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${tierConfig.bgColor} ${tierConfig.color}`}>
                          <TierIcon className="w-3 h-3" />
                          {tierConfig.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background/20 mb-4">
                    <p className="text-sm text-foreground/60 mb-1">Justification</p>
                    <p className="text-foreground/75">{nomination.justification}</p>
                  </div>

                  {nomination.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 rounded-lg bg-background border border-foreground/25">
                        <p className="text-xs text-foreground/60 mb-1">Suggested Tier</p>
                        <p className={`font-medium ${TIER_CONFIG[suggestedTier].color}`}>
                          {TIER_CONFIG[suggestedTier].label} (min score: {TIER_CONFIG[suggestedTier].minScore})
                        </p>
                      </div>
                      <Button
                        onClick={() => openApprovalModal(nomination)}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => reviewNomination(nomination.id, "rejected")}
                        variant="outline"
                        className="border-vermilion ink-vermilion hover:bg-vermilion/15"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <Award className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No {filter !== "all" ? filter : ""} nominations</p>
          </div>
        )}
      </motion.div>

      {/* Tier Selection Modal */}
      {showApprovalModal && selectedNomination && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowApprovalModal(false);
            setSelectedNomination(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">Approve TalentVisa</h3>
            <p className="text-foreground/60 mb-6">
              Select a tier for {selectedNomination.candidate?.first_name} {selectedNomination.candidate?.last_name}
            </p>

            <div className="space-y-3 mb-6">
              {(["gold", "silver", "bronze"] as TalentVisaTier[]).map((tier) => {
                const config = TIER_CONFIG[tier];
                const TierIcon = config.icon;
                const quota = getQuotaForTier(tier);
                const exceeded = isQuotaExceeded(tier);
                const isSelected = selectedTier === tier;

                return (
                  <button
                    key={tier}
                    onClick={() => !exceeded && setSelectedTier(tier)}
                    disabled={exceeded}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      exceeded
                        ? "opacity-50 cursor-not-allowed bg-foreground/[0.06]/50 border-foreground/25"
                        : isSelected
                        ? `${config.bgColor} ${config.borderColor} border-2`
                        : "bg-background border-foreground/25 hover:border-foreground/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <TierIcon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${isSelected ? config.color : "text-foreground"}`}>
                            {config.label} Tier
                          </p>
                          <p className="text-xs text-foreground/60">{config.description}</p>
                          <p className="text-xs text-foreground/50 mt-1">
                            Min Score: {config.minScore}/5 | Quota: {quota.current_approvals}/{quota.max_approvals}
                          </p>
                        </div>
                      </div>
                      {isSelected && !exceeded && (
                        <CheckCircle className={`w-5 h-5 ${config.color}`} />
                      )}
                      {exceeded && (
                        <Lock className="w-5 h-5 text-foreground/50" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedNomination.behavioral_score !== undefined && selectedNomination.behavioral_score > 0 && (
              <div className="p-3 rounded-lg bg-indigo-500/30 border border-indigo-500/20 mb-6">
                <p className="text-sm ink-vermilion">
                  Candidate's behavioral score is <span className="font-bold">{selectedNomination.behavioral_score.toFixed(1)}/5</span>.
                  Suggested tier: <span className="font-bold">{TIER_CONFIG[getSuggestedTier(selectedNomination.behavioral_score)].label}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedNomination(null);
                }}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
              >
                Cancel
              </Button>
              <Button
                onClick={() => reviewNomination(selectedNomination.id, "approved", selectedTier)}
                disabled={isQuotaExceeded(selectedTier)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve as {TIER_CONFIG[selectedTier].label}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Employers Management
const EmployersManagement = () => {
  const [employers, setEmployers] = useState<(EmployerProfile & { profile?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployers = async () => {
      const { data } = await supabase
        .from("employer_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        const enriched = await Promise.all(
          data.map(async (emp) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", emp.profile_id)
              .single();
            return { ...emp, profile };
          })
        );
        setEmployers(enriched);
      }

      setIsLoading(false);
    };

    fetchEmployers();
  }, []);

  const verifyEmployer = async (employerId: string, isVerified: boolean) => {
    await supabase
      .from("employer_profiles")
      .update({ is_verified: !isVerified })
      .eq("id", employerId);

    setEmployers((prev) =>
      prev.map((e) => (e.id === employerId ? { ...e, is_verified: !isVerified } : e))
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Employer Management</h1>
        <p className="text-foreground/60">Verify and manage employer accounts.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {employers.length > 0 ? (
          <div className="space-y-3">
            {employers.map((employer) => (
              <div
                key={employer.id}
                className="p-4 rounded-xl bg-background border border-foreground/25 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {employer.company_logo_url ? (
                    <img
                      src={employer.company_logo_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-vermilion/10 flex items-center justify-center ink-vermilion font-bold">
                      {employer.company_name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{employer.company_name}</p>
                    <p className="text-sm text-foreground/60">
                      {employer.profile?.first_name} {employer.profile?.last_name} - {employer.industry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    employer.is_verified
                      ? "bg-foreground/[0.06] text-foreground"
                      : "bg-vermilion/10 ink-vermilion"
                  }`}>
                    {employer.is_verified ? "Verified" : "Unverified"}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => verifyEmployer(employer.id, employer.is_verified)}
                    className={employer.is_verified ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}
                  >
                    {employer.is_verified ? "Unverify" : "Verify"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <Building2 className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No employers registered yet</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Schools Management
const SchoolsManagement = () => {
  const [schools, setSchools] = useState<(SchoolProfile & { profile?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from("school_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        const enriched = await Promise.all(
          data.map(async (school) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", school.profile_id)
              .single();
            return { ...school, profile };
          })
        );
        setSchools(enriched);
      }

      setIsLoading(false);
    };

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((s) => {
    if (!searchQuery) return true;
    return (
      s.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const verifySchool = async (schoolId: string, isVerified: boolean) => {
    await supabase
      .from("school_profiles")
      .update({ is_verified: !isVerified })
      .eq("id", schoolId);

    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, is_verified: !isVerified } : s))
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Schools Management</h1>
          <p className="text-foreground/60">Manage and verify school accounts.</p>
        </div>
        <div className="text-sm text-foreground/60">{schools.length} school{schools.length !== 1 ? "s" : ""}</div>
      </motion.div>

      {schools.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schools..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-red-500 focus:outline-none"
            />
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-background border border-foreground/25">
          <p className="text-2xl font-bold text-foreground">{schools.length}</p>
          <p className="text-xs text-foreground/60">Total Schools</p>
        </div>
        <div className="p-4 rounded-xl bg-background border border-foreground/25">
          <p className="text-2xl font-bold text-foreground">{schools.filter((s) => s.is_verified).length}</p>
          <p className="text-xs text-foreground/60">Verified</p>
        </div>
        <div className="p-4 rounded-xl bg-background border border-foreground/25">
          <p className="text-2xl font-bold ink-vermilion">{schools.filter((s) => !s.is_verified).length}</p>
          <p className="text-xs text-foreground/60">Pending Verification</p>
        </div>
        <div className="p-4 rounded-xl bg-background border border-foreground/25">
          <p className="text-2xl font-bold text-foreground">{schools.reduce((sum, s) => sum + (s.total_students || 0), 0)}</p>
          <p className="text-xs text-foreground/60">Total Students</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {filteredSchools.length > 0 ? (
          <div className="space-y-3">
            {filteredSchools.map((school) => (
              <div
                key={school.id}
                className="p-5 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold text-lg">
                      {school.school_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-lg">{school.school_name}</p>
                      <p className="text-sm text-foreground/60">
                        {school.profile?.first_name} {school.profile?.last_name} &middot; {school.profile?.email}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-foreground/50">
                        <span className="capitalize">{school.school_type?.replace("_", " ")}</span>
                        {school.district && <span>{school.district}</span>}
                        <span>{school.total_students || 0} students</span>
                        <span>{school.active_cohorts || 0} cohorts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      school.is_verified ? "bg-foreground/[0.06] text-foreground" : "bg-vermilion/10 ink-vermilion"
                    }`}>
                      {school.is_verified ? "Verified" : "Unverified"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => verifySchool(school.id, school.is_verified)}
                      className={school.is_verified ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}
                    >
                      {school.is_verified ? "Unverify" : "Verify"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <GraduationCap className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">{searchQuery ? "No schools match your search" : "No schools registered yet"}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Reports component
const Reports = () => {
  const [reportStats, setReportStats] = useState({
    passports: 0,
    observations: 0,
    projects: 0,
    connections: 0,
    candidates: 0,
    mentors: 0,
    employers: 0,
    schools: 0,
    totalUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);
  const [activityTrend, setActivityTrend] = useState<{ name: string; observations: number; connections: number }[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      const [
        { count: passportCount },
        { count: observationCount },
        { count: projectCount },
        { count: connectionCount },
        { count: candidateCount },
        { count: mentorCount },
        { count: employerCount },
        { count: schoolCount },
        { count: userCount },
      ] = await Promise.all([
        supabase.from("skill_passports").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("mentor_observations").select("*", { count: "exact", head: true }),
        supabase.from("liveworks_projects").select("*", { count: "exact", head: true }),
        supabase.from("t3x_connections").select("*", { count: "exact", head: true }),
        supabase.from("candidate_profiles").select("*", { count: "exact", head: true }),
        supabase.from("mentor_profiles").select("*", { count: "exact", head: true }),
        supabase.from("employer_profiles").select("*", { count: "exact", head: true }),
        supabase.from("school_profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      setReportStats({
        passports: passportCount || 0,
        observations: observationCount || 0,
        projects: projectCount || 0,
        connections: connectionCount || 0,
        candidates: candidateCount || 0,
        mentors: mentorCount || 0,
        employers: employerCount || 0,
        schools: schoolCount || 0,
        totalUsers: userCount || 0,
      });

      setRoleData([
        { name: "Candidates", value: candidateCount || 0 },
        { name: "Mentors", value: mentorCount || 0 },
        { name: "Employers", value: employerCount || 0 },
        { name: "Schools", value: schoolCount || 0 },
      ]);

      // Build a monthly trend for the last 6 months
      const months: typeof activityTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString("en-US", { month: "short" });
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();

        const [{ count: obsC }, { count: conC }] = await Promise.all([
          supabase.from("mentor_observations").select("*", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
          supabase.from("t3x_connections").select("*", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
        ]);
        months.push({ name: label, observations: obsC || 0, connections: conC || 0 });
      }
      setActivityTrend(months);

      setIsLoading(false);
    };

    fetchReportData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
      </div>
    );
  }

  const total = reportStats.totalUsers || 1;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
        <p className="text-foreground/60">Platform performance and real-time insights.</p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Behavioral Evidence Reports", value: reportStats.passports, icon: Shield, color: "ink-vermilion" },
          { label: "Mentor Observations", value: reportStats.observations, icon: Eye, color: "ink-vermilion" },
          { label: "Projects", value: reportStats.projects, icon: Briefcase, color: "text-foreground" },
          { label: "Connections", value: reportStats.connections, icon: Activity, color: "ink-vermilion" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-background border border-foreground/25">
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-foreground/60">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        {/* Activity Trend Chart */}
        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h3 className="font-semibold text-foreground mb-4">Activity Trend (6 months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }} />
                <Legend />
                <Bar dataKey="observations" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Observations" />
                <Bar dataKey="connections" fill="#ec4899" radius={[4, 4, 0, 0]} name="Connections" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="p-6 rounded-xl bg-background border border-foreground/25">
          <h3 className="font-semibold text-foreground mb-4">User Distribution</h3>
          <div className="space-y-4">
            {[
              { role: "Candidates", count: reportStats.candidates, color: "bg-emerald-500" },
              { role: "Mentors", count: reportStats.mentors, color: "bg-purple-500" },
              { role: "Employers", count: reportStats.employers, color: "bg-amber-500" },
              { role: "Schools", count: reportStats.schools, color: "bg-blue-500" },
            ].map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground/60">{item.role}</span>
                    <span className="text-foreground">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-foreground/15">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#6b7280" }}>
                    {roleData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Communications component - Admin email/notification sending
const CommunicationsPage = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendType, setSendType] = useState<"email" | "notification" | "both">("notification");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(data || []);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === "all" || u.role === selectedRole;
    const matchesSearch =
      !searchQuery ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const sendCommunication = async () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one recipient");
      return;
    }

    setIsSending(true);
    try {
      // Send notifications
      if (sendType === "notification" || sendType === "both") {
        const notifications = selectedUsers.map((userId) => ({
          user_id: userId,
          type: "admin_message",
          title: notificationTitle || subject || "Message from Admin",
          message: notificationMessage || message,
          priority: "high" as const,
          action_type: "announcement",
        }));

        await supabase.from("notifications").insert(notifications);
      }

      // Queue emails
      if (sendType === "email" || sendType === "both") {
        const selectedUserData = users.filter((u) => selectedUsers.includes(u.id));
        const emails = selectedUserData.map((u) => ({
          to_email: u.email,
          to_name: `${u.first_name} ${u.last_name}`,
          template: "admin_message",
          template_data: {
            subject: subject || notificationTitle || "Message from The 3rd Academy",
            body: message || notificationMessage,
          },
          status: "pending",
        }));

        await supabase.from("email_queue").insert(emails);
      }

      alert(`Successfully sent to ${selectedUsers.length} user(s)!`);
      setSelectedUsers([]);
      setSubject("");
      setMessage("");
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      console.error("Error sending:", error);
      alert("Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin ink-vermilion" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Communications</h1>
        <p className="text-foreground/60">Send emails and notifications to users.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* User Selection */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
          <h2 className="text-lg font-semibold text-foreground mb-4">Select Recipients</h2>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-background border border-foreground/25 rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="all" className="bg-background/50">All Roles</option>
              <option value="candidate" className="bg-background/50">Candidates</option>
              <option value="mentor" className="bg-background/50">Mentors</option>
              <option value="employer" className="bg-background/50">Employers</option>
              <option value="school_admin" className="bg-background/50">School Admins</option>
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-foreground/25 rounded-lg pl-10 pr-4 py-2 text-foreground placeholder:text-foreground/50 text-sm"
              />
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-foreground/25">
            <button
              onClick={selectAll}
              className="text-sm ink-vermilion hover:ink-vermilion"
            >
              {selectedUsers.length === filteredUsers.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-sm text-foreground/50">
              {selectedUsers.length} of {filteredUsers.length} selected
            </span>
          </div>

          {/* User List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredUsers.map((user) => (
              <label
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? "bg-vermilion/15 border border-vermilion"
                    : "bg-background hover:bg-foreground/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                  className="rounded border-foreground/25"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-foreground/50 truncate">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-background text-foreground/60 capitalize">
                  {user.role}
                </span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Message Composition */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
          <h2 className="text-lg font-semibold text-foreground mb-4">Compose Message</h2>

          {/* Send Type */}
          <div className="mb-6">
            <label className="block text-sm text-foreground/60 mb-2">Send as</label>
            <div className="flex gap-2">
              {[
                { value: "notification", label: "In-App Notification", icon: Bell },
                { value: "email", label: "Email", icon: Mail },
                { value: "both", label: "Both", icon: Send },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSendType(option.value as typeof sendType)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    sendType === option.value
                      ? "bg-vermilion/15 border-vermilion text-foreground"
                      : "border-foreground/25 text-foreground/60 hover:bg-foreground/5"
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Fields */}
          {(sendType === "notification" || sendType === "both") && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Notification Title</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Important Update"
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/50"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Notification Message</label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter your notification message..."
                  rows={3}
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/50 resize-none"
                />
              </div>
            </div>
          )}

          {/* Email Fields */}
          {(sendType === "email" || sendType === "both") && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/50"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Email Body</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your email message..."
                  rows={5}
                  className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/50 resize-none"
                />
              </div>
            </div>
          )}

          <Button
            onClick={sendCommunication}
            disabled={isSending || selectedUsers.length === 0}
            className="w-full bg-red-600 hover:bg-red-500 text-foreground"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedUsers.length} User{selectedUsers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Settings component
const SettingsPage = () => {
  const [platformName, setPlatformName] = useState("The 3rd Academy");
  const [supportEmail, setSupportEmail] = useState("support@the3rdacademy.com");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [autoApproveEmployers, setAutoApproveEmployers] = useState(false);
  const [autoApproveSchools, setAutoApproveSchools] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch = ({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-foreground/15">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-foreground/60">{description}</p>
      </div>
      <button onClick={onToggle} className="flex-shrink-0">
        {enabled ? (
          <ToggleRight className="w-10 h-10 text-foreground" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-foreground/50" />
        )}
      </button>
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Settings</h1>
          <p className="text-foreground/60">Platform configuration and preferences.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`${saved ? "bg-emerald-600" : "bg-red-600 hover:bg-red-500"}`}
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Saved</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Settings</>
          )}
        </Button>
      </motion.div>

      {/* General Settings */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">General</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-foreground/60 mb-1">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full max-w-md bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground/60 mb-1">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full max-w-md bg-background border border-foreground/25 rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Access Control */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 ink-vermilion" />
          <h2 className="text-lg font-semibold text-foreground">Access Control</h2>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={registrationOpen}
            onToggle={() => setRegistrationOpen(!registrationOpen)}
            label="Open Registration"
            description="Allow new users to sign up for the platform"
          />
          <ToggleSwitch
            enabled={maintenanceMode}
            onToggle={() => setMaintenanceMode(!maintenanceMode)}
            label="Maintenance Mode"
            description="Temporarily disable platform access for non-admins"
          />
        </div>
      </motion.div>

      {/* Approvals */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Auto-Approval</h2>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={autoApproveEmployers}
            onToggle={() => setAutoApproveEmployers(!autoApproveEmployers)}
            label="Auto-Approve Employers"
            description="Automatically verify employer accounts upon registration"
          />
          <ToggleSwitch
            enabled={autoApproveSchools}
            onToggle={() => setAutoApproveSchools(!autoApproveSchools)}
            label="Auto-Approve Schools"
            description="Automatically verify school accounts upon registration"
          />
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-vermilion/15 border border-vermilion">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 ink-vermilion" />
          <h2 className="text-lg font-semibold ink-vermilion">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-vermilion">
            <div>
              <p className="font-medium text-foreground">Reset All Notifications</p>
              <p className="text-sm text-foreground/60">Clear all pending notifications across the platform</p>
            </div>
            <Button variant="outline" className="border-vermilion ink-vermilion hover:bg-vermilion/15">
              Reset
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-vermilion">
            <div>
              <p className="font-medium text-foreground">Purge Inactive Users</p>
              <p className="text-sm text-foreground/60">Remove users who haven't logged in for 6+ months</p>
            </div>
            <Button variant="outline" className="border-vermilion ink-vermilion hover:bg-vermilion/15">
              Purge
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GoogleAuthLink />
      </motion.div>
    </motion.div>
  );
};

// Main Dashboard component
const ADMIN_SECTIONS: DashboardSection[] = [
  { id: "main", label: "§ I · Administration" },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };
    fetchNotifications();
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

  const navWithSection: DashboardNavItem[] = navItems.map((n) => ({
    ...n,
    section: "main",
  }));

  return (
    <DashboardLayout
      role="Administrator"
      roleTagline="You keep the register itself in good order — governance for the governance."
      nav={navWithSection}
      sections={ADMIN_SECTIONS}
      notifications={notifications}
      onMarkNotificationRead={markAsRead}
      onMarkAllRead={markAllAsRead}
      notificationsHref="/dashboard/admin"
    >
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="talentvisa" element={<TalentVisaReview />} />
        <Route path="employers" element={<EmployersManagement />} />
        <Route path="schools" element={<SchoolsManagement />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="evidence-review" element={<EvidenceReview />} />
        <Route path="d1-issuance" element={<D1IssuanceCoordinator />} />
        <Route path="agent" element={<AIAgent />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

// legacy shell removed

export default AdminDashboard;
