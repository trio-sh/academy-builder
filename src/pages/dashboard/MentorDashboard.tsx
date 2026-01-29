import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardCheck,
  Calendar,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
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
  { name: "Overview", href: "/dashboard/mentor", icon: TrendingUp },
  { name: "My Mentees", href: "/dashboard/mentor/mentees", icon: Users },
  { name: "Observations", href: "/dashboard/mentor/observations", icon: ClipboardCheck },
  { name: "Schedule", href: "/dashboard/mentor/schedule", icon: Calendar },
  { name: "Profile", href: "/dashboard/mentor/profile", icon: User },
  { name: "Settings", href: "/dashboard/mentor/settings", icon: Settings },
];

const Overview = () => {
  const { profile } = useAuth();

  const stats = [
    { label: "Active Mentees", value: "0", icon: Users, color: "from-indigo-500 to-purple-500" },
    { label: "Total Observations", value: "0", icon: ClipboardCheck, color: "from-emerald-500 to-teal-500" },
    { label: "Endorsements Given", value: "0", icon: CheckCircle, color: "from-amber-500 to-orange-500" },
    { label: "This Month", value: "0 hrs", icon: Clock, color: "from-pink-500 to-rose-500" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {profile?.first_name || "Mentor"}
        </h1>
        <p className="text-gray-400">
          Manage your mentees and track your observations.
        </p>
      </motion.div>

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

      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Pending Actions</h2>
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No pending actions</p>
          <p className="text-sm text-gray-500 mt-1">
            You're all caught up!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Mentees = () => (
  <div className="text-center py-20">
    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">My Mentees</h2>
    <p className="text-gray-400">No mentees assigned yet</p>
  </div>
);

const Observations = () => (
  <div className="text-center py-20">
    <ClipboardCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Observations</h2>
    <p className="text-gray-400">Your observation history will appear here</p>
  </div>
);

const Schedule = () => (
  <div className="text-center py-20">
    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Schedule</h2>
    <p className="text-gray-400">Manage your availability and sessions</p>
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

const MentorDashboard = () => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

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

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30"
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-medium">
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
          <button className="relative text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 md:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="mentees" element={<Mentees />} />
            <Route path="observations" element={<Observations />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;
