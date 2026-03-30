import { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, Routes, Route, useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { startLoop, completeLoop, mentorOverride } from "@/lib/observationLoops";
import { useUnreadMessageCount, usePresence, isUserOnline, sendMessageNotification } from "@/hooks/useMessaging";
import { uploadMessageAttachment, isImageFile, formatFileSize } from "@/lib/fileUpload";
import AIAgent from "@/pages/dashboard/AIAgent";
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
  ChevronLeft,
  Eye,
  Award,
  Save,
  Plus,
  ExternalLink,
  Star,
  MessageSquare,
  Send,
  FileCheck,
  ThumbsUp,
  ArrowRight,
  Lock,
  Target,
  AlertTriangle,
  Bot,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Reply,
  Paperclip,
} from "lucide-react";

type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type MentorAssignment = Database["public"]["Tables"]["mentor_assignments"]["Row"];
type MentorObservation = Database["public"]["Tables"]["mentor_observations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];

// T3A 14 Behavioral Dimensions — locked framework (February 2026)
// MVP: top 7 active for initial launch; dimensions 8–14 post-launch
const BEHAVIORAL_DIMENSIONS = [
  { id: "integrity_ethics", label: "Integrity & Ethics", description: "Acting with honesty, maintaining trust, navigating ethical grey areas" },
  { id: "accountability_ownership", label: "Accountability & Ownership", description: "Taking responsibility for outcomes, following through without excuses" },
  { id: "execution_reliability", label: "Execution Reliability", description: "Delivering consistent, quality work on time without constant supervision" },
  { id: "communication_pressure", label: "Communication Under Pressure", description: "Clear, timely messages with appropriate tone when stakes are high" },
  { id: "collaboration_conflict", label: "Collaboration & Conflict Resolution", description: "Working effectively with diverse teams, navigating disagreements productively" },
  { id: "resilience_recovery", label: "Resilience & Recovery", description: "Bouncing back from setbacks, maintaining composure through failure" },
  { id: "learning_agility", label: "Learning Agility", description: "Receiving and applying feedback; proactively acquiring new knowledge" },
  { id: "workplace_adaptability", label: "Workplace Adaptability", description: "Navigating organizational culture, reading situations, adjusting behavior" },
  { id: "prioritization_time", label: "Prioritization & Time Management", description: "Managing competing demands, making sound decisions under deadline pressure" },
  { id: "professional_boundaries", label: "Professional Boundaries", description: "Maintaining appropriate workplace relationships, navigating social dynamics" },
  { id: "creative_problem_solving", label: "Creative Problem-Solving", description: "Finding resourceful solutions when standard approaches don't work" },
  { id: "customer_service_focus", label: "Customer & Service Focus", description: "Prioritizing stakeholder needs, delivering service with genuine care" },
  { id: "influence_persuasion", label: "Influence & Persuasion", description: "Gaining cooperation and buy-in without formal authority" },
  { id: "relationship_building", label: "Relationship Building", description: "Developing and maintaining professional networks that create mutual value" },
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
  const [assignedDimIds, setAssignedDimIds] = useState<string[]>([]);
  const [l1Feedback, setL1Feedback] = useState<Array<{ dimension_id: string; bars_score: number | null; ai_draft_feedback: string | null }>>([]);

  // Fetch mentor profile and assignments
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get mentor profile, auto-create if missing (safety net for pre-fix mentors)
        let { data: mp } = await supabase
          .from("mentor_profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (!mp) {
          const { data: created } = await supabase
            .from("mentor_profiles")
            .insert({ profile_id: user.id })
            .select("*")
            .single();
          mp = created;
        }
        setMentorProfile(mp);

        if (mp) {
          // Get active assignments with candidate info
          const { data: assignmentData } = await supabase
            .from("mentor_assignments")
            .select("*")
            .eq("mentor_id", mp.id)
            .eq("status", "active");

          if (assignmentData) {
            // Fetch candidate profiles for each assignment (candidate_id = candidate_profiles.id)
            const enrichedAssignments = await Promise.all(
              assignmentData.map(async (assignment) => {
                const { data: candidateProfile } = await supabase
                  .from("candidate_profiles")
                  .select("*")
                  .eq("id", assignment.candidate_id)
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

    // Pre-populate if assignment/candidate was provided — also fetch assigned dims + L1 feedback
    if (selectedAssignmentId && selectedCandidateId) {
      setFormData(prev => ({ ...prev, assignmentId: selectedAssignmentId, candidateId: selectedCandidateId }));

      // Fetch assigned dimensions for this assignment
      supabase
        .from("mentor_assigned_dimensions")
        .select("dimension_id")
        .eq("assignment_id", selectedAssignmentId)
        .eq("is_active", true)
        .then(({ data: dims }) => {
          if (dims) setAssignedDimIds(dims.map((d: { dimension_id: string }) => d.dimension_id));
        });

      // Fetch L1 AI feedback for this candidate
      supabase
        .from("observation_feedback")
        .select("dimension_id, bars_score, ai_draft_feedback")
        .eq("assignment_id", selectedAssignmentId)
        .eq("candidate_id", selectedCandidateId)
        .eq("feedback_level", 1)
        .then(({ data: l1 }) => {
          if (l1) setL1Feedback(l1);
        });

      setStep(2);
    } else if (selectedAssignmentId) {
      setFormData(prev => ({ ...prev, assignmentId: selectedAssignmentId }));
      setStep(2);
    }
    if (selectedCandidateId && !selectedAssignmentId) {
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

  const selectCandidate = async (assignmentId: string, candidateId: string) => {
    setFormData(prev => ({ ...prev, assignmentId, candidateId }));

    // Fetch assigned dimensions for this assignment
    const { data: dims } = await supabase
      .from("mentor_assigned_dimensions")
      .select("dimension_id")
      .eq("assignment_id", assignmentId)
      .eq("is_active", true);
    if (dims) setAssignedDimIds(dims.map((d: { dimension_id: string }) => d.dimension_id));

    // Fetch L1 AI feedback for this candidate
    const { data: l1 } = await supabase
      .from("observation_feedback")
      .select("dimension_id, bars_score, ai_draft_feedback")
      .eq("assignment_id", assignmentId)
      .eq("candidate_id", candidateId)
      .eq("feedback_level", 1);
    if (l1) setL1Feedback(l1);

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
        // Write L2 observation feedback for each scored dimension
        for (const dimId of Object.keys(formData.scores)) {
          await supabase.from("observation_feedback").insert({
            assignment_id: formData.assignmentId,
            candidate_id: formData.candidateId,
            mentor_id: mentorProfile.id,
            dimension_id: dimId,
            feedback_level: 2,
            bars_score: formData.scores[dimId],
            mentor_feedback: formData.notes || null,
            status: "approved",
            mentor_approved: true,
            mentor_approved_at: new Date().toISOString(),
          });

          // Record loop tracking for L2 observation
          const loop = await startLoop(formData.candidateId, formData.assignmentId, dimId, 2, mentorProfile.id);
          if (loop) await completeLoop(loop.id, formData.scores[dimId], 'proceed');
        }

        // Update mentor stats
        await supabase
          .from("mentor_profiles")
          .update({
            total_observations: (mentorProfile.total_observations || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mentorProfile.id);

        // Get candidate's profile_id for growth log (formData.candidateId = candidate_profiles.id)
        const { data: cpForLog } = await supabase
          .from("candidate_profiles")
          .select("profile_id")
          .eq("id", formData.candidateId)
          .single();

        // Create growth log entry for candidate (uses profiles.id)
        if (cpForLog) {
          await supabase.from("growth_log_entries").insert({
            candidate_id: cpForLog.profile_id,
            event_type: "observation",
            title: "Mentor Observation Completed",
            description: `Behavioral observation recorded by mentor`,
            source_component: "MentorLink",
            source_id: observation.id,
          });
        }

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

          // Update candidate's mentor_loops count (candidateId = candidate_profiles.id)
          await supabase
            .from("candidate_profiles")
            .update({
              mentor_loops: 3,
              updated_at: new Date().toISOString(),
            })
            .eq("id", formData.candidateId);
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
  const scoringDimensions = assignedDimIds.length > 0
    ? BEHAVIORAL_DIMENSIONS.filter(d => assignedDimIds.includes(d.id))
    : BEHAVIORAL_DIMENSIONS;
  const allDimensionsScored = scoringDimensions.every(d => formData.scores[d.id] !== undefined);

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
          className="bg-gray-900 border border-white/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/30">
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
                    s <= step ? "bg-purple-500" : "bg-black"
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
                        className="w-full p-4 rounded-xl bg-black border border-white/30 hover:border-purple-500/50 transition-colors text-left flex items-center gap-4"
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
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black">
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
                    className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <details className="mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <summary className="text-sm font-medium text-indigo-400 cursor-pointer hover:text-indigo-300">
                      L2 Session Script (Read before starting)
                    </summary>
                    <div className="mt-3 text-sm text-gray-300 space-y-3">
                      <p className="text-indigo-300 font-medium">Opening Script — Read verbatim to candidate:</p>
                      <blockquote className="pl-3 border-l-2 border-indigo-500/50 text-gray-400 italic space-y-2">
                        <p>"Hello <span className="text-white">[Candidate Name]</span>, my name is <span className="text-white">[Mentor Name]</span>, and I'll be conducting your L2 live observation session today.</p>
                        <p>Before we begin, I want to confirm a few things:</p>
                        <p>This session will be used to observe and document your behavioural responses in a structured professional context. Your responses will be scored using The 3rd Academy's 4-point Behaviourally Anchored Rating Scale.</p>
                        <p>This session may be recorded for quality assurance and audit purposes. Do you consent to proceed with the session under these conditions?</p>
                        <p>[Wait for verbal confirmation]</p>
                        <p>Thank you. During this session, I'll present you with scenarios related to your assigned behavioural dimensions. Please respond as naturally and honestly as you can — there are no trick questions, and this is not a test you can fail. The purpose is to observe how you approach workplace situations.</p>
                        <p>Do you have any questions before we begin?"</p>
                      </blockquote>
                      <p className="text-xs text-gray-500 mt-2">Ref: BOSD Section 5.14, Doctrine Box 47. Minor phrasing adjustments for natural delivery are permitted, but consent confirmation and recording disclosure must be delivered in full.</p>
                    </div>
                  </details>
                  <p className="text-sm text-gray-400 mb-2">Assess each behavioral dimension using the 4-point BARS scale:</p>
                  <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-black/60 border border-white/10 text-center">
                    <div><span className="text-orange-400 font-bold text-sm">1</span><p className="text-[10px] text-gray-500">Not Yet Demonstrated</p></div>
                    <div><span className="text-amber-400 font-bold text-sm">2</span><p className="text-[10px] text-gray-500">Emerging</p></div>
                    <div><span className="text-blue-400 font-bold text-sm">3</span><p className="text-[10px] text-gray-500">Competent</p></div>
                    <div><span className="text-emerald-400 font-bold text-sm">4</span><p className="text-[10px] text-gray-500">Strong</p></div>
                  </div>
                  <div className="space-y-4">
                    {scoringDimensions.map(dimension => {
                      const l1 = l1Feedback.find(f => f.dimension_id === dimension.id);
                      return (
                        <div key={dimension.id} className="p-4 rounded-lg bg-black border border-white/30">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-white">{dimension.label}</p>
                              <p className="text-xs text-gray-500">{dimension.description}</p>
                            </div>
                            {l1 && l1.bars_score && (
                              <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-[10px] text-gray-500 uppercase">L1 AI Score</p>
                                <span className={`text-sm font-bold ${
                                  l1.bars_score >= 4 ? "text-emerald-400" : l1.bars_score >= 3 ? "text-blue-400" : l1.bars_score >= 2 ? "text-amber-400" : "text-orange-400"
                                }`}>{l1.bars_score}/4</span>
                              </div>
                            )}
                          </div>
                          {l1 && l1.ai_draft_feedback && (
                            <details className="mb-2">
                              <summary className="text-xs text-indigo-400/80 p-2 rounded bg-indigo-500/10 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-colors">
                                L1 AI: {l1.ai_draft_feedback.length > 100 ? l1.ai_draft_feedback.substring(0, 100) + "..." : l1.ai_draft_feedback}
                              </summary>
                              <p className="text-xs text-indigo-400/70 p-2 mt-1 rounded bg-indigo-500/5 border border-indigo-500/10 whitespace-pre-wrap">
                                {l1.ai_draft_feedback}
                              </p>
                            </details>
                          )}
                          <div className="flex gap-2 mt-2">
                            {[
                              { score: 1, label: "Not Yet", color: "bg-orange-600" },
                              { score: 2, label: "Emerging", color: "bg-amber-600" },
                              { score: 3, label: "Competent", color: "bg-blue-600" },
                              { score: 4, label: "Strong", color: "bg-emerald-600" },
                            ].map(({ score, label, color }) => (
                              <button
                                type="button"
                                key={score}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScoreChange(dimension.id, score); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none ${
                                  formData.scores[dimension.id] === score
                                    ? `${color} text-white`
                                    : "bg-black text-gray-400 hover:bg-white/20"
                                }`}
                                title={label}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
                      className="flex-1 px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
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
                      className="flex-1 px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
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
                    className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Score Summary */}
                <div className="p-4 rounded-lg bg-purple-500/30 border border-purple-500/20">
                  <h3 className="font-medium text-white mb-3">Score Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {BEHAVIORAL_DIMENSIONS.map(d => (
                      <div key={d.id} className="flex justify-between">
                        <span className="text-gray-400">{d.label}:</span>
                        <span className="text-white font-medium">{formData.scores[d.id] || "-"}/4</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 flex justify-between">
                    <span className="text-gray-400">Average Score:</span>
                    <span className="text-purple-400 font-bold">
                      {Object.values(formData.scores).length > 0
                        ? (Object.values(formData.scores).reduce((a, b) => a + b, 0) / Object.values(formData.scores).length).toFixed(1)
                        : "-"}/4
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/30">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="border-white/20 text-white hover:bg-black"
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
                  className="border-white/20 text-white hover:bg-black"
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
  { name: "Messages", href: "/dashboard/mentor/messages", icon: MessageSquare },
  { name: "Profile", href: "/dashboard/mentor/profile", icon: User },
  { name: "Praxis", href: "/dashboard/mentor/agent", icon: Bot },
  { name: "Settings", href: "/dashboard/mentor/settings", icon: Settings },
];

// Overview component with real data
const Overview = () => {
  const { profile, user } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [activeMentees, setActiveMentees] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingObservations, setPendingObservations] = useState(0);
  const [needsL2, setNeedsL2] = useState(0);
  const [readyForEndorsement, setReadyForEndorsement] = useState(0);
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

          // Count pending requests
          const { count: pendingCount } = await supabase
            .from("mentor_assignments")
            .select("*", { count: "exact", head: true })
            .eq("mentor_id", mp.id)
            .eq("status", "pending");
          setPendingRequests(pendingCount || 0);

          // Candidates needing L2 (have L1 but no L2)
          const { data: activeAssignments } = await supabase
            .from("mentor_assignments")
            .select("id, candidate_id")
            .eq("mentor_id", mp.id)
            .eq("status", "active");

          let needsL2Count = 0;
          let readyForEndorsementCount = 0;
          if (activeAssignments) {
            for (const a of activeAssignments) {
              const { count: l1Count } = await supabase
                .from("observation_feedback")
                .select("*", { count: "exact", head: true })
                .eq("assignment_id", a.id)
                .eq("feedback_level", 1);
              const { count: l2Count } = await supabase
                .from("observation_feedback")
                .select("*", { count: "exact", head: true })
                .eq("assignment_id", a.id)
                .eq("feedback_level", 2);
              if ((l1Count || 0) > 0 && (l2Count || 0) === 0) needsL2Count++;
              if ((l1Count || 0) > 0 && (l2Count || 0) > 0) readyForEndorsementCount++;
            }
          }
          setNeedsL2(needsL2Count);
          setReadyForEndorsement(readyForEndorsementCount);
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

      {/* Action Required alerts */}
      {(pendingRequests > 0 || needsL2 > 0 || readyForEndorsement > 0) && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Action Required
          </h2>
          {pendingRequests > 0 && (
            <Link to="/dashboard/mentor/mentees">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between hover:bg-amber-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="font-medium text-white">{pendingRequests} Pending Mentee Request{pendingRequests > 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-400">Candidates waiting for your approval</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </Link>
          )}
          {needsL2 > 0 && (
            <Link to="/dashboard/mentor/mentees">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between hover:bg-blue-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">{needsL2} Candidate{needsL2 > 1 ? 's' : ''} Ready for L2 Observation</p>
                    <p className="text-xs text-gray-400">L1 complete — schedule live observation</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </Link>
          )}
          {readyForEndorsement > 0 && (
            <Link to="/dashboard/mentor/endorsements">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between hover:bg-emerald-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-medium text-white">{readyForEndorsement} Candidate{readyForEndorsement > 1 ? 's' : ''} Ready for Endorsement</p>
                    <p className="text-xs text-gray-400">L1 + L2 complete — submit endorsement decision</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </Link>
          )}
        </motion.div>
      )}

      {/* Alert if not accepting mentees */}
      {mentorProfile && !mentorProfile.is_accepting && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-amber-500/30 border border-amber-500/20 flex items-center gap-3"
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
            className="relative group p-6 rounded-2xl bg-black backdrop-blur-xl border border-white/30 hover:border-white/20 transition-colors"
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
            className="p-6 rounded-xl bg-black border border-white/30 hover:border-purple-500/30 transition-colors group"
          >
            <Users className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">View Mentees</h3>
            <p className="text-sm text-gray-400">Manage your assigned candidates</p>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 mt-3 transition-colors" />
          </Link>

          <Link
            to="/dashboard/mentor/observations"
            className="p-6 rounded-xl bg-black border border-white/30 hover:border-purple-500/30 transition-colors group"
          >
            <ClipboardCheck className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Record Observation</h3>
            <p className="text-sm text-gray-400">Document candidate behaviors</p>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 mt-3 transition-colors" />
          </Link>

          <Link
            to="/dashboard/mentor/schedule"
            className="p-6 rounded-xl bg-black border border-white/30 hover:border-purple-500/30 transition-colors group"
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
        {pendingRequests > 0 || pendingObservations > 0 ? (
          <div className="space-y-3">
            {pendingRequests > 0 && (
              <Link to="/dashboard/mentor/mentees" className="block">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center gap-4 hover:border-amber-500/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{pendingRequests} mentee request{pendingRequests > 1 ? "s" : ""} awaiting approval</p>
                    <p className="text-sm text-gray-400">Review and accept or decline</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </div>
              </Link>
            )}
            {pendingObservations > 0 && (
              <div className="p-4 rounded-xl bg-black border border-white/30 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{pendingObservations} pending observations</p>
                  <p className="text-sm text-gray-400">Complete your scheduled observations</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-black border border-white/30 text-center">
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
      current_tier?: string;
      mentor_loops?: number;
    };
    assigned_dimensions?: string[];
    observation_count?: number;
    l1_completed?: boolean;
    l1_dimensions_scored?: number;
  }
  const [mentees, setMentees] = useState<MenteeWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [bridgefastModules, setBridgefastModules] = useState<{ id: string; title: string; behavioral_dimension: string }[]>([]);
  const [recommendModal, setRecommendModal] = useState<{ assignmentId: string; candidateProfileId: string; candidateName: string } | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [recommendNote, setRecommendNote] = useState("");

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
      // Get all assignments (including pending)
      const { data: assignments } = await supabase
        .from("mentor_assignments")
        .select("*")
        .eq("mentor_id", mp.id)
        .order("created_at", { ascending: false });

      // For each assignment, look up candidate profile and user profile
      if (assignments && assignments.length > 0) {
        const enhancedAssignments = await Promise.all(
          assignments.map(async (assignment) => {
            // candidate_id references candidate_profiles.id
            const { data: candidateProfile } = await supabase
              .from("candidate_profiles")
              .select("id, profile_id, current_tier, mentor_loops")
              .eq("id", assignment.candidate_id)
              .single();

            if (candidateProfile) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", candidateProfile.profile_id)
                .single();

              // Fetch assigned dimensions for this assignment
              const { data: dims } = await supabase
                .from("mentor_assigned_dimensions")
                .select("dimension_id")
                .eq("assignment_id", assignment.id)
                .eq("is_active", true);

              // Count L2 observations (locked mentor_observations)
              const { count: obsCount } = await supabase
                .from("mentor_observations")
                .select("*", { count: "exact", head: true })
                .eq("assignment_id", assignment.id)
                .eq("is_locked", true);

              // Count L1 AI feedback dimensions scored
              const { count: l1Count } = await supabase
                .from("observation_feedback")
                .select("*", { count: "exact", head: true })
                .eq("assignment_id", assignment.id)
                .eq("candidate_id", assignment.candidate_id)
                .eq("feedback_level", 1);

              return {
                ...assignment,
                candidate_profile: {
                  ...candidateProfile,
                  profile: profileData,
                },
                assigned_dimensions: dims?.map((d: { dimension_id: string }) => d.dimension_id) || [],
                observation_count: obsCount || 0,
                l1_completed: (l1Count || 0) > 0,
                l1_dimensions_scored: l1Count || 0,
              };
            }
            return assignment;
          })
        );
        setMentees(enhancedAssignments);
      } else {
        setMentees([]);
      }

      // Fetch BridgeFast modules for recommendations
      const { data: modules } = await supabase
        .from("bridgefast_modules")
        .select("id, title, behavioral_dimension")
        .eq("is_active", true);
      setBridgefastModules(modules || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchMentees();
  }, [user?.id]);

  const handleApproveRequest = async (assignmentId: string, candidateProfileId: string) => {
    setIsProcessing(assignmentId);
    try {
      // Update status to active
      await supabase
        .from("mentor_assignments")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", assignmentId);

      // Get the candidate's profile_id to send notification
      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("profile_id")
        .eq("id", candidateProfileId)
        .single();

      if (cp) {
        await supabase.from("notifications").insert({
          user_id: cp.profile_id,
          type: "mentor_approved",
          title: "Mentor Request Approved!",
          message: "Your mentor request has been approved. You can now begin your Observation Pathway.",
        });
      }

      await fetchMentees();
    } catch (error) {
      console.error("Error approving request:", error);
    }
    setIsProcessing(null);
  };

  const handleDeclineRequest = async (assignmentId: string, candidateProfileId: string) => {
    setIsProcessing(assignmentId);
    try {
      await supabase
        .from("mentor_assignments")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", assignmentId);

      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("profile_id")
        .eq("id", candidateProfileId)
        .single();

      if (cp) {
        await supabase.from("notifications").insert({
          user_id: cp.profile_id,
          type: "mentor_declined",
          title: "Mentor Request Update",
          message: "Your mentor request was not accepted. You can request a different mentor.",
        });
      }

      await fetchMentees();
    } catch (error) {
      console.error("Error declining request:", error);
    }
    setIsProcessing(null);
  };

  const handleRecommendModules = async () => {
    if (!recommendModal || selectedModules.length === 0) return;
    setIsProcessing("recommend");

    try {
      // Get candidate's profile_id for notification
      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("profile_id")
        .eq("id", recommendModal.candidateProfileId)
        .single();

      if (cp) {
        const moduleNames = selectedModules
          .map((id) => bridgefastModules.find((m) => m.id === id)?.title)
          .filter(Boolean)
          .join(", ");

        await supabase.from("notifications").insert({
          user_id: cp.profile_id,
          type: "bridgefast_recommendation",
          title: "Mentor Recommended BridgeFast Modules",
          message: `Your mentor recommends completing these BridgeFast modules: ${moduleNames}. ${recommendNote ? `Note: ${recommendNote}` : ""}`,
          action_url: "/dashboard/candidate/training",
        });

        // Log to candidate's growth log
        await supabase.from("growth_log_entries").insert({
          candidate_id: cp.profile_id,
          event_type: "training",
          title: "Mentor Recommended BridgeFast Modules",
          description: `Your mentor recommended ${selectedModules.length} BridgeFast module(s): ${moduleNames}`,
          source_component: "MentorRecommendation",
          metadata: {
            module_ids: selectedModules,
            module_names: moduleNames,
            mentor_note: recommendNote,
          },
        });
      }

      setRecommendModal(null);
      setSelectedModules([]);
      setRecommendNote("");
    } catch (error) {
      console.error("Error recommending modules:", error);
    }
    setIsProcessing(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const pendingRequests = mentees.filter((m) => m.status === "pending");
  const activeMentees = mentees.filter((m) => m.status === "active");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pb-4 -mx-4 px-4 pt-2 -mt-2 border-b border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">My Mentees</h1>
        <p className="text-gray-400">
          View and manage your assigned candidates.
        </p>
      </motion.div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-amber-400">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.map((assignment) => {
            const profile = assignment.candidate_profile?.profile;
            return (
              <div
                key={assignment.id}
                className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                    {profile?.first_name?.[0]}
                    {profile?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">
                      {profile?.first_name} {profile?.last_name}
                    </h3>
                    <p className="text-sm text-gray-400">{profile?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => handleApproveRequest(assignment.id, assignment.candidate_id)}
                      disabled={isProcessing === assignment.id}
                    >
                      {isProcessing === assignment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeclineRequest(assignment.id, assignment.candidate_id)}
                      disabled={isProcessing === assignment.id}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Active Mentees Section */}
      {activeMentees.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-emerald-400">
                Active Mentees ({activeMentees.length})
              </h2>
            </div>
          )}

          {activeMentees.map((assignment) => {
            const profile = assignment.candidate_profile?.profile;

            return (
              <div
                key={assignment.id}
                className="p-6 rounded-xl bg-black border border-white/30 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                    {profile?.first_name?.[0]}
                    {profile?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link to={`/dashboard/mentor/mentees/${assignment.id}`} className="font-semibold text-white hover:text-indigo-400 transition-colors">
                        {profile?.first_name} {profile?.last_name}
                      </Link>
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                        active
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{profile?.email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                      {assignment.l1_completed ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          L1 Complete ({assignment.l1_dimensions_scored} dims)
                        </span>
                      ) : (
                        <span className="text-amber-400">L1 Not started</span>
                      )}
                      <span className="text-gray-500">
                        {assignment.observation_count || 0} L2 observations
                      </span>
                      <span className="text-gray-500">
                        Tier: {assignment.candidate_profile?.current_tier?.replace("_", " ") || "Not assessed"}
                      </span>
                    </div>
                    {assignment.assigned_dimensions && assignment.assigned_dimensions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {assignment.assigned_dimensions.map(dimId => {
                          const dim = BEHAVIORAL_DIMENSIONS.find(d => d.id === dimId);
                          return (
                            <span key={dimId} className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                              {dim?.label || dimId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {(!assignment.assigned_dimensions || assignment.assigned_dimensions.length === 0) && (
                      <p className="text-xs text-amber-400 mt-2">No dimensions assigned yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => setRecommendModal({
                        assignmentId: assignment.id,
                        candidateProfileId: assignment.candidate_id,
                        candidateName: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
                      })}
                    >
                      <Award className="w-4 h-4 mr-1" />
                      Recommend
                    </Button>
                    <Link to={`/dashboard/mentor/assign-dimensions/${assignment.id}/${assignment.candidate_id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Dimensions
                      </Button>
                    </Link>
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
        !pendingRequests.length && (
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-2xl bg-black border border-white/30 text-center"
          >
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No mentees assigned yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Candidates will request you as their mentor
            </p>
          </motion.div>
        )
      )}

      {/* BridgeFast Module Recommendation Modal */}
      {recommendModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setRecommendModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl border border-white/30 w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2">
              Recommend BridgeFast Modules
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Select modules to recommend to {recommendModal.candidateName}.
            </p>

            <div className="space-y-2 mb-6">
              {bridgefastModules.map((module) => (
                <label
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModules.includes(module.id)
                      ? "bg-indigo-500/20 border-indigo-500/30"
                      : "bg-black border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(module.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedModules([...selectedModules, module.id]);
                      } else {
                        setSelectedModules(selectedModules.filter((id) => id !== module.id));
                      }
                    }}
                    className="rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white text-sm">{module.title}</p>
                    <p className="text-xs text-gray-500">{module.behavioral_dimension}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">Note to Candidate (Optional)</label>
              <textarea
                value={recommendNote}
                onChange={(e) => setRecommendNote(e.target.value)}
                placeholder="Add a note about why you recommend these modules..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setRecommendModal(null); setSelectedModules([]); setRecommendNote(""); }}
                className="flex-1 border-white/20 text-white hover:bg-black"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecommendModules}
                disabled={selectedModules.length === 0 || isProcessing === "recommend"}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500"
              >
                {isProcessing === "recommend" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Send Recommendation
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Dimension Assignment Page — Mentor assigns behavioral dimensions to a candidate
const AssignDimensions = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [existingDimensions, setExistingDimensions] = useState<string[]>([]);

  // Extract assignment ID and candidate ID from URL
  const pathParts = location.pathname.split("/");
  const assignmentId = pathParts[pathParts.length - 2];
  const candidateId = pathParts[pathParts.length - 1];

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !assignmentId || !candidateId) return;

      try {
        // Get candidate name via candidate_profiles → profiles
        const { data: cp } = await supabase
          .from("candidate_profiles")
          .select("profile_id")
          .eq("id", candidateId)
          .single();
        if (cp) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", cp.profile_id)
            .single();
          if (profile) setCandidateName(`${profile.first_name} ${profile.last_name}`);
        }

        // Get existing assigned dimensions
        const { data: dims } = await supabase
          .from("mentor_assigned_dimensions")
          .select("dimension_id")
          .eq("assignment_id", assignmentId)
          .eq("is_active", true);

        if (dims && dims.length > 0) {
          const dimIds = dims.map((d: { dimension_id: string }) => d.dimension_id);
          setExistingDimensions(dimIds);
          setSelectedDimensions(dimIds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, assignmentId, candidateId]);

  const toggleDimension = (dimId: string) => {
    if (selectedDimensions.includes(dimId)) {
      setSelectedDimensions(selectedDimensions.filter(d => d !== dimId));
    } else {
      setSelectedDimensions([...selectedDimensions, dimId]);
    }
  };

  const saveDimensions = async () => {
    if (!user?.id || !assignmentId || !candidateId) return;
    setIsSaving(true);

    try {
      // Deactivate existing dimensions not in new selection
      const toDeactivate = existingDimensions.filter(d => !selectedDimensions.includes(d));
      if (toDeactivate.length > 0) {
        for (const dimId of toDeactivate) {
          await supabase
            .from("mentor_assigned_dimensions")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("assignment_id", assignmentId)
            .eq("dimension_id", dimId);
        }
      }

      // Get mentor_profiles.id for the FK
      const { data: mp } = await supabase
        .from("mentor_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .single();
      const mentorProfileId = mp?.id || user.id;

      // Insert new dimensions
      const toInsert = selectedDimensions.filter(d => !existingDimensions.includes(d));
      if (toInsert.length > 0) {
        await supabase.from("mentor_assigned_dimensions").insert(
          toInsert.map(dimId => ({
            assignment_id: assignmentId,
            mentor_id: mentorProfileId,
            candidate_id: candidateId,
            dimension_id: dimId,
          }))
        );
      }

      setExistingDimensions(selectedDimensions);

      // Get profiles.id for growth_log_entries (candidateId = candidate_profiles.id)
      const { data: cpForLog } = await supabase
        .from("candidate_profiles")
        .select("profile_id")
        .eq("id", candidateId)
        .single();

      // Create growth log entry (FK to profiles.id)
      if (cpForLog) {
        await supabase.from("growth_log_entries").insert({
          candidate_id: cpForLog.profile_id,
          event_type: "observation",
          title: "Observation Dimensions Assigned",
          description: `Your mentor has assigned ${selectedDimensions.length} behavioral dimensions for observation.`,
          source_component: "MentorLink",
        });
      }
    } catch (error) {
      console.error("Error saving dimensions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // MVP dimensions (first 5)
  const mvpDimensions = BEHAVIORAL_DIMENSIONS.slice(0, 7);
  const futureDimensions = BEHAVIORAL_DIMENSIONS.slice(5);

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
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants}>
        <Link to="/dashboard/mentor/mentees" className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
          &larr; Back to Mentees
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Assign Observation Dimensions</h1>
        <p className="text-gray-400">
          Select the behavioral dimensions for <span className="text-white font-medium">{candidateName}</span> to be observed on. The candidate cannot begin any observation activity until dimensions are assigned.
        </p>
      </motion.div>

      {/* MVP Dimensions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-white mb-3">MVP Dimensions (Active)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {mvpDimensions.map(dim => (
            <button
              key={dim.id}
              onClick={() => toggleDimension(dim.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedDimensions.includes(dim.id)
                  ? "bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30"
                  : "bg-black border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedDimensions.includes(dim.id) ? "bg-emerald-500" : "bg-black/60"
                }`}>
                  {selectedDimensions.includes(dim.id) ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Target className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{dim.label}</p>
                  <p className="text-xs text-gray-500">{dim.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Future Dimensions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-white mb-3">Additional Dimensions (Post-MVP)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {futureDimensions.map(dim => (
            <button
              key={dim.id}
              onClick={() => toggleDimension(dim.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedDimensions.includes(dim.id)
                  ? "bg-indigo-500/20 border-indigo-500/50 ring-2 ring-indigo-500/30"
                  : "bg-black border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedDimensions.includes(dim.id) ? "bg-indigo-500" : "bg-black/60"
                }`}>
                  {selectedDimensions.includes(dim.id) ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Target className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{dim.label}</p>
                  <p className="text-xs text-gray-500">{dim.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Save */}
      <motion.div variants={itemVariants} className="flex items-center justify-between p-4 rounded-xl bg-black border border-white/10">
        <div>
          <p className="text-sm text-gray-400">
            {selectedDimensions.length} dimension{selectedDimensions.length !== 1 ? "s" : ""} selected
          </p>
          {selectedDimensions.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">At least one dimension must be assigned for the candidate to begin observations.</p>
          )}
        </div>
        <Button
          onClick={saveDimensions}
          disabled={isSaving || selectedDimensions.length === 0}
          className="bg-purple-600 hover:bg-purple-500"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Assigned Dimensions</>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};

// Mentee Detail — Focused view of a single mentee's observation journey
const MenteeDetail = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { openModal } = useObservationModal();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState<MentorAssignment | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<{ profile?: Profile; current_tier?: string } | null>(null);
  const [assignedDims, setAssignedDims] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Array<{ dimension_id: string; feedback_level: number; bars_score: number | null; status: string; ai_draft_feedback: string | null; mentor_feedback: string | null; created_at: string }>>([]);
  const [observations, setObservations] = useState<Array<{ id: string; session_date: string; behavioral_scores: Record<string, number>; is_locked: boolean; notes: string }>>([]);
  const [endorsement, setEndorsement] = useState<{ decision: string; justification: string; created_at: string } | null>(null);
  const [loopData, setLoopData] = useState<Array<{ dimension_id: string; loop_number: number; status: string; bars_score: number | null; endorsement_decision: string | null; completed_at: string | null; cooldown_ends_at: string | null }>>([]);
  const [overrideModal, setOverrideModal] = useState<{ dimId: string; dimLabel: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!assignmentId || !user?.id) return;

      try {
        // Fetch assignment
        const { data: asgn } = await supabase
          .from("mentor_assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();
        if (!asgn) { setIsLoading(false); return; }
        setAssignment(asgn);

        // Fetch candidate profile + user profile
        const { data: cp } = await supabase
          .from("candidate_profiles")
          .select("id, profile_id, current_tier")
          .eq("id", asgn.candidate_id)
          .single();
        if (cp) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", cp.profile_id)
            .single();
          setCandidateProfile({ ...cp, profile: prof });
        }

        // Fetch assigned dimensions
        const { data: dims } = await supabase
          .from("mentor_assigned_dimensions")
          .select("dimension_id")
          .eq("assignment_id", assignmentId)
          .eq("is_active", true);
        if (dims) setAssignedDims(dims.map((d: { dimension_id: string }) => d.dimension_id));

        // Fetch observation feedback (L1 + L2)
        const { data: fb } = await supabase
          .from("observation_feedback")
          .select("dimension_id, feedback_level, bars_score, status, ai_draft_feedback, mentor_feedback, created_at")
          .eq("assignment_id", assignmentId)
          .eq("candidate_id", asgn.candidate_id)
          .order("created_at", { ascending: true });
        if (fb) setFeedback(fb);

        // Fetch mentor observations
        const { data: obs } = await supabase
          .from("mentor_observations")
          .select("id, session_date, behavioral_scores, is_locked, notes")
          .eq("assignment_id", assignmentId)
          .order("session_date", { ascending: false });
        if (obs) setObservations(obs);

        // Fetch loop tracking data
        const { data: loops } = await supabase
          .from("observation_loops")
          .select("dimension_id, loop_number, status, bars_score, endorsement_decision, completed_at, cooldown_ends_at")
          .eq("candidate_id", asgn.candidate_id)
          .order("loop_number", { ascending: true });
        if (loops) setLoopData(loops);

        // Fetch endorsement
        const { data: end } = await supabase
          .from("endorsements")
          .select("decision, justification, created_at")
          .eq("assignment_id", assignmentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (end) setEndorsement(end);
      } catch (error) {
        console.error("Error fetching mentee detail:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [assignmentId, user?.id]);

  const getBarsLabel = (score: number) => {
    switch (score) {
      case 1: return "Not Yet Demonstrated";
      case 2: return "Emerging";
      case 3: return "Competent";
      case 4: return "Strong";
      default: return "—";
    }
  };

  const getBarsColor = (score: number) => {
    switch (score) {
      case 1: return "text-orange-400";
      case 2: return "text-amber-400";
      case 3: return "text-blue-400";
      case 4: return "text-emerald-400";
      default: return "text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!assignment || !candidateProfile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Mentee not found.</p>
        <Button variant="ghost" onClick={() => navigate("/dashboard/mentor/mentees")} className="mt-4 text-indigo-400">
          Back to Mentees
        </Button>
      </div>
    );
  }

  const profile = candidateProfile.profile;
  const l1Feedback = feedback.filter(f => f.feedback_level === 1);
  const l2Feedback = feedback.filter(f => f.feedback_level === 2);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/mentor/mentees")} className="text-gray-400 hover:text-white mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Mentees
        </Button>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{profile?.first_name} {profile?.last_name}</h1>
            <p className="text-gray-400">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                {assignment.status}
              </span>
              <span className="text-sm text-gray-500">
                Tier: {candidateProfile.current_tier?.replace("_", " ") || "Not assessed"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/dashboard/mentor/assign-dimensions/${assignment.id}/${assignment.candidate_id}`}>
              <Button size="sm" variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                <Star className="w-4 h-4 mr-1" /> Dimensions
              </Button>
            </Link>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={() => openModal(assignment.id, assignment.candidate_id)}>
              <ClipboardCheck className="w-4 h-4 mr-1" /> Record L2
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Observation Pipeline Status */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-white mb-3">Observation Pipeline</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${l1Feedback.length > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black border-white/10"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">L1 AI Scenarios</span>
              {l1Feedback.length > 0 && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-white font-bold">{l1Feedback.length > 0 ? `${l1Feedback.length} dimensions scored` : "Not started"}</p>
          </div>
          <div className={`p-4 rounded-xl border ${l2Feedback.length > 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-black border-white/10"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-400">L2 Mentor Live</span>
              {l2Feedback.length > 0 && <CheckCircle className="w-4 h-4 text-blue-400" />}
            </div>
            <p className="text-white font-bold">{l2Feedback.length > 0 ? `${l2Feedback.length} dimensions scored` : observations.length > 0 ? `${observations.length} observations recorded` : "Not started"}</p>
          </div>
          <div className={`p-4 rounded-xl border ${endorsement ? "bg-indigo-500/10 border-indigo-500/30" : "bg-black border-white/10"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-400">Endorsement</span>
              {endorsement?.decision === "proceed" && <Award className="w-4 h-4 text-emerald-400" />}
            </div>
            {endorsement ? (
              <p className={`font-bold capitalize ${
                endorsement.decision === "proceed" ? "text-emerald-400" :
                endorsement.decision === "redirect" ? "text-amber-400" :
                endorsement.decision === "pause" ? "text-orange-400" : "text-red-400"
              }`}>{endorsement.decision}</p>
            ) : (
              <p className="text-white font-bold">Pending</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Assigned Dimensions with L1/L2 Scores */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-white mb-3">Dimensions ({assignedDims.length} assigned)</h2>
        {assignedDims.length === 0 ? (
          <div className="p-6 rounded-xl bg-black border border-white/10 text-center">
            <p className="text-amber-400">No dimensions assigned yet.</p>
            <Link to={`/dashboard/mentor/assign-dimensions/${assignment.id}/${assignment.candidate_id}`}>
              <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-500">Assign Dimensions</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedDims.map(dimId => {
              const dim = BEHAVIORAL_DIMENSIONS.find(d => d.id === dimId);
              const l1 = l1Feedback.find(f => f.dimension_id === dimId);
              const l2 = l2Feedback.find(f => f.dimension_id === dimId);
              const dimLoops = loopData.filter(l => l.dimension_id === dimId);
              const latestLoop = dimLoops[dimLoops.length - 1];
              const loopCount = dimLoops.length;
              const hasCooldown = latestLoop?.cooldown_ends_at && new Date(latestLoop.cooldown_ends_at) > new Date();
              const cooldownDays = hasCooldown ? Math.ceil((new Date(latestLoop.cooldown_ends_at!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

              return (
                <div key={dimId} className="p-4 rounded-xl bg-black border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{dim?.label || dimId}</h3>
                      <p className="text-xs text-gray-500">{dim?.description}</p>
                    </div>
                    {/* Loop tracking badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {loopCount > 0 && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          latestLoop?.endorsement_decision === 'proceed' ? 'bg-emerald-500/20 text-emerald-400' :
                          hasCooldown ? 'bg-amber-500/20 text-amber-400' :
                          loopCount >= 3 ? 'bg-red-500/20 text-red-400' :
                          'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          Loop {loopCount}/3
                          {latestLoop?.endorsement_decision === 'proceed' && ' ✓'}
                          {hasCooldown && ` (${cooldownDays}d cooldown)`}
                          {loopCount >= 3 && latestLoop?.endorsement_decision !== 'proceed' && ' Locked'}
                        </span>
                      )}
                      {loopCount === 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-500">No loops</span>
                      )}
                      {loopCount >= 3 && latestLoop?.endorsement_decision !== 'proceed' && (
                        <button
                          onClick={() => setOverrideModal({ dimId, dimLabel: dim?.label || dimId })}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        >
                          Override
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Loop history */}
                  {dimLoops.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {dimLoops.map((loop, i) => (
                        <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${
                          loop.endorsement_decision === 'proceed' ? 'bg-emerald-500/10 text-emerald-400' :
                          loop.endorsement_decision === 'redirect' ? 'bg-amber-500/10 text-amber-400' :
                          loop.endorsement_decision === 'pause' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-white/5 text-gray-500'
                        }`}>
                          L{loop.loop_number}: {loop.bars_score ? `${loop.bars_score}/4` : '—'} {loop.endorsement_decision ? `(${loop.endorsement_decision})` : ''}
                          {loop.completed_at && <span className="text-gray-600 ml-1">{new Date(loop.completed_at).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className={`p-3 rounded-lg ${l1 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/5 border border-white/5"}`}>
                      <p className="text-[10px] text-gray-500 uppercase mb-1">L1 AI Score</p>
                      {l1 && l1.bars_score ? (
                        <div>
                          <span className={`text-lg font-bold ${getBarsColor(l1.bars_score)}`}>{l1.bars_score}/4</span>
                          <span className={`text-xs ml-2 ${getBarsColor(l1.bars_score)}`}>{getBarsLabel(l1.bars_score)}</span>
                          {l1.ai_draft_feedback && (
                            <details className="mt-1">
                              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                                {l1.ai_draft_feedback.length > 80 ? l1.ai_draft_feedback.substring(0, 80) + "..." : l1.ai_draft_feedback}
                              </summary>
                              <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{l1.ai_draft_feedback}</p>
                            </details>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">—</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${l2 ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5 border border-white/5"}`}>
                      <p className="text-[10px] text-gray-500 uppercase mb-1">L2 Mentor Score</p>
                      {l2 && l2.bars_score ? (
                        <div>
                          <span className={`text-lg font-bold ${getBarsColor(l2.bars_score)}`}>{l2.bars_score}/4</span>
                          <span className={`text-xs ml-2 ${getBarsColor(l2.bars_score)}`}>{getBarsLabel(l2.bars_score)}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">—</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Endorsement Detail */}
      {endorsement && (
        <motion.div variants={itemVariants}>
          <h2 className="text-lg font-semibold text-white mb-3">Endorsement Record</h2>
          <div className={`p-5 rounded-xl border ${
            endorsement.decision === "proceed" ? "bg-emerald-500/10 border-emerald-500/30" :
            endorsement.decision === "redirect" ? "bg-amber-500/10 border-amber-500/30" :
            "bg-black border-white/10"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-lg font-bold capitalize ${
                endorsement.decision === "proceed" ? "text-emerald-400" :
                endorsement.decision === "redirect" ? "text-amber-400" :
                endorsement.decision === "pause" ? "text-orange-400" : "text-red-400"
              }`}>{endorsement.decision}</span>
              <span className="text-xs text-gray-500">{new Date(endorsement.created_at).toLocaleDateString()}</span>
            </div>
            {endorsement.justification && (
              <p className="text-sm text-gray-300">{endorsement.justification}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      {!endorsement && (
        <motion.div variants={itemVariants}>
          <div className="flex gap-3">
            <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openModal(assignment.id, assignment.candidate_id)}>
              <ClipboardCheck className="w-4 h-4 mr-2" /> Record L2 Observation
            </Button>
            {observations.filter(o => o.is_locked).length >= 1 && l1Feedback.length > 0 && (
              <Link to="/dashboard/mentor/endorsements">
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <Award className="w-4 h-4 mr-2" /> Submit Endorsement
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* Override modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setOverrideModal(null)} />
          <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-gray-900 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2">Override Loop Limit</h3>
            <p className="text-sm text-gray-400 mb-4">
              Grant an additional attempt for <strong className="text-white">{overrideModal.dimLabel}</strong> beyond the 3-loop maximum. This requires documented justification.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for override (required)..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-black border border-white/20 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setOverrideModal(null); setOverrideReason(""); }} className="flex-1 border-white/20 text-white">Cancel</Button>
              <Button
                disabled={!overrideReason.trim()}
                onClick={async () => {
                  if (!assignment || !overrideReason.trim()) return;
                  await mentorOverride(assignment.candidate_id, overrideModal.dimId, 1, overrideReason);
                  setOverrideModal(null);
                  setOverrideReason("");
                  // Refresh loop data
                  const { data: loops } = await supabase.from("observation_loops").select("dimension_id, loop_number, status, bars_score, endorsement_decision, completed_at, cooldown_ends_at").eq("candidate_id", assignment.candidate_id).order("loop_number", { ascending: true });
                  if (loops) setLoopData(loops);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500"
              >Grant Override</Button>
            </div>
          </div>
        </div>
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
          // Enrich with candidate info (o.candidate_id = candidate_profiles.id)
          const enrichedObs = await Promise.all(
            obs.map(async (o) => {
              const { data: cp } = await supabase
                .from("candidate_profiles")
                .select("profile_id")
                .eq("id", o.candidate_id)
                .single();
              let profile = null;
              if (cp) {
                const { data: p } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", cp.profile_id)
                  .single();
                profile = p;
              }
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
              className="p-6 rounded-xl bg-black border border-white/30 hover:border-white/20 transition-colors"
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
                  className="border-white/20 text-white hover:bg-black"
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
          className="p-8 rounded-2xl bg-black border border-white/30 text-center"
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
    decision: "" as "" | "proceed" | "redirect" | "pause" | "escalate",
    escalateConcern: "",
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
            // For each assignment, check L1+L2 completion and existing endorsements
            const enrichedAssignments = await Promise.all(
              assignments.map(async (assignment) => {
                // Check L1 feedback exists
                const { count: l1Count } = await supabase
                  .from("observation_feedback")
                  .select("*", { count: "exact", head: true })
                  .eq("assignment_id", assignment.id)
                  .eq("candidate_id", assignment.candidate_id)
                  .eq("feedback_level", 1);

                // Check L2 feedback exists
                const { count: l2Count } = await supabase
                  .from("observation_feedback")
                  .select("*", { count: "exact", head: true })
                  .eq("assignment_id", assignment.id)
                  .eq("candidate_id", assignment.candidate_id)
                  .eq("feedback_level", 2);

                // Check if already endorsed
                const { count: endorsedCount } = await supabase
                  .from("endorsements")
                  .select("*", { count: "exact", head: true })
                  .eq("assignment_id", assignment.id);

                // Get candidate profile
                const { data: candidateProfile } = await supabase
                  .from("candidate_profiles")
                  .select("*")
                  .eq("id", assignment.candidate_id)
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
                  observation_count: (l1Count || 0) + (l2Count || 0),
                  l1_complete: (l1Count || 0) > 0,
                  l2_complete: (l2Count || 0) > 0,
                  already_endorsed: (endorsedCount || 0) > 0,
                  candidate_profile: candidateProfile ? { ...candidateProfile, profile } : undefined,
                };
              })
            );

            // Ready for endorsement: has L1 + L2 and not already endorsed
            setReadyForEndorsement(enrichedAssignments.filter(a => a.l1_complete && a.l2_complete && !a.already_endorsed));
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
                // e.candidate_id = candidate_profiles.id, need to go through to get profile
                const { data: cp } = await supabase
                  .from("candidate_profiles")
                  .select("profile_id")
                  .eq("id", e.candidate_id)
                  .single();
                let profile = null;
                if (cp) {
                  const { data: p } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", cp.profile_id)
                    .single();
                  profile = p;
                }
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
          redirect_to: endorsementForm.decision === "redirect" ? (endorsementForm.redirectToLiveworks ? "liveworks" : "bridgefast") : null,
        })
        .select()
        .single();

      if (endorsementError) {
        console.error("Error creating endorsement:", endorsementError);
        return;
      }

      // Record loop tracking for endorsement — one loop per assigned dimension
      const { data: endorsedDims } = await supabase
        .from("mentor_assigned_dimensions")
        .select("dimension_id")
        .eq("assignment_id", selectedAssignment)
        .eq("is_active", true);

      if (endorsedDims && endorsedDims.length > 0) {
        // Calculate average score across all feedback for this assignment
        const { data: allFeedbackForAvg } = await supabase
          .from("observation_feedback")
          .select("bars_score")
          .eq("assignment_id", selectedAssignment)
          .eq("candidate_id", assignment.candidate_id)
          .not("bars_score", "is", null);
        const avgScore = allFeedbackForAvg && allFeedbackForAvg.length > 0
          ? Math.round((allFeedbackForAvg.reduce((sum, f) => sum + (f.bars_score || 0), 0) / allFeedbackForAvg.length) * 10) / 10
          : 0;

        for (const { dimension_id: dimId } of endorsedDims) {
          const loop = await startLoop(assignment.candidate_id, selectedAssignment, dimId, 1);
          if (loop) await completeLoop(loop.id, avgScore, endorsementForm.decision);
        }
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
      let newTier = assignment.candidate_profile?.current_tier || "silver";
      if (endorsementForm.decision === "proceed") {
        // Promote candidate: silver → gold → platinum
        const tierProgression: Record<string, string> = {
          silver: "gold",
          gold: "platinum",
          platinum: "platinum", // Already at max
        };
        newTier = tierProgression[newTier] || "gold";
      }

      // candidate_id = candidate_profiles.id — update tier + passport flags together
      await supabase
        .from("candidate_profiles")
        .update({
          current_tier: newTier,
          ...(endorsementForm.decision === "proceed" ? { has_skill_passport: true, is_listed_on_t3x: true } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.candidate_id);

      // Get profiles.id for growth_log_entries (which has FK to profiles.id)
      const { data: cpForGrowth } = await supabase
        .from("candidate_profiles")
        .select("profile_id")
        .eq("id", assignment.candidate_id)
        .single();
      const growthCandidateId = cpForGrowth?.profile_id || assignment.candidate_id;

      // Create growth log entry
      const decisionLabels: Record<string, string> = {
        proceed: "Proceed - Ready to advance",
        redirect: "Redirect - Additional training needed",
        pause: "Pause - Not ready to continue",
        escalate: "Escalate - Flagged for governance review",
      };

      // Growth log entry (non-blocking — don't let this fail the critical path)
      supabase.from("growth_log_entries").insert({
        candidate_id: growthCandidateId,
        event_type: "endorsement",
        title: `Mentor Endorsement: ${endorsementForm.decision.charAt(0).toUpperCase() + endorsementForm.decision.slice(1)}`,
        description: decisionLabels[endorsementForm.decision],
        source_component: "MentorLink",
        source_id: endorsement.id,
      }).then(() => {}).catch(e => console.log("Growth log write:", e));

      // If decision is "proceed", generate Skill Passport
      if (endorsementForm.decision === "proceed") {
        // Calculate aggregate behavioral scores from observation_feedback (L1 + L2)
        const { data: allFeedback } = await supabase
          .from("observation_feedback")
          .select("dimension_id, bars_score, feedback_level")
          .eq("assignment_id", selectedAssignment)
          .eq("candidate_id", assignment.candidate_id)
          .not("bars_score", "is", null);

        let aggregatedScores: Record<string, number> = {};
        if (allFeedback && allFeedback.length > 0) {
          // Group scores by dimension, average L1+L2
          const dimScores: Record<string, number[]> = {};
          allFeedback.forEach(f => {
            if (!dimScores[f.dimension_id]) dimScores[f.dimension_id] = [];
            dimScores[f.dimension_id].push(f.bars_score);
          });
          Object.entries(dimScores).forEach(([dim, scores]) => {
            aggregatedScores[dim] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
          });
        }

        // Generate unique verification code
        const verificationCode = `SKP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Create Skill Passport (FK to candidate_profiles.id)
        await supabase.from("skill_passports").insert({
          candidate_id: assignment.candidate_id,
          verification_code: verificationCode,
          readiness_tier: newTier,
          behavioral_scores: aggregatedScores,
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
        });

        // has_skill_passport + is_listed_on_t3x already set above in the tier update

        // Create growth log entry for passport (non-blocking)
        supabase.from("growth_log_entries").insert({
          candidate_id: growthCandidateId,
          event_type: "endorsement",
          title: "Skill Passport Earned",
          description: `Verification Code: ${verificationCode}`,
          source_component: "SkillPassport",
        }).then(() => {}).catch(e => console.log("Passport growth log:", e));
      }

      // If escalate, create an escalation notification for admin/governance
      if (endorsementForm.decision === "escalate") {
        supabase.from("growth_log_entries").insert({
          candidate_id: growthCandidateId,
          event_type: "escalation",
          title: "Observation Escalated — Governance Review",
          description: `Concern: ${endorsementForm.escalateConcern || endorsementForm.justification}. Awaiting governance review.`,
          source_component: "MentorLink",
          source_id: endorsement.id,
        }).then(() => {}).catch(e => console.log("Escalation growth log:", e));
      }

      // Update assignment status
      await supabase
        .from("mentor_assignments")
        .update({
          status: endorsementForm.decision === "proceed" ? "completed" : endorsementForm.decision === "escalate" ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedAssignment);

      // Create notification for candidate (user_id = profiles.id)
      await supabase.from("notifications").insert({
        user_id: growthCandidateId,
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
        escalateConcern: "",
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
                      ? "bg-purple-500/30 border-purple-500/30"
                      : "bg-black border-white/30 hover:border-white/20"
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
                      className="mt-6 pt-6 border-t border-white/30 space-y-6"
                    >
                      {/* Decision Selector */}
                      <div>
                        <label className="text-sm text-gray-400 block mb-3">Decision</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { value: "proceed", label: "Proceed", desc: "Ready to advance", color: "emerald" },
                            { value: "redirect", label: "Redirect", desc: "Needs more training", color: "amber" },
                            { value: "pause", label: "Pause", desc: "Not ready yet", color: "orange" },
                            { value: "escalate", label: "Escalate", desc: "Governance review", color: "red" },
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
                                    : option.color === "orange"
                                    ? "bg-orange-500/20 border-orange-500/50"
                                    : "bg-red-500/20 border-red-500/50"
                                  : "bg-black border-white/30 hover:border-white/20"
                              }`}
                            >
                              <p className={`font-medium ${
                                option.color === "emerald" ? "text-emerald-400" :
                                option.color === "amber" ? "text-amber-400" :
                                option.color === "orange" ? "text-orange-400" : "text-red-400"
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
                        <div className="space-y-4 p-4 rounded-xl bg-amber-500/30 border border-amber-500/20">
                          <p className="text-sm text-amber-400">
                            Select where to redirect the candidate:
                          </p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm text-gray-400 block mb-2">BridgeFast Module</label>
                              <select
                                value={endorsementForm.redirectModule}
                                onChange={(e) => setEndorsementForm(prev => ({ ...prev, redirectModule: e.target.value, redirectToLiveworks: false }))}
                                className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/30 text-white focus:border-amber-500 focus:outline-none"
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
                                className="w-5 h-5 rounded bg-black border-white/20"
                              />
                              <span className="text-white">Redirect to LiveWorks project experience</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Escalate Options */}
                      {endorsementForm.decision === "escalate" && (
                        <div className="space-y-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-red-400 font-medium">Governance Review Flag</p>
                              <p className="text-xs text-gray-400 mt-1">
                                This will flag a serious concern identified during observation. The candidate will be informed through a formal process and the case will be reviewed by governance.
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 block mb-2">
                              Nature of Concern <span className="text-red-400">*</span>
                            </label>
                            <textarea
                              value={endorsementForm.escalateConcern}
                              onChange={(e) => setEndorsementForm(prev => ({ ...prev, escalateConcern: e.target.value }))}
                              placeholder="Document the specific concern observed during the observation period..."
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg bg-black border border-red-500/30 text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none resize-none"
                            />
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
                          className="w-full px-4 py-3 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
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
                          className="border-white/20 text-white hover:bg-black"
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
          <div className="p-8 rounded-2xl bg-black border border-white/30 text-center">
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
                className="p-4 rounded-xl bg-black border border-white/30 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  endorsement.decision === "proceed"
                    ? "bg-emerald-500/20"
                    : endorsement.decision === "redirect"
                    ? "bg-amber-500/20"
                    : endorsement.decision === "escalate"
                    ? "bg-red-500/20"
                    : "bg-orange-500/20"
                }`}>
                  {endorsement.decision === "proceed" ? (
                    <ThumbsUp className={`w-5 h-5 text-emerald-400`} />
                  ) : endorsement.decision === "redirect" ? (
                    <ArrowRight className={`w-5 h-5 text-amber-400`} />
                  ) : endorsement.decision === "escalate" ? (
                    <AlertTriangle className={`w-5 h-5 text-red-400`} />
                  ) : (
                    <AlertCircle className={`w-5 h-5 text-orange-400`} />
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
                        : endorsement.decision === "escalate"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-orange-500/20 text-orange-400"
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
          <div className="p-6 rounded-xl bg-black border border-white/30 text-center">
            <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No endorsements given yet</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Schedule component with full functionality
const Schedule = () => {
  const { user } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"availability" | "sessions">("availability");

  // Days and time slots
  const DAYS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  const TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  ];

  // Availability state: { dayOfWeek: { startTime, endTime, isActive } }
  const [availability, setAvailability] = useState<Record<number, { startTime: string; endTime: string; isActive: boolean }>>({
    1: { startTime: "09:00", endTime: "17:00", isActive: true },
    2: { startTime: "09:00", endTime: "17:00", isActive: true },
    3: { startTime: "09:00", endTime: "17:00", isActive: true },
    4: { startTime: "09:00", endTime: "17:00", isActive: true },
    5: { startTime: "09:00", endTime: "17:00", isActive: true },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Get mentor profile
      const { data: mp } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      setMentorProfile(mp);

      if (mp) {
        // Fetch availability settings
        const { data: availData } = await supabase
          .from("mentor_availability")
          .select("*")
          .eq("mentor_id", mp.id);

        if (availData && availData.length > 0) {
          const availMap: Record<number, { startTime: string; endTime: string; isActive: boolean }> = {};
          availData.forEach((slot) => {
            availMap[slot.day_of_week] = {
              startTime: slot.start_time,
              endTime: slot.end_time,
              isActive: slot.is_active,
            };
          });
          setAvailability(availMap);
        }

        // Fetch upcoming sessions
        const { data: sessionData } = await supabase
          .from("mentor_sessions")
          .select("*, candidate:profiles!mentor_sessions_candidate_id_fkey(first_name, last_name, email, avatar_url)")
          .eq("mentor_id", mp.id)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(20);

        setSessions(sessionData || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const toggleDayAvailability = (dayValue: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayValue]: prev[dayValue]
        ? { ...prev[dayValue], isActive: !prev[dayValue].isActive }
        : { startTime: "09:00", endTime: "17:00", isActive: true },
    }));
  };

  const updateDayTime = (dayValue: number, field: "startTime" | "endTime", value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value },
    }));
  };

  const saveAvailability = async () => {
    if (!mentorProfile) return;
    setIsSaving(true);

    try {
      // Delete existing availability
      await supabase
        .from("mentor_availability")
        .delete()
        .eq("mentor_id", mentorProfile.id);

      // Insert new availability
      const records = Object.entries(availability)
        .filter(([_, val]) => val.isActive)
        .map(([day, val]) => ({
          mentor_id: mentorProfile.id,
          day_of_week: parseInt(day),
          start_time: val.startTime,
          end_time: val.endTime,
          is_active: true,
        }));

      if (records.length > 0) {
        await supabase.from("mentor_availability").insert(records);
      }

      alert("Availability saved successfully!");
    } catch (error) {
      console.error("Error saving availability:", error);
      alert("Failed to save availability");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, status: "confirmed" | "cancelled") => {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = user?.id;
    }

    await supabase
      .from("mentor_sessions")
      .update(updateData)
      .eq("id", sessionId);

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status } : s))
    );
  };

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: "bg-blue-500/20 text-blue-400",
      confirmed: "bg-emerald-500/20 text-emerald-400",
      completed: "bg-purple-500/20 text-purple-400",
      cancelled: "bg-red-500/20 text-red-400",
      no_show: "bg-amber-500/20 text-amber-400",
    };
    return styles[status] || "bg-gray-500/20 text-gray-400";
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
        <p className="text-gray-400">Manage your availability and upcoming sessions.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <Button
          variant={activeTab === "availability" ? "default" : "outline"}
          onClick={() => setActiveTab("availability")}
          className={activeTab === "availability" ? "bg-purple-600" : "border-white/20 text-white hover:bg-black"}
        >
          <Clock className="w-4 h-4 mr-2" />
          Availability
        </Button>
        <Button
          variant={activeTab === "sessions" ? "default" : "outline"}
          onClick={() => setActiveTab("sessions")}
          className={activeTab === "sessions" ? "bg-purple-600" : "border-white/20 text-white hover:bg-black"}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Sessions ({sessions.length})
        </Button>
      </motion.div>

      {activeTab === "availability" && (
        <motion.div variants={itemVariants} className="p-6 rounded-xl bg-black border border-white/30">
          <h2 className="text-lg font-semibold text-white mb-6">Weekly Availability</h2>
          <p className="text-sm text-gray-400 mb-6">
            Set your available hours for each day. Candidates can book sessions during these times.
          </p>

          <div className="space-y-4">
            {DAYS.map((day) => {
              const dayAvail = availability[day.value];
              const isActive = dayAvail?.isActive;

              return (
                <div
                  key={day.value}
                  className={`p-4 rounded-lg border transition-colors ${
                    isActive
                      ? "bg-purple-500/30 border-purple-500/30"
                      : "bg-black border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isActive || false}
                          onChange={() => toggleDayAvailability(day.value)}
                        />
                        <div className="w-11 h-6 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className={`font-medium ${isActive ? "text-white" : "text-gray-500"}`}>
                        {day.label}
                      </span>
                    </div>

                    {isActive && (
                      <div className="flex items-center gap-2">
                        <select
                          value={dayAvail?.startTime || "09:00"}
                          onChange={(e) => updateDayTime(day.value, "startTime", e.target.value)}
                          className="bg-black border border-white/30 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t} className="bg-gray-900">
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-400">to</span>
                        <select
                          value={dayAvail?.endTime || "17:00"}
                          onChange={(e) => updateDayTime(day.value, "endTime", e.target.value)}
                          className="bg-black border border-white/30 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t} className="bg-gray-900">
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={saveAvailability}
            disabled={isSaving}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-500"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </motion.div>
      )}

      {activeTab === "sessions" && (
        <motion.div variants={itemVariants} className="space-y-4">
          {sessions.length === 0 ? (
            <div className="p-12 rounded-xl bg-black border border-white/30 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Sessions</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                When candidates book sessions with you, they'll appear here. Make sure your availability is set up.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-6 rounded-xl bg-black border border-white/30 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      {session.candidate?.avatar_url ? (
                        <img
                          src={session.candidate.avatar_url}
                          alt=""
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {session.candidate?.first_name} {session.candidate?.last_name}
                      </h3>
                      <p className="text-sm text-gray-400">{session.candidate?.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                    {session.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date & Time</p>
                    <p className="text-white font-medium">{formatSessionDate(session.scheduled_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Duration</p>
                    <p className="text-white font-medium">{session.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="text-white font-medium capitalize">{session.session_type?.replace("_", " ")}</p>
                  </div>
                </div>

                {session.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-black">
                    <p className="text-sm text-gray-400">{session.notes}</p>
                  </div>
                )}

                {session.status === "scheduled" && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateSessionStatus(session.id, "confirmed")}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateSessionStatus(session.id, "cancelled")}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    {session.meeting_url && (
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto"
                      >
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-black">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}
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
        <div className="p-6 rounded-xl bg-black border border-white/30">
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
                  className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white focus:border-purple-500 focus:outline-none"
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
                  className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white focus:border-purple-500 focus:outline-none"
                />
              ) : (
                <p className="text-white">{formData.last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="p-6 rounded-xl bg-black border border-white/30">
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
                  className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
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
                  className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
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
                className="w-full px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
              />
            ) : (
              <p className="text-white">{formData.industry || "Not set"}</p>
            )}
          </div>
        </div>

        {/* Specializations */}
        <div className="p-6 rounded-xl bg-black border border-white/30">
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
                className="flex-1 px-4 py-2 rounded-lg bg-black border border-white/30 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <Button onClick={addSpec} size="sm" className="bg-purple-600 hover:bg-purple-500">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mentor Settings */}
        <div className="p-6 rounded-xl bg-black border border-white/30">
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
                  <div className="w-11 h-6 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
                  className="w-24 px-4 py-2 rounded-lg bg-black border border-white/30 text-white focus:border-purple-500 focus:outline-none"
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
// Messages Page for Mentor Dashboard
const MentorMessagesPage = () => {
  const { user, profile } = useAuth();
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
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; size: number; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setIsUploading(true);
    try {
      const result = await uploadMessageAttachment(file, user.id);
      if (result) {
        setAttachedFile({ url: result.url, name: result.name, size: result.size, type: result.type });
      }
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setIsUploading(false);
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
        await supabase.from("conversation_participants").insert([{ conversation_id: conv.id, user_id: user.id }, { conversation_id: conv.id, user_id: targetUserId }]);
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

    // Real-time conversation updates
    if (!user?.id) return;
    const convChannel = supabase
      .channel(`conv-updates-mentor-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload) => {
        const updated = payload.new as any;
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === updated.id);
          if (idx === -1) return prev;
          const updatedList = [...prev];
          updatedList[idx] = { ...updatedList[idx], ...updated };
          updatedList.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
          return updatedList;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(convChannel); };
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
    const channel = supabase.channel(`messages:${activeConversation.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversation.id}` }, async (payload) => {
      const { data: newMsg } = await supabase.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)").eq("id", payload.new.id).single();
      if (newMsg) setMessages((prev) => [...prev, newMsg]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversation?.id, user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;
    if (!activeConversation || !user?.id) return;
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

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="h-[calc(100vh-12rem)]">
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Messages</h1>
        <p className="text-gray-400">Connect with candidates, employers, and other mentors.</p>
      </motion.div>
      <motion.div variants={itemVariants} className="h-[calc(100%-5rem)] rounded-xl bg-black border border-white/30 overflow-hidden flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-white/30 flex flex-col">
          <div className="p-4 border-b border-white/30 space-y-3">
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500" />
              <Button onClick={() => setShowNewChat(!showNewChat)} className="bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-2 flex-shrink-0" title="New conversation"><Plus className="w-4 h-4" /></Button>
            </div>
            {showNewChat && (
              <div className="bg-black/90 border border-purple-500/30 rounded-xl p-3 space-y-3">
                <p className="text-xs text-purple-400 font-medium">Find someone to message</p>
                <input type="text" placeholder="Search by name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} autoFocus className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {isSearching && <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-purple-500" /></div>}
                  {!isSearching && searchResults.length === 0 && userSearchQuery.length >= 2 && <p className="text-xs text-gray-500 text-center py-2">No users found</p>}
                  {!isSearching && userSearchQuery.length > 0 && userSearchQuery.length < 2 && <p className="text-xs text-gray-500 text-center py-2">Type at least 2 characters</p>}
                  {searchResults.map((result) => (
                    <button key={result.id} onClick={() => startConversation(result.id)} disabled={isCreatingConversation} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-purple-500/10 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                        {result.avatar_url ? <img src={result.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{result.first_name} {result.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{result.role}</p>
                      </div>
                      <Send className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No conversations yet</p>
                <p className="text-sm text-gray-500 mt-1">Click the <span className="text-purple-400">+</span> button to find and message anyone</p>
              </div>
            ) : filteredConversations.map((conv) => {
              const hasUnread = conv.last_message_at && (!conv.last_read_at || new Date(conv.last_message_at) > new Date(conv.last_read_at));
              return (
                <button key={conv.id} onClick={() => setActiveConversation(conv)} className={`w-full p-4 flex items-start gap-3 hover:bg-black transition-colors text-left ${activeConversation?.id === conv.id ? "bg-purple-500/30 border-l-2 border-purple-500" : ""}`}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      {conv.other_user?.avatar_url ? <img src={conv.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6 text-purple-400" />}
                    </div>
                    {hasUnread ? (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500" />
                    ) : (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[conv.other_user?.id]) ? "bg-emerald-500" : "bg-gray-600"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate ${hasUnread ? "text-white" : "text-gray-300"}`}>{conv.other_user?.first_name} {conv.other_user?.last_name}</p>
                      <span className="text-xs text-gray-500">{conv.last_message_at ? formatMessageTime(conv.last_message_at) : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 capitalize">{conv.other_user?.role}</span>
                      <span className="text-gray-600">·</span>
                      <p className={`text-sm truncate ${hasUnread ? "text-gray-300" : "text-gray-500"}`}>{conv.last_message_preview || "No messages yet"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-white/30 flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    {activeConversation.other_user?.avatar_url ? <img src={activeConversation.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? "bg-emerald-500" : "bg-gray-600"}`} />
                </div>
                <div>
                  <p className="font-medium text-white">{activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}</p>
                  <p className="text-xs text-gray-500">{isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? <span className="text-emerald-400">Online</span> : <span className="capitalize">{activeConversation.other_user?.role}</span>}</p>
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
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                            {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-4 h-4 text-purple-400" />}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div className="relative">
                          {/* Action buttons */}
                          <div className={`flex items-center gap-1 mb-1 transition-opacity duration-150 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"} ${isOwn ? "justify-end" : "justify-start"}`}>
                            <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setActiveMsgId(null); }} className="p-1.5 rounded-lg bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors" title="Reply">
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content || ""); }} className="p-1.5 rounded-lg bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors" title="Copy">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Reply quote */}
                          {msg.reply_to && (
                            <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 text-xs cursor-pointer ${isOwn ? "bg-purple-700/40 border-purple-400/60 text-purple-200" : "bg-white/5 border-purple-400/40 text-gray-400"}`} onClick={() => { const el = document.getElementById(`msg-${msg.reply_to.id}`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("ring-2", "ring-purple-500/50"); setTimeout(() => el.classList.remove("ring-2", "ring-purple-500/50"), 2000); } }}>
                              <p className="font-medium text-[11px] mb-0.5">{msg.reply_to.sender?.first_name || "User"}</p>
                              <p className="truncate opacity-80">{msg.reply_to.content?.substring(0, 80)}</p>
                            </div>
                          )}
                          <div id={`msg-${msg.id}`} onClick={() => setActiveMsgId(showActions ? null : msg.id)} className={`px-4 py-2 rounded-2xl cursor-pointer transition-all duration-300 ${isOwn ? "bg-purple-600 text-white rounded-br-md" : "bg-black text-gray-200 rounded-bl-md"}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.file_url && (
                              <div className="mt-2">
                                {isImageFile(msg.file_url, msg.metadata) ? (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                    <img src={msg.file_url} alt={msg.metadata?.file_name || 'attachment'} className="max-w-xs rounded-lg border border-white/10" />
                                  </a>
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-black/50 border border-white/10 hover:border-white/20 text-sm">
                                    <Paperclip className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="text-indigo-400 truncate">{msg.metadata?.file_name || 'Attachment'}</span>
                                    {msg.metadata?.file_size && <span className="text-gray-500 text-xs flex-shrink-0">{formatFileSize(msg.metadata.file_size)}</span>}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isOwn ? "text-right" : ""}`}>{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-white/30">
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Reply className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0 border-l-2 border-purple-400/50 pl-2">
                      <p className="text-xs font-medium text-purple-300">{replyTo.sender?.first_name || "User"}</p>
                      <p className="text-xs text-gray-400 truncate">{replyTo.content?.substring(0, 100)}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                )}
                {attachedFile && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Paperclip className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-purple-300 truncate flex-1">{attachedFile.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatFileSize(attachedFile.size)}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    disabled={isUploading}
                    title="Attach file"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} className="flex-1 bg-black border border-white/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500" />
                  <Button onClick={sendMessage} disabled={(!newMessage.trim() && !attachedFile) || isSending} className="bg-purple-600 hover:bg-purple-500 rounded-xl px-6">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a Conversation</h3>
                <p className="text-gray-400 max-w-sm mb-4">Choose a conversation or start a new one.</p>
                <Button onClick={() => setShowNewChat(true)} className="bg-purple-600 hover:bg-purple-500 rounded-xl px-6"><Plus className="w-4 h-4 mr-2" />New Conversation</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

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
        <div className="p-6 rounded-xl bg-black border border-white/30">
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
        <div className="p-6 rounded-xl bg-black border border-white/30">
          <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
          <Button variant="outline" className="border-white/20 text-white hover:bg-black">
            Change Password
          </Button>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-xl bg-black border border-white/30">
          <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Email notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-black border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">New mentee assignments</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-black border-white/20" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-400">Session reminders</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-black border-white/20" />
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount(user?.id);
  usePresence(user?.id);

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

    // Real-time notification subscription
    const channel = supabase
      .channel(`notifications-mentor-${user?.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        className={`fixed top-0 left-0 z-50 h-full ${sidebarCollapsed ? "w-16" : "w-64"} bg-black/90 backdrop-blur-xl border-r border-white/30 transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} p-4 border-b border-white/30`}>
            {sidebarCollapsed ? (
              <Link to="/" className="flex items-center justify-center">
                <img src="/icon-192.png" alt="Logo" className="w-8 h-8 rounded-full" />
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2">
                <img src="/icon-192.png" alt="Logo" className="w-8 h-8 rounded-full" />
                <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  The 3rd Academy
                </span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className={`flex-1 ${sidebarCollapsed ? "p-2" : "p-4"} space-y-1 overflow-y-auto`}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center ${sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"} rounded-xl transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30"
                      : "text-gray-400 hover:text-white hover:bg-black"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                    {item.name === "Messages" && unreadMessageCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold px-1">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle — desktop only */}
          <div className="hidden lg:flex justify-center py-2 border-t border-white/10">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <div className={`${sidebarCollapsed ? "p-2" : "p-4"} border-t border-white/30`}>
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} mb-4`}>
              <div className={`${sidebarCollapsed ? "w-8 h-8 text-xs" : "w-10 h-10"} rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-medium`}>
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                </div>
              )}
            </div>
            {sidebarCollapsed ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-full p-2 text-gray-400 hover:text-white hover:bg-black rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-white/20 text-gray-400 hover:text-white hover:bg-black"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"} ${location.pathname.endsWith("/agent") ? "h-screen flex flex-col overflow-hidden" : ""}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-black backdrop-blur-xl border-b border-white/30 flex-shrink-0">
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
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-black/95 border border-white/30 shadow-xl overflow-hidden">
                <div className="p-3 border-b border-white/30">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 hover:bg-black border-b border-white/5">
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
                <div className="border-t border-white/10 p-2">
                  <Link
                    to="/dashboard/mentor/notifications"
                    className="block w-full text-center py-2 text-sm text-indigo-400 hover:bg-black rounded-lg"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className={`p-4 md:p-8 ${location.pathname.endsWith("/agent") ? "flex-1 overflow-hidden !p-0" : ""}`}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="mentees" element={<Mentees />} />
            <Route path="mentees/:assignmentId" element={<MenteeDetail />} />
            <Route path="assign-dimensions/:assignmentId/:candidateId" element={<AssignDimensions />} />
            <Route path="observations" element={<Observations />} />
            <Route path="endorsements" element={<Endorsements />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="messages" element={<MentorMessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="agent" element={<AIAgent />} />
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
