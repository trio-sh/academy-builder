import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import AIAgent from "@/pages/dashboard/AIAgent";
import { GoogleAuthLink } from "@/components/GoogleAuthLink";
import { Button } from "@/components/ui/button";
import {
  DashboardLayout,
  type DashboardNavItem,
  type DashboardSection,
} from "@/components/dashboard/DashboardLayout";
import {
  DashboardPageHeader,
  DashSection,
  LedgerStat,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
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
  MessageSquare,
  Send,
  User,
  Bot,
  PanelLeftClose,
  PanelLeft,
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
  { name: "Messages", href: "/dashboard/school/messages", icon: MessageSquare },
  { name: "Praxis", href: "/dashboard/school/agent", icon: Bot },
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

  if (isLoading) return <LedgerLoading />;

  const overviewStats = [
    { label: "Total students", value: stats.totalStudents },
    { label: "Active cohorts", value: stats.activeCohorts },
    { label: "Observations filed", value: stats.totalObservations },
    { label: "Average score", value: `${stats.avgBehavioralScore}%` },
  ];

  return (
    <div>
      <DashboardPageHeader
        eyebrow={`§ Civic Access Lab · ${schoolProfile?.school_name || "Institution"}`}
        title={
          <>
            Welcome,{" "}
            <span className="italic display-serif-italic ink-vermilion">
              {schoolProfile?.school_name || "school"}
            </span>
            .
          </>
        }
        meta="Where the classroom register begins to become the professional one."
      />

      <DashSection eyebrow="§ I · Standing figures" title="At the institution">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {overviewStats.map((s) => (
            <LedgerStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </DashSection>

      <DashSection eyebrow="§ II · Common entries" title="Where you likely wanted to go">
        <div className="grid md:grid-cols-3 border-t-2 border-foreground border-b border-foreground/40">
          {[
            { n: "01", title: "Manage students", body: "View and manage enrolled students.", href: "/dashboard/school/students" },
            { n: "02", title: "Record an observation", body: "Document student behavioural assessments.", href: "/dashboard/school/observations" },
            { n: "03", title: "View analytics", body: "Track cohort trends over time.", href: "/dashboard/school/analytics" },
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
        eyebrow="§ III · Recent observations"
        title="Latest entries in the classroom register"
        actions={
          <Link to="/dashboard/school/observations">
            <span className="mono-label text-foreground hover:ink-vermilion underline underline-offset-4">
              View all →
            </span>
          </Link>
        }
      >
        {recentObservations.length > 0 ? (
          <div className="border-t-2 border-foreground">
            {recentObservations.map((obs, i) => (
              <div
                key={obs.id}
                className="grid grid-cols-12 gap-4 py-5 px-2 md:px-4 border-b border-foreground/20 items-baseline"
              >
                <div className="col-span-3 md:col-span-2 mono-num text-foreground/50 text-xs">
                  {new Date(obs.observation_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="col-span-1 mono-label text-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="col-span-8 md:col-span-9">
                  <p className="display-serif text-lg text-foreground leading-tight">
                    {obs.student?.profile?.first_name} {obs.student?.profile?.last_name}
                  </p>
                  {obs.context && (
                    <p className="text-foreground/70 text-[0.875rem] mt-1 leading-relaxed">
                      {obs.context}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="§ No entries yet"
            title={
              <>
                The classroom register is <span className="italic display-serif-italic">open.</span>
              </>
            }
            body="Start documenting student behaviours to begin building the record."
          />
        )}
      </DashSection>
    </div>
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
      case "active": return "bg-foreground/[0.06] text-foreground";
      case "graduated": return "bg-foreground/[0.06] text-foreground";
      case "transferred": return "bg-vermilion/10 ink-vermilion";
      case "inactive": return "bg-gray-500/20 text-foreground/60";
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Students</h1>
          <p className="text-foreground/60">Manage enrolled students and track their progress.</p>
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or ID..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none"
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
                className="p-4 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors"
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
                      <div className="w-12 h-12 rounded-full bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold">
                        {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">
                        {student.profile?.first_name} {student.profile?.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-foreground/60">
                        {student.student_id_number && (
                          <span>ID: {student.student_id_number}</span>
                        )}
                        {student.grade_level && (
                          <span>Grade: {student.grade_level}</span>
                        )}
                        {student.cohort && (
                          <span className="px-2 py-0.5 rounded bg-background">
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
                      <p className="text-sm text-foreground/60">
                        {student.total_observations} observations
                      </p>
                      {student.avg_behavioral_score && (
                        <p className="text-sm text-foreground">
                          Avg: {student.avg_behavioral_score}%
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-foreground/25 text-foreground hover:bg-foreground/5"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <Users className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No students found</p>
            <p className="text-sm text-foreground/50 mt-1">
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
      case "active": return "bg-foreground/[0.06] text-foreground";
      case "completed": return "bg-foreground/[0.06] text-foreground";
      case "upcoming": return "bg-vermilion/10 ink-vermilion";
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Cohorts</h1>
          <p className="text-foreground/60">Manage student cohorts and programs.</p>
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
          className="p-6 rounded-xl bg-background border border-foreground/25"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Create New Cohort</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Cohort Name</label>
              <input
                type="text"
                value={newCohort.name}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Spring 2024"
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Program</label>
              <input
                type="text"
                value={newCohort.program}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, program: e.target.value }))}
                placeholder="e.g., Career Readiness"
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-2">Start Date</label>
              <input
                type="date"
                value={newCohort.startDate}
                onChange={(e) => setNewCohort((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewCohort(false)}
              className="border-foreground/25 text-foreground hover:bg-foreground/5"
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
                className="p-6 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{cohort.name}</h3>
                    <p className="text-sm text-foreground/60">{cohort.program}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(cohort.status)}`}>
                    {cohort.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-foreground/60">
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
                  className="w-full mt-4 border-foreground/25 text-foreground hover:bg-foreground/5"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <GraduationCap className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No cohorts created yet</p>
            <p className="text-sm text-foreground/50 mt-1">Create cohorts to organize your students</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Observations</h1>
          <p className="text-foreground/60">Record and review student behavioral observations.</p>
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
          className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewObservation(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-foreground/25">
              <h2 className="text-xl font-bold text-foreground">New Observation</h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Student Selection */}
              <div className="mb-6">
                <label className="text-sm text-foreground/60 block mb-2">Select Student</label>
                <select
                  value={selectedStudent?.id || ""}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-teal-500 focus:outline-none"
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
                    <label className="text-sm text-foreground/60 block mb-2">Observation Context</label>
                    <input
                      type="text"
                      value={observationForm.context}
                      onChange={(e) => setObservationForm((prev) => ({ ...prev, context: e.target.value }))}
                      placeholder="e.g., Class project presentation"
                      className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Behavioral Scores */}
                  <div className="mb-6">
                    <label className="text-sm text-foreground/60 block mb-3">Behavioral Scores</label>
                    <div className="grid grid-cols-2 gap-4">
                      {BEHAVIORAL_DIMENSIONS.map((dimension) => (
                        <div key={dimension} className="flex items-center gap-3">
                          <span className="text-sm text-foreground/75 flex-1">{dimension}</span>
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
                                    ? "bg-teal-600 text-foreground"
                                    : "bg-background text-foreground/60 hover:bg-foreground/5"
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
                    <label className="text-sm text-foreground/60 block mb-2">Notes</label>
                    <textarea
                      value={observationForm.notes}
                      onChange={(e) => setObservationForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional observations..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-foreground/25 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewObservation(false)}
                className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
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
                className="p-4 rounded-xl bg-background border border-foreground/25"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold">
                      {obs.student?.profile?.first_name?.[0]}{obs.student?.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {obs.student?.profile?.first_name} {obs.student?.profile?.last_name}
                      </p>
                      <p className="text-sm text-foreground/60">{obs.context}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/50">
                    {new Date(obs.observation_date).toLocaleDateString()}
                  </p>
                </div>
                {obs.notes && (
                  <p className="mt-3 text-sm text-foreground/60 bg-background/20 p-3 rounded-lg">
                    {obs.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
            <ClipboardList className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground/60">No observations recorded yet</p>
            <p className="text-sm text-foreground/50 mt-1">Start documenting student behaviors</p>
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <p className="text-foreground/60">Track cohort performance and behavioral trends.</p>
      </motion.div>

      {/* Behavioral Dimension Overview */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
        <h2 className="text-lg font-semibold text-foreground mb-4">Behavioral Dimensions Average</h2>
        <div className="space-y-4">
          {BEHAVIORAL_DIMENSIONS.map((dimension, index) => {
            const score = 60 + Math.random() * 30; // Placeholder random scores
            return (
              <div key={dimension} className="flex items-center gap-4">
                <span className="text-sm text-foreground/60 w-40">{dimension}</span>
                <div className="flex-1 h-3 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="text-sm text-foreground w-12 text-right">{Math.round(score)}%</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-foreground/40">
          <TrendingUp className="w-8 h-8 text-foreground mb-3" />
          <p className="text-3xl font-bold text-foreground">+12%</p>
          <p className="text-sm text-foreground/60">Average Score Improvement</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-foreground/40">
          <Award className="w-8 h-8 ink-vermilion mb-3" />
          <p className="text-3xl font-bold text-foreground">24</p>
          <p className="text-sm text-foreground/60">Students Ready for Mentorship</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-foreground/40">
          <Target className="w-8 h-8 text-foreground mb-3" />
          <p className="text-3xl font-bold text-foreground">78%</p>
          <p className="text-sm text-foreground/60">Goal Completion Rate</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Settings component
// Messages Page for School Dashboard
const SchoolMessagesPage = () => {
  const { user } = useAuth();
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
            const { data: profileData } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, role").eq("id", participants[0].user_id).single();
            otherUser = profileData;
          }
          const myParticipant = participantData.find((p) => p.conversation_id === conv.id);
          return { ...conv, other_user: otherUser, last_read_at: myParticipant?.last_read_at };
        }));
        setConversations(enrichedConversations);
      }
      setIsLoading(false);
    };
    fetchConversations();
  }, [user?.id]);

  useEffect(() => {
    if (!activeConversation) { setMessages([]); return; }
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true });
      setMessages(data || []);
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
    if (!newMessage.trim() || !activeConversation || !user?.id) return;
    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");
    try {
      await supabase.from("messages").insert({ conversation_id: activeConversation.id, sender_id: user.id, content: messageContent, message_type: "text" });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: messageContent.substring(0, 100), updated_at: new Date().toISOString() }).eq("id", activeConversation.id);
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
        <p className="text-foreground/60">Connect with mentors, candidates, employers, and other schools.</p>
      </motion.div>
      <motion.div variants={itemVariants} className="h-[calc(100%-5rem)] rounded-xl bg-background border border-foreground/25 overflow-hidden flex">
        <div className="w-80 border-r border-foreground/25 flex flex-col">
          <div className="p-4 border-b border-foreground/25 space-y-3">
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-background border border-foreground/25 rounded-lg px-4 py-2 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-teal-500" />
              <Button onClick={() => setShowNewChat(!showNewChat)} className="bg-teal-600 hover:bg-teal-500 rounded-lg px-3 py-2 flex-shrink-0" title="New conversation"><Plus className="w-4 h-4" /></Button>
            </div>
            {showNewChat && (
              <div className="bg-background/90 border border-foreground/40 rounded-xl p-3 space-y-3">
                <p className="text-xs text-foreground font-medium">Find someone to message</p>
                <input type="text" placeholder="Search by name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} autoFocus className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-teal-500" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {isSearching && <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-foreground" /></div>}
                  {!isSearching && searchResults.length === 0 && userSearchQuery.length >= 2 && <p className="text-xs text-foreground/50 text-center py-2">No users found</p>}
                  {!isSearching && userSearchQuery.length > 0 && userSearchQuery.length < 2 && <p className="text-xs text-foreground/50 text-center py-2">Type at least 2 characters</p>}
                  {searchResults.map((result) => (
                    <button key={result.id} onClick={() => startConversation(result.id)} disabled={isCreatingConversation} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.06] transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
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
                <button key={conv.id} onClick={() => setActiveConversation(conv)} className={`w-full p-4 flex items-start gap-3 hover:bg-foreground/5 transition-colors text-left ${activeConversation?.id === conv.id ? "bg-foreground/[0.06] border-l-2 border-teal-500" : ""}`}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      {conv.other_user?.avatar_url ? <img src={conv.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6 text-foreground" />}
                    </div>
                    {hasUnread && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-500" />}
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                  {activeConversation.other_user?.avatar_url ? <img src={activeConversation.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-foreground" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}</p>
                  <p className="text-xs text-foreground/50 capitalize">{activeConversation.other_user?.role}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-4 h-4 text-foreground" />}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div>
                          <div className={`px-4 py-2 rounded-2xl ${isOwn ? "bg-teal-600 text-foreground rounded-br-md" : "bg-background text-foreground/80 rounded-bl-md"}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-foreground/50 mt-1 ${isOwn ? "text-right" : ""}`}>{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-foreground/25">
                <div className="flex items-center gap-3">
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} className="flex-1 bg-background border border-foreground/25 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-teal-500" />
                  <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} className="bg-teal-600 hover:bg-teal-500 rounded-xl px-6">
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
                <Button onClick={() => setShowNewChat(true)} className="bg-teal-600 hover:bg-teal-500 rounded-xl px-6"><Plus className="w-4 h-4 mr-2" />New Conversation</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsPage = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-foreground/60">Manage your school profile and preferences.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
        <p className="text-foreground/60">School settings will appear here.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GoogleAuthLink />
      </motion.div>
    </motion.div>
  );
};

// Main Dashboard component
const SCHOOL_SECTIONS: DashboardSection[] = [
  { id: "main", label: "§ I · Civic Access Lab" },
];

const SchoolDashboard = () => {
  const navWithSection: DashboardNavItem[] = navItems.map((n) => ({
    ...n,
    section: "main",
  }));

  return (
    <DashboardLayout
      role="Institution"
      roleTagline="Where the classroom register begins to become the professional one."
      nav={navWithSection}
      sections={SCHOOL_SECTIONS}
    >
      <Routes>
        <Route index element={<Overview />} />
        <Route path="students" element={<Students />} />
        <Route path="cohorts" element={<Cohorts />} />
        <Route path="observations" element={<Observations />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="messages" element={<SchoolMessagesPage />} />
        <Route path="agent" element={<AIAgent />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

// legacy shell removed

export default SchoolDashboard;
