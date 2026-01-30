import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
import {
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
  Award,
  Target,
  Search,
  Filter,
} from "lucide-react";

type SchoolProfile = Database["public"]["Tables"]["school_profiles"]["Row"];
type SchoolCohort = Database["public"]["Tables"]["school_cohorts"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type TeacherObservation = Database["public"]["Tables"]["teacher_observations"]["Row"];
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
  { name: "Overview", href: "/dashboard/school", icon: BarChart3 },
  { name: "Students", href: "/dashboard/school/students", icon: Users },
  { name: "Cohorts", href: "/dashboard/school/cohorts", icon: GraduationCap },
  { name: "Observations", href: "/dashboard/school/observations", icon: ClipboardList },
  { name: "Analytics", href: "/dashboard/school/analytics", icon: TrendingUp },
  { name: "Settings", href: "/dashboard/school/settings", icon: Settings },
];

const BEHAVIORAL_DIMENSIONS = [
  "Communication",
  "Problem Solving",
  "Adaptability",
  "Collaboration",
  "Initiative",
  "Time Management",
  "Professionalism",
  "Learning Agility",
];

// Overview component
const Overview = () => {
  const { user } = useAuth();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCohorts: 0,
    totalObservations: 0,
    avgBehavioralScore: 0,
  });
  const [recentObservations, setRecentObservations] = useState<(TeacherObservation & { student?: Student & { profile?: Profile } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Fetch school profile
      const { data: school } = await supabase
        .from("school_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setSchoolProfile(school);

      if (school) {
        // Fetch stats
        const { count: studentCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("school_id", school.id);

        const { count: cohortCount } = await supabase
          .from("school_cohorts")
          .select("*", { count: "exact", head: true })
          .eq("school_id", school.id)
          .eq("status", "active");

        const { data: students } = await supabase
          .from("students")
          .select("id")
          .eq("school_id", school.id);

        const studentIds = students?.map(s => s.id) || [];

        let observationCount = 0;
        if (studentIds.length > 0) {
          const { count } = await supabase
            .from("teacher_observations")
            .select("*", { count: "exact", head: true })
            .in("student_id", studentIds);
          observationCount = count || 0;
        }

        setStats({
          totalStudents: studentCount || 0,
          activeCohorts: cohortCount || 0,
          totalObservations: observationCount,
          avgBehavioralScore: 78, // Placeholder
        });

        // Fetch recent observations
        if (studentIds.length > 0) {
          const { data: observations } = await supabase
            .from("teacher_observations")
            .select("*")
            .in("student_id", studentIds)
            .order("created_at", { ascending: false })
            .limit(5);

          if (observations) {
            const enriched = await Promise.all(
              observations.map(async (obs) => {
                const { data: student } = await supabase
                  .from("students")
                  .select("*")
                  .eq("id", obs.student_id)
                  .single();

                let profile = null;
                if (student) {
                  const { data: p } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", student.profile_id)
                    .single();
                  profile = p;
                }

                return { ...obs, student: student ? { ...student, profile } : undefined };
              })
            );
            setRecentObservations(enriched);
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
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
          Welcome, {schoolProfile?.school_name || "School Admin"}
        </h1>
        <p className="text-gray-400">
          Manage your students and track their behavioral development.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-teal-400" },
          { label: "Active Cohorts", value: stats.activeCohorts, icon: GraduationCap, color: "text-blue-400" },
          { label: "Observations", value: stats.totalObservations, icon: ClipboardList, color: "text-purple-400" },
          { label: "Avg Score", value: `${stats.avgBehavioralScore}%`, icon: Target, color: "text-emerald-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl bg-white/5 border border-white/10"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/school/students"
            className="p-6 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 hover:border-teal-500/40 transition-colors group"
          >
            <Users className="w-8 h-8 text-teal-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Manage Students</h3>
            <p className="text-sm text-gray-400">View and manage enrolled students</p>
            <ChevronRight className="w-5 h-5 text-teal-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/dashboard/school/observations"
            className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors group"
          >
            <ClipboardList className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Record Observation</h3>
            <p className="text-sm text-gray-400">Document student behavioral assessments</p>
            <ChevronRight className="w-5 h-5 text-purple-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/dashboard/school/analytics"
            className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors group"
          >
            <TrendingUp className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">View Analytics</h3>
            <p className="text-sm text-gray-400">Track cohort performance trends</p>
            <ChevronRight className="w-5 h-5 text-blue-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* Recent Observations */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Observations</h2>
          <Link to="/dashboard/school/observations" className="text-sm text-teal-400 hover:text-teal-300">
            View all
          </Link>
        </div>
        {recentObservations.length > 0 ? (
          <div className="space-y-3">
            {recentObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {obs.student?.profile?.first_name} {obs.student?.profile?.last_name}
                    </p>
                    <p className="text-sm text-gray-400">{obs.context}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {new Date(obs.observation_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
            <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No observations recorded yet</p>
            <p className="text-sm text-gray-500 mt-1">Start documenting student behaviors</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Students component
interface StudentWithProfile extends Student {
  profile?: Profile;
  cohort?: SchoolCohort;
}

const Students = () => {
  const { user } = useAuth();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    email: "",
    firstName: "",
    lastName: "",
    studentId: "",
    gradeLevel: "",
    cohortId: "",
  });
  const [cohorts, setCohorts] = useState<SchoolCohort[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data: school } = await supabase
        .from("school_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setSchoolProfile(school);

      if (school) {
        // Fetch cohorts
        const { data: cohortData } = await supabase
          .from("school_cohorts")
          .select("*")
          .eq("school_id", school.id);

        setCohorts(cohortData || []);

        // Fetch students
        const { data: studentData } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", school.id)
          .order("created_at", { ascending: false });

        if (studentData) {
          const enriched = await Promise.all(
            studentData.map(async (student) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", student.profile_id)
                .single();

              const cohort = cohortData?.find(c => c.id === student.cohort_id);

              return { ...student, profile, cohort };
            })
          );
          setStudents(enriched);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const filteredStudents = students.filter((s) =>
    `${s.profile?.first_name} ${s.profile?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "graduated": return "bg-blue-500/20 text-blue-400";
      case "transferred": return "bg-amber-500/20 text-amber-400";
      case "inactive": return "bg-gray-500/20 text-gray-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
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
          <h1 className="text-3xl font-bold text-white mb-2">Students</h1>
          <p className="text-gray-400">Manage enrolled students and track their progress.</p>
        </div>
        <Button
          onClick={() => setShowAddStudent(true)}
          className="bg-teal-600 hover:bg-teal-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or ID..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </motion.div>

      {/* Students List */}
      <motion.div variants={itemVariants}>
        {filteredStudents.length > 0 ? (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {student.profile?.avatar_url ? (
                      <img
                        src={student.profile.avatar_url}
                        alt="Student"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                        {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">
                        {student.profile?.first_name} {student.profile?.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        {student.student_id_number && (
                          <span>ID: {student.student_id_number}</span>
                        )}
                        {student.grade_level && (
                          <span>Grade: {student.grade_level}</span>
                        )}
                        {student.cohort && (
                          <span className="px-2 py-0.5 rounded bg-white/10">
                            {student.cohort.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {student.total_observations} observations
                      </p>
                      {student.avg_behavioral_score && (
                        <p className="text-sm text-teal-400">
                          Avg: {student.avg_behavioral_score}%
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No students found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? "Try a different search term" : "Add students to get started"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Cohorts component
const Cohorts = () => {
  const { user } = useAuth();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [cohorts, setCohorts] = useState<SchoolCohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCohort, setShowNewCohort] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: "",
    program: "",
    startDate: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data: school } = await supabase
        .from("school_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setSchoolProfile(school);

      if (school) {
        const { data } = await supabase
          .from("school_cohorts")
          .select("*")
          .eq("school_id", school.id)
          .order("start_date", { ascending: false });

        setCohorts(data || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const createCohort = async () => {
    if (!schoolProfile || !newCohort.name || !newCohort.program) return;

    const { data, error } = await supabase
      .from("school_cohorts")
      .insert({
        school_id: schoolProfile.id,
        name: newCohort.name,
        program: newCohort.program,
        start_date: newCohort.startDate || new Date().toISOString(),
        status: "upcoming",
      })
      .select()
      .single();

    if (!error && data) {
      setCohorts((prev) => [data, ...prev]);
      setShowNewCohort(false);
      setNewCohort({ name: "", program: "", startDate: "" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "completed": return "bg-blue-500/20 text-blue-400";
      case "upcoming": return "bg-amber-500/20 text-amber-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
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
          <h1 className="text-3xl font-bold text-white mb-2">Cohorts</h1>
          <p className="text-gray-400">Manage student cohorts and programs.</p>
        </div>
        <Button
          onClick={() => setShowNewCohort(true)}
          className="bg-teal-600 hover:bg-teal-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Cohort
        </Button>
      </motion.div>

      {/* New Cohort Form */}
      {showNewCohort && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-white/5 border border-white/10"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Create New Cohort</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Cohort Name</label>
              <input
                type="text"
                value={newCohort.name}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Spring 2024"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Program</label>
              <input
                type="text"
                value={newCohort.program}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, program: e.target.value }))}
                placeholder="e.g., Career Readiness"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Start Date</label>
              <input
                type="date"
                value={newCohort.startDate}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewCohort(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={createCohort}
              disabled={!newCohort.name || !newCohort.program}
              className="bg-teal-600 hover:bg-teal-500"
            >
              Create Cohort
            </Button>
          </div>
        </motion.div>
      )}

      {/* Cohorts List */}
      <motion.div variants={itemVariants}>
        {cohorts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{cohort.name}</h3>
                    <p className="text-sm text-gray-400">{cohort.program}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(cohort.status)}`}>
                    {cohort.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {cohort.total_students} students
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(cohort.start_date).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-4 border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No cohorts created yet</p>
            <p className="text-sm text-gray-500 mt-1">Create cohorts to organize your students</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Observations component
const Observations = () => {
  const { user } = useAuth();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [observations, setObservations] = useState<(TeacherObservation & { student?: StudentWithProfile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewObservation, setShowNewObservation] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProfile | null>(null);
  const [observationForm, setObservationForm] = useState({
    context: "",
    notes: "",
    strengths: [] as string[],
    areasForGrowth: [] as string[],
    scores: {} as Record<string, number>,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data: school } = await supabase
        .from("school_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setSchoolProfile(school);

      if (school) {
        // Fetch students
        const { data: studentData } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", school.id)
          .eq("status", "active");

        if (studentData) {
          const enriched = await Promise.all(
            studentData.map(async (student) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", student.profile_id)
                .single();
              return { ...student, profile };
            })
          );
          setStudents(enriched);

          // Fetch observations
          const studentIds = studentData.map(s => s.id);
          if (studentIds.length > 0) {
            const { data: obsData } = await supabase
              .from("teacher_observations")
              .select("*")
              .in("student_id", studentIds)
              .order("observation_date", { ascending: false });

            if (obsData) {
              const enrichedObs = obsData.map((obs) => ({
                ...obs,
                student: enriched.find(s => s.id === obs.student_id),
              }));
              setObservations(enrichedObs);
            }
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const submitObservation = async () => {
    if (!user?.id || !selectedStudent) return;

    const { error } = await supabase.from("teacher_observations").insert({
      teacher_id: user.id,
      student_id: selectedStudent.id,
      cohort_id: selectedStudent.cohort_id,
      observation_date: new Date().toISOString(),
      context: observationForm.context,
      behavioral_scores: observationForm.scores,
      strengths: observationForm.strengths,
      areas_for_growth: observationForm.areasForGrowth,
      notes: observationForm.notes,
    });

    if (!error) {
      // Update student observation count
      await supabase
        .from("students")
        .update({
          total_observations: (selectedStudent.total_observations || 0) + 1,
        })
        .eq("id", selectedStudent.id);

      setShowNewObservation(false);
      setSelectedStudent(null);
      setObservationForm({
        context: "",
        notes: "",
        strengths: [],
        areasForGrowth: [],
        scores: {},
      });

      // Refresh observations
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
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
          <p className="text-gray-400">Record and review student behavioral observations.</p>
        </div>
        <Button
          onClick={() => setShowNewObservation(true)}
          className="bg-teal-600 hover:bg-teal-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Observation
        </Button>
      </motion.div>

      {/* New Observation Form */}
      {showNewObservation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewObservation(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">New Observation</h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Student Selection */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 block mb-2">Select Student</label>
                <select
                  value={selectedStudent?.id || ""}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.profile?.first_name} {student.profile?.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <>
                  {/* Context */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 block mb-2">Observation Context</label>
                    <input
                      type="text"
                      value={observationForm.context}
                      onChange={(e) => setObservationForm((prev) => ({ ...prev, context: e.target.value }))}
                      placeholder="e.g., Class project presentation"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Behavioral Scores */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 block mb-3">Behavioral Scores</label>
                    <div className="grid grid-cols-2 gap-4">
                      {BEHAVIORAL_DIMENSIONS.map((dimension) => (
                        <div key={dimension} className="flex items-center gap-3">
                          <span className="text-sm text-gray-300 flex-1">{dimension}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() =>
                                  setObservationForm((prev) => ({
                                    ...prev,
                                    scores: { ...prev.scores, [dimension]: score },
                                  }))
                                }
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                  observationForm.scores[dimension] === score
                                    ? "bg-teal-600 text-white"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 block mb-2">Notes</label>
                    <textarea
                      value={observationForm.notes}
                      onChange={(e) => setObservationForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional observations..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewObservation(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={submitObservation}
                disabled={!selectedStudent || !observationForm.context}
                className="flex-1 bg-teal-600 hover:bg-teal-500"
              >
                Submit Observation
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Observations List */}
      <motion.div variants={itemVariants}>
        {observations.length > 0 ? (
          <div className="space-y-3">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                      {obs.student?.profile?.first_name?.[0]}{obs.student?.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {obs.student?.profile?.first_name} {obs.student?.profile?.last_name}
                      </p>
                      <p className="text-sm text-gray-400">{obs.context}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(obs.observation_date).toLocaleDateString()}
                  </p>
                </div>
                {obs.notes && (
                  <p className="mt-3 text-sm text-gray-400 bg-black/20 p-3 rounded-lg">
                    {obs.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
            <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No observations recorded yet</p>
            <p className="text-sm text-gray-500 mt-1">Start documenting student behaviors</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Analytics component
const Analytics = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Track cohort performance and behavioral trends.</p>
      </motion.div>

      {/* Behavioral Dimension Overview */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Behavioral Dimensions Average</h2>
        <div className="space-y-4">
          {BEHAVIORAL_DIMENSIONS.map((dimension, index) => {
            const score = 60 + Math.random() * 30; // Placeholder random scores
            return (
              <div key={dimension} className="flex items-center gap-4">
                <span className="text-sm text-gray-400 w-40">{dimension}</span>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="text-sm text-white w-12 text-right">{Math.round(score)}%</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20">
          <TrendingUp className="w-8 h-8 text-teal-400 mb-3" />
          <p className="text-3xl font-bold text-white">+12%</p>
          <p className="text-sm text-gray-400">Average Score Improvement</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <Award className="w-8 h-8 text-purple-400 mb-3" />
          <p className="text-3xl font-bold text-white">24</p>
          <p className="text-sm text-gray-400">Students Ready for Mentorship</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
          <Target className="w-8 h-8 text-blue-400 mb-3" />
          <p className="text-3xl font-bold text-white">78%</p>
          <p className="text-sm text-gray-400">Goal Completion Rate</p>
        </div>
      </motion.div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your school profile and preferences.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-white/5 border border-white/10">
        <p className="text-gray-400">School settings will appear here.</p>
      </motion.div>
    </motion.div>
  );
};

// Main Dashboard component
const SchoolDashboard = () => {
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
                src="https://api.a0.dev/assets/image?text=Futuristic AI-powered academy logo with glowing teal circuit patterns&aspect=1:1&seed=civic_logo"
                alt="Logo"
                className="w-8 h-8 rounded-full"
              />
              <span className="font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Civic Access Lab
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
                      ? "bg-gradient-to-r from-teal-600/20 to-cyan-600/20 text-white border border-teal-500/30"
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
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">School Admin</p>
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
            <Route path="students" element={<Students />} />
            <Route path="cohorts" element={<Cohorts />} />
            <Route path="observations" element={<Observations />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default SchoolDashboard;
