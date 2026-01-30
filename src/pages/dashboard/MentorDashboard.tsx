import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
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
  Loader2,
  ChevronRight,
  Eye,
  Award,
  Save,
  Plus,
  ExternalLink,
  Star,
  MessageSquare,
} from "lucide-react";

type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type MentorAssignment = Database["public"]["Tables"]["mentor_assignments"]["Row"];
type MentorObservation = Database["public"]["Tables"]["mentor_observations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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

// Overview component with real data
const Overview = () => {
  const { profile, user } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [activeMentees, setActiveMentees] = useState(0);
  const [pendingObservations, setPendingObservations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Fetch mentor profile
        const { data: mp } = await supabase
          .from("mentor_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        setMentorProfile(mp);

        if (mp) {
          // Count active mentees
          const { count: menteeCount } = await supabase
            .from("mentor_assignments")
            .select("*", { count: "exact", head: true })
            .eq("mentor_profile_id", mp.id)
            .eq("status", "active");
          setActiveMentees(menteeCount || 0);
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
      label: "Active Mentees",
      value: activeMentees.toString(),
      icon: Users,
      color: "from-indigo-500 to-purple-500"
    },
    {
      label: "Total Observations",
      value: (mentorProfile?.total_observations || 0).toString(),
      icon: ClipboardCheck,
      color: "from-emerald-500 to-teal-500"
    },
    {
      label: "Endorsements Given",
      value: (mentorProfile?.total_endorsements || 0).toString(),
      icon: CheckCircle,
      color: "from-amber-500 to-orange-500"
    },
    {
      label: "Max Mentees",
      value: `${activeMentees} / ${mentorProfile?.max_mentees || 5}`,
      icon: Clock,
      color: "from-pink-500 to-rose-500"
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
          Welcome back, {profile?.first_name || "Mentor"}
        </h1>
        <p className="text-gray-400">
          Manage your mentees and track your observations.
        </p>
      </motion.div>

      {/* Alert if not accepting mentees */}
      {mentorProfile && !mentorProfile.is_accepting && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <p className="text-amber-400">
            You are currently not accepting new mentees.
            <Link to="/dashboard/mentor/profile" className="underline ml-2">
              Update your preferences
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
            <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl bg-gradient-to-r from-purple-600 to-pink-600 transition-opacity" />
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

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/mentor/mentees"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors group"
          >
            <Users className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">View Mentees</h3>
            <p className="text-sm text-gray-400">Manage your assigned candidates</p>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 mt-3 transition-colors" />
          </Link>

          <Link
            to="/dashboard/mentor/observations"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors group"
          >
            <ClipboardCheck className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Record Observation</h3>
            <p className="text-sm text-gray-400">Document candidate behaviors</p>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 mt-3 transition-colors" />
          </Link>

          <Link
            to="/dashboard/mentor/schedule"
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors group"
          >
            <Calendar className="w-8 h-8 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Manage Schedule</h3>
            <p className="text-sm text-gray-400">Set your availability</p>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 mt-3 transition-colors" />
          </Link>
        </div>
      </motion.div>

      {/* Pending Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Pending Actions</h2>
        {pendingObservations > 0 ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{pendingObservations} pending observations</p>
                <p className="text-sm text-gray-400">Complete your scheduled observations</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-gray-400">No pending actions</p>
            <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Mentees component
const Mentees = () => {
  const { user } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  interface MenteeWithProfile extends MentorAssignment {
    candidate_profile?: {
      profile?: Profile;
    };
  }
  const [mentees, setMentees] = useState<MenteeWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMentees = async () => {
      if (!user?.id) return;

      // First get mentor profile
      const { data: mp } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setMentorProfile(mp);

      if (mp) {
        // Get assignments with candidate profiles
        const { data: assignments } = await supabase
          .from("mentor_assignments")
          .select(`
            *,
            candidate_profile:candidate_profile_id(
              profile_id,
              current_tier,
              mentor_loops
            )
          `)
          .eq("mentor_profile_id", mp.id)
          .order("created_at", { ascending: false });

        // For each assignment, get the candidate's profile data
        if (assignments && assignments.length > 0) {
          const enhancedAssignments = await Promise.all(
            assignments.map(async (assignment: MenteeWithProfile) => {
              if (assignment.candidate_profile) {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", (assignment.candidate_profile as { profile_id?: string }).profile_id)
                  .single();
                return {
                  ...assignment,
                  candidate_profile: {
                    ...assignment.candidate_profile,
                    profile: profileData,
                  },
                };
              }
              return assignment;
            })
          );
          setMentees(enhancedAssignments);
        } else {
          setMentees([]);
        }
      }

      setIsLoading(false);
    };

    fetchMentees();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
        <h1 className="text-3xl font-bold text-white mb-2">My Mentees</h1>
        <p className="text-gray-400">
          View and manage your assigned candidates.
        </p>
      </motion.div>

      {mentees.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {mentees.map((assignment) => {
            const candidateProfile = assignment.candidate_profile as {
              profile?: Profile;
              current_tier?: string;
              mentor_loops?: number;
            } | undefined;
            const profile = candidateProfile?.profile;

            return (
              <div
                key={assignment.id}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                    {profile?.first_name?.[0]}
                    {profile?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">
                        {profile?.first_name} {profile?.last_name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        assignment.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{profile?.email}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-500">
                        Loop {assignment.loop_number} of 3
                      </span>
                      <span className="text-gray-500">
                        Tier: {candidateProfile?.current_tier?.replace("_", " ") || "Not assessed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" />
                      Observe
                    </Button>
                  </div>
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
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No mentees assigned yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Candidates will be assigned to you by the platform
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

// Observations component
const Observations = () => {
  const { user } = useAuth();
  const [observations, setObservations] = useState<MentorObservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchObservations = async () => {
      if (!user?.id) return;

      // Get mentor profile first
      const { data: mp } = await supabase
        .from("mentor_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (mp) {
        // Get assignments for this mentor
        const { data: assignments } = await supabase
          .from("mentor_assignments")
          .select("id")
          .eq("mentor_profile_id", mp.id);

        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map((a) => a.id);

          // Get observations for those assignments
          const { data: obs } = await supabase
            .from("mentor_observations")
            .select("*")
            .in("assignment_id", assignmentIds)
            .order("created_at", { ascending: false });

          setObservations(obs || []);
        }
      }

      setIsLoading(false);
    };

    fetchObservations();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
          <h1 className="text-3xl font-bold text-white mb-2">Observations</h1>
          <p className="text-gray-400">Record and review behavioral observations.</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-500">
          <Plus className="w-4 h-4 mr-2" />
          New Observation
        </Button>
      </motion.div>

      {observations.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {observations.map((observation) => (
            <div
              key={observation.id}
              className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400">
                    Session Date: {new Date(observation.session_date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {observation.is_locked ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                        Locked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>

              {observation.strengths && observation.strengths.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-2">Strengths:</p>
                  <div className="flex flex-wrap gap-2">
                    {observation.strengths.map((s, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {observation.notes && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{observation.notes}</p>
              )}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
        >
          <ClipboardCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No observations recorded yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Start recording observations for your mentees
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

// Schedule component
const Schedule = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
        <p className="text-gray-400">Manage your availability and upcoming sessions.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        {/* Availability Settings */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Availability</h2>
          <div className="space-y-4">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
              <div key={day} className="flex items-center justify-between">
                <span className="text-gray-400">{day}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            ))}
          </div>
          <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-500">
            <Save className="w-4 h-4 mr-2" />
            Save Availability
          </Button>
        </div>

        {/* Upcoming Sessions */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Sessions</h2>
          <div className="p-6 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No upcoming sessions</p>
            <p className="text-sm text-gray-500 mt-1">Sessions will appear here when scheduled</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Profile component
const ProfilePage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    headline: "",
    bio: "",
    industry: "",
    company: "",
    job_title: "",
    specializations: [] as string[],
    max_mentees: 5,
    is_accepting: true,
  });
  const [newSpec, setNewSpec] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
      }));
    }
  }, [profile]);

  useEffect(() => {
    const fetchMentorProfile = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (data) {
        setMentorProfile(data);
        setFormData((prev) => ({
          ...prev,
          industry: data.industry || "",
          company: data.company || "",
          job_title: data.job_title || "",
          specializations: data.specializations || [],
          max_mentees: data.max_mentees || 5,
          is_accepting: data.is_accepting,
        }));
      }
    };

    fetchMentorProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      // Update profiles table
      await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          headline: formData.headline,
          bio: formData.bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Update or create mentor_profiles
      if (mentorProfile) {
        await supabase
          .from("mentor_profiles")
          .update({
            industry: formData.industry,
            company: formData.company,
            job_title: formData.job_title,
            specializations: formData.specializations,
            max_mentees: formData.max_mentees,
            is_accepting: formData.is_accepting,
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", user.id);
      } else {
        await supabase
          .from("mentor_profiles")
          .insert({
            profile_id: user.id,
            industry: formData.industry,
            company: formData.company,
            job_title: formData.job_title,
            specializations: formData.specializations,
            max_mentees: formData.max_mentees,
            is_accepting: formData.is_accepting,
          });
      }

      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSpec = () => {
    if (newSpec.trim() && !formData.specializations.includes(newSpec.trim())) {
      setFormData((prev) => ({
        ...prev,
        specializations: [...prev.specializations, newSpec.trim()],
      }));
      setNewSpec("");
    }
  };

  const removeSpec = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((s) => s !== spec),
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
          <p className="text-gray-400">Manage your mentor profile</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-purple-600 hover:bg-purple-500">
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-500">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {/* Basic Info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl text-white font-bold">
              {formData.first_name?.[0]}{formData.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {formData.first_name} {formData.last_name}
              </h2>
              <p className="text-gray-400">{profile?.email}</p>
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 mt-1">
                Mentor
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">Professional Information</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Company</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="Your company"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.company || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Job Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, job_title: e.target.value }))}
                  placeholder="Your title"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.job_title || "Not set"}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">Industry</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., Technology, Healthcare, Finance"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
              />
            ) : (
              <p className="text-white">{formData.industry || "Not set"}</p>
            )}
          </div>
        </div>

        {/* Specializations */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <label className="text-sm text-gray-400 block mb-3">Specializations</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm"
              >
                {spec}
                {isEditing && (
                  <button onClick={() => removeSpec(spec)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {formData.specializations.length === 0 && !isEditing && (
              <p className="text-gray-500">No specializations added</p>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpec}
                onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpec())}
                placeholder="Add a specialization..."
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <Button onClick={addSpec} size="sm" className="bg-purple-600 hover:bg-purple-500">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mentor Settings */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">Mentor Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Accepting New Mentees</p>
                <p className="text-sm text-gray-500">Allow new candidates to be assigned to you</p>
              </div>
              {isEditing ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_accepting}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_accepting: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              ) : (
                <span className={`px-2 py-1 rounded text-xs ${
                  formData.is_accepting ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {formData.is_accepting ? "Yes" : "No"}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Maximum Mentees</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.max_mentees}
                  onChange={(e) => setFormData((prev) => ({ ...prev, max_mentees: parseInt(e.target.value) || 5 }))}
                  min={1}
                  max={20}
                  className="w-24 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.max_mentees}</p>
              )}
            </div>
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
              <span className="text-gray-400">New mentee assignments</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Session reminders</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
            </label>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MentorDashboard = () => {
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
              <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
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
          <div className="relative">
            <button
              className="relative text-gray-400 hover:text-white"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-xs flex items-center justify-center text-white">
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
            <Route path="mentees" element={<Mentees />} />
            <Route path="observations" element={<Observations />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;
