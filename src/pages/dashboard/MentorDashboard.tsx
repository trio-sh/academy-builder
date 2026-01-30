import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FileCheck,
  ThumbsUp,
  ArrowRight,
  Lock,
} from "lucide-react";

type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type MentorAssignment = Database["public"]["Tables"]["mentor_assignments"]["Row"];
type MentorObservation = Database["public"]["Tables"]["mentor_observations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];

// Behavioral dimensions for observation scoring
const BEHAVIORAL_DIMENSIONS = [
  { id: "communication", label: "Communication", description: "Clear, professional verbal and written communication" },
  { id: "problem_solving", label: "Problem Solving", description: "Analytical thinking and solution development" },
  { id: "adaptability", label: "Adaptability", description: "Flexibility and response to change" },
  { id: "collaboration", label: "Collaboration", description: "Teamwork and interpersonal skills" },
  { id: "initiative", label: "Initiative", description: "Self-direction and proactive behavior" },
  { id: "time_management", label: "Time Management", description: "Prioritization and deadline management" },
  { id: "professionalism", label: "Professionalism", description: "Workplace conduct and reliability" },
  { id: "learning_agility", label: "Learning Agility", description: "Ability to learn and apply new concepts" },
];

// Context for observation modal
interface ObservationModalContextType {
  isOpen: boolean;
  openModal: (assignmentId?: string, candidateId?: string) => void;
  closeModal: () => void;
  selectedAssignmentId: string | null;
  selectedCandidateId: string | null;
}

const ObservationModalContext = createContext<ObservationModalContextType | undefined>(undefined);

const useObservationModal = () => {
  const context = useContext(ObservationModalContext);
  if (!context) throw new Error("useObservationModal must be used within ObservationModalProvider");
  return context;
};

// Observation Form Modal Component
const ObservationFormModal = () => {
  const { user } = useAuth();
  const { isOpen, closeModal, selectedAssignmentId, selectedCandidateId } = useObservationModal();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [assignments, setAssignments] = useState<(MentorAssignment & { candidate_profile?: CandidateProfile & { profile?: Profile } })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Select candidate, 2: Score dimensions, 3: Notes & submit

  // Form state
  const [formData, setFormData] = useState({
    assignmentId: "",
    candidateId: "",
    sessionDate: new Date().toISOString().split("T")[0],
    scores: {} as Record<string, number>,
    strengths: [] as string[],
    areasForImprovement: [] as string[],
    notes: "",
  });
  const [newStrength, setNewStrength] = useState("");
  const [newImprovement, setNewImprovement] = useState("");

  // Fetch mentor profile and assignments
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get mentor profile
        const { data: mp } = await supabase
          .from("mentor_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        setMentorProfile(mp);

        if (mp) {
          // Get active assignments with candidate info
          const { data: assignmentData } = await supabase
            .from("mentor_assignments")
            .select("*")
            .eq("mentor_id", mp.id)
            .eq("status", "active");

          if (assignmentData) {
            // Fetch candidate profiles for each assignment
            const enrichedAssignments = await Promise.all(
              assignmentData.map(async (assignment) => {
                const { data: candidateProfile } = await supabase
                  .from("candidate_profiles")
                  .select("*")
                  .eq("profile_id", assignment.candidate_id)
                  .single();

                if (candidateProfile) {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", candidateProfile.profile_id)
                    .single();

                  return {
                    ...assignment,
                    candidate_profile: { ...candidateProfile, profile },
                  };
                }
                return assignment;
              })
            );
            setAssignments(enrichedAssignments);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Pre-populate if assignment/candidate was provided
    if (selectedAssignmentId) {
      setFormData(prev => ({ ...prev, assignmentId: selectedAssignmentId }));
      setStep(2);
    }
    if (selectedCandidateId) {
      setFormData(prev => ({ ...prev, candidateId: selectedCandidateId }));
    }
  }, [isOpen, user?.id, selectedAssignmentId, selectedCandidateId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormData({
        assignmentId: "",
        candidateId: "",
        sessionDate: new Date().toISOString().split("T")[0],
        scores: {},
        strengths: [],
        areasForImprovement: [],
        notes: "",
      });
      setNewStrength("");
      setNewImprovement("");
    }
  }, [isOpen]);

  const handleScoreChange = (dimensionId: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [dimensionId]: score },
    }));
  };

  const addStrength = () => {
    if (newStrength.trim() && !formData.strengths.includes(newStrength.trim())) {
      setFormData(prev => ({ ...prev, strengths: [...prev.strengths, newStrength.trim()] }));
      setNewStrength("");
    }
  };

  const removeStrength = (s: string) => {
    setFormData(prev => ({ ...prev, strengths: prev.strengths.filter(str => str !== s) }));
  };

  const addImprovement = () => {
    if (newImprovement.trim() && !formData.areasForImprovement.includes(newImprovement.trim())) {
      setFormData(prev => ({ ...prev, areasForImprovement: [...prev.areasForImprovement, newImprovement.trim()] }));
      setNewImprovement("");
    }
  };

  const removeImprovement = (i: string) => {
    setFormData(prev => ({ ...prev, areasForImprovement: prev.areasForImprovement.filter(imp => imp !== i) }));
  };

  const selectCandidate = (assignmentId: string, candidateId: string) => {
    setFormData(prev => ({ ...prev, assignmentId, candidateId }));
    setStep(2);
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!user?.id || !mentorProfile || !formData.assignmentId) return;
    setIsSaving(true);

    try {
      // Create observation
      const { data: observation, error: obsError } = await supabase
        .from("mentor_observations")
        .insert({
          assignment_id: formData.assignmentId,
          mentor_id: mentorProfile.id,
          candidate_id: formData.candidateId,
          session_date: formData.sessionDate,
          behavioral_scores: formData.scores,
          strengths: formData.strengths,
          areas_for_improvement: formData.areasForImprovement,
          notes: formData.notes,
          is_locked: !asDraft,
        })
        .select()
        .single();

      if (obsError) {
        console.error("Error creating observation:", obsError);
        return;
      }

      if (!asDraft) {
        // Update mentor stats
        await supabase
          .from("mentor_profiles")
          .update({
            total_observations: (mentorProfile.total_observations || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mentorProfile.id);

        // Create growth log entry for candidate
        await supabase.from("growth_log_entries").insert({
          candidate_id: formData.candidateId,
          event_type: "observation",
          title: "Mentor Observation Completed",
          description: `Behavioral observation recorded by mentor`,
          source_component: "MentorLink",
          source_id: observation.id,
        });

        // Check if this is the 3rd observation for this assignment (ready for endorsement)
        const { count } = await supabase
          .from("mentor_observations")
          .select("*", { count: "exact", head: true })
          .eq("assignment_id", formData.assignmentId)
          .eq("is_locked", true);

        if (count && count >= 3) {
          // Update assignment to indicate ready for endorsement
          await supabase
            .from("mentor_assignments")
            .update({
              loop_number: 3,
              updated_at: new Date().toISOString(),
            })
            .eq("id", formData.assignmentId);

          // Update candidate's mentor_loops count
          await supabase
            .from("candidate_profiles")
            .update({
              mentor_loops: 3,
              updated_at: new Date().toISOString(),
            })
            .eq("profile_id", formData.candidateId);
        }
      }

      closeModal();
    } catch (error) {
      console.error("Error saving observation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAssignment = assignments.find(a => a.id === formData.assignmentId);
  const allDimensionsScored = BEHAVIORAL_DIMENSIONS.every(d => formData.scores[d.id] !== undefined);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Record Observation</h2>
              <p className="text-sm text-gray-400 mt-1">
                Step {step} of 3: {step === 1 ? "Select Candidate" : step === 2 ? "Behavioral Scoring" : "Summary & Submit"}
              </p>
            </div>
            <button onClick={closeModal} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 pt-4">
            <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-purple-500" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : step === 1 ? (
              // Step 1: Select Candidate
              <div className="space-y-4">
                <p className="text-gray-400">Select a mentee to record an observation for:</p>
                {assignments.length > 0 ? (
                  assignments.map(assignment => {
                    const profile = assignment.candidate_profile?.profile;
                    return (
                      <button
                        key={assignment.id}
                        onClick={() => selectCandidate(assignment.id, assignment.candidate_id)}
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors text-left flex items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                          {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{profile?.first_name} {profile?.last_name}</p>
                          <p className="text-sm text-gray-400">Loop {assignment.loop_number} of 3</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No active mentees assigned</p>
                  </div>
                )}
              </div>
            ) : step === 2 ? (
              // Step 2: Behavioral Scoring
              <div className="space-y-6">
                {selectedAssignment && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                      {selectedAssignment.candidate_profile?.profile?.first_name?.[0]}
                      {selectedAssignment.candidate_profile?.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {selectedAssignment.candidate_profile?.profile?.first_name} {selectedAssignment.candidate_profile?.profile?.last_name}
                      </p>
                      <p className="text-xs text-gray-400">Observation Session</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400 block mb-2">Session Date</label>
                  <input
                    type="date"
                    value={formData.sessionDate}
                    onChange={e => setFormData(prev => ({ ...prev, sessionDate: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-4">Rate each behavioral dimension (1-5):</p>
                  <div className="space-y-4">
                    {BEHAVIORAL_DIMENSIONS.map(dimension => (
                      <div key={dimension.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-white">{dimension.label}</p>
                            <p className="text-xs text-gray-500">{dimension.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(dimension.id, score)}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.scores[dimension.id] === score
                                  ? "bg-purple-600 text-white"
                                  : "bg-white/10 text-gray-400 hover:bg-white/20"
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
              </div>
            ) : (
              // Step 3: Notes & Submit
              <div className="space-y-6">
                {/* Strengths */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Observed Strengths</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.strengths.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                        {s}
                        <button onClick={() => removeStrength(s)} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStrength}
                      onChange={e => setNewStrength(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addStrength())}
                      placeholder="Add a strength..."
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                    <Button onClick={addStrength} size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Areas for Improvement */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Areas for Improvement</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.areasForImprovement.map(i => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                        {i}
                        <button onClick={() => removeImprovement(i)} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newImprovement}
                      onChange={e => setNewImprovement(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImprovement())}
                      placeholder="Add an area for improvement..."
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                    <Button onClick={addImprovement} size="sm" className="bg-amber-600 hover:bg-amber-500">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional observations or context..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Score Summary */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h3 className="font-medium text-white mb-3">Score Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {BEHAVIORAL_DIMENSIONS.map(d => (
                      <div key={d.id} className="flex justify-between">
                        <span className="text-gray-400">{d.label}:</span>
                        <span className="text-white font-medium">{formData.scores[d.id] || "-"}/5</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 flex justify-between">
                    <span className="text-gray-400">Average Score:</span>
                    <span className="text-purple-400 font-bold">
                      {Object.values(formData.scores).length > 0
                        ? (Object.values(formData.scores).reduce((a, b) => a + b, 0) / Object.values(formData.scores).length).toFixed(1)
                        : "-"}/5
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              {step === 3 && (
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Save as Draft
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 ? !formData.assignmentId : !allDimensionsScored}
                  className="bg-purple-600 hover:bg-purple-500"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSaving || !allDimensionsScored}
                  className="bg-purple-600 hover:bg-purple-500"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Submit & Lock
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
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
  { name: "Overview", href: "/dashboard/mentor", icon: TrendingUp },
  { name: "My Mentees", href: "/dashboard/mentor/mentees", icon: Users },
  { name: "Observations", href: "/dashboard/mentor/observations", icon: ClipboardCheck },
  { name: "Endorsements", href: "/dashboard/mentor/endorsements", icon: Award },
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
            .eq("mentor_id", mp.id)
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
  const { openModal } = useObservationModal();
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
            candidate_profiles!candidate_id(
              id,
              profile_id,
              current_tier,
              mentor_loops
            )
          `)
          .eq("mentor_id", mp.id)
          .order("created_at", { ascending: false });

        // For each assignment, get the candidate's profile data
        if (assignments && assignments.length > 0) {
          const enhancedAssignments = await Promise.all(
            assignments.map(async (assignment: MenteeWithProfile) => {
              if (assignment.candidate_profiles) {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", (assignment.candidate_profiles as { profile_id?: string }).profile_id)
                  .single();
                return {
                  ...assignment,
                  candidate_profile: {
                    ...assignment.candidate_profiles,
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
            const candidateProfile = assignment.candidate_profiles as {
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
                      onClick={() => openModal(assignment.id, assignment.candidate_id)}
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
  const { openModal } = useObservationModal();
  const [observations, setObservations] = useState<(MentorObservation & { candidate_profile?: { profile?: Profile } })[]>([]);
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
        // Get observations for this mentor directly
        const { data: obs } = await supabase
          .from("mentor_observations")
          .select("*")
          .eq("mentor_id", mp.id)
          .order("created_at", { ascending: false });

        if (obs) {
          // Enrich with candidate info
          const enrichedObs = await Promise.all(
            obs.map(async (o) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", o.candidate_id)
                .single();
              return { ...o, candidate_profile: { profile } };
            })
          );
          setObservations(enrichedObs);
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
        <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openModal()}>
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

// Endorsements component
const Endorsements = () => {
  const { user } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [readyForEndorsement, setReadyForEndorsement] = useState<(MentorAssignment & {
    candidate_profile?: CandidateProfile & { profile?: Profile };
    observation_count?: number;
  })[]>([]);
  const [pastEndorsements, setPastEndorsements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Endorsement form state
  const [endorsementForm, setEndorsementForm] = useState({
    decision: "" as "" | "proceed" | "redirect" | "pause",
    justification: "",
    redirectModule: "",
    redirectToLiveworks: false,
  });

  // Fetch BridgeFast modules for redirect option
  const [bridgefastModules, setBridgefastModules] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        // Get mentor profile
        const { data: mp } = await supabase
          .from("mentor_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        setMentorProfile(mp);

        if (mp) {
          // Get active assignments
          const { data: assignments } = await supabase
            .from("mentor_assignments")
            .select("*")
            .eq("mentor_id", mp.id)
            .eq("status", "active");

          if (assignments) {
            // For each assignment, get observation count and check if ready for endorsement
            const enrichedAssignments = await Promise.all(
              assignments.map(async (assignment) => {
                // Count locked observations
                const { count } = await supabase
                  .from("mentor_observations")
                  .select("*", { count: "exact", head: true })
                  .eq("assignment_id", assignment.id)
                  .eq("is_locked", true);

                // Get candidate profile
                const { data: candidateProfile } = await supabase
                  .from("candidate_profiles")
                  .select("*")
                  .eq("profile_id", assignment.candidate_id)
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
                  ...assignment,
                  observation_count: count || 0,
                  candidate_profile: candidateProfile ? { ...candidateProfile, profile } : undefined,
                };
              })
            );

            // Filter to those with 3+ observations
            setReadyForEndorsement(enrichedAssignments.filter(a => (a.observation_count || 0) >= 3));
          }

          // Get past endorsements
          const { data: endorsements } = await supabase
            .from("endorsements")
            .select("*")
            .eq("mentor_id", mp.id)
            .order("created_at", { ascending: false });

          if (endorsements) {
            // Enrich with candidate info
            const enrichedEndorsements = await Promise.all(
              endorsements.map(async (e) => {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", e.candidate_id)
                  .single();
                return { ...e, profile };
              })
            );
            setPastEndorsements(enrichedEndorsements);
          }
        }

        // Fetch BridgeFast modules
        const { data: modules } = await supabase
          .from("bridgefast_modules")
          .select("id, title")
          .order("order_index");
        setBridgefastModules(modules || []);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleSubmitEndorsement = async () => {
    if (!selectedAssignment || !mentorProfile || !endorsementForm.decision || !endorsementForm.justification.trim()) {
      return;
    }

    const assignment = readyForEndorsement.find(a => a.id === selectedAssignment);
    if (!assignment) return;

    setIsSubmitting(true);

    try {
      // Create endorsement record
      const { data: endorsement, error: endorsementError } = await supabase
        .from("endorsements")
        .insert({
          assignment_id: selectedAssignment,
          mentor_id: mentorProfile.id,
          candidate_id: assignment.candidate_id,
          decision: endorsementForm.decision,
          justification: endorsementForm.justification,
          redirect_module_id: endorsementForm.decision === "redirect" && endorsementForm.redirectModule ? endorsementForm.redirectModule : null,
          redirect_to_liveworks: endorsementForm.decision === "redirect" ? endorsementForm.redirectToLiveworks : false,
        })
        .select()
        .single();

      if (endorsementError) {
        console.error("Error creating endorsement:", endorsementError);
        return;
      }

      // Update mentor stats
      await supabase
        .from("mentor_profiles")
        .update({
          total_endorsements: (mentorProfile.total_endorsements || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mentorProfile.id);

      // Update candidate tier based on decision
      let newTier = assignment.candidate_profile?.current_tier || "developing";
      if (endorsementForm.decision === "proceed") {
        // Promote candidate
        const tierProgression: Record<string, string> = {
          developing: "emerging",
          emerging: "ready",
          ready: "ready", // Already at max
        };
        newTier = tierProgression[newTier] || "emerging";
      }

      await supabase
        .from("candidate_profiles")
        .update({
          current_tier: newTier,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", assignment.candidate_id);

      // Create growth log entry
      const decisionLabels: Record<string, string> = {
        proceed: "Proceed - Ready to advance",
        redirect: "Redirect - Additional training needed",
        pause: "Pause - Not ready to continue",
      };

      await supabase.from("growth_log_entries").insert({
        candidate_id: assignment.candidate_id,
        event_type: "endorsement",
        title: `Mentor Endorsement: ${endorsementForm.decision.charAt(0).toUpperCase() + endorsementForm.decision.slice(1)}`,
        description: decisionLabels[endorsementForm.decision],
        source_component: "MentorLink",
        source_id: endorsement.id,
      });

      // If decision is "proceed", generate Skill Passport
      if (endorsementForm.decision === "proceed") {
        // Calculate aggregate behavioral scores from observations
        const { data: observations } = await supabase
          .from("mentor_observations")
          .select("behavioral_scores")
          .eq("assignment_id", selectedAssignment)
          .eq("is_locked", true);

        let aggregatedScores: Record<string, number> = {};
        if (observations && observations.length > 0) {
          // Average all behavioral scores
          const scoreKeys = Object.keys(observations[0].behavioral_scores || {});
          scoreKeys.forEach(key => {
            const sum = observations.reduce((acc, o) => acc + (o.behavioral_scores?.[key] || 0), 0);
            aggregatedScores[key] = Math.round((sum / observations.length) * 10) / 10;
          });
        }

        // Generate unique verification code
        const verificationCode = `SKP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Create Skill Passport
        await supabase.from("skill_passports").insert({
          candidate_id: assignment.candidate_id,
          verification_code: verificationCode,
          readiness_tier: newTier,
          behavioral_scores: aggregatedScores,
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
        });

        // Update candidate profile
        await supabase
          .from("candidate_profiles")
          .update({
            has_skill_passport: true,
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", assignment.candidate_id);

        // Create growth log entry for passport
        await supabase.from("growth_log_entries").insert({
          candidate_id: assignment.candidate_id,
          event_type: "skill_passport",
          title: "Skill Passport Earned",
          description: `Verification Code: ${verificationCode}`,
          source_component: "SkillPassport",
        });
      }

      // Update assignment status
      await supabase
        .from("mentor_assignments")
        .update({
          status: endorsementForm.decision === "proceed" ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedAssignment);

      // Create notification for candidate
      await supabase.from("notifications").insert({
        user_id: assignment.candidate_id,
        title: "New Endorsement Received",
        message: `Your mentor has submitted an endorsement: ${decisionLabels[endorsementForm.decision]}`,
        type: "endorsement",
      });

      // Reset form and refresh
      setSelectedAssignment(null);
      setEndorsementForm({
        decision: "",
        justification: "",
        redirectModule: "",
        redirectToLiveworks: false,
      });

      // Refresh data
      window.location.reload();

    } catch (error) {
      console.error("Error submitting endorsement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAssignmentData = readyForEndorsement.find(a => a.id === selectedAssignment);

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
        <h1 className="text-3xl font-bold text-white mb-2">Endorsements</h1>
        <p className="text-gray-400">
          Issue endorsements for candidates who have completed 3 mentor observations.
        </p>
      </motion.div>

      {/* Ready for Endorsement */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Ready for Endorsement</h2>
        {readyForEndorsement.length > 0 ? (
          <div className="space-y-4">
            {readyForEndorsement.map((assignment) => {
              const profile = assignment.candidate_profile?.profile;
              const isSelected = selectedAssignment === assignment.id;

              return (
                <div
                  key={assignment.id}
                  className={`p-6 rounded-xl border transition-colors ${
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {profile?.first_name} {profile?.last_name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {assignment.observation_count} observations completed
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 mt-1">
                          Ready for endorsement
                        </span>
                      </div>
                    </div>
                    {!isSelected && (
                      <Button
                        onClick={() => setSelectedAssignment(assignment.id)}
                        className="bg-purple-600 hover:bg-purple-500"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Endorse
                      </Button>
                    )}
                  </div>

                  {/* Endorsement Form */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-6 pt-6 border-t border-white/10 space-y-6"
                    >
                      {/* Decision Selector */}
                      <div>
                        <label className="text-sm text-gray-400 block mb-3">Decision</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: "proceed", label: "Proceed", desc: "Ready to advance", color: "emerald" },
                            { value: "redirect", label: "Redirect", desc: "Needs more training", color: "amber" },
                            { value: "pause", label: "Pause", desc: "Not ready yet", color: "red" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setEndorsementForm(prev => ({ ...prev, decision: option.value as any }))}
                              className={`p-4 rounded-xl border text-left transition-colors ${
                                endorsementForm.decision === option.value
                                  ? option.color === "emerald"
                                    ? "bg-emerald-500/20 border-emerald-500/50"
                                    : option.color === "amber"
                                    ? "bg-amber-500/20 border-amber-500/50"
                                    : "bg-red-500/20 border-red-500/50"
                                  : "bg-white/5 border-white/10 hover:border-white/20"
                              }`}
                            >
                              <p className={`font-medium ${
                                option.color === "emerald" ? "text-emerald-400" :
                                option.color === "amber" ? "text-amber-400" : "text-red-400"
                              }`}>
                                {option.label}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Redirect Options */}
                      {endorsementForm.decision === "redirect" && (
                        <div className="space-y-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm text-amber-400">
                            Select where to redirect the candidate:
                          </p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm text-gray-400 block mb-2">BridgeFast Module</label>
                              <select
                                value={endorsementForm.redirectModule}
                                onChange={(e) => setEndorsementForm(prev => ({ ...prev, redirectModule: e.target.value, redirectToLiveworks: false }))}
                                className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                              >
                                <option value="">Select a module...</option>
                                {bridgefastModules.map(m => (
                                  <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400 text-sm">or</span>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={endorsementForm.redirectToLiveworks}
                                onChange={(e) => setEndorsementForm(prev => ({ ...prev, redirectToLiveworks: e.target.checked, redirectModule: "" }))}
                                className="w-5 h-5 rounded bg-white/10 border-white/20"
                              />
                              <span className="text-white">Redirect to LiveWorks project experience</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Justification */}
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Justification <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={endorsementForm.justification}
                          onChange={(e) => setEndorsementForm(prev => ({ ...prev, justification: e.target.value }))}
                          placeholder="Explain your decision and provide feedback for the candidate..."
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAssignment(null);
                            setEndorsementForm({
                              decision: "",
                              justification: "",
                              redirectModule: "",
                              redirectToLiveworks: false,
                            });
                          }}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitEndorsement}
                          disabled={!endorsementForm.decision || !endorsementForm.justification.trim() || isSubmitting}
                          className="bg-purple-600 hover:bg-purple-500"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4 mr-2" />
                              Submit Endorsement
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No candidates ready for endorsement</p>
            <p className="text-sm text-gray-500 mt-1">
              Candidates need 3 completed observations before endorsement
            </p>
          </div>
        )}
      </motion.div>

      {/* Past Endorsements */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Endorsement History</h2>
        {pastEndorsements.length > 0 ? (
          <div className="space-y-3">
            {pastEndorsements.map((endorsement) => (
              <div
                key={endorsement.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  endorsement.decision === "proceed"
                    ? "bg-emerald-500/20"
                    : endorsement.decision === "redirect"
                    ? "bg-amber-500/20"
                    : "bg-red-500/20"
                }`}>
                  {endorsement.decision === "proceed" ? (
                    <ThumbsUp className={`w-5 h-5 text-emerald-400`} />
                  ) : endorsement.decision === "redirect" ? (
                    <ArrowRight className={`w-5 h-5 text-amber-400`} />
                  ) : (
                    <AlertCircle className={`w-5 h-5 text-red-400`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">
                      {endorsement.profile?.first_name} {endorsement.profile?.last_name}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      endorsement.decision === "proceed"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : endorsement.decision === "redirect"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {endorsement.decision.charAt(0).toUpperCase() + endorsement.decision.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{endorsement.justification}</p>
                </div>
                <p className="text-xs text-gray-600">
                  {new Date(endorsement.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No endorsements given yet</p>
          </div>
        )}
      </motion.div>
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

// Inner dashboard component (to be wrapped with context)
const MentorDashboardInner = () => {
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
            <Route path="endorsements" element={<Endorsements />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Observation Form Modal */}
      <ObservationFormModal />
    </div>
  );
};

// Main MentorDashboard component with context provider
const MentorDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const openModal = (assignmentId?: string, candidateId?: string) => {
    setSelectedAssignmentId(assignmentId || null);
    setSelectedCandidateId(candidateId || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAssignmentId(null);
    setSelectedCandidateId(null);
  };

  return (
    <ObservationModalContext.Provider
      value={{
        isOpen: isModalOpen,
        openModal,
        closeModal,
        selectedAssignmentId,
        selectedCandidateId,
      }}
    >
      <MentorDashboardInner />
    </ObservationModalContext.Provider>
  );
};

export default MentorDashboard;
