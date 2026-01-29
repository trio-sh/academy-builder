import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

const navItems = [
  { name: "Overview", href: "/dashboard/candidate", icon: BarChart3 },
  { name: "Skill Passport", href: "/dashboard/candidate/passport", icon: Award },
  { name: "Growth Log", href: "/dashboard/candidate/growth", icon: TrendingUp },
  { name: "Projects", href: "/dashboard/candidate/projects", icon: Briefcase },
  { name: "Profile", href: "/dashboard/candidate/profile", icon: User },
  { name: "Settings", href: "/dashboard/candidate/settings", icon: Settings },
];

// Overview component
const Overview = () => {
  const { profile } = useAuth();

  const stats = [
    { label: "Current Tier", value: "Not Assessed", icon: Award, color: "from-amber-500 to-orange-500" },
    { label: "Growth Log Entries", value: "0", icon: BarChart3, color: "from-indigo-500 to-purple-500" },
    { label: "Projects Completed", value: "0", icon: Briefcase, color: "from-emerald-500 to-teal-500" },
    { label: "Days Active", value: "1", icon: Clock, color: "from-pink-500 to-rose-500" },
  ];

  const nextSteps = [
    { title: "Complete your profile", description: "Add your skills and experience", completed: false },
    { title: "Upload your resume", description: "Start the credentialing process", completed: false },
    { title: "Get matched with a mentor", description: "Begin MentorLink observations", completed: false },
    { title: "Earn your Skill Passport", description: "Receive your behavioral credential", completed: false },
  ];

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
          {nextSteps.map((step, index) => (
            <div
              key={index}
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
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No recent activity</p>
          <p className="text-sm text-gray-500 mt-1">
            Complete your profile to get started
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Placeholder components for other routes
const SkillPassport = () => (
  <div className="text-center py-20">
    <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Skill Passport</h2>
    <p className="text-gray-400">Complete MentorLink to earn your Skill Passport</p>
  </div>
);

const GrowthLog = () => (
  <div className="text-center py-20">
    <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Growth Log</h2>
    <p className="text-gray-400">Your behavioral growth timeline will appear here</p>
  </div>
);

const Projects = () => (
  <div className="text-center py-20">
    <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">LiveWorks Projects</h2>
    <p className="text-gray-400">Browse and apply for projects to gain experience</p>
  </div>
);

const Profile = () => {
  const { profile } = useAuth();
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Your Profile</h2>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400">Name</p>
          <p className="text-white">{profile?.first_name} {profile?.last_name}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400">Email</p>
          <p className="text-white">{profile?.email}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400">Role</p>
          <p className="text-white capitalize">{profile?.role}</p>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <div className="text-center py-20">
    <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
    <p className="text-gray-400">Account settings coming soon</p>
  </div>
);

const CandidateDashboard = () => {
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium">
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
          <button className="relative text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="passport" element={<SkillPassport />} />
            <Route path="growth" element={<GrowthLog />} />
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
