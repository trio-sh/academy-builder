import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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
  Database,
  FileText,
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
} from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type TalentVisaNomination = Database["public"]["Tables"]["talentvisa_nominations"]["Row"];
type TalentVisaQuota = Database["public"]["Tables"]["talentvisa_quotas"]["Row"];
type TalentVisaTier = "gold" | "silver" | "bronze";

// Tier configuration
const TIER_CONFIG = {
  gold: {
    label: "Gold",
    icon: Crown,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/30",
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
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Platform management and analytics overview.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
          { label: "Candidates", value: stats.totalCandidates, icon: UserCheck, color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/10" },
          { label: "Mentors", value: stats.totalMentors, icon: GraduationCap, color: "text-purple-400", bg: "from-purple-500/10 to-pink-500/10" },
          { label: "Employers", value: stats.totalEmployers, icon: Building2, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/10" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-6 rounded-xl bg-gradient-to-br ${stat.bg} border border-white/10`}
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Passports", value: stats.totalPassports, icon: Shield, color: "text-indigo-400" },
          { label: "Pending TalentVisa", value: stats.pendingTalentVisas, icon: Award, color: "text-yellow-400" },
          { label: "Active Projects", value: stats.activeProjects, icon: Briefcase, color: "text-cyan-400" },
          { label: "Total Connections", value: stats.totalConnections, icon: Activity, color: "text-pink-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Analytics Charts */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">User Growth (12 Weeks)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={{ stroke: "#4b5563" }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  tickLine={{ stroke: "#4b5563" }}
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
                  dataKey="users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#userGrowthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution Pie Chart */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">User Role Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#6b7280" }}
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Platform Activity Bar Chart */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Platform Activity Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Alerts */}
      {stats.pendingTalentVisas > 0 && (
        <motion.div variants={itemVariants}>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <div className="flex-1">
              <p className="font-medium text-amber-400">Pending Review</p>
              <p className="text-sm text-gray-400">
                {stats.pendingTalentVisas} TalentVisa nomination{stats.pendingTalentVisas !== 1 ? "s" : ""} awaiting review.
              </p>
            </div>
            <Link to="/dashboard/admin/talentvisa">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500">
                Review Now
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/admin/users"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
          >
            <Users className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Manage Users</h3>
            <p className="text-sm text-gray-400">View, edit, and moderate user accounts</p>
            <ChevronRight className="w-5 h-5 text-blue-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/dashboard/admin/talentvisa"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
          >
            <Award className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">TalentVisa Review</h3>
            <p className="text-sm text-gray-400">Review and approve premium nominations</p>
            <ChevronRight className="w-5 h-5 text-yellow-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/dashboard/admin/reports"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
          >
            <FileText className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">View Reports</h3>
            <p className="text-sm text-gray-400">Platform analytics and insights</p>
            <ChevronRight className="w-5 h-5 text-purple-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* Recent Users */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Users</h2>
          <Link to="/dashboard/admin/users" className="text-sm text-red-400 hover:text-red-300">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recentActivity.map((user) => (
            <div
              key={user.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  user.role === "candidate" ? "bg-emerald-500/20 text-emerald-400" :
                  user.role === "mentor" ? "bg-purple-500/20 text-purple-400" :
                  user.role === "employer" ? "bg-amber-500/20 text-amber-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {user.role}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-gray-400">View and manage all platform users.</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-red-500 focus:outline-none"
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
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === "candidate" ? "bg-emerald-500/20 text-emerald-400" :
                        user.role === "mentor" ? "bg-purple-500/20 text-purple-400" :
                        user.role === "employer" ? "bg-amber-500/20 text-amber-400" :
                        user.role === "admin" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={user.is_active ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}
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
              .single();

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
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
          <h1 className="text-3xl font-bold text-white mb-2">TalentVisa Review</h1>
          <p className="text-gray-400">Review and approve TalentVisa nominations with tier assignment.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowQuotaSettings(!showQuotaSettings)}
          className="border-white/20 text-white hover:bg-white/10"
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
                  <p className="text-xs text-gray-400">{config.description}</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Monthly Quota</span>
                  <span className={isExceeded ? "text-red-400" : "text-white"}>
                    {quota.current_approvals} / {quota.max_approvals}
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExceeded ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
              {isExceeded && (
                <p className="text-xs text-red-400 flex items-center gap-1">
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
                ? "bg-red-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
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
                      ? "bg-amber-500/5 border-amber-500/20"
                      : nomination.status === "approved"
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-red-500/5 border-red-500/20"
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
                        <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-lg">
                          {nomination.candidate?.first_name?.[0]}{nomination.candidate?.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white text-lg">
                          {nomination.candidate?.first_name} {nomination.candidate?.last_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          Nominated by {nomination.mentor?.first_name} {nomination.mentor?.last_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(nomination.created_at).toLocaleDateString()}
                          </span>
                          {nomination.behavioral_score !== undefined && nomination.behavioral_score > 0 && (
                            <span className="text-xs text-indigo-400 flex items-center gap-1">
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
                          ? "bg-amber-500/20 text-amber-400"
                          : nomination.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
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

                  <div className="p-4 rounded-lg bg-black/20 mb-4">
                    <p className="text-sm text-gray-400 mb-1">Justification</p>
                    <p className="text-gray-300">{nomination.justification}</p>
                  </div>

                  {nomination.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Suggested Tier</p>
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
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
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
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Award className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No {filter !== "all" ? filter : ""} nominations</p>
          </div>
        )}
      </motion.div>

      {/* Tier Selection Modal */}
      {showApprovalModal && selectedNomination && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowApprovalModal(false);
            setSelectedNomination(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-2">Approve TalentVisa</h3>
            <p className="text-gray-400 mb-6">
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
                        ? "opacity-50 cursor-not-allowed bg-gray-800/50 border-gray-700"
                        : isSelected
                        ? `${config.bgColor} ${config.borderColor} border-2`
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <TierIcon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${isSelected ? config.color : "text-white"}`}>
                            {config.label} Tier
                          </p>
                          <p className="text-xs text-gray-400">{config.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Min Score: {config.minScore}/5 | Quota: {quota.current_approvals}/{quota.max_approvals}
                          </p>
                        </div>
                      </div>
                      {isSelected && !exceeded && (
                        <CheckCircle className={`w-5 h-5 ${config.color}`} />
                      )}
                      {exceeded && (
                        <Lock className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedNomination.behavioral_score !== undefined && selectedNomination.behavioral_score > 0 && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-6">
                <p className="text-sm text-indigo-300">
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
                className="flex-1 border-white/20 text-white hover:bg-white/10"
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
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">Employer Management</h1>
        <p className="text-gray-400">Verify and manage employer accounts.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {employers.length > 0 ? (
          <div className="space-y-3">
            {employers.map((employer) => (
              <div
                key={employer.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {employer.company_logo_url ? (
                    <img
                      src={employer.company_logo_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                      {employer.company_name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{employer.company_name}</p>
                    <p className="text-sm text-gray-400">
                      {employer.profile?.first_name} {employer.profile?.last_name} - {employer.industry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    employer.is_verified
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
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
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No employers registered yet</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Schools Management
const SchoolsManagement = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Schools Management</h1>
        <p className="text-gray-400">Manage and verify school accounts.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
        <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No schools registered yet</p>
      </motion.div>
    </motion.div>
  );
};

// Reports component
const Reports = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
        <p className="text-gray-400">Platform performance and insights.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">User Growth (30 days)</h3>
          <div className="h-48 flex items-end gap-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-red-600 to-red-400 rounded-t"
                style={{ height: `${20 + Math.random() * 80}%` }}
              />
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">User Distribution</h3>
          <div className="space-y-4">
            {[
              { role: "Candidates", percent: 60, color: "bg-emerald-500" },
              { role: "Mentors", percent: 20, color: "bg-purple-500" },
              { role: "Employers", percent: 15, color: "bg-amber-500" },
              { role: "Schools", percent: 5, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.role}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{item.role}</span>
                  <span className="text-white">{item.percent}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Skill Passports Issued", value: "1,234", change: "+12%" },
          { label: "Mentor Observations", value: "3,456", change: "+8%" },
          { label: "Project Completions", value: "567", change: "+15%" },
          { label: "Employer Hires", value: "189", change: "+23%" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-xs text-emerald-400 mt-1">{stat.change} this month</p>
          </div>
        ))}
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
          subject: subject || notificationTitle || "Message from The 3rd Academy",
          body: message || notificationMessage,
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
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">Communications</h1>
        <p className="text-gray-400">Send emails and notifications to users.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* User Selection */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Select Recipients</h2>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all" className="bg-gray-900">All Roles</option>
              <option value="candidate" className="bg-gray-900">Candidates</option>
              <option value="mentor" className="bg-gray-900">Mentors</option>
              <option value="employer" className="bg-gray-900">Employers</option>
              <option value="school_admin" className="bg-gray-900">School Admins</option>
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
            <button
              onClick={selectAll}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              {selectedUsers.length === filteredUsers.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-sm text-gray-500">
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
                    ? "bg-red-500/10 border border-red-500/30"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                  className="rounded border-white/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400 capitalize">
                  {user.role}
                </span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Message Composition */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Compose Message</h2>

          {/* Send Type */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Send as</label>
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
                      ? "bg-red-500/20 border-red-500/50 text-white"
                      : "border-white/10 text-gray-400 hover:bg-white/5"
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
                <label className="block text-sm text-gray-400 mb-2">Notification Title</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Important Update"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notification Message</label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter your notification message..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Email Fields */}
          {(sendType === "email" || sendType === "both") && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Body</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your email message..."
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 resize-none"
                />
              </div>
            </div>
          )}

          <Button
            onClick={sendCommunication}
            disabled={isSending || selectedUsers.length === 0}
            className="w-full bg-red-600 hover:bg-red-500 text-white"
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
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
        <p className="text-gray-400">Platform configuration and preferences.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
        <p className="text-gray-400">Admin settings will appear here.</p>
      </motion.div>
    </motion.div>
  );
};

// Main Dashboard component
const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Admin Panel
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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-red-600/20 to-orange-600/20 text-white border border-red-500/30"
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
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-red-400 truncate">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center gap-4 p-4 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <button className="relative text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="talentvisa" element={<TalentVisaReview />} />
            <Route path="employers" element={<EmployersManagement />} />
            <Route path="schools" element={<SchoolsManagement />} />
            <Route path="communications" element={<CommunicationsPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
