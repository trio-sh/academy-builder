import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, updatePassword } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessageCount, usePresence, isUserOnline, sendMessageNotification } from "@/hooks/useMessaging";
import { MentorMatchingService, type MentorMatch } from "@/lib/mentorMatching";
import { parseResume } from "@/lib/resumeParser";
import { analyzeResume } from "@/services/resumeEnhancer";
import { uploadMessageAttachment, isImageFile, formatFileSize } from "@/lib/fileUpload";
import { Button } from "@/components/ui/button";
import { TrainingModuleViewer } from "@/components/training/TrainingModuleViewer";
import { AssessmentViewer } from "@/components/assessment/AssessmentViewer";
import { InteractiveSkillAssessment } from "@/components/assessment/InteractiveSkillAssessment";
import { INTERACTIVE_MODULES } from "@/data/interactiveTrainingModules";
import type { Database } from "@/types/database.types";
import AIAgent from "@/pages/dashboard/AIAgent";
import ReportReview from "@/pages/dashboard/candidate/ReportReview";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GoogleAuthLink } from "@/components/GoogleAuthLink";
import {
 DashboardPageHeader,
 DashSection,
 LedgerStat,
 LedgerBadge,
 LedgerLoading,
 EmptyState,
 LegacyBanner,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
import {
 LineChart,
 Line,
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 RadarChart,
 PolarGrid,
 PolarAngleAxis,
 PolarRadiusAxis,
 Radar,
} from "recharts";
import {
 Award,
 Flag,
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
 Upload,
 FileText,
 BookOpen,
 Shield,
 ExternalLink,
 Play,
 Calendar,
 Star,
 Loader2,
 Save,
 Plus,
 Copy,
 QrCode,
 Download,
 Share2,
 Lock,
 Eye,
 EyeOff,
 Users,
 Building2,
 ThumbsUp,
 ThumbsDown,
 ChevronLeft,
 ChevronDown,
 Target,
 GraduationCap,
 Send,
 ClipboardCheck,
 Sliders,
 Sparkles,
 ArrowRight,
 MessageSquare,
 Image,
 Paperclip,
 Volume2,
 Mic,
 Brain,
 Zap,
 Bot,
 PanelLeftClose,
 PanelLeft,
 Reply,
} from "lucide-react";

type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type GrowthLogEntry = Database["public"]["Tables"]["growth_log_entries"]["Row"];
type BridgeFastModule = Database["public"]["Tables"]["bridgefast_modules"]["Row"];
type BridgeFastProgress = Database["public"]["Tables"]["bridgefast_progress"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type LiveWorksProject = Database["public"]["Tables"]["liveworks_projects"]["Row"];
type LiveWorksApplication = Database["public"]["Tables"]["liveworks_applications"]["Row"];
type SkillPassportRecord = Database["public"]["Tables"]["skill_passports"]["Row"];
type T3XConnection = Database["public"]["Tables"]["t3x_connections"]["Row"];
type EmployerProfile = Database["public"]["Tables"]["employer_profiles"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type MentorAssignment = Database["public"]["Tables"]["mentor_assignments"]["Row"];
type SelfAssessment = Database["public"]["Tables"]["candidate_self_assessments"]["Row"];

// T3A 14 Behavioral Dimensions — locked framework (February 2026)
// MVP: top 7 active for initial launch; dimensions 8–14 post-launch
const BEHAVIORAL_DIMENSIONS = [
 { id: "integrity_ethics", label: "Integrity & Ethics", color: "" },
 { id: "accountability_ownership", label: "Accountability & Ownership", color: "" },
 { id: "execution_reliability", label: "Execution Reliability", color: "" },
 { id: "communication_pressure", label: "Communication Under Pressure", color: "" },
 { id: "collaboration_conflict", label: "Collaboration & Conflict Resolution", color: "" },
 { id: "resilience_recovery", label: "Resilience & Recovery", color: "" },
 { id: "learning_agility", label: "Learning Agility", color: "" },
 { id: "workplace_adaptability", label: "Workplace Adaptability", color: "" },
 { id: "prioritization_time", label: "Prioritization & Time Management", color: "" },
 { id: "professional_boundaries", label: "Professional Boundaries", color: "" },
 { id: "creative_problem_solving", label: "Creative Problem-Solving", color: "" },
 { id: "customer_service_focus", label: "Customer & Service Focus", color: "" },
 { id: "influence_persuasion", label: "Influence & Persuasion", color: "" },
 { id: "relationship_building", label: "Relationship Building", color: "" },
];

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
 { name: "Overview", href: "/dashboard/candidate", icon: BarChart3, section: "observation" },
 { name: "Observation Pathway", href: "/dashboard/candidate/observations", icon: ClipboardCheck, section: "observation" },
 { name: "Behavioral Evidence Report", href: "/dashboard/candidate/passport", icon: Award, section: "observation" },
 { name: "Report Review", href: "/dashboard/candidate/report-review", icon: Flag, section: "observation" },
 { name: "Growth Log", href: "/dashboard/candidate/growth", icon: TrendingUp, section: "observation" },
 { name: "Praxis", href: "/dashboard/candidate/agent", icon: Bot, section: "observation" },
 { name: "BridgeFast", href: "/dashboard/candidate/training", icon: BookOpen, section: "preparation" },
 { name: "Readiness Reflection", href: "/dashboard/candidate/assessment", icon: Sliders, section: "preparation" },
 { name: "Projects", href: "/dashboard/candidate/projects", icon: Briefcase, section: "liveworks" },
 { name: "Request a Mentor", href: "/dashboard/candidate/mentors", icon: GraduationCap, section: "account" },
 { name: "Connections", href: "/dashboard/candidate/connections", icon: Users, section: "account" },
 { name: "Messages", href: "/dashboard/candidate/messages", icon: MessageSquare, section: "account" },
 { name: "Notifications", href: "/dashboard/candidate/notifications", icon: Bell, section: "account" },
 { name: "Profile", href: "/dashboard/candidate/profile", icon: User, section: "account" },
 { name: "Settings", href: "/dashboard/candidate/settings", icon: Settings, section: "account" },
];

// Overview component with real data
const Overview = () => {
 const { profile, user } = useAuth();
 const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
 const [growthLogCount, setGrowthLogCount] = useState(0);
 const [isLoading, setIsLoading] = useState(true);
 const [recentActivity, setRecentActivity] = useState<GrowthLogEntry[]>([]);
 const [hasMentorAssignment, setHasMentorAssignment] = useState(false);

 useEffect(() => {
 const fetchData = async () => {
 if (!user?.id) return;

 try {
 // Fetch candidate profile
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();
 setCandidateProfile(cp);

 // Fetch growth log count and recent entries
 const { count } = await supabase
 .from("growth_log_entries")
 .select("*", { count: "exact", head: true })
 .eq("candidate_id", user.id);
 setGrowthLogCount(count || 0);

 const { data: recent } = await supabase
 .from("growth_log_entries")
 .select("*")
 .eq("candidate_id", user.id)
 .order("created_at", { ascending: false })
 .limit(5);
 setRecentActivity(recent || []);

 // Check for mentor assignment (candidate_id references candidate_profiles.id)
 if (cp?.id) {
 const { data: assignment } = await supabase
 .from("mentor_assignments")
 .select("id")
 .eq("candidate_id", cp.id)
 .eq("status", "active")
 .limit(1)
 .maybeSingle();
 setHasMentorAssignment(!!assignment);
 }
 } catch (error) {
 console.error("Error fetching data:", error);
 } finally {
 setIsLoading(false);
 }
 };

 fetchData();
 }, [user?.id]);

 const getTierDisplay = (tier: string | null | undefined) => {
 if (!tier) return "Not Assessed";
 const tierMap: Record<string, string> = {
 platinum: "Platinum",
 gold: "Gold",
 silver: "Silver",
 };
 return tierMap[tier] || tier;
 };

 const getDaysActive = () => {
 if (!profile?.created_at) return 1;
 const created = new Date(profile.created_at);
 const now = new Date();
 return Math.max(1, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
 };

 const stats = [
 {
 label: "Current Tier",
 value: getTierDisplay(candidateProfile?.current_tier),
 icon: Award,
 color: ""
 },
 {
 label: "Growth Log Entries",
 value: growthLogCount.toString(),
 icon: BarChart3,
 color: ""
 },
 {
 label: "Observations",
 value: (candidateProfile?.mentor_loops || 0).toString(),
 icon: Briefcase,
 color: ""
 },
 {
 label: "Days Active",
 value: getDaysActive().toString(),
 icon: Clock,
 color: ""
 },
 ];

 const getNextSteps = () => {
 // Check if profile is reasonably complete (has name, headline or bio)
 const hasBasicProfile = !!(
 profile?.first_name &&
 profile?.last_name &&
 (profile?.headline || profile?.bio)
 );

 // Check if skills have been added
 const hasSkills = (candidateProfile?.skills?.length || 0) > 0;

 // Profile is complete if they have basic info AND skills
 const profileComplete = hasBasicProfile && hasSkills;

 const steps = [
 {
 title: "Complete your profile",
 description: "Add your info and skills",
 completed: profileComplete,
 href: "/dashboard/candidate/profile"
 },
 {
 title: "Upload your resume",
 description: "AI analyzes your resume to identify observation areas",
 completed: !!candidateProfile?.resume_url,
 href: "/dashboard/candidate/profile"
 },
 {
 title: "Get matched with a mentor",
 description: hasMentorAssignment
 ? "You've been matched! Your mentor will schedule observations."
 : "We'll auto-match you based on your skills and goals",
 completed: hasMentorAssignment || (candidateProfile?.mentor_loops || 0) > 0,
 href: "/dashboard/candidate/mentors"
 },
 {
 title: "Complete S1–S4 observations",
 description: "Complete AI Pressure Scenarios (S1), Mentor Live Observation (S2), Work Sample (S3) and Peer-Team Simulation (S4) across your assigned dimensions.",
 completed: candidateProfile?.has_skill_passport || false,
 href: "/dashboard/candidate/observations"
 },
 {
 title: "Receive your Behavioral Evidence Report",
 description: "The Proceed decision is recorded, the Behavioral Evidence Report is issued, and you decide whether, when, and to whom it is released.",
 completed: candidateProfile?.has_skill_passport || false,
 href: "/dashboard/candidate/passport"
 },
 ];
 return steps;
 };

 const getEventIcon = (type: string) => {
 switch (type) {
 case "signup": return User;
 case "resume_upload": return Upload;
 case "training": return BookOpen;
 case "observation": return Star;
 case "tier_change": return Award;
 default: return TrendingUp;
 }
 };

 if (isLoading) {
 return <LedgerLoading />;
 }

 const nextSteps = getNextSteps();
 const completedSteps = nextSteps.filter((s) => s.completed).length;

 return (
 <div>
 {/* Page header */}
 <DashboardPageHeader
 eyebrow={`§ Register · ${profile?.first_name || "Individual"}'s desk`}
 title={
 <>
 Welcome back,{" "}
 <span className="italic display-serif-italic ink-vermilion">
 {profile?.first_name || "individual"}
 </span>
 .
 </>
 }
 meta={`${completedSteps} of ${nextSteps.length} steps entered · Continue where the observation left off.`}
 />

 {/* Welcome copy — per Post-Launch 02 Note 6a. Do not reword
     'more to show', 'review what appears in it', or 'whether a
     completed record is released, when, and to whom' — see the
     drafting note. */}
 <DashSection eyebrow="§ Register · welcome">
   <div className="max-w-3xl space-y-6 text-foreground/85 text-[1.0625rem] leading-[1.7]">
     <p>Your professional story has more to show now.</p>
     <p>
       This is where you can see what has been documented in your name,
       follow how your record develops over time, review what appears in
       it, and decide whether a completed record is released, when, and
       to whom.
     </p>
     <p>
       Your résumé tells people where you have been. Your record
       preserves how your conduct showed up along the way.
     </p>
   </div>
 </DashSection>

 {/* Standing figures */}
 <DashSection eyebrow="§ I · Standing figures" title="At a glance">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
 {stats.map((stat) => (
 <LedgerStat key={stat.label} label={stat.label} value={stat.value} />
 ))}
 </div>
 </DashSection>

 {/* Journey checklist as a numbered register */}
 <DashSection
 eyebrow="§ II · Your journey"
 title={
 <>
 <span className="italic display-serif-italic">From profile</span> to evidence
 </>
 }
 >
 <div className="border-t-2 border-foreground">
 {nextSteps.map((step, index) => (
 <Link
 key={index}
 to={step.href}
 className="row-hover grid grid-cols-12 gap-4 py-6 px-2 md:px-4 border-b border-foreground/20 items-baseline group"
 >
 <div className="col-span-2 md:col-span-1">
 <span
 className={cn(
 "ledger-num text-4xl leading-none",
 step.completed ? "text-foreground/30 line-through" : "text-foreground"
 )}
 >
 {String(index + 1).padStart(2, "0")}
 </span>
 </div>
 <div className="col-span-8 md:col-span-8">
 <h4
 className={cn(
 "display-serif text-xl md:text-2xl leading-tight",
 step.completed ? "text-foreground/40 line-through" : "text-foreground group-hover:italic transition-all"
 )}
 >
 {step.title}
 </h4>
 <p className="text-foreground/70 text-[0.9375rem] mt-1 leading-relaxed">
 {step.description}
 </p>
 </div>
 <div className="col-span-2 md:col-span-3 text-right">
 {step.completed ? (
 <LedgerBadge variant="outline">
 <CheckCircle className="w-3 h-3" /> Filed
 </LedgerBadge>
 ) : (
 <span className="mono-label text-foreground group-hover:ink-vermilion transition-colors">
 Enter →
 </span>
 )}
 </div>
 </Link>
 ))}
 </div>
 </DashSection>

 {/* Recent activity */}
 <DashSection eyebrow="§ III · Recent activity" title="Latest entries in your record">
 {recentActivity.length > 0 ? (
 <div className="border-t-2 border-foreground">
 {recentActivity.map((entry, index) => (
 <div
 key={entry.id}
 className="grid grid-cols-12 gap-4 py-5 px-2 md:px-4 border-b border-foreground/20 items-baseline"
 >
 <div className="col-span-3 md:col-span-2">
 <span className="mono-num text-foreground/50 text-xs">
 {new Date(entry.created_at).toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 })}
 </span>
 </div>
 <div className="col-span-1 mono-label text-foreground/40">
 {String(index + 1).padStart(2, "0")}
 </div>
 <div className="col-span-8 md:col-span-9">
 <p className="display-serif text-lg text-foreground leading-tight">
 {entry.title}
 </p>
 {entry.description && (
 <p className="text-foreground/70 text-[0.875rem] mt-1 leading-relaxed">
 {entry.description}
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
 Your register is <span className="italic display-serif-italic">open.</span>
 </>
 }
 body="Complete your profile and connect with a mentor to begin adding entries to the record."
 action={
 <Link to="/dashboard/candidate/profile">
 <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6">
 Complete profile →
 </Button>
 </Link>
 }
 />
 )}
 </DashSection>
 </div>
 );
};

// Behavioral Evidence Report component
const SkillPassport = () => {
 const { user, profile } = useAuth();
 const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
 const [passportData, setPassportData] = useState<SkillPassportRecord | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [copied, setCopied] = useState(false);
 const [observationProgress, setObservationProgress] = useState<Array<{ dimension_id: string; feedback_level: number; bars_score: number | null; status: string }>>([]);
 const [assignedDimensionIds, setAssignedDimensionIds] = useState<string[]>([]);

 useEffect(() => {
 const fetchData = async () => {
 if (!user?.id) return;

 // Fetch candidate profile
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();
 setCandidateProfile(cp);

 if (cp) {
 // If has passport, fetch passport data (candidate_id = candidate_profiles.id)
 if (cp.has_skill_passport) {
 const { data: passport } = await supabase
 .from("skill_passports")
 .select("*")
 .eq("candidate_id", cp.id)
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 setPassportData(passport);
 }

 // Fetch observation feedback progress
 const { data: assignments } = await supabase
 .from("mentor_assignments")
 .select("id")
 .eq("candidate_id", cp.id)
 .eq("status", "active")
 .limit(1);

 if (assignments && assignments.length > 0) {
 const assignmentId = assignments[0].id;

 // Get assigned dimensions
 const { data: dims } = await supabase
 .from("mentor_assigned_dimensions")
 .select("dimension_id")
 .eq("assignment_id", assignmentId)
 .eq("is_active", true);
 if (dims) {
 setAssignedDimensionIds(dims.map((d: { dimension_id: string }) => d.dimension_id));
 }

 // Get observation feedback
 const { data: feedback } = await supabase
 .from("observation_feedback")
 .select("dimension_id, feedback_level, bars_score, status")
 .eq("assignment_id", assignmentId)
 .eq("candidate_id", cp.id);
 if (feedback) setObservationProgress(feedback);
 }
 }

 setIsLoading(false);
 };

 fetchData();
 }, [user?.id]);

 const copyVerificationCode = () => {
 if (passportData?.verification_code) {
 navigator.clipboard.writeText(passportData.verification_code);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }
 };

 const sharePassport = () => {
 const url = `${window.location.origin}/verify/${passportData?.verification_code}`;
 navigator.clipboard.writeText(url);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const downloadPDF = () => {
 const behavioralScores = (passportData?.behavioral_scores || {}) as Record<string, number>;
 const scoredDims = Object.entries(behavioralScores).filter(([, v]) => v > 0);
 const avgScore = scoredDims.length > 0
 ? (scoredDims.reduce((a, [, b]) => a + b, 0) / scoredDims.length).toFixed(1)
 : "N/A";
 const tierLabel = getTierLabel(passportData?.readiness_tier || candidateProfile?.current_tier);

 const printWindow = window.open('', '_blank');
 if (!printWindow) return;
 const tierColorHex = tierLabel.color.includes('emerald') ? '#10b981' : tierLabel.color.includes('amber') ? '#f59e0b' : '#94a3b8';
 const barsLabel = (s: number) => s >= 3.5 ? "Strong" : s >= 2.5 ? "Competent" : s >= 1.5 ? "Emerging" : "Not Yet Demonstrated";

 const html = `<!DOCTYPE html><html><head><title>Behavioral Evidence Report - ${profile?.first_name} ${profile?.last_name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;color:#1a1a2e;background:#fff}.c{max-width:800px;margin:0 auto;border:2px solid #10b981;border-radius:16px;padding:32px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdfa 100%)}.hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #d1d5db}.pr{display:flex;align-items:center;gap:16px}.av{width:64px;height:64px;border-radius:12px;background:linear-gradient(135deg,#10b981,#14b8a6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;object-fit:cover}.nm{font-size:24px;font-weight:700;color:#1a1a2e}.hl{color:#10b981;font-weight:500}.vb{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#dcfce7;border:1px solid #86efac;border-radius:20px;color:#16a34a;font-size:14px;font-weight:500}.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.sc{padding:14px;background:#fff;border-radius:12px;border:1px solid #e5e7eb}.sl{font-size:11px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.sv{font-size:18px;font-weight:700}.vx{padding:16px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:24px;display:flex;align-items:center;gap:12px}.vc{font-family:monospace;font-size:18px;font-weight:700;letter-spacing:2px}.dt{font-size:16px;font-weight:600;margin-bottom:4px}.ds{font-size:11px;color:#6b7280;margin-bottom:16px}.dg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}.dm{padding:14px;background:#fff;border-radius:10px;border:1px solid #e5e7eb}.dh{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.dn{font-weight:600;font-size:13px}.ds2{font-weight:700;font-size:14px}.dl{font-size:11px;margin-bottom:8px}.pb{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}.pf{height:100%;border-radius:4px}.os{padding:24px;background:linear-gradient(135deg,#ecfdf5,#f0fdfa);border:2px solid #10b981;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.ol{color:#6b7280;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}.ov{font-size:36px;font-weight:700;color:#1a1a2e}.ox{font-size:14px;font-weight:600;color:#10b981}.ft{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}@media print{body{padding:20px}.c{border-width:1px}}</style></head><body><div class="c"><div class="hd"><div class="pr">${profile?.avatar_url ? '<img src="' + profile.avatar_url + '" class="av"/>' : '<div class="av">' + (profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '') + '</div>'}<div><div class="nm">${profile?.first_name || ''} ${profile?.last_name || ''}</div><div class="hl">${profile?.headline || 'Behavioral Readiness Credential Holder'}</div></div></div><div class="vb">✓ Verified</div></div><div class="sg"><div class="sc"><div class="sl">Readiness Tier</div><div class="sv" style="color:${tierColorHex}">${tierLabel.label}</div></div><div class="sc"><div class="sl">Dimensions</div><div class="sv">${scoredDims.length}</div></div><div class="sc"><div class="sl">Issued</div><div class="sv" style="font-size:14px">${passportData?.issued_at ? new Date(passportData.issued_at).toLocaleDateString() : 'N/A'}</div></div><div class="sc"><div class="sl">Expires</div><div class="sv" style="font-size:14px">${passportData?.expires_at ? new Date(passportData.expires_at).toLocaleDateString() : 'Never'}</div></div></div><div class="vx"><span style="font-size:24px">🔒</span><div><div class="sl">Verification Code</div><div class="vc">${passportData?.verification_code || 'N/A'}</div></div></div><div class="dt">Behavioral Assessment</div><div class="ds">4-Point Behaviourally Anchored Rating Scale (BARS)</div><div class="dg">${scoredDims.map(([dimId, score]) => { const dim = BEHAVIORAL_DIMENSIONS.find(d => d.id === dimId); if (!dim) return ''; const pct = (score / 4) * 100; const clr = score >= 3.5 ? '#10b981' : score >= 2.5 ? '#3b82f6' : score >= 1.5 ? '#f59e0b' : '#ef4444'; return '<div class="dm"><div class="dh"><span class="dn">' + dim.label + '</span><span class="ds2" style="color:' + clr + '">' + score.toFixed(1) + '/4</span></div><div class="dl" style="color:' + clr + '">' + barsLabel(score) + '</div><div class="pb"><div class="pf" style="width:' + pct + '%;background:' + clr + '"></div></div></div>'; }).join('')}</div><div class="os"><div><div class="ol">Overall Behavioral Readiness</div><div class="ov">${avgScore}/4</div><div class="ox">${avgScore !== "N/A" ? barsLabel(parseFloat(avgScore)) : '—'}</div></div><div style="font-size:48px">🏆</div></div><div class="ft"><span>The 3rd Academy — Behavioral Readiness Platform</span><span style="color:#6366f1;font-family:monospace;font-size:11px">${window.location.origin}/verify/${passportData?.verification_code}</span></div></div><script>window.onload=function(){window.print()}<\/script></body></html>`;
 printWindow.document.write(html);
 printWindow.document.close();
 };


 const getTierLabel = (tier: string | null) => {
 const labels: Record<string, { label: string; color: string }> = {
 developing: { label: "Developing", color: "ink-vermilion" },
 emerging: { label: "Emerging", color: "text-foreground" },
 ready: { label: "Job Ready", color: "text-foreground" },
 silver: { label: "Silver", color: "text-foreground/75" },
 gold: { label: "Gold", color: "ink-vermilion" },
 platinum: { label: "Platinum", color: "text-foreground" },
 };
 return labels[tier || "developing"] || { label: tier || "Unknown", color: "text-foreground/60" };
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 if (!candidateProfile?.has_skill_passport) {
 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="space-y-8"
 >
 <LegacyBanner
   body="This is the earlier version of this surface. A newer Report Review surface is available, where you can raise a challenge to any statement or observation in your record."
   linkHref="/dashboard/candidate/report-review"
   linkLabel="Open the new Report Review surface"
 />
 <motion.div variants={itemVariants}>
 <h1 className="text-3xl font-bold text-foreground mb-2">Behavioral Evidence Report</h1>
 <p className="text-foreground/60">
 A Behavioral Evidence Report reflects how your conduct shows up across workplace situations over time.
 </p>
 </motion.div>

 {/* Your Record Actions — per Post-Launch 02 Note 8(k). The four
     actions sit as parallel destinations, not a numbered sequence.
     Availability is state-aware; here we render the 'no report yet'
     state where REVIEW/CONTINUE/CHECK become available once
     observation begins and RELEASE only once the report is issued. */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Your Record Actions</h2>
 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 border-t-2 border-foreground pt-4">
 {[
 { label: "REVIEW", body: "See the conduct already documented in your record." },
 { label: "CONTINUE", body: "Pick up where your record is still being built." },
 { label: "CHECK", body: "See what the record supports, what remains unobserved, and raise a correction where necessary." },
 { label: "RELEASE", body: "Choose whether and when a completed record is released, and who receives it." },
 ].map((a) => (
 <div
 key={a.label}
 aria-disabled="true"
 className="p-5 border border-foreground/20 bg-foreground/[0.02] opacity-70"
 >
 <div className="mono-label text-foreground/60 mb-2">{a.label}</div>
 <p className="text-sm text-foreground/70 leading-snug mb-3">{a.body}</p>
 <p className="text-[0.7rem] text-foreground/45 italic">Not yet available — observation has not started.</p>
 </div>
 ))}
 </div>
 </motion.div>

 <motion.div
 variants={itemVariants}
 className="p-8 rounded-2xl bg-foreground/[0.04] border border-foreground/25 text-center"
 >
 <div className="w-20 h-20 rounded-full bg-foreground/20 flex items-center justify-center mx-auto mb-6">
 <Shield className="w-10 h-10 ink-vermilion" />
 </div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Your Behavioral Evidence Report</h2>
 <p className="text-foreground/70 max-w-lg mx-auto mb-6 leading-relaxed">
 Your Behavioral Evidence Report reflects conduct documented across workplace situations over time. It records what was observed. It is not generated from your profile.
 </p>
 {(() => {
 const hasS1 = observationProgress.some(f => f.feedback_level === 1);
 const hasS2 = observationProgress.some(f => f.feedback_level === 2);
 const hasS3 = observationProgress.some(f => f.feedback_level === 3);
 const hasS4 = observationProgress.some(f => f.feedback_level === 4);
 const dimensionsObserved = new Set(observationProgress.map(f => f.dimension_id)).size;
 const mdcMet = dimensionsObserved >= 3;
 return (
 <>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${hasS1 ? "text-foreground" : "text-foreground/40"}`} />
 <span className="text-sm leading-snug">S1 AI Pressure Scenarios</span>
 </div>
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${hasS2 ? "text-foreground" : "text-foreground/40"}`} />
 <span className="text-sm leading-snug">S2 Mentor Live Observation</span>
 </div>
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${hasS3 ? "text-foreground" : "text-foreground/40"}`} />
 <span className="text-sm leading-snug">S3 Work Sample</span>
 </div>
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${hasS4 ? "text-foreground" : "text-foreground/40"}`} />
 <span className="text-sm leading-snug">S4 Peer-Team Simulation</span>
 </div>
 </div>
 <div className="mt-6 max-w-lg mx-auto text-left space-y-3">
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${mdcMet ? "text-foreground" : "text-foreground/40"}`} />
 <div className="text-sm leading-snug">
 <div className="text-foreground">MDC-3 — Minimum Dimension Count: {dimensionsObserved} of 3.</div>
 <p className="text-xs text-foreground/60 mt-1">
 At least three behavioral dimensions must be observed before a Behavioral Evidence Report can be issued. Meeting the minimum does not by itself mean a report is issued.
 </p>
 </div>
 </div>
 <div className="flex items-start gap-2 text-foreground/70">
 <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-foreground/40" />
 <span className="text-sm leading-snug">Proceed decision recorded</span>
 </div>
 </div>
 </>
 );
 })()}

 {/* Show dimension-level observation progress if any feedback exists */}
 {observationProgress.length > 0 && assignedDimensionIds.length > 0 && (
 <div className="mt-8 max-w-lg mx-auto">
 <p className="text-sm text-foreground/50 mb-3">Observation Evidence</p>
 <div className="space-y-3">
 {assignedDimensionIds.map(dimId => {
 const dimInfo = BEHAVIORAL_DIMENSIONS.find(d => d.id === dimId);
 const dimFeedback = observationProgress.filter(f => f.dimension_id === dimId);
 const hasL1 = dimFeedback.some(f => f.feedback_level === 1);
 const hasL2 = dimFeedback.some(f => f.feedback_level === 2);
 const latestScore = dimFeedback.find(f => f.bars_score)?.bars_score;

 return (
 <div key={dimId} className="flex items-center justify-between p-3 rounded-xl bg-background border border-foreground/15">
 <div className="flex items-center gap-3">
 <div className={`w-2 h-2 rounded-full ${hasL1 || hasL2 ? "bg-vermilion/10" : "bg-foreground/10"}`} />
 <span className="text-sm text-foreground">{dimInfo?.label || dimId}</span>
 </div>
 <div className="flex items-center gap-3">
 {latestScore && (
 <span className="text-xs text-foreground/60">BARS: {latestScore}/4</span>
 )}
 <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasL1 ? "bg-foreground/[0.06] text-foreground" : "bg-white/5 text-foreground/50"}`}>S1</span>
 <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasL2 ? "bg-foreground/[0.06] text-foreground" : "bg-white/5 text-foreground/50"}`}>S2</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </motion.div>

 {/* Old numbered 'How It Works' block removed per Post-Launch 02
     Note 8(k); replaced by the Your Record Actions block above. */}
 </motion.div>
 );
 }

 // Has Behavioral Evidence Report - Full Display
 const behavioralScores = (passportData?.behavioral_scores || {}) as Record<string, number>;
 const tierInfo = getTierLabel(passportData?.readiness_tier || candidateProfile?.current_tier);

 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="space-y-8"
 >
 <motion.div variants={itemVariants} className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground mb-2">Your Behavioral Evidence Report</h1>
 <p className="text-foreground/60">Your documented behavioral readiness assessment for employers.</p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 className="border-foreground/25 text-foreground hover:bg-foreground/5"
 onClick={sharePassport}
 >
 <Share2 className="w-4 h-4 mr-2" />
 {copied ? "Copied!" : "Share Link"}
 </Button>
 <Button
 variant="outline"
 className="border-foreground/40 text-foreground hover:bg-foreground/[0.06]"
 onClick={downloadPDF}
 >
 <Download className="w-4 h-4 mr-2" />
 Download PDF
 </Button>
 </div>
 </motion.div>

 {/* Passport Card */}
 <motion.div
 variants={itemVariants}
 className="relative overflow-hidden rounded-2xl bg-foreground/[0.05] border border-foreground/40"
 >
 {/* Background Pattern */}
 <div className="absolute inset-0 opacity-5">
 <div className="absolute top-0 left-0 w-40 h-40 bg-foreground/[0.05] from-white rounded-full blur-3xl" />
 <div className="absolute bottom-0 right-0 w-60 h-60 bg-foreground/[0.05] from-white rounded-full blur-3xl" />
 </div>

 <div className="relative p-8">
 {/* Header */}
 <div className="flex items-start justify-between mb-8">
 <div className="flex items-center gap-4">
 {profile?.avatar_url ? (
 <img src={profile.avatar_url} alt="Profile" className="w-16 h-16 rounded-2xl object-cover" />
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-vermilion flex items-center justify-center text-background font-bold text-xl">
 {profile?.first_name?.[0]}{profile?.last_name?.[0]}
 </div>
 )}
 <div>
 <h2 className="text-2xl font-bold text-foreground">
 {profile?.first_name} {profile?.last_name}
 </h2>
 <p className="text-foreground font-medium">{profile?.headline || "Candidate"}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/[0.06] border border-foreground/40">
 <CheckCircle className="w-4 h-4 text-foreground" />
 <span className="text-foreground font-medium text-sm">Verified</span>
 </div>
 </div>
 </div>

 {/* Tier & Stats */}
 <div className="grid md:grid-cols-3 gap-6 mb-8">
 <div className="p-4 rounded-xl bg-background/20 backdrop-blur">
 <p className="text-sm text-foreground/60 mb-1">Readiness Tier</p>
 <p className={`text-xl font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
 </div>
 <div className="p-4 rounded-xl bg-background/20 backdrop-blur">
 <p className="text-sm text-foreground/60 mb-1">Dimensions Observed</p>
 <p className="text-xl font-bold text-foreground">{Object.keys(behavioralScores).length}</p>
 </div>
 <div className="p-4 rounded-xl bg-background/20 backdrop-blur">
 <p className="text-sm text-foreground/60 mb-1">Valid Until</p>
 <p className="text-xl font-bold text-foreground">
 {passportData?.expires_at
 ? new Date(passportData.expires_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
 : "N/A"}
 </p>
 </div>
 </div>

 {/* Verification Code */}
 <div className="p-4 rounded-xl bg-background/20 backdrop-blur mb-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <QrCode className="w-8 h-8 text-foreground" />
 <div>
 <p className="text-xs text-foreground/60 mb-1">Verification Code</p>
 <p className="text-lg font-mono font-bold text-foreground tracking-wider">
 {passportData?.verification_code || "N/A"}
 </p>
 </div>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={copyVerificationCode}
 className="border-foreground/40 text-foreground hover:bg-foreground/[0.06]"
 >
 <Copy className="w-4 h-4 mr-1" />
 {copied ? "Copied!" : "Copy"}
 </Button>
 </div>
 </div>

 {/* Issue Date */}
 <div className="flex items-center justify-between text-sm text-foreground/50">
 <span>
 Issued: {passportData?.issued_at
 ? new Date(passportData.issued_at).toLocaleDateString()
 : "N/A"}
 </span>
 <span>The 3rd Academy</span>
 </div>
 </div>
 </motion.div>

 {/* Behavioral Scores — Only observed dimensions */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Behavioral Assessment (BARS 4-Point Scale)</h2>
 <div className="grid md:grid-cols-2 gap-4">
 {Object.entries(behavioralScores).filter(([, v]) => v > 0).map(([dimId, score]) => {
 const dimension = BEHAVIORAL_DIMENSIONS.find(d => d.id === dimId);
 if (!dimension) return null;
 const percentage = (score / 4) * 100;
 const barsLabel = score >= 3.5 ? "Strong" : score >= 2.5 ? "Competent" : score >= 1.5 ? "Emerging" : "Not Yet Demonstrated";
 const barsColor = score >= 3.5 ? "text-foreground" : score >= 2.5 ? "text-foreground" : score >= 1.5 ? "ink-vermilion" : "ink-vermilion";

 return (
 <div key={dimId} className="p-4 rounded-xl bg-background border border-foreground/15">
 <div className="flex items-center justify-between mb-1">
 <span className="font-medium text-foreground">{dimension.label}</span>
 <span className={`text-lg font-bold ${barsColor}`}>{score.toFixed(1)}/4</span>
 </div>
 <p className={`text-xs mb-2 ${barsColor}`}>{barsLabel}</p>
 <div className="h-2 bg-white/5 rounded-full overflow-hidden">
 <div
 className={`h-full bg-foreground/[0.05] ${dimension.color} rounded-full transition-all duration-500`}
 style={{ width: `${percentage}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </motion.div>

 {/* Overall Score */}
 {(() => {
 const scored = Object.values(behavioralScores).filter(v => v > 0);
 const avg = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
 const label = avg >= 3.5 ? "Strong" : avg >= 2.5 ? "Competent" : avg >= 1.5 ? "Emerging" : "—";
 const color = avg >= 3.5 ? "text-foreground" : avg >= 2.5 ? "text-foreground" : avg >= 1.5 ? "ink-vermilion" : "text-foreground/60";
 return (
 <motion.div variants={itemVariants}>
 <div className="p-6 rounded-xl bg-foreground/[0.05] border border-foreground/40">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-foreground/60 mb-1">Overall Behavioral Readiness</p>
 <p className={`text-3xl font-bold ${color}`}>{avg > 0 ? avg.toFixed(1) : "N/A"}/4</p>
 <p className={`text-sm ${color}`}>{label}</p>
 </div>
 <div className="w-20 h-20 rounded-full bg-foreground/[0.05] flex items-center justify-center">
 <Award className="w-10 h-10 ink-vermilion" />
 </div>
 </div>
 </div>
 </motion.div>
 );
 })()}

 {/* Verification Info */}
 <motion.div variants={itemVariants}>
 <div className="p-4 rounded-xl bg-background border border-foreground/25">
 <div className="flex items-center gap-3">
 <Shield className="w-5 h-5 text-foreground" />
 <p className="text-sm text-foreground/60">
 Employers can review this documentation at{" "}
 <span className="text-foreground font-mono">
 {window.location.origin}/verify/{passportData?.verification_code}
 </span>
 </p>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
};

// Growth Log component
const GrowthLog = () => {
 const { user } = useAuth();
 const [entries, setEntries] = useState<GrowthLogEntry[]>([]);
 const [passportData, setPassportData] = useState<SkillPassportRecord | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [viewMode, setViewMode] = useState<"timeline" | "charts">("charts");

 useEffect(() => {
 const fetchEntries = async () => {
 if (!user?.id) return;

 const { data } = await supabase
 .from("growth_log_entries")
 .select("*")
 .eq("candidate_id", user.id)
 .order("created_at", { ascending: false });

 // Get candidate_profiles.id for skill_passports FK
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("id")
 .eq("profile_id", user.id)
 .single();

 // Fetch passport for behavioral scores (candidate_id = candidate_profiles.id)
 if (cp) {
 const { data: passport } = await supabase
 .from("skill_passports")
 .select("*")
 .eq("candidate_id", cp.id)
 .eq("is_active", true)
 .limit(1)
 .maybeSingle();
 setPassportData(passport);
 }

 setEntries(data || []);
 setIsLoading(false);
 };

 fetchEntries();
 }, [user?.id]);

 const getEventIcon = (type: string) => {
 const icons: Record<string, typeof TrendingUp> = {
 signup: User,
 resume_upload: Upload,
 training: BookOpen,
 observation: Star,
 tier_change: Award,
 assessment: BarChart3,
 project: Briefcase,
 endorsement: Shield,
 };
 return icons[type] || TrendingUp;
 };

 const getEventColor = (type: string) => {
 const colors: Record<string, string> = {
 signup: "",
 resume_upload: "",
 training: "",
 observation: "",
 tier_change: "",
 assessment: "",
 project: "",
 endorsement: "",
 };
 return colors[type] || "";
 };

 // Calculate activity trends data (last 30 days)
 const getActivityTrendsData = () => {
 const last30Days: Record<string, number> = {};
 const today = new Date();

 // Initialize last 30 days
 for (let i = 29; i >= 0; i--) {
 const date = new Date(today);
 date.setDate(date.getDate() - i);
 const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
 last30Days[key] = 0;
 }

 // Count entries per day
 entries.forEach((entry) => {
 const entryDate = new Date(entry.created_at);
 const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
 if (daysDiff < 30) {
 const key = entryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
 if (last30Days[key] !== undefined) {
 last30Days[key]++;
 }
 }
 });

 return Object.entries(last30Days).map(([date, count]) => ({
 date,
 activities: count,
 }));
 };

 // Calculate behavioral radar data
 const getBehavioralRadarData = () => {
 const scores = (passportData?.behavioral_scores || {}) as Record<string, number>;
 return BEHAVIORAL_DIMENSIONS.map((dim) => ({
 dimension: dim.label,
 score: scores[dim.id] || 0,
 fullMark: 4,
 }));
 };

 // Calculate event type distribution
 const getEventDistribution = () => {
 const distribution: Record<string, number> = {};
 entries.forEach((entry) => {
 distribution[entry.event_type] = (distribution[entry.event_type] || 0) + 1;
 });
 return Object.entries(distribution).map(([type, count]) => ({
 type: type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
 count,
 }));
 };

 // Calculate growth stats
 const getGrowthStats = () => {
 const thisWeek = entries.filter((e) => {
 const daysDiff = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
 return daysDiff < 7;
 }).length;

 const lastWeek = entries.filter((e) => {
 const daysDiff = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
 return daysDiff >= 7 && daysDiff < 14;
 }).length;

 // Only calculate growth rate if there's a baseline from last week
 // If lastWeek is 0, showing 100% growth is unrealistic - show 0 instead
 const growthRate = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

 return { thisWeek, lastWeek, growthRate };
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 const activityData = getActivityTrendsData();
 const radarData = getBehavioralRadarData();
 const eventDistribution = getEventDistribution();
 const growthStats = getGrowthStats();

 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="space-y-8"
 >
 <motion.div variants={itemVariants} className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground mb-2">Growth Log</h1>
 <p className="text-foreground/60">
 Your complete behavioral development timeline.
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 variant={viewMode === "charts" ? "default" : "outline"}
 size="sm"
 onClick={() => setViewMode("charts")}
 className={viewMode === "charts" ? "bg-foreground/10" : "border-foreground/25 text-foreground"}
 >
 <BarChart3 className="w-4 h-4 mr-2" />
 Analytics
 </Button>
 <Button
 variant={viewMode === "timeline" ? "default" : "outline"}
 size="sm"
 onClick={() => setViewMode("timeline")}
 className={viewMode === "timeline" ? "bg-foreground/10" : "border-foreground/25 text-foreground"}
 >
 <Clock className="w-4 h-4 mr-2" />
 Timeline
 </Button>
 </div>
 </motion.div>

 {/* Stats Overview */}
 <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="p-4 rounded-xl bg-foreground/[0.05] border border-foreground/40">
 <p className="text-sm text-foreground/60 mb-1">Total Activities</p>
 <p className="text-2xl font-bold text-foreground">{entries.length}</p>
 </div>
 <div className="p-4 rounded-xl bg-foreground/[0.05] border border-foreground/40">
 <p className="text-sm text-foreground/60 mb-1">This Week</p>
 <p className="text-2xl font-bold text-foreground">{growthStats.thisWeek}</p>
 </div>
 <div className="p-4 rounded-xl bg-foreground/[0.05] border border-foreground/40">
 <p className="text-sm text-foreground/60 mb-1">Growth Rate</p>
 <p className={`text-2xl font-bold ${growthStats.growthRate >= 0 ? "text-foreground" : "ink-vermilion"}`}>
 {growthStats.growthRate >= 0 ? "+" : ""}{growthStats.growthRate}%
 </p>
 </div>
 <div className="p-4 rounded-xl bg-vermilion/[0.08] border border-vermilion">
 <p className="text-sm text-foreground/60 mb-1">Event Types</p>
 <p className="text-2xl font-bold text-foreground">{eventDistribution.length}</p>
 </div>
 </motion.div>

 {viewMode === "charts" && (
 <>
 {/* Activity Trends Chart */}
 <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
 <h2 className="text-lg font-semibold text-foreground mb-4">Activity Trends (Last 30 Days)</h2>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={activityData}>
 <defs>
 <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
 <XAxis
 dataKey="date"
 tick={{ fill: "#9ca3af", fontSize: 10 }}
 tickLine={{ stroke: "#4b5563" }}
 interval="preserveStartEnd"
 />
 <YAxis
 tick={{ fill: "#9ca3af", fontSize: 12 }}
 tickLine={{ stroke: "#4b5563" }}
 allowDecimals={false}
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
 dataKey="activities"
 stroke="#6366f1"
 strokeWidth={2}
 fill="url(#activityGradient)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </motion.div>

 {/* Behavioral Dimensions Radar */}
 <div className="grid md:grid-cols-2 gap-6">
 <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
 <h2 className="text-lg font-semibold text-foreground mb-4">Behavioral Profile</h2>
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart data={radarData}>
 <PolarGrid stroke="#374151" />
 <PolarAngleAxis
 dataKey="dimension"
 tick={{ fill: "#9ca3af", fontSize: 10 }}
 />
 <PolarRadiusAxis
 angle={30}
 domain={[0, 4]}
 tick={{ fill: "#6b7280", fontSize: 10 }}
 />
 <Radar
 name="Score"
 dataKey="score"
 stroke="#10b981"
 fill="#10b981"
 fillOpacity={0.3}
 strokeWidth={2}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: "#1f2937",
 border: "1px solid #374151",
 borderRadius: "8px",
 color: "#fff",
 }}
 />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 </motion.div>

 <motion.div variants={itemVariants} className="p-6 rounded-xl bg-background border border-foreground/25">
 <h2 className="text-lg font-semibold text-foreground mb-4">Activity Breakdown</h2>
 <div className="space-y-3">
 {eventDistribution.map((item) => {
 const maxCount = Math.max(...eventDistribution.map((e) => e.count));
 const percentage = (item.count / maxCount) * 100;
 return (
 <div key={item.type}>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-foreground/60">{item.type}</span>
 <span className="text-foreground font-medium">{item.count}</span>
 </div>
 <div className="h-2 bg-background rounded-full overflow-hidden">
 <div
 className="h-full bg-foreground rounded-full transition-all duration-500"
 style={{ width: `${percentage}%` }}
 />
 </div>
 </div>
 );
 })}
 {eventDistribution.length === 0 && (
 <p className="text-foreground/50 text-center py-4">No activities recorded yet</p>
 )}
 </div>
 </motion.div>
 </div>
 </>
 )}

 {viewMode === "timeline" && (
 <>
 {entries.length > 0 ? (
 <motion.div variants={itemVariants} className="relative">
 {/* Timeline line */}
 <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-foreground" />

 <div className="space-y-6">
 {entries.map((entry, index) => {
 const Icon = getEventIcon(entry.event_type);
 return (
 <motion.div
 key={entry.id}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.1 }}
 className="relative pl-14"
 >
 {/* Timeline dot */}
 <div className={`absolute left-0 w-10 h-10 rounded-xl bg-foreground/[0.05] ${getEventColor(entry.event_type)} flex items-center justify-center shadow-lg`}>
 <Icon className="w-5 h-5 text-foreground" />
 </div>

 <div className="p-5 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors">
 <div className="flex items-start justify-between mb-2">
 <h3 className="font-semibold text-foreground">{entry.title}</h3>
 <span className="text-xs text-foreground/50 whitespace-nowrap ml-4">
 {new Date(entry.created_at).toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 year: "numeric",
 })}
 </span>
 </div>
 {entry.description && (
 <p className="text-sm text-foreground/60">{entry.description}</p>
 )}
 {entry.source_component && (
 <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs bg-background text-foreground/60">
 {entry.source_component}
 </span>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </motion.div>
 ) : (
 <motion.div
 variants={itemVariants}
 className="p-8 rounded-2xl bg-background border border-foreground/25 text-center"
 >
 <TrendingUp className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No entries yet</p>
 <p className="text-sm text-foreground/50 mt-1">
 Your growth log will populate as you complete activities
 </p>
 </motion.div>
 )}
 </>
 )}
 </motion.div>
 );
};

// Quiz questions for each behavioral dimension
const QUIZ_QUESTIONS: Record<string, { question: string; options: string[]; correct: number }[]> = {
 communication: [
 { question: "Which approach is most effective for delivering critical feedback?", options: ["Publicly to set an example", "Via email only", "Privately and constructively", "Avoid it entirely"], correct: 2 },
 { question: "Active listening involves:", options: ["Thinking about your response while others speak", "Maintaining eye contact and asking clarifying questions", "Interrupting to show engagement", "Taking notes constantly"], correct: 1 },
 { question: "When presenting complex information, you should:", options: ["Use as much jargon as possible", "Break it into digestible chunks with examples", "Speak quickly to cover more ground", "Assume audience knowledge"], correct: 1 },
 ],
 problem_solving: [
 { question: "The first step in effective problem-solving is:", options: ["Implementing a quick fix", "Blaming the responsible party", "Clearly defining the problem", "Calling a meeting"], correct: 2 },
 { question: "Root cause analysis helps you:", options: ["Find someone to blame", "Address symptoms quickly", "Identify and fix underlying issues", "Avoid accountability"], correct: 2 },
 { question: "When facing a novel problem, you should:", options: ["Panic and escalate immediately", "Research similar cases and brainstorm options", "Ignore it until it resolves", "Make assumptions without data"], correct: 1 },
 ],
 adaptability: [
 { question: "How should you respond to unexpected changes in project scope?", options: ["Refuse to accept changes", "Assess impact and adjust plans accordingly", "Complain to colleagues", "Ignore the changes"], correct: 1 },
 { question: "Adaptable employees are characterized by:", options: ["Resistance to new ideas", "Flexibility and openness to change", "Strict adherence to routines", "Avoiding challenges"], correct: 1 },
 { question: "When learning new technology, you should:", options: ["Wait for formal training only", "Explore, practice, and ask questions", "Avoid it as long as possible", "Claim you can't learn it"], correct: 1 },
 ],
 collaboration: [
 { question: "Effective team collaboration requires:", options: ["Individual competition", "Clear communication and shared goals", "Working in isolation", "Avoiding disagreements"], correct: 1 },
 { question: "When a team member disagrees with your idea, you should:", options: ["Dismiss their opinion", "Listen and consider their perspective", "Escalate to management", "Stop contributing"], correct: 1 },
 { question: "Sharing credit for team success:", options: ["Makes you look weak", "Builds trust and morale", "Is unnecessary", "Should be avoided"], correct: 1 },
 ],
 initiative: [
 { question: "Taking initiative means:", options: ["Waiting to be told what to do", "Proactively identifying and addressing opportunities", "Only doing assigned tasks", "Avoiding extra work"], correct: 1 },
 { question: "When you notice a process improvement opportunity:", options: ["Ignore it - not your job", "Document and propose the improvement", "Complain about current process", "Wait for someone else to notice"], correct: 1 },
 { question: "Self-starters typically:", options: ["Need constant supervision", "Seek out challenges and learning opportunities", "Avoid responsibility", "Follow others only"], correct: 1 },
 ],
 time_management: [
 { question: "The best way to handle multiple deadlines is to:", options: ["Work on everything simultaneously", "Prioritize tasks by urgency and importance", "Miss some deadlines", "Only work on easy tasks"], correct: 1 },
 { question: "When estimating task duration, you should:", options: ["Always give shortest estimate", "Add buffer time for unexpected issues", "Avoid giving estimates", "Double all estimates"], correct: 1 },
 { question: "Effective time management includes:", options: ["Multitasking constantly", "Setting clear goals and minimizing distractions", "Working without breaks", "Checking email every 5 minutes"], correct: 1 },
 ],
 professionalism: [
 { question: "Professional workplace behavior includes:", options: ["Gossip and office politics", "Reliability, respect, and accountability", "Casual attitude to deadlines", "Avoiding difficult conversations"], correct: 1 },
 { question: "When you make a mistake at work, you should:", options: ["Hide it and hope no one notices", "Acknowledge it and work to fix it", "Blame others", "Ignore it"], correct: 1 },
 { question: "Professional communication means:", options: ["Using slang and emojis always", "Clear, respectful, and appropriate language", "Being overly casual", "Avoiding communication"], correct: 1 },
 ],
 learning_agility: [
 { question: "Learning agility is best described as:", options: ["Memorizing information quickly", "Ability to learn from experience and apply to new situations", "Avoiding new challenges", "Only learning from formal training"], correct: 1 },
 { question: "When you fail at something, you should:", options: ["Give up on similar tasks", "Analyze what went wrong and try again", "Blame external factors", "Avoid the topic forever"], correct: 1 },
 { question: "Continuous learning in the workplace means:", options: ["Only attending mandatory training", "Actively seeking new knowledge and skills", "Waiting for promotions to learn", "Learning stops after onboarding"], correct: 1 },
 ],
};

// Observation Readiness Check — dimension descriptions (T3A 14 Behavioral Dimensions, MVP top 5)
const ASSESSMENT_DESCRIPTIONS: Record<string, { title: string; description: string; examples: string[] }> = {
 integrity_ethics: {
 title: "Integrity & Ethics",
 description: "Acting with honesty, maintaining trust, and navigating ethical grey areas under pressure.",
 examples: ["Honesty under pressure", "Reporting misconduct", "Navigating conflicts of interest", "Maintaining trust"],
 },
 accountability_ownership: {
 title: "Accountability & Ownership",
 description: "Taking full responsibility for outcomes and following through on commitments without excuses.",
 examples: ["Owning mistakes", "Following through on promises", "Transparent communication", "Not shifting blame"],
 },
 execution_reliability: {
 title: "Execution Reliability",
 description: "Delivering consistent, quality work on time without constant supervision.",
 examples: ["Meeting deadlines", "Quality output under pressure", "Self-managed delivery", "Consistent performance"],
 },
 communication_pressure: {
 title: "Communication Under Pressure",
 description: "Delivering clear, timely messages with appropriate tone when stakes are high.",
 examples: ["Calm messaging in conflict", "Clear written communication", "Tone under stress", "Active listening"],
 },
 collaboration_conflict: {
 title: "Collaboration & Conflict Resolution",
 description: "Working effectively with diverse teams and navigating disagreements productively.",
 examples: ["Navigating team conflict", "Building consensus", "Supporting colleagues", "Cross-functional work"],
 },
 workplace_adaptability: {
 title: "Workplace Adaptability",
 description: "Reading situations, adjusting behavior appropriately, and navigating organizational culture.",
 examples: ["Adjusting to new environments", "Reading the room", "Cultural sensitivity", "Flexible problem-solving"],
 },
 prioritization_time: {
 title: "Prioritization & Time Management",
 description: "Managing competing demands and making sound decisions under deadline pressure.",
 examples: ["Prioritizing under pressure", "Managing multiple tasks", "Meeting deadlines", "Clear decision-making"],
 },
 resilience_recovery: {
 title: "Resilience & Recovery",
 description: "Bouncing back from setbacks and maintaining composure through failure and rejection.",
 examples: ["Handling rejection", "Recovering from failure", "Composure under pressure", "Sustained performance"],
 },
 learning_agility: {
 title: "Learning Agility",
 description: "Receiving and applying feedback without defensiveness; proactively acquiring new knowledge.",
 examples: ["Applying feedback", "Self-directed learning", "Curiosity and openness", "Adapting quickly"],
 },
 professional_boundaries: {
 title: "Professional Boundaries",
 description: "Maintaining appropriate workplace relationships and navigating social dynamics professionally.",
 examples: ["Appropriate humor", "Confidentiality", "Relationship limits", "Workplace conduct"],
 },
 creative_problem_solving: {
 title: "Creative Problem-Solving",
 description: "Finding resourceful solutions when standard approaches don't work.",
 examples: ["Improvising under constraints", "Innovative thinking", "Lateral approaches", "Resource creativity"],
 },
 customer_service_focus: {
 title: "Customer & Service Focus",
 description: "Prioritizing stakeholder needs and delivering service with genuine care.",
 examples: ["Stakeholder empathy", "Service under pressure", "Going beyond requirements", "Following through"],
 },
 influence_persuasion: {
 title: "Influence & Persuasion",
 description: "Gaining cooperation and buy-in without formal authority.",
 examples: ["Influencing peers", "Building buy-in", "Negotiating without authority", "Motivating others"],
 },
 relationship_building: {
 title: "Relationship Building",
 description: "Developing and maintaining professional networks that create mutual value.",
 examples: ["Building trust", "Networking authentically", "Long-term relationship maintenance", "Mutual value creation"],
 },
};

// Mentor-Gated Observation Pathway
// Candidates MUST have an active mentor assignment to access observations.
// Mentor assigns dimensions before any observation activity (S1–S4) can begin.
const ObservationPathway = () => {
 const { user } = useAuth();
 const [isLoading, setIsLoading] = useState(true);
 const [mentorAssignment, setMentorAssignment] = useState<MentorAssignment | null>(null);
 const [mentorProfile, setMentorProfile] = useState<{ first_name: string; last_name: string } | null>(null);
 const [assignedDimensions, setAssignedDimensions] = useState<string[]>([]);
 const [observationFeedback, setObservationFeedback] = useState<Array<{ dimension_id: string; feedback_level: number; bars_score: number | null; status: string; final_feedback: string | null }>>([]);
 const [endorsementDecision, setEndorsementDecision] = useState<string | null>(null);;
 const [loopData, setLoopData] = useState<Array<{dimension_id: string; loop_number: number; status: string; cooldown_ends_at: string | null; endorsement_decision: string | null; completed_at: string | null}>>([]);

 useEffect(() => {
 const fetchObservationData = async () => {
 if (!user?.id) return;

 try {
 // Get candidate_profiles.id (FK for mentor_assignments)
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("id")
 .eq("profile_id", user.id)
 .single();
 if (!cp) { setIsLoading(false); return; }

 // Check for active mentor assignment
 const { data: assignments } = await supabase
 .from("mentor_assignments")
 .select("*")
 .eq("candidate_id", cp.id)
 .eq("status", "active")
 .limit(1);

 if (assignments && assignments.length > 0) {
 const assignment = assignments[0];
 setMentorAssignment(assignment);

 // Get mentor name — mentor_id references mentor_profiles.id, need to join through profile_id
 const { data: mentorProfileData } = await supabase
 .from("mentor_profiles")
 .select("profile_id")
 .eq("id", assignment.mentor_id)
 .single();
 if (mentorProfileData) {
 const { data: mentorData } = await supabase
 .from("profiles")
 .select("first_name, last_name")
 .eq("id", mentorProfileData.profile_id)
 .single();
 if (mentorData) setMentorProfile(mentorData);
 }

 // Get mentor-assigned dimensions
 const { data: dims } = await supabase
 .from("mentor_assigned_dimensions")
 .select("dimension_id")
 .eq("assignment_id", assignment.id)
 .eq("is_active", true);

 if (dims) {
 setAssignedDimensions(dims.map((d: { dimension_id: string }) => d.dimension_id));
 }

 // Get observation feedback for this assignment
 const { data: feedback } = await supabase
 .from("observation_feedback")
 .select("dimension_id, feedback_level, bars_score, status, final_feedback")
 .eq("assignment_id", assignment.id)
 .eq("candidate_id", cp.id);

 if (feedback) setObservationFeedback(feedback);

 // Get loop tracking data for this candidate
 const { data: loops } = await supabase
 .from("observation_loops")
 .select("dimension_id, loop_number, status, cooldown_ends_at, endorsement_decision, completed_at")
 .eq("candidate_id", cp.id)
 .order("loop_number", { ascending: true });
 if (loops) setLoopData(loops);

 // Get endorsement decision if any
 const { data: endorsement } = await supabase
 .from("endorsements")
 .select("decision")
 .eq("assignment_id", assignment.id)
 .eq("candidate_id", cp.id)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (endorsement) setEndorsementDecision(endorsement.decision);
 }
 } catch (error) {
 console.error("Error fetching observation data:", error);
 } finally {
 setIsLoading(false);
 }
 };

 fetchObservationData();
 }, [user?.id]);

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
 case 1: return "ink-vermilion";
 case 2: return "ink-vermilion";
 case 3: return "text-foreground";
 case 4: return "text-foreground";
 default: return "text-foreground/60";
 }
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 // NO MENTOR ASSIGNMENT — Gate the entire observation pathway
 if (!mentorAssignment) {
 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="max-w-3xl mx-auto space-y-8"
 >
 <motion.div variants={itemVariants} className="text-center py-12">
 <div className="w-20 h-20 rounded-2xl bg-foreground/[0.03] flex items-center justify-center mx-auto mb-6">
 <Lock className="w-10 h-10 ink-vermilion" />
 </div>
 <h1 className="text-3xl font-bold text-foreground mb-3">Observation Pathway</h1>
 <p className="text-foreground/60 max-w-xl mx-auto mb-6">
 The Observation Pathway is where observation takes place and your record is built.
 </p>
 <div className="p-4 rounded-xl bg-vermilion/10 border border-vermilion inline-flex items-start gap-3 max-w-lg text-left">
 <AlertCircle className="w-5 h-5 ink-vermilion shrink-0 mt-0.5" />
 <div>
 <p className="text-sm ink-vermilion font-medium">Mentor Assignment Required</p>
 <p className="text-sm ink-vermilion/70 mt-1">
 Observation begins once a mentor has been assigned and your observation focus has been confirmed. Request a mentor to get started.
 </p>
 </div>
 </div>
 <div className="mt-8">
 <Link to="/dashboard/candidate/mentors">
 <Button
 size="lg"
 className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
 >
 <GraduationCap className="w-5 h-5 mr-2" />
 Request a Mentor
 </Button>
 </Link>
 </div>

 <div className="mt-12 grid md:grid-cols-3 gap-4 text-left">
 {[
 { step: "1", title: "Request a Mentor", desc: "Submit a request for mentor assignment." },
 { step: "2", title: "Observation Focus Confirmed", desc: "The areas for observation are confirmed before observation begins." },
 { step: "3", title: "Begin Observations", desc: "Complete S1–S4 observation sessions on assigned dimensions" },
 ].map((item) => (
 <div key={item.step} className="p-4 rounded-xl bg-background border border-foreground/15">
 <div className="w-8 h-8 rounded-full bg-foreground/20 flex items-center justify-center ink-vermilion font-bold text-sm mb-3">
 {item.step}
 </div>
 <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
 <p className="text-xs text-foreground/50 mt-1">{item.desc}</p>
 </div>
 ))}
 </div>
 </motion.div>
 </motion.div>
 );
 }

 // HAS MENTOR BUT NO ASSIGNED DIMENSIONS
 if (assignedDimensions.length === 0) {
 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="max-w-3xl mx-auto space-y-8"
 >
 <motion.div variants={itemVariants}>
 <h1 className="text-3xl font-bold text-foreground mb-2">Observation Pathway</h1>
 <p className="text-foreground/60">
 You are assigned to mentor {mentorProfile?.first_name} {mentorProfile?.last_name}.
 </p>
 </motion.div>

 <motion.div variants={itemVariants} className="p-8 rounded-2xl bg-background border border-foreground/15 text-center">
 <div className="w-16 h-16 rounded-2xl bg-vermilion/10 flex items-center justify-center mx-auto mb-4">
 <Clock className="w-8 h-8 ink-vermilion" />
 </div>
 <h2 className="text-xl font-semibold text-foreground mb-2">Awaiting Dimension Assignment</h2>
 <p className="text-foreground/60 max-w-md mx-auto">
 Your mentor has not yet assigned behavioral dimensions for your observation. Once dimensions are assigned, you will be able to begin your S1 observation session.
 </p>
 <p className="text-sm text-foreground/50 mt-4">
 Your mentor will be notified that you are ready to begin.
 </p>
 </motion.div>

 <motion.div variants={itemVariants}>
 <div className="p-4 rounded-xl bg-foreground/10 border border-foreground/25">
 <p className="text-sm ink-vermilion">
 While you wait, you can use the <Link to="/dashboard/candidate/assessment" className="underline font-medium">Readiness Reflection</Link> tool in the Preparation section to self-assess your behavioral readiness. This is personal and will not appear in your Behavioral Evidence Report.
 </p>
 </div>
 </motion.div>
 </motion.div>
 );
 }

 // HAS MENTOR + ASSIGNED DIMENSIONS — Show observation dashboard
 const mvpDimensions = BEHAVIORAL_DIMENSIONS.filter(d => assignedDimensions.includes(d.id));

 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="max-w-5xl mx-auto space-y-8"
 >
 {/* Header */}
 <motion.div variants={itemVariants}>
 <h1 className="text-3xl font-bold text-foreground mb-2">Your Observation Pathway</h1>
 <p className="text-foreground/60">
 Observation sessions on your mentor-assigned dimensions. All feedback is documented and assessed by your mentor.
 </p>
 <div className="mt-3 flex items-center gap-3">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.06] text-sm text-foreground">
 <CheckCircle className="w-4 h-4" />
 Mentor: {mentorProfile?.first_name} {mentorProfile?.last_name}
 </div>
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/20 text-sm ink-vermilion">
 <ClipboardCheck className="w-4 h-4" />
 {assignedDimensions.length} Dimensions Assigned
 </div>
 </div>
 </motion.div>

 {/* MVP Observation Pipeline: L1 → L2 → Endorsement */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Observation Pipeline</h2>
 <div className="grid md:grid-cols-3 gap-4">
 {/* L1 — AI Scenarios */}
 {(() => {
 const l1Feedback = observationFeedback.filter(f => f.feedback_level === 1);
 const l1ScoredDims = new Set(l1Feedback.map(f => f.dimension_id));
 const l1AllComplete = assignedDimensions.length > 0 && assignedDimensions.every(d => l1ScoredDims.has(d));
 const l1Partial = l1Feedback.length > 0 && !l1AllComplete;
 return (
 <div className={`p-5 rounded-xl border ${l1AllComplete ? "bg-foreground/[0.06] border-foreground/40" : l1Partial ? "bg-vermilion/10 border-vermilion" : "bg-background border-foreground/15"}`}>
 <div className="flex items-center justify-between mb-3">
 <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-foreground/[0.06] text-foreground">L1</span>
 {l1AllComplete && <CheckCircle className="w-4 h-4 text-foreground" />}
 </div>
 <h3 className="font-semibold text-foreground mb-1">AI-Driven Scenarios</h3>
 <p className="text-xs text-foreground/60 mb-4">Solo, asynchronous. AI observes your behavioral responses to workplace pressure scenarios.</p>
 {l1AllComplete ? (
 <p className="text-xs text-foreground font-medium">L1 Complete — {l1ScoredDims.size}/{assignedDimensions.length} dimensions scored</p>
 ) : (
 <>
 {l1Partial && (
 <p className="text-xs ink-vermilion mb-3">{l1ScoredDims.size}/{assignedDimensions.length} dimensions scored — continue to complete remaining</p>
 )}
 <Link to="/dashboard/candidate/observations/session">
 <Button size="sm" className="w-full bg-foreground/[0.05] hover:hover:">
 {l1Partial ? "Continue L1 Session" : "Begin L1 Session"}
 <ArrowRight className="w-4 h-4 ml-1" />
 </Button>
 </Link>
 </>
 )}
 </div>
 );
 })()}

 {/* L2 — Mentor Live Observation */}
 {(() => {
 const l2Feedback = observationFeedback.filter(f => f.feedback_level === 2);
 const l2Complete = l2Feedback.length > 0;
 const l1Complete = observationFeedback.some(f => f.feedback_level === 1);
 return (
 <div className={`p-5 rounded-xl border ${l2Complete ? "bg-foreground/[0.06] border-foreground/40" : l1Complete ? "bg-background border-foreground/15" : "bg-background/50 border-foreground/10 opacity-60"}`}>
 <div className="flex items-center justify-between mb-3">
 <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-foreground/[0.06] text-foreground">L2</span>
 {l2Complete && <CheckCircle className="w-4 h-4 text-foreground" />}
 </div>
 <h3 className="font-semibold text-foreground mb-1">Mentor Live Observation</h3>
 <p className="text-xs text-foreground/60 mb-4">Solo, synchronous. Your mentor observes your behaviour in a live session using structured prompts.</p>
 {l2Complete ? (
 <p className="text-xs text-foreground font-medium">L2 Complete — Mentor reviewed</p>
 ) : l1Complete ? (
 <p className="text-xs ink-vermilion font-medium">Awaiting mentor scheduling</p>
 ) : (
 <p className="text-xs text-foreground/50">Complete S1 first</p>
 )}
 </div>
 );
 })()}

 {/* Endorsement Decision */}
 {(() => {
 const l1Complete = observationFeedback.some(f => f.feedback_level === 1);
 const l2Complete = observationFeedback.some(f => f.feedback_level === 2);
 const decisionColors: Record<string, string> = {
 proceed: "bg-foreground/[0.06] border-foreground/40",
 redirect: "bg-vermilion/10 border-vermilion",
 pause: "bg-vermilion/10 border-vermilion",
 escalate: "bg-vermilion/15 border-vermilion",
 };
 const decisionLabels: Record<string, { label: string; color: string; desc: string }> = {
 proceed: { label: "Proceed", color: "text-foreground", desc: "You've been endorsed. Behavioral Evidence Report issued!" },
 redirect: { label: "Redirect", color: "ink-vermilion", desc: "Targeted development recommended before re-observation." },
 pause: { label: "Pause", color: "ink-vermilion", desc: "Additional observation needed. Sessions will be scheduled." },
 escalate: { label: "Escalate", color: "ink-vermilion", desc: "Flagged for governance review." },
 };
 const decision = endorsementDecision ? decisionLabels[endorsementDecision] : null;
 return (
 <div className={`p-5 rounded-xl border ${endorsementDecision ? decisionColors[endorsementDecision] || "bg-background border-foreground/15" : "bg-background border-foreground/15"} ${!l1Complete ? "opacity-60" : ""}`}>
 <div className="flex items-center justify-between mb-3">
 <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-foreground/20 ink-vermilion">Decision</span>
 {endorsementDecision === "proceed" && <Award className="w-4 h-4 text-foreground" />}
 </div>
 <h3 className="font-semibold text-foreground mb-1">Proceed decision</h3>
 <p className="text-xs text-foreground/60 mb-4">The decision is recorded once all observation evidence has been reviewed.</p>
 {decision ? (
 <div>
 <p className={`text-sm font-bold ${decision.color}`}>{decision.label}</p>
 <p className="text-xs text-foreground/60 mt-1">{decision.desc}</p>
 </div>
 ) : l1Complete && l2Complete ? (
 <p className="text-xs ink-vermilion font-medium">Awaiting the decision</p>
 ) : l1Complete ? (
 <p className="text-xs text-foreground/50">Complete S2 first</p>
 ) : (
 <p className="text-xs text-foreground/50">Complete S1 and S2 first</p>
 )}
 </div>
 );
 })()}
 </div>

 {/* L3/L4 Post-Launch notice */}
 <div className="mt-4 p-3 rounded-xl bg-background/50 border border-foreground/10">
 <p className="text-xs text-foreground/50">
 <span className="font-medium text-foreground/60">Coming post-launch:</span> L3 Work Sample Evaluation and L4 Peer/Team Simulation will be added to strengthen your behavioral evidence profile.
 </p>
 </div>
 </motion.div>

 {/* Assigned Dimensions */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Assigned Dimensions</h2>
 <div className="grid md:grid-cols-2 gap-4">
 {mvpDimensions.map((dim) => {
 const dimFeedback = observationFeedback.filter(f => f.dimension_id === dim.id);
 const latestScore = dimFeedback.find(f => f.bars_score)?.bars_score;
 const completedLevels = new Set(dimFeedback.filter(f => f.status === 'ai_delivered' || f.status === 'approved').map(f => f.feedback_level)).size;

 return (
 <div key={dim.id} className="p-5 rounded-xl bg-background border border-foreground/15">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-semibold text-foreground">{dim.label}</h3>
 <p className="text-xs text-foreground/50 mt-1">
 {completedLevels}/2 levels documented
 </p>
 </div>
 {latestScore && (
 <div className="text-right">
 <span className={`text-lg font-bold ${getBarsColor(latestScore)}`}>
 {latestScore}/4
 </span>
 <p className={`text-xs ${getBarsColor(latestScore)}`}>
 {getBarsLabel(latestScore)}
 </p>
 </div>
 )}
 </div>
 <div className="flex gap-2">
 {[
 { level: 1, label: "S1 AI Pressure Scenarios" },
 { level: 2, label: "S2 Mentor Live" },
 ].map(({ level, label }) => {
 const levelFeedback = dimFeedback.find(f => f.feedback_level === level);
 const isComplete = levelFeedback && (levelFeedback.status === 'ai_delivered' || levelFeedback.status === 'approved');
 const isPending = levelFeedback && levelFeedback.status === 'mentor_review';
 return (
 <div
 key={level}
 className={`flex-1 px-2 py-1.5 rounded-lg text-center text-[10px] font-medium ${
 isComplete
 ? "bg-foreground/[0.06] text-foreground border border-foreground/40"
 : isPending
 ? "bg-vermilion/10 ink-vermilion border border-vermilion"
 : "bg-white/5 text-foreground/50 border border-foreground/15"
 }`}
 title={`${label}: ${isComplete ? "Complete" : isPending ? "Awaiting review" : "Not started"}`}
 >
 {label}
 </div>
 );
 })}
 </div>
 {(() => {
 const dimLoops = loopData.filter(l => l.dimension_id === dim.id);
 if (dimLoops.length === 0) return null;
 const latest = dimLoops[dimLoops.length - 1];
 const hasCooldown = latest.cooldown_ends_at && new Date(latest.cooldown_ends_at) > new Date();
 return (
 <div className="mt-2 flex items-center gap-2">
 <span className="text-[10px] text-foreground/50">Loop {dimLoops.length}/3</span>
 {hasCooldown && <span className="text-[10px] ink-vermilion">Cooldown active</span>}
 {latest.endorsement_decision === 'proceed' && <span className="text-[10px] text-foreground">Endorsed</span>}
 </div>
 );
 })()}
 </div>
 );
 })}
 </div>
 </motion.div>

 {/* Feedback History */}
 {observationFeedback.filter(f => f.final_feedback).length > 0 && (
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Observation Feedback</h2>
 <div className="space-y-3">
 {observationFeedback
 .filter(f => f.final_feedback)
 .map((fb, i) => {
 const dim = BEHAVIORAL_DIMENSIONS.find(d => d.id === fb.dimension_id);
 return (
 <div key={i} className="p-4 rounded-xl bg-background border border-foreground/15">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="px-2 py-0.5 text-xs rounded-full bg-foreground/20 ink-vermilion">
 L{fb.feedback_level}
 </span>
 <span className="font-medium text-foreground text-sm">{dim?.label}</span>
 </div>
 {fb.bars_score && (
 <span className={`font-bold ${getBarsColor(fb.bars_score)}`}>
 {fb.bars_score}/4 — {getBarsLabel(fb.bars_score)}
 </span>
 )}
 </div>
 <p className="text-sm text-foreground/60">{fb.final_feedback}</p>
 </div>
 );
 })}
 </div>
 </motion.div>
 )}

 {/* BARS Scale Reference */}
 <motion.div variants={itemVariants}>
 <div className="p-4 rounded-xl bg-background border border-foreground/15">
 <h3 className="text-sm font-semibold text-foreground/60 mb-3">4-Point BARS Scoring Reference</h3>
 <div className="grid grid-cols-4 gap-3">
 {[
 { score: 1, label: "Not Yet Demonstrated", desc: "Behaviour not observed or inconsistent", color: "ink-vermilion" },
 { score: 2, label: "Emerging", desc: "Partially demonstrated, inconsistent under pressure", color: "ink-vermilion" },
 { score: 3, label: "Competent", desc: "Consistently demonstrated, meets readiness standard", color: "text-foreground" },
 { score: 4, label: "Strong", desc: "Exceeds standard, depth in complex situations", color: "text-foreground" },
 ].map((item) => (
 <div key={item.score} className="text-center">
 <span className={`text-lg font-bold ${item.color}`}>{item.score}</span>
 <p className={`text-xs font-medium ${item.color}`}>{item.label}</p>
 <p className="text-[10px] text-foreground/50 mt-1">{item.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
};

// Self Assessment component (Preparation — NOT part of formal observation)
const SelfAssessmentPage = () => {
 const { user, profile } = useAuth();
 const [isLoading, setIsLoading] = useState(true);
 const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
 const [currentScores, setCurrentScores] = useState<Record<string, number>>({
 integrity_ethics: 3,
 accountability_ownership: 3,
 execution_reliability: 3,
 communication_pressure: 3,
 collaboration_conflict: 3,
 workplace_adaptability: 3,
 prioritization_time: 3,
 resilience_recovery: 3,
 learning_agility: 3,
 professional_boundaries: 3,
 creative_problem_solving: 3,
 customer_service_focus: 3,
 influence_persuasion: 3,
 relationship_building: 3,
 });
 const [strengths, setStrengths] = useState<string[]>([]);
 const [improvements, setImprovements] = useState<string[]>([]);
 const [goals, setGoals] = useState("");
 const [notes, setNotes] = useState("");
 const [isSaving, setIsSaving] = useState(false);
 const [showSuccess, setShowSuccess] = useState(false);
 const [activeStep, setActiveStep] = useState(0); // 0=intro, 1=rate, 2=reflect, 3=goals, 4=review

 useEffect(() => {
 const fetchAssessments = async () => {
 if (!user?.id) return;

 const { data } = await supabase
 .from("candidate_self_assessments")
 .select("*")
 .eq("candidate_id", user.id)
 .order("created_at", { ascending: false });

 if (data && data.length > 0) {
 setAssessments(data);
 // Load the most recent assessment
 const latest = data[0];
 if (latest.behavioral_scores) {
 setCurrentScores(latest.behavioral_scores as Record<string, number>);
 }
 setStrengths(latest.strengths || []);
 setImprovements(latest.areas_for_improvement || []);
 setGoals(latest.goals || "");
 setNotes(latest.notes || "");
 }
 setIsLoading(false);
 };

 fetchAssessments();
 }, [user?.id]);

 const getScoreLabel = (score: number) => {
 if (score >= 4.5) return "Excellent";
 if (score >= 3.5) return "Strong";
 if (score >= 2.5) return "Developing";
 if (score >= 1.5) return "Emerging";
 return "Beginning";
 };

 const getScoreColor = (score: number) => {
 if (score >= 4.5) return "text-foreground";
 if (score >= 3.5) return "text-foreground";
 if (score >= 2.5) return "ink-vermilion";
 if (score >= 1.5) return "ink-vermilion";
 return "ink-vermilion";
 };

 const getOverallScore = () => {
 const values = Object.values(currentScores);
 return values.reduce((a, b) => a + b, 0) / values.length;
 };

 const getRadarData = () => {
 return BEHAVIORAL_DIMENSIONS.map((dim) => ({
 subject: dim.label,
 score: currentScores[dim.id] || 0,
 fullMark: 5,
 }));
 };

 const toggleStrength = (dimension: string) => {
 if (strengths.includes(dimension)) {
 setStrengths(strengths.filter((s) => s !== dimension));
 } else if (strengths.length < 3) {
 setStrengths([...strengths, dimension]);
 }
 };

 const toggleImprovement = (dimension: string) => {
 if (improvements.includes(dimension)) {
 setImprovements(improvements.filter((s) => s !== dimension));
 } else if (improvements.length < 3) {
 setImprovements([...improvements, dimension]);
 }
 };

 const saveAssessment = async () => {
 if (!user?.id) return;
 setIsSaving(true);

 try {
 // Save assessment
 const { error } = await supabase.from("candidate_self_assessments").insert({
 candidate_id: user.id,
 behavioral_scores: currentScores,
 strengths,
 areas_for_improvement: improvements,
 goals,
 notes,
 completed: true,
 });

 if (error) throw error;

 // Create growth log entry
 await supabase.from("growth_log_entries").insert({
 candidate_id: user.id,
 event_type: "assessment",
 title: "Readiness Reflection Completed",
 description: `Personal readiness reflection recorded across ${Object.keys(currentScores).length} behavioral dimensions. This is a preparation tool — not part of formal observation.`,
 source_component: "SelfAssessment",
 metadata: {
 scores: currentScores,
 overall: getOverallScore(),
 strengths,
 areas_for_improvement: improvements,
 },
 });

 setShowSuccess(true);

 // Refresh assessments
 const { data } = await supabase
 .from("candidate_self_assessments")
 .select("*")
 .eq("candidate_id", user.id)
 .order("created_at", { ascending: false });

 if (data) setAssessments(data);
 } catch (error) {
 console.error("Error saving assessment:", error);
 } finally {
 setIsSaving(false);
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
 className="max-w-5xl mx-auto space-y-8"
 >
 {/* Header */}
 <motion.div variants={itemVariants}>
 <h1 className="text-3xl font-bold text-foreground mb-2">Readiness Reflection</h1>
 <p className="text-foreground/60">
 A personal reflection tool to help you prepare for your formal observation sessions.
 </p>
 <div className="mt-3 px-4 py-2.5 rounded-lg bg-vermilion/10 border border-vermilion inline-flex items-start gap-2 max-w-2xl">
 <AlertCircle className="w-4 h-4 ink-vermilion shrink-0 mt-0.5" />
 <p className="text-sm ink-vermilion">
 This is a personal preparation tool. It is not part of your formal T3A observation pathway and will not appear in your Behavioral Evidence Report. Your formal observation is conducted through the Observation Pathway with your assigned mentor.
 </p>
 </div>
 </motion.div>

 {/* Success Banner with Mentor Recommendation */}
 {showSuccess && (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4"
 >
 <div className="p-4 rounded-xl bg-foreground/[0.06] border border-foreground/40 flex items-center gap-3">
 <CheckCircle className="w-5 h-5 text-foreground" />
 <span className="ink-vermilion">Reflection saved successfully!</span>
 </div>
 <div className="p-6 rounded-xl bg-foreground/[0.03] border border-foreground/25">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center shrink-0">
 <GraduationCap className="w-6 h-6 text-foreground" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-foreground mb-1">Ready for the Next Step?</h3>
 <p className="text-sm text-foreground/60 mb-4">
 Now that you have completed your self-reflection, connect with a mentor to begin your formal Observation Pathway. Your mentor will guide you through behavioral assessments and help you earn your Behavioral Evidence Report.
 </p>
 <Link to="/dashboard/candidate/mentors">
 <Button className="bg-foreground hover:bg-foreground/90">
 <GraduationCap className="w-4 h-4 mr-2" />
 Request a Mentor
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </motion.div>
 )}

 {/* Progress Steps */}
 <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
 {["Introduction", "Rate Skills", "Reflect", "Goals", "Review"].map((step, index) => (
 <div key={step} className="flex items-center">
 <button
 onClick={() => setActiveStep(index)}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
 activeStep === index
 ? "bg-foreground text-background"
 : activeStep > index
 ? "bg-foreground/[0.06] text-background"
 : "bg-background text-foreground/60 hover:bg-foreground/5"
 }`}
 >
 {activeStep > index ? (
 <CheckCircle className="w-4 h-4" />
 ) : (
 <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs">
 {index + 1}
 </span>
 )}
 <span className="hidden sm:inline">{step}</span>
 </button>
 {index < 4 && <ChevronRight className="w-4 h-4 text-foreground/40 mx-1" />}
 </div>
 ))}
 </motion.div>

 {/* Step Content */}
 <motion.div
 key={activeStep}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-6"
 >
 {/* Introduction Step */}
 {activeStep === 0 && (
 <div className="space-y-6">
 {/* Header */}
 <div className="text-center mb-8">
 <h1 className="text-3xl font-bold text-foreground mb-2">Readiness Reflection</h1>
 <p className="text-foreground/60 max-w-2xl mx-auto">
 A self-directed preparation tool to reflect on your behavioral readiness before your formal observation sessions.
 </p>
 <div className="mt-4 px-4 py-2 rounded-lg bg-vermilion/10 border border-vermilion inline-flex items-center gap-2">
 <AlertCircle className="w-4 h-4 ink-vermilion shrink-0" />
 <p className="text-xs ink-vermilion">
 Preparation only — not part of your formal observation. Results do not appear in your Behavioral Evidence Report.
 </p>
 </div>
 </div>

 {/* Guided Self-Reflection */}
 <div className="relative overflow-hidden p-6 rounded-2xl bg-foreground/[0.05] border border-vermilion">
 <div className="flex flex-col md:flex-row items-start gap-4">
 <div className="w-14 h-14 rounded-xl bg-vermilion/[0.08] flex items-center justify-center">
 <Sparkles className="w-7 h-7 ink-vermilion" />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-foreground mb-1">Guided Self-Reflection</h3>
 <p className="text-foreground/60 text-sm mb-4">
 A guided, immersive journey through all 14 behavioral dimensions with narrative introductions,
 thoughtful prompts, and voice narration. Rate yourself through self-reflection.
 </p>
 <Link to="/dashboard/candidate/assessment/interactive">
 <Button
 variant="outline"
 className="border-vermilion text-foreground/75 hover:bg-vermilion/10"
 >
 Start Guided Reflection
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </Link>
 </div>
 </div>
 </div>

 {/* Quick Reflection */}
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <div className="flex flex-col md:flex-row items-start gap-4">
 <div className="w-14 h-14 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
 <Sliders className="w-7 h-7 text-foreground/60" />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-foreground mb-1">Quick Reflection</h3>
 <p className="text-foreground/60 text-sm mb-4">
 Rate all 14 dimensions directly with sliders. Best for quick updates or when you are already familiar
 with the reflection process.
 </p>
 <Button
 variant="outline"
 className="border-foreground/25 text-foreground/75 hover:bg-foreground/5"
 onClick={() => setActiveStep(1)}
 >
 Start Quick Reflection
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>
 </div>

 {/* Benefits */}
 <div className="grid md:grid-cols-4 gap-4">
 {[
 { icon: Target, text: "Identify strengths & growth areas", color: "text-foreground" },
 { icon: TrendingUp, text: "Track progress over time", color: "text-foreground" },
 { icon: Users, text: "Prepare for mentor observations", color: "ink-vermilion" },
 { icon: Award, text: "Personal development only", color: "ink-vermilion" },
 ].map((item, i) => (
 <div key={i} className="p-4 rounded-xl bg-background border border-foreground/25 text-center">
 <item.icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
 <span className="text-sm text-foreground/60">{item.text}</span>
 </div>
 ))}
 </div>

 {/* Readiness Reflection History */}
 {assessments.length > 0 && (
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h3 className="text-lg font-semibold text-foreground mb-4">Your Readiness Reflections</h3>
 <div className="space-y-3">
 {assessments.slice(0, 3).map((assessment, i) => {
 const scores = assessment.behavioral_scores as Record<string, number>;
 const overall = scores ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length : 0;
 return (
 <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-foreground/20 flex items-center justify-center">
 <ClipboardCheck className="w-5 h-5 ink-vermilion" />
 </div>
 <div>
 <p className="text-sm text-foreground">Readiness Reflection</p>
 <p className="text-xs text-foreground/50">
 {new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
 </p>
 </div>
 </div>
 <div className="text-right">
 <p className={`text-lg font-bold ${getScoreColor(overall)}`}>{overall.toFixed(1)}</p>
 <p className="text-xs text-foreground/50">{getScoreLabel(overall)}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Rate Skills Step */}
 {activeStep === 1 && (
 <div className="space-y-6">
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-2">Rate Your Behavioral Skills</h2>
 <p className="text-foreground/60 mb-6">
 Use the sliders to rate yourself on each dimension from 1 (Beginning) to 5 (Excellent).
 </p>

 <div className="grid gap-6">
 {BEHAVIORAL_DIMENSIONS.map((dim) => {
 const info = ASSESSMENT_DESCRIPTIONS[dim.id];
 const score = currentScores[dim.id] || 3;

 return (
 <div key={dim.id} className="p-4 rounded-xl bg-background border border-foreground/25">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-semibold text-foreground">{info.title}</h3>
 <p className="text-sm text-foreground/60">{info.description}</p>
 </div>
 <div className="text-right">
 <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
 <p className={`text-xs ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
 </div>
 </div>

 <input
 type="range"
 min="1"
 max="5"
 step="0.5"
 value={score}
 onChange={(e) => setCurrentScores({ ...currentScores, [dim.id]: parseFloat(e.target.value) })}
 className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-indigo-500"
 />

 <div className="flex justify-between text-xs text-foreground/50 mt-1">
 <span>Beginning</span>
 <span>Emerging</span>
 <span>Developing</span>
 <span>Strong</span>
 <span>Excellent</span>
 </div>

 <div className="mt-3 flex flex-wrap gap-2">
 {info.examples.map((ex) => (
 <span key={ex} className="px-2 py-1 text-xs rounded-full bg-background text-foreground/60">
 {ex}
 </span>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Radar Preview */}
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h3 className="text-lg font-semibold text-foreground mb-4">Your Skills Profile</h3>
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart data={getRadarData()}>
 <PolarGrid stroke="#374151" />
 <PolarAngleAxis dataKey="subject" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
 <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: "#9CA3AF" }} />
 <Radar
 name="Self Assessment"
 dataKey="score"
 stroke="#8B5CF6"
 fill="#8B5CF6"
 fillOpacity={0.3}
 />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 <div className="text-center mt-4">
 <span className="text-3xl font-bold text-foreground">{getOverallScore().toFixed(1)}</span>
 <span className="text-foreground/60 ml-2">/ 5.0 Overall</span>
 </div>
 </div>

 <div className="flex justify-between">
 <Button variant="outline" className="border-foreground/25" onClick={() => setActiveStep(0)}>
 Back
 </Button>
 <Button
 className="bg-foreground hover:bg-foreground/90"
 onClick={() => setActiveStep(2)}
 >
 Continue to Reflect
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>
 )}

 {/* Reflect Step */}
 {activeStep === 2 && (
 <div className="space-y-6">
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-2">Identify Your Strengths</h2>
 <p className="text-foreground/60 mb-6">
 Select up to 3 dimensions that you consider your strongest areas.
 </p>

 <div className="grid md:grid-cols-2 gap-3">
 {BEHAVIORAL_DIMENSIONS.map((dim) => (
 <button
 key={dim.id}
 onClick={() => toggleStrength(dim.id)}
 className={`p-4 rounded-xl border text-left transition-all ${
 strengths.includes(dim.id)
 ? "bg-foreground/[0.06] border-foreground/40 ring-2 ring-emerald-500/30"
 : "bg-background border-foreground/25 hover:border-foreground/25"
 }`}
 >
 <div className="flex items-center gap-3">
 <div
 className={`w-10 h-10 rounded-lg flex items-center justify-center ${
 strengths.includes(dim.id) ? "bg-vermilion/10" : "bg-background"
 }`}
 >
 {strengths.includes(dim.id) ? (
 <CheckCircle className="w-5 h-5 text-foreground" />
 ) : (
 <Target className="w-5 h-5 text-foreground/60" />
 )}
 </div>
 <div>
 <p className="font-medium text-foreground">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</p>
 <p className="text-sm text-foreground/60">Score: {currentScores[dim.id].toFixed(1)}</p>
 </div>
 </div>
 </button>
 ))}
 </div>

 <p className="text-sm text-foreground/50 mt-4">
 {strengths.length}/3 selected
 </p>
 </div>

 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-2">Areas for Improvement</h2>
 <p className="text-foreground/60 mb-6">
 Select up to 3 dimensions you want to focus on improving.
 </p>

 <div className="grid md:grid-cols-2 gap-3">
 {BEHAVIORAL_DIMENSIONS.map((dim) => (
 <button
 key={dim.id}
 onClick={() => toggleImprovement(dim.id)}
 className={`p-4 rounded-xl border text-left transition-all ${
 improvements.includes(dim.id)
 ? "bg-vermilion/10 border-vermilion ring-2 ring-amber-500/30"
 : "bg-background border-foreground/25 hover:border-foreground/25"
 }`}
 >
 <div className="flex items-center gap-3">
 <div
 className={`w-10 h-10 rounded-lg flex items-center justify-center ${
 improvements.includes(dim.id) ? "bg-vermilion/10" : "bg-background"
 }`}
 >
 {improvements.includes(dim.id) ? (
 <CheckCircle className="w-5 h-5 text-foreground" />
 ) : (
 <TrendingUp className="w-5 h-5 text-foreground/60" />
 )}
 </div>
 <div>
 <p className="font-medium text-foreground">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</p>
 <p className="text-sm text-foreground/60">Score: {currentScores[dim.id].toFixed(1)}</p>
 </div>
 </div>
 </button>
 ))}
 </div>

 <p className="text-sm text-foreground/50 mt-4">
 {improvements.length}/3 selected
 </p>
 </div>

 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-4">Additional Notes</h2>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Add any reflections on your current skill levels..."
 className="w-full p-4 rounded-xl bg-background border border-foreground/25 text-foreground placeholder:text-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
 rows={4}
 />
 </div>

 <div className="flex justify-between">
 <Button variant="outline" className="border-foreground/25" onClick={() => setActiveStep(1)}>
 Back
 </Button>
 <Button
 className="bg-foreground hover:bg-foreground/90"
 onClick={() => setActiveStep(3)}
 >
 Continue to Goals
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>
 )}

 {/* Goals Step */}
 {activeStep === 3 && (
 <div className="space-y-6">
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-2">Set Your Goals</h2>
 <p className="text-foreground/60 mb-6">
 What do you want to achieve in your professional development journey?
 </p>

 <textarea
 value={goals}
 onChange={(e) => setGoals(e.target.value)}
 placeholder="Example: I want to improve my communication skills by actively participating in team meetings and seeking feedback from my mentor. I also aim to develop better time management habits by using task prioritization techniques..."
 className="w-full p-4 rounded-xl bg-background border border-foreground/25 text-foreground placeholder:text-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
 rows={6}
 />
 </div>

 {improvements.length > 0 && (
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h3 className="text-lg font-semibold text-foreground mb-4">Suggested Focus Areas</h3>
 <p className="text-foreground/60 mb-4">Based on your areas for improvement:</p>

 <div className="space-y-4">
 {improvements.map((imp) => {
 const info = ASSESSMENT_DESCRIPTIONS[imp];
 return (
 <div key={imp} className="p-4 rounded-xl bg-background border border-foreground/25">
 <h4 className="font-medium text-foreground mb-2">{info.title}</h4>
 <ul className="text-sm text-foreground/60 space-y-1">
 {info.examples.map((ex) => (
 <li key={ex} className="flex items-center gap-2">
 <ChevronRight className="w-3 h-3 ink-vermilion" />
 {ex}
 </li>
 ))}
 </ul>
 </div>
 );
 })}
 </div>
 </div>
 )}

 <div className="flex justify-between">
 <Button variant="outline" className="border-foreground/25" onClick={() => setActiveStep(2)}>
 Back
 </Button>
 <Button
 className="bg-foreground hover:bg-foreground/90"
 onClick={() => setActiveStep(4)}
 >
 Review Assessment
 <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>
 )}

 {/* Review Step */}
 {activeStep === 4 && (
 <div className="space-y-6">
 <div className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-6">Review Your Readiness Reflection</h2>

 {/* Readiness Profile */}
 <div className="flex items-center justify-center gap-6 p-6 rounded-xl bg-foreground/[0.03] border border-foreground/25 mb-6">
 <div className="text-center">
 <p className="text-5xl font-bold text-foreground">{getOverallScore().toFixed(1)}</p>
 <p className="text-foreground/60">Readiness Reflection Index</p>
 <p className="text-xs text-foreground/50 mt-1">Personal reflection only — not formal observation</p>
 </div>
 <div className={`text-xl font-semibold ${getScoreColor(getOverallScore())}`}>
 {getScoreLabel(getOverallScore())}
 </div>
 </div>

 {/* Skills Grid */}
 <div className="grid md:grid-cols-2 gap-4 mb-6">
 {BEHAVIORAL_DIMENSIONS.map((dim) => (
 <div key={dim.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
 <span className="text-foreground/75">{ASSESSMENT_DESCRIPTIONS[dim.id].title}</span>
 <span className={`font-semibold ${getScoreColor(currentScores[dim.id])}`}>
 {currentScores[dim.id].toFixed(1)}
 </span>
 </div>
 ))}
 </div>

 {/* Strengths & Improvements */}
 <div className="grid md:grid-cols-2 gap-6 mb-6">
 <div>
 <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
 <Star className="w-4 h-4 text-foreground" />
 Strengths
 </h3>
 <div className="space-y-2">
 {strengths.length > 0 ? (
 strengths.map((s) => (
 <div key={s} className="p-2 rounded-lg bg-foreground/[0.06] ink-vermilion text-sm">
 {ASSESSMENT_DESCRIPTIONS[s].title}
 </div>
 ))
 ) : (
 <p className="text-foreground/50 text-sm">No strengths selected</p>
 )}
 </div>
 </div>
 <div>
 <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
 <TrendingUp className="w-4 h-4 ink-vermilion" />
 Areas for Improvement
 </h3>
 <div className="space-y-2">
 {improvements.length > 0 ? (
 improvements.map((s) => (
 <div key={s} className="p-2 rounded-lg bg-vermilion/10 ink-vermilion text-sm">
 {ASSESSMENT_DESCRIPTIONS[s].title}
 </div>
 ))
 ) : (
 <p className="text-foreground/50 text-sm">No areas selected</p>
 )}
 </div>
 </div>
 </div>

 {/* Goals */}
 {goals && (
 <div className="mb-6">
 <h3 className="font-semibold text-foreground mb-3">Goals</h3>
 <p className="text-foreground/75 whitespace-pre-wrap">{goals}</p>
 </div>
 )}

 {/* Notes */}
 {notes && (
 <div>
 <h3 className="font-semibold text-foreground mb-3">Notes</h3>
 <p className="text-foreground/75 whitespace-pre-wrap">{notes}</p>
 </div>
 )}
 </div>

 <div className="flex justify-between">
 <Button variant="outline" className="border-foreground/25" onClick={() => setActiveStep(3)}>
 Back
 </Button>
 <Button
 className="bg-foreground hover:hover:"
 onClick={saveAssessment}
 disabled={isSaving}
 >
 {isSaving ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 Saving...
 </>
 ) : (
 <>
 <Save className="w-4 h-4 mr-2" />
 Save Assessment
 </>
 )}
 </Button>
 </div>
 </div>
 )}
 </motion.div>

 {/* Previous Readiness Reflections */}
 {assessments.length > 0 && (
 <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-background border border-foreground/25">
 <h2 className="text-xl font-semibold text-foreground mb-4">Reflection History</h2>
 <div className="space-y-3">
 {assessments.slice(0, 5).map((assessment) => {
 const scores = assessment.behavioral_scores as Record<string, number>;
 const avgScore =
 Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
 return (
 <div
 key={assessment.id}
 className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-foreground/5 transition-colors"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-foreground/20 flex items-center justify-center">
 <ClipboardCheck className="w-5 h-5 ink-vermilion" />
 </div>
 <div>
 <p className="text-foreground font-medium">
 {new Date(assessment.created_at).toLocaleDateString("en-US", {
 month: "long",
 day: "numeric",
 year: "numeric",
 })}
 </p>
 <p className="text-sm text-foreground/60">
 {assessment.strengths?.length || 0} strengths, {assessment.areas_for_improvement?.length || 0} areas to improve
 </p>
 </div>
 </div>
 <div className="text-right">
 <span className={`text-xl font-bold ${getScoreColor(avgScore)}`}>
 {avgScore.toFixed(1)}
 </span>
 <p className="text-xs text-foreground/50">Overall</p>
 </div>
 </div>
 );
 })}
 </div>
 </motion.div>
 )}
 </motion.div>
 );
};

// Training (Interactive Modules) component
// Type for training progress derived from growth log entries
type TrainingProgressFromLog = {
 module_id: string;
 module_slug: string;
 score: number;
 completed_at: string;
 progress_percent?: number;
};

const Training = () => {
 const { user } = useAuth();
 const navigate = useNavigate();
 const [progress, setProgress] = useState<Record<string, TrainingProgressFromLog>>({});
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 const fetchData = async () => {
 if (!user?.id) return;

 // Fetch training completions from growth_log_entries (same source as Growth page)
 const { data: trainingLogs } = await supabase
 .from("growth_log_entries")
 .select("*")
 .eq("candidate_id", user.id)
 .eq("event_type", "training")
 .order("created_at", { ascending: false });

 // Build progress map from training logs
 const progressMap: Record<string, TrainingProgressFromLog> = {};
 (trainingLogs || []).forEach((log) => {
 const metadata = log.metadata as { module_id?: string; module_slug?: string; score?: number } | null;
 if (metadata?.module_id && !progressMap[metadata.module_id]) {
 // Only keep the latest (first due to desc order) completion per module
 progressMap[metadata.module_id] = {
 module_id: metadata.module_id,
 module_slug: metadata.module_slug || '',
 score: metadata.score || 0,
 completed_at: log.created_at,
 };
 }
 });
 setProgress(progressMap);

 setIsLoading(false);
 };

 fetchData();
 }, [user?.id]);

 const openModule = (moduleSlug: string) => {
 navigate(`/dashboard/candidate/training/module/${moduleSlug}`);
 };

 // Get icon component by name
 const getIconComponent = (iconName: string) => {
 const icons: Record<string, React.ReactNode> = {
 'Shield': <Shield className="w-6 h-6" />,
 'Smartphone': <MessageSquare className="w-6 h-6" />,
 'Award': <Award className="w-6 h-6" />,
 'Users': <Users className="w-6 h-6" />,
 'UserX': <User className="w-6 h-6" />,
 'MessageSquare': <MessageSquare className="w-6 h-6" />,
 'AlertTriangle': <AlertCircle className="w-6 h-6" />,
 'Scale': <Sliders className="w-6 h-6" />,
 'FileCheck': <FileText className="w-6 h-6" />,
 'Handshake': <Users className="w-6 h-6" />,
 };
 return icons[iconName] || <BookOpen className="w-6 h-6" />;
 };

 // Calculate statistics from growth log entries
 const completedCount = Object.keys(progress).length;
 const inProgressCount = 0; // Growth log only tracks completions, not in-progress

 // Check if module is locked (requires previous modules to be completed for sequential unlocking)
 const isModuleLocked = (index: number): boolean => {
 if (index === 0) return false; // First module is always unlocked
 // For now, all modules are unlocked - can enable sequential locking by uncommenting:
 // const previousModule = INTERACTIVE_MODULES[index - 1];
 // return progress[previousModule.id]?.status !== 'completed';
 return false;
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
 {/* Header */}
 <motion.div variants={itemVariants}>
 <h1 className="text-3xl font-bold text-foreground mb-2">BridgeFast</h1>
 <p className="text-foreground/60">
 Skill development programs to build workplace readiness before or between your observation sessions.
 </p>
 <div className="mt-3 px-4 py-2.5 rounded-lg bg-vermilion/10 border border-vermilion inline-flex items-start gap-2 max-w-2xl">
 <AlertCircle className="w-4 h-4 ink-vermilion shrink-0 mt-0.5" />
 <p className="text-sm ink-vermilion">
 BridgeFast is a development area. These programs are separate from your formal observation sessions and will not be recorded in your Behavioral Evidence Report.
 </p>
 </div>
 </motion.div>

 {/* Progress Overview */}
 <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <BookOpen className="w-8 h-8 ink-vermilion mb-3" />
 <p className="text-3xl font-bold text-foreground">{INTERACTIVE_MODULES.length}</p>
 <p className="text-sm text-foreground/60">Total Programs</p>
 </div>
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <Play className="w-8 h-8 ink-vermilion mb-3" />
 <p className="text-3xl font-bold text-foreground">{inProgressCount}</p>
 <p className="text-sm text-foreground/60">In Progress</p>
 </div>
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <CheckCircle className="w-8 h-8 text-foreground mb-3" />
 <p className="text-3xl font-bold text-foreground">{completedCount}</p>
 <p className="text-sm text-foreground/60">Completed</p>
 </div>
 </motion.div>

 {/* Modules Grid */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">BridgeFast Programs</h2>
 <div className="grid md:grid-cols-2 gap-4">
 {INTERACTIVE_MODULES.map((module, index) => {
 const moduleProgress = progress[module.id];
 // If we have a log entry for this module, it's completed
 const isCompleted = !!moduleProgress;
 const locked = isModuleLocked(index);

 return (
 <motion.div
 key={module.id}
 whileHover={!locked ? { scale: 1.02 } : {}}
 className={`relative p-6 rounded-xl border transition-all cursor-pointer overflow-hidden ${
 locked
 ? 'bg-foreground/[0.06]/50 border-foreground/25 cursor-not-allowed'
 : isCompleted
 ? 'bg-foreground/[0.06] border-foreground/40 hover:border-foreground/40'
 : 'bg-background border-foreground/25 hover:border-foreground/25'
 }`}
 onClick={() => !locked && openModule(module.slug)}
 >
 {/* Gradient overlay */}
 <div className={`absolute inset-0 bg-foreground/[0.05] ${module.color} opacity-5`} />

 <div className="relative">
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className={`p-3 rounded-xl bg-foreground/[0.05] ${module.color}`}>
 {getIconComponent(module.icon)}
 </div>
 <div className="flex items-center gap-2">
 {locked ? (
 <Lock className="w-5 h-5 text-foreground/50" />
 ) : isCompleted ? (
 <div className="flex items-center gap-1 text-foreground">
 <CheckCircle className="w-5 h-5" />
 <span className="text-sm font-medium">
 {moduleProgress.score}pts
 </span>
 </div>
 ) : null}
 </div>
 </div>

 {/* Content */}
 <div className="mb-4">
 <span className={`inline-block px-2 py-0.5 rounded text-xs mb-2 bg-foreground/[0.05] ${module.color} bg-opacity-20 text-foreground`}>
 {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
 </span>
 <h3 className="font-semibold text-foreground text-lg">{module.title}</h3>
 <p className="text-sm text-foreground/50">{module.subtitle}</p>
 </div>

 <p className="text-sm text-foreground/60 mb-4 line-clamp-2">
 {module.description}
 </p>

 {/* Meta info */}
 <div className="flex items-center gap-4 text-sm text-foreground/50 mb-4">
 <span className="flex items-center gap-1">
 <Clock className="w-4 h-4" />
 {module.duration}
 </span>
 <span className="flex items-center gap-1">
 <Target className="w-4 h-4" />
 {module.scenes.length} scenes
 </span>
 <span className="flex items-center gap-1">
 <Star className="w-4 h-4" />
 {module.totalPoints} pts
 </span>
 </div>

 {/* Competencies */}
 <div className="flex flex-wrap gap-1 mb-4">
 {module.competencies.slice(0, 3).map((comp, i) => (
 <span
 key={i}
 className="px-2 py-0.5 rounded text-xs bg-background text-foreground/60"
 >
 {comp}
 </span>
 ))}
 {module.competencies.length > 3 && (
 <span className="px-2 py-0.5 rounded text-xs bg-background text-foreground/60">
 +{module.competencies.length - 3}
 </span>
 )}
 </div>

 {/* Progress bar for in-progress */}
 {status === 'in_progress' && moduleProgress?.progress_percent && (
 <div className="mb-4">
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="text-foreground/60">Progress</span>
 <span className="ink-vermilion">{moduleProgress.progress_percent}%</span>
 </div>
 <div className="h-1.5 bg-background rounded-full overflow-hidden">
 <div
 className={`h-full bg-foreground/[0.05] ${module.color} transition-all`}
 style={{ width: `${moduleProgress.progress_percent}%` }}
 />
 </div>
 </div>
 )}

 {/* Action button */}
 {!locked && (
 <Button
 size="sm"
 className={`w-full ${
 status === 'completed'
 ? 'bg-vermilion/10 hover:bg-vermilion/10'
 : status === 'in_progress'
 ? 'bg-vermilion/10 hover:bg-vermilion/10'
 : `bg-foreground/[0.05] ${module.color} hover:opacity-90`
 }`}
 onClick={(e) => {
 e.stopPropagation();
 openModule(module.slug);
 }}
 >
 {status === 'completed' ? (
 <>
 <Play className="w-4 h-4 mr-2" />
 Review Module
 </>
 ) : status === 'in_progress' ? (
 <>
 <Play className="w-4 h-4 mr-2" />
 Continue
 </>
 ) : (
 <>
 <Play className="w-4 h-4 mr-2" />
 Start Module
 </>
 )}
 </Button>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </motion.div>

 {/* Info section */}
 <motion.div variants={itemVariants} className="p-6 rounded-xl bg-foreground/30 border border-foreground/25">
 <div className="flex items-start gap-4">
 <div className="p-3 rounded-xl bg-foreground/20">
 <Sparkles className="w-6 h-6 ink-vermilion" />
 </div>
 <div>
 <h3 className="font-semibold text-foreground mb-1">Immersive Learning Experience</h3>
 <p className="text-sm text-foreground/60">
 Each module features realistic workplace scenarios, interactive choices, reflection prompts,
 and knowledge checks. Navigate through multi-scene experiences that test and develop your
 professional judgment across key behavioral competencies.
 </p>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
};

// [Old Training code removed - see TrainingModuleViewer for new implementation]
// Projects (LiveWorks) component
const Projects = () => {
 const { user } = useAuth();
 const [projects, setProjects] = useState<LiveWorksProject[]>([]);
 const [myApplications, setMyApplications] = useState<Map<string, LiveWorksApplication>>(new Map());
 const [isLoading, setIsLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<"browse" | "applied">("browse");

 // Application modal state
 const [showApplyModal, setShowApplyModal] = useState(false);
 const [selectedProject, setSelectedProject] = useState<LiveWorksProject | null>(null);
 const [coverLetter, setCoverLetter] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [applicationSuccess, setApplicationSuccess] = useState(false);

 useEffect(() => {
 const fetchData = async () => {
 if (!user?.id) return;

 // Fetch open projects
 const { data: projectData } = await supabase
 .from("liveworks_projects")
 .select("*")
 .eq("status", "open")
 .order("created_at", { ascending: false })
 .limit(20);

 setProjects(projectData || []);

 // Fetch my applications
 const { data: applicationData } = await supabase
 .from("liveworks_applications")
 .select("*")
 .eq("candidate_id", user.id);

 if (applicationData) {
 const appMap = new Map<string, LiveWorksApplication>();
 applicationData.forEach(app => appMap.set(app.project_id, app));
 setMyApplications(appMap);
 }

 setIsLoading(false);
 };

 fetchData();
 }, [user?.id]);

 const openApplyModal = (project: LiveWorksProject) => {
 setSelectedProject(project);
 setCoverLetter("");
 setApplicationSuccess(false);
 setShowApplyModal(true);
 };

 const submitApplication = async () => {
 if (!selectedProject || !user?.id) return;

 setIsSubmitting(true);

 try {
 // Create application
 const { data: application, error } = await supabase
 .from("liveworks_applications")
 .insert({
 project_id: selectedProject.id,
 candidate_id: user.id,
 cover_letter: coverLetter || null,
 status: "pending",
 })
 .select()
 .single();

 if (error) {
 console.error("Error submitting application:", error);
 return;
 }

 // Create growth log entry
 await supabase.from("growth_log_entries").insert({
 candidate_id: user.id,
 event_type: "project",
 title: "Applied to LiveWorks Project",
 description: `Applied to: ${selectedProject.title}`,
 source_component: "LiveWorks",
 source_id: application.id,
 });

 // Update local state
 setMyApplications(prev => {
 const newMap = new Map(prev);
 newMap.set(selectedProject.id, application);
 return newMap;
 });

 setApplicationSuccess(true);
 setTimeout(() => {
 setShowApplyModal(false);
 setSelectedProject(null);
 setApplicationSuccess(false);
 }, 1500);

 } catch (error) {
 console.error("Error:", error);
 } finally {
 setIsSubmitting(false);
 }
 };

 const getApplicationStatus = (projectId: string) => {
 return myApplications.get(projectId);
 };

 const appliedProjects = projects.filter(p => myApplications.has(p.id));

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
 <h1 className="text-3xl font-bold text-foreground mb-2">LiveWorks Projects</h1>
 <p className="text-foreground/60">
 Apply to real projects with employer partners to build experience.
 </p>
 </motion.div>

 {/* Tabs */}
 <motion.div variants={itemVariants} className="flex gap-2">
 <button
 onClick={() => setActiveTab("browse")}
 className={`px-4 py-2 rounded-lg font-medium transition-colors ${
 activeTab === "browse"
 ? "bg-foreground text-background"
 : "bg-background text-foreground/60 hover:text-background"
 }`}
 >
 Browse Projects
 </button>
 <button
 onClick={() => setActiveTab("applied")}
 className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
 activeTab === "applied"
 ? "bg-foreground text-background"
 : "bg-background text-foreground/60 hover:text-background"
 }`}
 >
 My Applications
 {appliedProjects.length > 0 && (
 <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
 {appliedProjects.length}
 </span>
 )}
 </button>
 </motion.div>

 {activeTab === "browse" ? (
 projects.length > 0 ? (
 <motion.div variants={itemVariants} className="grid gap-4">
 {projects.map((project) => {
 const application = getApplicationStatus(project.id);
 const hasApplied = !!application;

 return (
 <div
 key={project.id}
 className="p-6 rounded-xl bg-background border border-foreground/25 hover:border-foreground/25 transition-colors"
 >
 <div className="flex items-start justify-between mb-4">
 <div>
 <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
 <span className="inline-block px-2 py-0.5 rounded text-xs bg-foreground/[0.06] ink-vermilion mt-1">
 {project.category}
 </span>
 </div>
 <div className="text-right">
 <p className="text-sm text-foreground/60">{project.duration_days} days</p>
 {project.budget_min && project.budget_max && (
 <p className="text-sm text-foreground">
 ${project.budget_min} - ${project.budget_max}
 </p>
 )}
 </div>
 </div>
 <p className="text-sm text-foreground/60 mb-4 line-clamp-2">{project.description}</p>
 <div className="flex items-center justify-between">
 <span className={`text-xs px-2 py-1 rounded ${
 project.skill_level === 'beginner'
 ? 'bg-vermilion/20 ink-vermilion'
 : project.skill_level === 'intermediate'
 ? 'bg-vermilion/10 ink-vermilion'
 : 'bg-vermilion/15 ink-vermilion'
 }`}>
 {project.skill_level}
 </span>
 {hasApplied ? (
 <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
 application.status === "accepted"
 ? "bg-foreground/[0.06] text-foreground"
 : application.status === "rejected"
 ? "bg-vermilion/15 ink-vermilion"
 : "bg-vermilion/10 ink-vermilion"
 }`}>
 {application.status === "accepted" ? "Accepted" :
 application.status === "rejected" ? "Not Selected" : "Application Pending"}
 </span>
 ) : (
 <Button
 size="sm"
 className="bg-foreground/10 hover:bg-foreground/10"
 onClick={() => openApplyModal(project)}
 >
 Apply Now
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </motion.div>
 ) : (
 <motion.div
 variants={itemVariants}
 className="p-8 rounded-2xl bg-background border border-foreground/25 text-center"
 >
 <Briefcase className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No open projects available</p>
 <p className="text-sm text-foreground/50 mt-1">
 Check back soon for new opportunities
 </p>
 </motion.div>
 )
 ) : (
 appliedProjects.length > 0 ? (
 <motion.div variants={itemVariants} className="space-y-4">
 {appliedProjects.map((project) => {
 const application = getApplicationStatus(project.id)!;
 return (
 <div
 key={project.id}
 className="p-6 rounded-xl bg-background border border-foreground/25"
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-semibold text-foreground">{project.title}</h3>
 <p className="text-sm text-foreground/50">
 Applied {new Date(application.created_at).toLocaleDateString()}
 </p>
 </div>
 <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
 application.status === "accepted"
 ? "bg-foreground/[0.06] text-foreground"
 : application.status === "rejected"
 ? "bg-vermilion/15 ink-vermilion"
 : "bg-vermilion/10 ink-vermilion"
 }`}>
 {application.status === "accepted" ? "Accepted" :
 application.status === "rejected" ? "Not Selected" : "Pending"}
 </span>
 </div>
 {application.cover_letter && (
 <p className="text-sm text-foreground/60 bg-background/20 p-3 rounded-lg line-clamp-2">
 {application.cover_letter}
 </p>
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
 <Briefcase className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No applications yet</p>
 <p className="text-sm text-foreground/50 mt-1">
 Browse open projects and start applying
 </p>
 <Button
 className="mt-4 bg-foreground/10 hover:bg-foreground/10"
 onClick={() => setActiveTab("browse")}
 >
 Browse Projects
 </Button>
 </motion.div>
 )
 )}

 {/* Application Modal */}
 {showApplyModal && selectedProject && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-background"
 onClick={() => !isSubmitting && setShowApplyModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="relative w-full max-w-lg mx-4 p-6 rounded-2xl bg-background/50 border border-foreground/25"
 >
 {applicationSuccess ? (
 <div className="text-center py-8">
 <div className="w-16 h-16 rounded-full bg-foreground/[0.06] flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-8 h-8 text-foreground" />
 </div>
 <h3 className="text-xl font-bold text-foreground mb-2">Application Submitted!</h3>
 <p className="text-foreground/60">
 Your application has been sent to the employer.
 </p>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-foreground">Apply to Project</h2>
 <button
 onClick={() => setShowApplyModal(false)}
 disabled={isSubmitting}
 className="text-foreground/60 hover:text-foreground"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Project Preview */}
 <div className="p-4 rounded-xl bg-background mb-6">
 <h3 className="font-semibold text-foreground">{selectedProject.title}</h3>
 <div className="flex items-center gap-3 mt-2 text-sm">
 <span className="ink-vermilion">{selectedProject.category}</span>
 <span className="text-foreground/50">{selectedProject.duration_days} days</span>
 <span className={`px-2 py-0.5 rounded ${
 selectedProject.skill_level === 'beginner'
 ? 'bg-vermilion/20 ink-vermilion'
 : selectedProject.skill_level === 'intermediate'
 ? 'bg-vermilion/10 ink-vermilion'
 : 'bg-vermilion/15 ink-vermilion'
 }`}>
 {selectedProject.skill_level}
 </span>
 </div>
 </div>

 {/* Cover Letter */}
 <div className="mb-6">
 <label className="text-sm text-foreground/60 block mb-2">
 Cover Letter (optional)
 </label>
 <textarea
 value={coverLetter}
 onChange={(e) => setCoverLetter(e.target.value)}
 placeholder="Tell the employer why you're a great fit for this project..."
 rows={5}
 className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none resize-none"
 />
 </div>

 {/* Actions */}
 <div className="flex gap-3">
 <Button
 variant="outline"
 onClick={() => setShowApplyModal(false)}
 disabled={isSubmitting}
 className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
 >
 Cancel
 </Button>
 <Button
 onClick={submitApplication}
 disabled={isSubmitting}
 className="flex-1 bg-foreground/10 hover:bg-foreground/10"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 Submitting...
 </>
 ) : (
 "Submit Application"
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

// Connections component - employer interest/requests
interface ConnectionWithEmployer extends T3XConnection {
 employer_profile?: EmployerProfile & { profile?: Profile };
}

const Connections = () => {
 const { user } = useAuth();
 const [connections, setConnections] = useState<ConnectionWithEmployer[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [respondingTo, setRespondingTo] = useState<string | null>(null);

 useEffect(() => {
 const fetchConnections = async () => {
 if (!user?.id) return;

 // Get candidate_profiles.id (t3x_connections FK references candidate_profiles, not profiles)
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("id")
 .eq("profile_id", user.id)
 .single();
 if (!cp) { setIsLoading(false); return; }

 // Fetch connections for this candidate
 const { data: connectionData } = await supabase
 .from("t3x_connections")
 .select("*")
 .eq("candidate_id", cp.id)
 .order("created_at", { ascending: false });

 if (connectionData && connectionData.length > 0) {
 // Get employer profiles for each connection
 const enrichedConnections = await Promise.all(
 connectionData.map(async (conn) => {
 const { data: employerProfile } = await supabase
 .from("employer_profiles")
 .select("*")
 .eq("id", conn.employer_id)
 .single();

 let profile = null;
 if (employerProfile) {
 const { data: p } = await supabase
 .from("profiles")
 .select("*")
 .eq("id", employerProfile.profile_id)
 .single();
 profile = p;
 }

 return {
 ...conn,
 employer_profile: employerProfile ? { ...employerProfile, profile } : undefined,
 };
 })
 );
 setConnections(enrichedConnections);
 } else {
 setConnections([]);
 }

 setIsLoading(false);
 };

 fetchConnections();
 }, [user?.id]);

 const respondToConnection = async (connectionId: string, accept: boolean) => {
 setRespondingTo(connectionId);

 try {
 const newStatus = accept ? "accepted" : "declined";

 const { error } = await supabase
 .from("t3x_connections")
 .update({
 status: newStatus,
 responded_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", connectionId);

 if (error) {
 console.error("Error updating connection:", error);
 return;
 }

 // Update local state
 setConnections(prev =>
 prev.map(c => c.id === connectionId ? { ...c, status: newStatus, responded_at: new Date().toISOString() } : c)
 );

 // Create growth log entry
 await supabase.from("growth_log_entries").insert({
 candidate_id: user?.id,
 event_type: "tier_change",
 title: accept ? "Accepted Employer Connection" : "Declined Employer Connection",
 description: `Response sent to employer connection request`,
 source_component: "T3X",
 source_id: connectionId,
 });

 } catch (error) {
 console.error("Error:", error);
 } finally {
 setRespondingTo(null);
 }
 };

 const pendingConnections = connections.filter(c => c.status === "pending");
 const respondedConnections = connections.filter(c => c.status !== "pending");

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
 <h1 className="text-3xl font-bold text-foreground mb-2">Employer Connections</h1>
 <p className="text-foreground/60">
 Manage connection requests from employers interested in your profile.
 </p>
 </motion.div>

 {/* Pending Requests */}
 {pendingConnections.length > 0 && (
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
 <Bell className="w-5 h-5 ink-vermilion" />
 Pending Requests ({pendingConnections.length})
 </h2>
 <div className="space-y-4">
 {pendingConnections.map((connection) => (
 <div
 key={connection.id}
 className="p-6 rounded-xl bg-vermilion/[0.08] border border-vermilion"
 >
 <div className="flex items-start gap-4">
 <div className="w-14 h-14 rounded-xl bg-vermilion/[0.08] flex items-center justify-center text-foreground">
 <Building2 className="w-7 h-7" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-foreground text-lg">
 {connection.employer_profile?.company_name || "Unknown Company"}
 </h3>
 <p className="text-sm text-foreground/60">
 {connection.employer_profile?.industry || "Industry not specified"}
 </p>
 <p className="text-xs text-foreground/50 mt-1">
 Requested {new Date(connection.created_at).toLocaleDateString()}
 </p>
 </div>
 </div>

 {connection.message && (
 <div className="mt-4 p-3 rounded-lg bg-background/20">
 <p className="text-sm text-foreground/75">{connection.message}</p>
 </div>
 )}

 <div className="mt-4 flex gap-3">
 <Button
 onClick={() => respondToConnection(connection.id, true)}
 disabled={respondingTo === connection.id}
 className="flex-1 bg-vermilion/10 hover:bg-vermilion/10"
 >
 {respondingTo === connection.id ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <>
 <ThumbsUp className="w-4 h-4 mr-2" />
 Accept
 </>
 )}
 </Button>
 <Button
 variant="outline"
 onClick={() => respondToConnection(connection.id, false)}
 disabled={respondingTo === connection.id}
 className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
 >
 <ThumbsDown className="w-4 h-4 mr-2" />
 Decline
 </Button>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}

 {/* Connection History */}
 <motion.div variants={itemVariants}>
 <h2 className="text-xl font-semibold text-foreground mb-4">Connection History</h2>
 {respondedConnections.length > 0 ? (
 <div className="space-y-3">
 {respondedConnections.map((connection) => (
 <div
 key={connection.id}
 className="p-4 rounded-xl bg-background border border-foreground/25 flex items-center gap-4"
 >
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
 connection.status === "accepted"
 ? "bg-foreground/[0.06]"
 : "bg-foreground/20"
 }`}>
 <Building2 className={`w-5 h-5 ${
 connection.status === "accepted"
 ? "text-foreground"
 : "text-foreground/60"
 }`} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-foreground">
 {connection.employer_profile?.company_name || "Unknown Company"}
 </p>
 <p className="text-sm text-foreground/50">
 {connection.responded_at
 ? `Responded ${new Date(connection.responded_at).toLocaleDateString()}`
 : `Requested ${new Date(connection.created_at).toLocaleDateString()}`}
 </p>
 </div>
 <span className={`px-3 py-1 rounded-full text-sm ${
 connection.status === "accepted"
 ? "bg-foreground/[0.06] text-foreground"
 : connection.status === "declined"
 ? "bg-foreground/20 text-foreground/60"
 : "bg-vermilion/10 ink-vermilion"
 }`}>
 {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
 </span>
 </div>
 ))}
 </div>
 ) : pendingConnections.length === 0 ? (
 <div className="p-8 rounded-2xl bg-background border border-foreground/25 text-center">
 <Users className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No connection requests yet</p>
 <p className="text-sm text-foreground/50 mt-1">
 When employers are interested in your profile, you'll see their requests here
 </p>
 </div>
 ) : (
 <p className="text-foreground/50 text-sm">No previous connections</p>
 )}
 </motion.div>
 </motion.div>
 );
};

// Profile component with edit functionality
const Profile = () => {
 const { profile, user, refreshProfile } = useAuth();
 const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [isUploading, setIsUploading] = useState(false);
 const [uploadError, setUploadError] = useState<string | null>(null);
 const [uploadSuccess, setUploadSuccess] = useState(false);
 const [isEnhancing, setIsEnhancing] = useState(false);
 const [enhancerSummary, setEnhancerSummary] = useState<string | null>(null);
 const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
 const [avatarError, setAvatarError] = useState<string | null>(null);
 const [showResumeViewer, setShowResumeViewer] = useState(false);
 const [formData, setFormData] = useState({
 first_name: "",
 last_name: "",
 headline: "",
 bio: "",
 location: "",
 skills: [] as string[],
 });
 const [newSkill, setNewSkill] = useState("");

 useEffect(() => {
 if (profile) {
 setFormData((prev) => ({
 ...prev,
 first_name: profile.first_name || "",
 last_name: profile.last_name || "",
 headline: profile.headline || "",
 bio: profile.bio || "",
 location: profile.location || "",
 // Preserve skills - they come from candidate_profiles, not profiles
 }));
 }
 }, [profile]);

 useEffect(() => {
 const fetchCandidateProfile = async () => {
 if (!user?.id) return;

 const { data } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();

 if (data) {
 setCandidateProfile(data);
 setFormData((prev) => ({
 ...prev,
 skills: data.skills || [],
 }));
 }
 };

 fetchCandidateProfile();
 }, [user?.id]);

 const handleSave = async () => {
 if (!user?.id) return;
 setIsSaving(true);

 try {
 // Check if profile is reasonably complete — only promote to true, never demote
 const isProfileComplete = !!(
 formData.first_name &&
 formData.last_name &&
 (formData.headline || formData.bio) &&
 formData.skills.length > 0
 );

 // Build update payload — never reset onboarding_completed back to false
 const profileUpdate: Record<string, unknown> = {
 first_name: formData.first_name,
 last_name: formData.last_name,
 headline: formData.headline,
 bio: formData.bio,
 location: formData.location,
 updated_at: new Date().toISOString(),
 };
 if (isProfileComplete) {
 profileUpdate.onboarding_completed = true;
 }

 // Update profiles table
 const { error: profileError } = await supabase
 .from("profiles")
 .update(profileUpdate)
 .eq("id", user.id);

 if (profileError) {
 console.error("Error updating profile:", profileError);
 }

 // Check if candidate_profile exists
 const { data: existingProfile } = await supabase
 .from("candidate_profiles")
 .select("id")
 .eq("profile_id", user.id)
 .single();

 if (existingProfile) {
 // Update existing candidate_profile
 const { error: updateError } = await supabase
 .from("candidate_profiles")
 .update({
 skills: formData.skills,
 updated_at: new Date().toISOString(),
 })
 .eq("profile_id", user.id);

 if (updateError) {
 console.error("Error updating candidate profile:", updateError);
 }
 } else {
 // Insert new candidate_profile (default to resume_upload entry path)
 const { error: insertError } = await supabase
 .from("candidate_profiles")
 .insert({
 profile_id: user.id,
 skills: formData.skills,
 entry_path: 'resume_upload',
 });

 if (insertError) {
 console.error("Error creating candidate profile:", insertError);
 }
 }

 // Refresh local state
 const { data: updatedCandidateProfile } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();

 if (updatedCandidateProfile) {
 setCandidateProfile(updatedCandidateProfile);
 // Update formData.skills to reflect saved data
 setFormData((prev) => ({
 ...prev,
 skills: updatedCandidateProfile.skills || [],
 }));
 }

 await refreshProfile();
 setIsEditing(false);
 } catch (error) {
 console.error("Error saving profile:", error);
 } finally {
 setIsSaving(false);
 }
 };

 const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file || !user?.id) return;

 // Validate file type
 const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
 if (!allowedTypes.includes(file.type)) {
 setUploadError('Please upload a PDF or Word document');
 return;
 }

 // Validate file size (max 10MB)
 if (file.size > 10 * 1024 * 1024) {
 setUploadError('File size must be less than 10MB');
 return;
 }

 setIsUploading(true);
 setUploadError(null);
 setUploadSuccess(false);

 try {
 // Generate unique filename
 const fileExt = file.name.split('.').pop();
 const fileName = `${user.id}/${Date.now()}_resume.${fileExt}`;

 // Upload to Supabase Storage
 const { error: uploadError } = await supabase.storage
 .from('resumes')
 .upload(fileName, file, {
 cacheControl: '3600',
 upsert: true,
 });

 if (uploadError) {
 // If bucket doesn't exist, provide helpful message
 if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
 setUploadError('Resume storage is being configured. Please try again later.');
 console.error('Storage bucket "resumes" may not exist:', uploadError);
 } else {
 setUploadError('Failed to upload resume. Please try again.');
 console.error('Upload error:', uploadError);
 }
 return;
 }

 // Get public URL
 const { data: publicUrlData } = supabase.storage
 .from('resumes')
 .getPublicUrl(fileName);

 const resumeUrl = publicUrlData?.publicUrl || fileName;

 // Upsert candidate profile with resume URL
 const { data: updatedProfile } = await supabase
 .from("candidate_profiles")
 .upsert({
 profile_id: user.id,
 resume_url: resumeUrl,
 skills: candidateProfile?.skills || [],
 entry_path: candidateProfile?.entry_path || 'resume_upload',
 updated_at: new Date().toISOString(),
 }, {
 onConflict: 'profile_id'
 })
 .select()
 .single();

 if (updatedProfile) {
 setCandidateProfile(updatedProfile);
 }

 // Create growth log entry for resume upload
 await supabase.from("growth_log_entries").insert({
 candidate_id: user.id,
 event_type: "resume_upload",
 title: "Resume Uploaded",
 description: `Uploaded resume: ${file.name}`,
 source_component: "Profile",
 });

 setUploadSuccess(true);

 // Resume Enhancer: AI-powered analysis using a0.dev LLM API
 // Parses resume text and sends to AI for behavioral dimension mapping
 setIsEnhancing(true);
 setEnhancerSummary(null);

 try {
 // Extract text from the uploaded file for AI analysis
 const parsed = await parseResume(file);
 const resumeText = parsed.rawText || "";

 // Call AI to analyze resume and map to behavioral dimensions
 const enhancerResult = await analyzeResume(resumeText);

 // Update candidate profile with AI-generated Basic Profile data
 const updateData: Record<string, unknown> = {
 observation_areas: enhancerResult.observationDimensions,
 has_basic_profile: true,
 updated_at: new Date().toISOString(),
 };

 // Merge AI-suggested skills with existing skills
 if (enhancerResult.suggestedSkills.length > 0) {
 const existingSkills = candidateProfile?.skills || [];
 const mergedSkills = Array.from(new Set([...existingSkills, ...parsed.skills, ...enhancerResult.suggestedSkills]));
 updateData.skills = mergedSkills;
 }

 await supabase
 .from("candidate_profiles")
 .update(updateData)
 .eq("profile_id", user.id);

 // Build rationale summary for growth log
 const rationaleEntries = Object.entries(enhancerResult.dimensionRationale)
 .map(([dim, reason]) => `• ${dim.replace(/_/g, " ")}: ${reason}`)
 .join("\n");

 // Create growth log entry for Resume Enhancer / Basic Profile creation
 await supabase.from("growth_log_entries").insert({
 candidate_id: user.id,
 event_type: "assessment",
 title: "Resume Enhancer — Basic Profile Created",
 description: `AI-analyzed resume. ${enhancerResult.summary}\n\nObservation areas identified (${enhancerResult.observationDimensions.length} dimensions):\n${rationaleEntries}`,
 source_component: "ResumeEnhancer",
 metadata: {
 experienceLevel: enhancerResult.experienceLevel,
 industryFocus: enhancerResult.industryFocus,
 strengthAreas: enhancerResult.strengthAreas,
 suggestedSkills: enhancerResult.suggestedSkills,
 },
 });

 setEnhancerSummary(enhancerResult.summary);

 // Refresh candidate profile
 const { data: refreshedProfile } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();
 if (refreshedProfile) setCandidateProfile(refreshedProfile);
 } catch (enhancerError) {
 console.error("Resume Enhancer error (non-blocking):", enhancerError);
 // Fallback: still create basic profile with default dimensions
 const fallbackDimensions = [
 "integrity_ethics", "accountability_ownership", "execution_reliability",
 "communication_pressure", "collaboration_conflict",
 ];
 await supabase.from("candidate_profiles").update({
 observation_areas: fallbackDimensions,
 has_basic_profile: true,
 updated_at: new Date().toISOString(),
 }).eq("profile_id", user.id);

 await supabase.from("growth_log_entries").insert({
 candidate_id: user.id,
 event_type: "assessment",
 title: "Resume Enhancer — Basic Profile Created",
 description: "Basic Profile created with default observation dimensions (AI analysis unavailable).",
 source_component: "ResumeEnhancer",
 });

 // Refresh candidate profile
 const { data: refreshedProfile } = await supabase
 .from("candidate_profiles")
 .select("*")
 .eq("profile_id", user.id)
 .single();
 if (refreshedProfile) setCandidateProfile(refreshedProfile);
 } finally {
 setIsEnhancing(false);
 }

 // Clear success message after 3 seconds
 setTimeout(() => setUploadSuccess(false), 3000);
 } catch (error) {
 console.error("Error uploading resume:", error);
 setUploadError('An unexpected error occurred. Please try again.');
 } finally {
 setIsUploading(false);
 // Reset file input
 event.target.value = '';
 }
 };

 const handleDeleteResume = async () => {
 if (!user?.id || !candidateProfile?.resume_url) return;

 if (!confirm('Are you sure you want to delete your resume?')) return;

 try {
 // Extract filename from URL
 const urlParts = candidateProfile.resume_url.split('/');
 const fileName = urlParts.slice(-2).join('/'); // user_id/filename.ext

 // Delete from storage
 await supabase.storage.from('resumes').remove([fileName]);

 // Update candidate profile
 await supabase
 .from("candidate_profiles")
 .update({
 resume_url: null,
 updated_at: new Date().toISOString(),
 })
 .eq("profile_id", user.id);

 setCandidateProfile({ ...candidateProfile, resume_url: null });
 } catch (error) {
 console.error("Error deleting resume:", error);
 }
 };

 const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file || !user?.id) return;

 // Validate file type
 const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
 if (!allowedTypes.includes(file.type)) {
 setAvatarError('Please upload a JPG, PNG, GIF, or WebP image');
 return;
 }

 // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 setAvatarError('Image size must be less than 5MB');
 return;
 }

 setIsUploadingAvatar(true);
 setAvatarError(null);

 try {
 // Generate unique filename
 const fileExt = file.name.split('.').pop();
 const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

 // Delete old avatar if exists
 if (profile?.avatar_url) {
 try {
 const oldUrlParts = profile.avatar_url.split('/');
 const oldFileName = oldUrlParts.slice(-2).join('/');
 await supabase.storage.from('avatars').remove([oldFileName]);
 } catch (e) {
 // Ignore errors when deleting old avatar
 }
 }

 // Upload to Supabase Storage
 const { error: uploadError } = await supabase.storage
 .from('avatars')
 .upload(fileName, file, {
 cacheControl: '3600',
 upsert: true,
 });

 if (uploadError) {
 if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
 setAvatarError('Avatar storage is being configured. Please try again later.');
 console.error('Storage bucket "avatars" may not exist:', uploadError);
 } else {
 setAvatarError('Failed to upload avatar. Please try again.');
 console.error('Upload error:', uploadError);
 }
 return;
 }

 // Get public URL
 const { data: publicUrlData } = supabase.storage
 .from('avatars')
 .getPublicUrl(fileName);

 const avatarUrl = publicUrlData?.publicUrl || fileName;

 // Update profile with avatar URL
 const { error: updateError } = await supabase
 .from("profiles")
 .update({
 avatar_url: avatarUrl,
 updated_at: new Date().toISOString(),
 })
 .eq("id", user.id);

 if (updateError) {
 console.error("Error updating profile with avatar:", updateError);
 setAvatarError('Failed to save avatar. Please try again.');
 return;
 }

 // Refresh profile to get updated avatar
 await refreshProfile();
 } catch (error) {
 console.error("Error uploading avatar:", error);
 setAvatarError('An unexpected error occurred. Please try again.');
 } finally {
 setIsUploadingAvatar(false);
 event.target.value = '';
 }
 };

 const handleDeleteAvatar = async () => {
 if (!user?.id || !profile?.avatar_url) return;

 if (!confirm('Are you sure you want to remove your profile picture?')) return;

 try {
 // Extract filename from URL
 const urlParts = profile.avatar_url.split('/');
 const fileName = urlParts.slice(-2).join('/');

 // Delete from storage
 await supabase.storage.from('avatars').remove([fileName]);

 // Update profile
 await supabase
 .from("profiles")
 .update({
 avatar_url: null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", user.id);

 await refreshProfile();
 } catch (error) {
 console.error("Error deleting avatar:", error);
 }
 };

 const addSkill = () => {
 if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
 setFormData((prev) => ({
 ...prev,
 skills: [...prev.skills, newSkill.trim()],
 }));
 setNewSkill("");
 }
 };

 const removeSkill = (skill: string) => {
 setFormData((prev) => ({
 ...prev,
 skills: prev.skills.filter((s) => s !== skill),
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
 <h1 className="text-3xl font-bold text-foreground mb-2">Your Profile</h1>
 <p className="text-foreground/60">Manage your personal information</p>
 </div>
 {!isEditing ? (
 <Button onClick={() => setIsEditing(true)} className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none">
 Edit Profile
 </Button>
 ) : (
 <div className="flex gap-2">
 <Button
 variant="outline"
 onClick={() => setIsEditing(false)}
 className="border-foreground/25"
 >
 Cancel
 </Button>
 <Button
 onClick={handleSave}
 disabled={isSaving}
 className="bg-foreground/10 hover:bg-foreground/10"
 >
 {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
 Save
 </Button>
 </div>
 )}
 </motion.div>

 <motion.div variants={itemVariants} className="space-y-4">
 {/* Avatar and basic info */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <div className="flex items-center gap-4 mb-6">
 <div className="relative group">
 {profile?.avatar_url ? (
 <img
 src={profile.avatar_url}
 alt="Profile"
 className="w-20 h-20 rounded-2xl object-cover"
 />
 ) : (
 <div className="w-20 h-20 rounded-2xl bg-foreground flex items-center justify-center text-3xl text-background font-bold">
 {formData.first_name?.[0]}{formData.last_name?.[0]}
 </div>
 )}
 {/* Upload overlay */}
 <label className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
 {isUploadingAvatar ? (
 <Loader2 className="w-6 h-6 text-foreground animate-spin" />
 ) : (
 <Upload className="w-6 h-6 text-foreground" />
 )}
 <input
 type="file"
 accept="image/jpeg,image/png,image/gif,image/webp"
 onChange={handleAvatarUpload}
 disabled={isUploadingAvatar}
 className="hidden"
 />
 </label>
 {/* Delete button */}
 {profile?.avatar_url && (
 <button
 onClick={handleDeleteAvatar}
 className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/10"
 title="Remove photo"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 <div>
 <h2 className="text-xl font-bold text-foreground">
 {formData.first_name} {formData.last_name}
 </h2>
 <p className="text-foreground/60">{profile?.email}</p>
 <p className="text-xs text-foreground/50 mt-1">Hover over photo to change</p>
 </div>
 </div>

 {avatarError && (
 <div className="flex items-center gap-2 p-3 rounded-lg bg-vermilion/15 border border-vermilion ink-vermilion text-sm mb-4">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 {avatarError}
 </div>
 )}

 <div className="grid md:grid-cols-2 gap-4">
 <div>
 <label className="text-sm text-foreground/60 block mb-2">First Name</label>
 {isEditing ? (
 <input
 type="text"
 value={formData.first_name}
 onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
 className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-foreground focus:outline-none"
 />
 ) : (
 <p className="text-foreground">{formData.first_name}</p>
 )}
 </div>
 <div>
 <label className="text-sm text-foreground/60 block mb-2">Last Name</label>
 {isEditing ? (
 <input
 type="text"
 value={formData.last_name}
 onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
 className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground focus:border-foreground focus:outline-none"
 />
 ) : (
 <p className="text-foreground">{formData.last_name}</p>
 )}
 </div>
 </div>
 </div>

 {/* Resume Upload */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Resume</h3>
 <p className="text-sm text-foreground/60">Upload your resume to start the observation process</p>
 </div>
 <FileText className="w-8 h-8 ink-vermilion" />
 </div>

 {candidateProfile?.resume_url ? (
 <div className="space-y-4">
 <div className="flex items-center gap-4 p-4 rounded-lg bg-foreground/[0.06] border border-foreground/40">
 <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
 <CheckCircle className="w-6 h-6 text-foreground" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-foreground">Resume Uploaded</p>
 <p className="text-sm text-foreground/60 truncate">
 Your resume is on file and ready for review
 </p>
 </div>
 </div>

 {/* Resume Actions */}
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setShowResumeViewer(true)}
 className="px-4 py-2 rounded-none bg-foreground hover:bg-foreground/90 text-background transition-colors flex items-center gap-2 shadow-none"
 >
 <Eye className="w-4 h-4" />
 View Resume
 </button>
 <a
 href={candidateProfile.resume_url}
 download
 className="px-4 py-2 rounded-lg bg-background text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-2"
 >
 <Download className="w-4 h-4" />
 Download
 </a>
 <a
 href={candidateProfile.resume_url}
 target="_blank"
 rel="noopener noreferrer"
 className="px-4 py-2 rounded-lg bg-background text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-2"
 >
 <ExternalLink className="w-4 h-4" />
 Open in New Tab
 </a>
 <button
 onClick={handleDeleteResume}
 className="px-4 py-2 rounded-lg bg-vermilion/15 ink-vermilion hover:bg-vermilion/15 transition-colors flex items-center gap-2"
 >
 <X className="w-4 h-4" />
 Remove
 </button>
 </div>

 {/* Replace option */}
 <div className="pt-2 border-t border-foreground/25">
 <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-foreground/25 text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors text-sm">
 <Upload className="w-4 h-4" />
 Replace Resume
 <input
 type="file"
 accept=".pdf,.doc,.docx"
 onChange={handleResumeUpload}
 disabled={isUploading}
 className="hidden"
 />
 </label>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="p-6 rounded-lg border-2 border-dashed border-foreground/25 text-center hover:border-foreground/25 transition-colors">
 <Upload className="w-10 h-10 text-foreground/50 mx-auto mb-3" />
 <p className="text-foreground/60 mb-2">
 Drop your resume here or click to upload
 </p>
 <p className="text-xs text-foreground/50 mb-4">
 Supports PDF, DOC, DOCX (max 10MB)
 </p>
 <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none font-medium transition-colors">
 {isUploading ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Uploading...
 </>
 ) : (
 <>
 <Upload className="w-5 h-5" />
 Select File
 </>
 )}
 <input
 type="file"
 accept=".pdf,.doc,.docx"
 onChange={handleResumeUpload}
 disabled={isUploading}
 className="hidden"
 />
 </label>
 </div>

 {uploadError && (
 <div className="flex items-center gap-2 p-3 rounded-lg bg-vermilion/15 border border-vermilion ink-vermilion text-sm">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 {uploadError}
 </div>
 )}

 {uploadSuccess && (
 <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/[0.06] border border-foreground/40 text-foreground text-sm">
 <CheckCircle className="w-5 h-5 flex-shrink-0" />
 Resume uploaded successfully!
 </div>
 )}

 {isEnhancing && (
 <div className="flex items-center gap-3 p-4 rounded-lg bg-foreground/10 border border-foreground/25 ink-vermilion text-sm">
 <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
 <div>
 <p className="font-medium">Resume Enhancer AI is analyzing your resume...</p>
 <p className="text-xs text-foreground/60 mt-1">Creating your Basic Profile and identifying observation areas</p>
 </div>
 </div>
 )}

 {enhancerSummary && !isEnhancing && (
 <div className="flex items-start gap-3 p-4 rounded-lg bg-foreground/10 border border-foreground/25 ink-vermilion text-sm">
 <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium ink-vermilion">AI Analysis Complete</p>
 <p className="text-foreground/75 mt-1">{enhancerSummary}</p>
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Resume Enhancer — Basic Profile */}
 {candidateProfile?.has_basic_profile && (
 <div className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/25">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-lg bg-foreground/20 flex items-center justify-center">
 <FileText className="w-5 h-5 ink-vermilion" />
 </div>
 <div>
 <h3 className="font-semibold text-foreground">Basic Profile</h3>
 <p className="text-xs text-foreground/60">Created by Resume Enhancer AI (non-credentialed)</p>
 </div>
 <span className="ml-auto px-3 py-1 rounded-full bg-foreground/20 ink-vermilion text-xs font-medium">
 Active
 </span>
 </div>
 {candidateProfile.observation_areas && candidateProfile.observation_areas.length > 0 && (
 <div>
 <p className="text-sm text-foreground/60 mb-2">Observation Areas Identified</p>
 <div className="flex flex-wrap gap-2">
 {candidateProfile.observation_areas.map((area: string, i: number) => (
 <span key={i} className="px-3 py-1 rounded-lg bg-background/60 text-sm ink-vermilion border border-foreground/25">
 {area.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
 </span>
 ))}
 </div>
 <p className="text-xs text-foreground/50 mt-3">
 These dimensions will be assessed by your assigned mentor through structured observations (BASD protocol).
 </p>
 </div>
 )}
 </div>
 )}

 {/* Headline and Bio */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <div className="mb-4">
 <label className="text-sm text-foreground/60 block mb-2">Headline</label>
 {isEditing ? (
 <input
 type="text"
 value={formData.headline}
 onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
 placeholder="e.g., Software Developer | Career Changer"
 className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
 />
 ) : (
 <p className="text-foreground">{formData.headline || "No headline set"}</p>
 )}
 </div>
 <div>
 <label className="text-sm text-foreground/60 block mb-2">Bio</label>
 {isEditing ? (
 <textarea
 value={formData.bio}
 onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
 placeholder="Tell us about yourself..."
 rows={4}
 className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none resize-none"
 />
 ) : (
 <p className="text-foreground whitespace-pre-wrap">{formData.bio || "No bio set"}</p>
 )}
 </div>
 </div>

 {/* Location */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <label className="text-sm text-foreground/60 block mb-2">Location</label>
 {isEditing ? (
 <input
 type="text"
 value={formData.location}
 onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
 placeholder="City, State"
 className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
 />
 ) : (
 <p className="text-foreground">{formData.location || "Not specified"}</p>
 )}
 </div>

 {/* Skills */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <label className="text-sm text-foreground/60 block mb-3">Skills</label>
 <div className="flex flex-wrap gap-2 mb-4">
 {formData.skills.map((skill) => (
 <span
 key={skill}
 className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-foreground/20 ink-vermilion text-sm"
 >
 {skill}
 {isEditing && (
 <button onClick={() => removeSkill(skill)} className="hover:text-foreground">
 <X className="w-3 h-3" />
 </button>
 )}
 </span>
 ))}
 {formData.skills.length === 0 && !isEditing && (
 <p className="text-foreground/50">No skills added</p>
 )}
 </div>
 {isEditing && (
 <div className="flex gap-2">
 <input
 type="text"
 value={newSkill}
 onChange={(e) => setNewSkill(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
 placeholder="Add a skill..."
 className="flex-1 px-4 py-2 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
 />
 <Button onClick={addSkill} size="sm" className="bg-foreground/10 hover:bg-foreground/10">
 <Plus className="w-4 h-4" />
 </Button>
 </div>
 )}
 </div>
 </motion.div>

 {/* Resume Viewer Modal */}
 {showResumeViewer && candidateProfile?.resume_url && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
 onClick={() => setShowResumeViewer(false)}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-background/50 rounded-2xl border border-foreground/25 w-full max-w-5xl h-[90vh] flex flex-col"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-foreground/25">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-foreground/20 flex items-center justify-center">
 <FileText className="w-5 h-5 ink-vermilion" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-foreground">Your Resume</h2>
 <p className="text-sm text-foreground/60">View and review your uploaded resume</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <a
 href={candidateProfile.resume_url}
 download
 className="px-3 py-2 rounded-lg bg-background text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-2 text-sm"
 >
 <Download className="w-4 h-4" />
 Download
 </a>
 <a
 href={candidateProfile.resume_url}
 target="_blank"
 rel="noopener noreferrer"
 className="px-3 py-2 rounded-lg bg-background text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-2 text-sm"
 >
 <ExternalLink className="w-4 h-4" />
 Open in New Tab
 </a>
 <button
 onClick={() => setShowResumeViewer(false)}
 className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Resume Viewer */}
 <div className="flex-1 overflow-hidden">
 {candidateProfile.resume_url.toLowerCase().endsWith('.pdf') ? (
 <iframe
 src={`${candidateProfile.resume_url}#toolbar=1&navpanes=0&scrollbar=1`}
 className="w-full h-full border-0"
 title="Resume Viewer"
 />
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-8 text-center">
 <div className="w-20 h-20 rounded-2xl bg-foreground/20 flex items-center justify-center mb-4">
 <FileText className="w-10 h-10 ink-vermilion" />
 </div>
 <h3 className="text-xl font-semibold text-foreground mb-2">Document Preview</h3>
 <p className="text-foreground/60 mb-6 max-w-md">
 This document format cannot be previewed directly in the browser.
 You can download it or open it in a new tab to view the contents.
 </p>
 <div className="flex gap-3">
 <a
 href={candidateProfile.resume_url}
 download
 className="px-6 py-3 rounded-xl bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none font-medium transition-colors flex items-center gap-2"
 >
 <Download className="w-5 h-5" />
 Download Resume
 </a>
 <a
 href={`https://docs.google.com/viewer?url=${encodeURIComponent(candidateProfile.resume_url)}&embedded=true`}
 target="_blank"
 rel="noopener noreferrer"
 className="px-6 py-3 rounded-xl bg-background hover:bg-foreground/10 text-foreground font-medium transition-colors flex items-center gap-2"
 >
 <ExternalLink className="w-5 h-5" />
 Open with Google Docs
 </a>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}

 <motion.div variants={itemVariants}>
 <GoogleAuthLink />
 </motion.div>
 </motion.div>
 );
};

// Settings component
const SettingsPage = () => {
 const { user, signOut } = useAuth();
 const navigate = useNavigate();

 // Password change state
 const [showPasswordModal, setShowPasswordModal] = useState(false);
 const [passwordForm, setPasswordForm] = useState({
 newPassword: "",
 confirmPassword: "",
 });
 const [showNewPassword, setShowNewPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 const [isChangingPassword, setIsChangingPassword] = useState(false);
 const [passwordError, setPasswordError] = useState<string | null>(null);
 const [passwordSuccess, setPasswordSuccess] = useState(false);

 const handleDeleteAccount = () => {
 if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
 // Would implement account deletion here
 alert("Account deletion would be implemented here");
 }
 };

 const handlePasswordChange = async () => {
 setPasswordError(null);

 // Validation
 if (passwordForm.newPassword.length < 8) {
 setPasswordError("Password must be at least 8 characters long");
 return;
 }

 if (passwordForm.newPassword !== passwordForm.confirmPassword) {
 setPasswordError("Passwords do not match");
 return;
 }

 setIsChangingPassword(true);

 try {
 const { error } = await updatePassword(passwordForm.newPassword);

 if (error) {
 setPasswordError(error.message || "Failed to update password");
 return;
 }

 setPasswordSuccess(true);
 setTimeout(() => {
 setShowPasswordModal(false);
 setPasswordSuccess(false);
 setPasswordForm({ newPassword: "", confirmPassword: "" });
 }, 1500);

 } catch (error) {
 setPasswordError("An unexpected error occurred");
 } finally {
 setIsChangingPassword(false);
 }
 };

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
 {/* Account */}
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

 {/* Security */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <h2 className="text-lg font-semibold text-foreground mb-4">Security</h2>
 <Button
 variant="outline"
 className="border-foreground/25 text-foreground hover:bg-foreground/5"
 onClick={() => {
 setPasswordForm({ newPassword: "", confirmPassword: "" });
 setPasswordError(null);
 setPasswordSuccess(false);
 setShowPasswordModal(true);
 }}
 >
 <Lock className="w-4 h-4 mr-2" />
 Change Password
 </Button>
 </div>

 {/* Notifications */}
 <div className="p-6 rounded-xl bg-background border border-foreground/25">
 <h2 className="text-lg font-semibold text-foreground mb-4">Notifications</h2>
 <div className="space-y-4">
 <label className="flex items-center justify-between">
 <span className="text-foreground/60">Email notifications</span>
 <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
 </label>
 <label className="flex items-center justify-between">
 <span className="text-foreground/60">Progress updates</span>
 <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
 </label>
 <label className="flex items-center justify-between">
 <span className="text-foreground/60">Project opportunities</span>
 <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-background border-foreground/25" />
 </label>
 </div>
 </div>

 {/* Danger Zone */}
 <div className="p-6 rounded-xl bg-vermilion/15 border border-vermilion">
 <h2 className="text-lg font-semibold ink-vermilion mb-4">Danger Zone</h2>
 <p className="text-sm text-foreground/60 mb-4">
 Once you delete your account, there is no going back. Please be certain.
 </p>
 <Button
 variant="outline"
 className="border-vermilion ink-vermilion hover:bg-vermilion/15"
 onClick={handleDeleteAccount}
 >
 Delete Account
 </Button>
 </div>
 </motion.div>

 {/* Password Change Modal */}
 {showPasswordModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-background"
 onClick={() => !isChangingPassword && setShowPasswordModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-background/50 border border-foreground/25"
 >
 {passwordSuccess ? (
 <div className="text-center py-8">
 <div className="w-16 h-16 rounded-full bg-foreground/[0.06] flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-8 h-8 text-foreground" />
 </div>
 <h3 className="text-xl font-bold text-foreground mb-2">Password Updated!</h3>
 <p className="text-foreground/60">
 Your password has been successfully changed.
 </p>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-foreground">Change Password</h2>
 <button
 onClick={() => setShowPasswordModal(false)}
 disabled={isChangingPassword}
 className="text-foreground/60 hover:text-foreground"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {passwordError && (
 <div className="flex items-center gap-2 p-3 rounded-lg bg-vermilion/15 border border-vermilion ink-vermilion text-sm mb-4">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 {passwordError}
 </div>
 )}

 <div className="space-y-4">
 <div>
 <label className="text-sm text-foreground/60 block mb-2">New Password</label>
 <div className="relative">
 <input
 type={showNewPassword ? "text" : "password"}
 value={passwordForm.newPassword}
 onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
 placeholder="Enter new password"
 className="w-full px-4 py-2.5 pr-12 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
 />
 <button
 type="button"
 onClick={() => setShowNewPassword(!showNewPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground/75"
 >
 {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
 </button>
 </div>
 </div>
 <div>
 <label className="text-sm text-foreground/60 block mb-2">Confirm Password</label>
 <div className="relative">
 <input
 type={showConfirmPassword ? "text" : "password"}
 value={passwordForm.confirmPassword}
 onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
 placeholder="Confirm new password"
 className="w-full px-4 py-2.5 pr-12 rounded-lg bg-background border border-foreground/25 text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
 />
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground/75"
 >
 {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
 </button>
 </div>
 </div>
 </div>

 <p className="text-xs text-foreground/50 mt-4">
 Password must be at least 8 characters long.
 </p>

 <div className="flex gap-3 mt-6">
 <Button
 variant="outline"
 onClick={() => setShowPasswordModal(false)}
 disabled={isChangingPassword}
 className="flex-1 border-foreground/25 text-foreground hover:bg-foreground/5"
 >
 Cancel
 </Button>
 <Button
 onClick={handlePasswordChange}
 disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
 className="flex-1 bg-foreground/10 hover:bg-foreground/10"
 >
 {isChangingPassword ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 Updating...
 </>
 ) : (
 "Update Password"
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

// Request a Mentor — request-intake + assignment-status panel.
//
// Post-Launch 03 Note 4: this screen never presents the mentor pool. No
// list, no filter, no availability language, in any state. The individual
// submits a request; The 3rd Academy assigns a mentor. See the migration
// 20260826120000_t3a_mentor_request_and_pool_lockdown.sql for the RLS
// change that closes the data path — the UI change alone would not be
// enough.
type MentorRequestStatus =
 | "received"
 | "under_review"
 | "assigned"
 | "introduction_sent"
 | "closed_without_assignment"
 | "withdrawn";

type MentorRequestRow = {
 mentor_request_id: string;
 requester_id: string;
 area_of_work: string | null;
 current_work_context: string | null;
 availability: string | null;
 time_zone: string | null;
 additional_context: string | null;
 status: MentorRequestStatus;
 assigned_mentor_id: string | null;
 created_at: string;
 updated_at: string;
};

const REQUEST_STAGES: { key: MentorRequestStatus; label: string; note: string }[] = [
 { key: "received", label: "Request received", note: "Complete once submitted." },
 { key: "under_review", label: "Under review", note: "Current while the request is being considered." },
 { key: "assigned", label: "Mentor assigned", note: "Complete when an assignment is made." },
 { key: "introduction_sent", label: "Introduction sent", note: "Complete when the individual and the mentor have been introduced." },
];

const REQUEST_STAGE_ORDER: MentorRequestStatus[] = [
 "received",
 "under_review",
 "assigned",
 "introduction_sent",
];

const FindMentor = () => {
 const { user } = useAuth();
 const { toast } = useToast();
 const navigate = useNavigate();
 const [request, setRequest] = useState<MentorRequestRow | null>(null);
 const [assignment, setAssignment] = useState<MentorAssignment | null>(null);
 const [assignedMentorName, setAssignedMentorName] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState({
 areaOfWork: "",
 currentWorkContext: "",
 availability: "",
 timeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
 additionalContext: "",
 });

 useEffect(() => {
 let cancelled = false;
 (async () => {
 if (!user?.id) { setIsLoading(false); return; }
 setIsLoading(true);

 // Latest request submitted by this individual, if any.
 const { data: reqRows } = await supabase
 .from("t3a_mentor_request")
 .select("*")
 .eq("requester_id", user.id)
 .order("created_at", { ascending: false })
 .limit(1);
 const latest = (reqRows ?? [])[0] as MentorRequestRow | undefined;

 // Assignment (if any) — used to derive the "assigned" state independently
 // of the request row, because a mentor can be assigned via other flows.
 const { data: cp } = await supabase
 .from("candidate_profiles")
 .select("id")
 .eq("profile_id", user.id)
 .single();
 const candidateProfileId = cp?.id;

 let activeAssignment: MentorAssignment | null = null;
 if (candidateProfileId) {
 const { data: aRows } = await supabase
 .from("mentor_assignments")
 .select("*")
 .eq("candidate_id", candidateProfileId)
 .in("status", ["pending", "active"])
 .order("created_at", { ascending: false })
 .limit(1);
 activeAssignment = ((aRows ?? [])[0] as MentorAssignment) ?? null;
 }

 // If a mentor is assigned, the individual is now permitted to read that
 // one mentor_profiles row (see migration RLS). Otherwise we do not
 // touch mentor_profiles at all.
 let assignedName: string | null = null;
 if (activeAssignment?.mentor_id) {
 const { data: mp } = await supabase
 .from("mentor_profiles")
 .select("id, profile_id")
 .eq("id", activeAssignment.mentor_id)
 .maybeSingle();
 if (mp?.profile_id) {
 const { data: prof } = await supabase
 .from("profiles")
 .select("first_name, last_name")
 .eq("id", mp.profile_id)
 .maybeSingle();
 const first = prof?.first_name ?? "";
 const last = prof?.last_name ?? "";
 assignedName = `${first} ${last}`.trim() || null;
 }
 }

 if (cancelled) return;
 setRequest(latest ?? null);
 setAssignment(activeAssignment);
 setAssignedMentorName(assignedName);
 setIsLoading(false);
 })();
 return () => { cancelled = true; };
 }, [user?.id]);

 const submit = async () => {
 if (!user?.id) return;
 setSaving(true);
 const { data, error } = await supabase
 .from("t3a_mentor_request")
 .insert({
 requester_id: user.id,
 area_of_work: form.areaOfWork.trim() || null,
 current_work_context: form.currentWorkContext.trim() || null,
 availability: form.availability.trim() || null,
 time_zone: form.timeZone.trim() || null,
 additional_context: form.additionalContext.trim() || null,
 status: "received",
 })
 .select("*")
 .single();
 setSaving(false);
 if (error) {
 toast({
 title: "Request not sent",
 description: error.message,
 variant: "destructive",
 });
 return;
 }
 setRequest(data as MentorRequestRow);
 toast({
 title: "Request received.",
 description: "You will be notified when a mentor has been assigned.",
 });
 };

 if (isLoading) return <LedgerLoading />;

 // Derive the effective state.
 const isAssigned = !!assignment && (assignment.status === "active" || assignment.status === "pending");
 const isClosedWithoutAssignment =
 !!request && !isAssigned && (request.status === "closed_without_assignment" || request.status === "withdrawn");
 const hasOpenRequest = !!request && !isAssigned && !isClosedWithoutAssignment;

 return (
 <div>
 <DashboardPageHeader
 eyebrow="Your record · Request a mentor"
 title={<>Submit a request for <span className="italic display-serif-italic">mentor assignment</span>.</>}
 meta="The 3rd Academy assigns a mentor to work with you."
 />

 {isAssigned ? (
 <DashSection eyebrow="§ Mentor assigned" title="Mentor assigned">
 <div className="border-2 border-foreground p-6 space-y-4">
 <div className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-foreground mt-1 shrink-0" />
 <div>
 <p className="display-serif text-lg text-foreground leading-snug">
 {assignedMentorName
 ? <>Your assigned mentor is <span className="italic">{assignedMentorName}</span>.</>
 : <>A mentor has been assigned to your account.</>}
 </p>
 <p className="text-foreground/75 text-[0.9375rem] mt-2">
 You can now continue through the observation process.
 </p>
 </div>
 </div>
 <div className="pt-2 border-t border-foreground/20">
 <Button
 onClick={() => navigate("/dashboard/candidate/observations")}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-2 text-sm font-medium"
 >
 Go to Observation Pathway <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>
 </DashSection>
 ) : hasOpenRequest ? (
 <DashSection eyebrow="§ Request status" title="Your request status">
 <RequestStatusSequence current={request!.status} />
 <p className="mt-6 text-sm text-foreground/70 border-l-2 border-foreground/25 pl-4">
 You will be notified once a mentor has been assigned. The sequence above shows where your
 request stands. It does not show who is reviewing it or how many mentors have been considered.
 </p>
 </DashSection>
 ) : isClosedWithoutAssignment ? (
 <DashSection eyebrow="§ Request closed" title="This request has been closed">
 <div className="border-2 border-foreground/25 p-6">
 <p className="display-serif text-lg text-foreground leading-snug">
 Your previous request was closed without an assignment.
 </p>
 <p className="text-foreground/75 text-[0.9375rem] mt-3">
 You can submit a new request below. If you would like context on why the previous request
 was not assigned, contact your program coordinator through Messages.
 </p>
 </div>
 <div className="mt-8">
 <RequestForm form={form} setForm={setForm} saving={saving} onSubmit={submit} />
 </div>
 </DashSection>
 ) : (
 <DashSection eyebrow="§ No request yet" title="No mentor request submitted yet">
 <p className="text-foreground/75 text-[0.9375rem] mb-6">
 Complete the form below to request mentor assignment.
 </p>
 <RequestForm form={form} setForm={setForm} saving={saving} onSubmit={submit} />
 </DashSection>
 )}
 </div>
 );
};

function RequestStatusSequence({ current }: { current: MentorRequestStatus }) {
 const currentIdx = Math.max(0, REQUEST_STAGE_ORDER.indexOf(current));
 return (
 <div className="border-t-2 border-foreground">
 {REQUEST_STAGES.map((stage, i) => {
 const state: "complete" | "current" | "upcoming" =
 i < currentIdx ? "complete" : i === currentIdx ? "current" : "upcoming";
 return (
 <div
 key={stage.key}
 className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-foreground/20 items-baseline"
 >
 <div className="col-span-1 mono-label text-foreground/60">0{i + 1}</div>
 <div className="col-span-6">
 <div className="display-serif text-lg text-foreground leading-tight">{stage.label}</div>
 <div className="text-foreground/70 text-[0.9375rem] mt-1">{stage.note}</div>
 </div>
 <div className="col-span-5 text-right mono-label text-foreground/60">
 {state === "complete" ? "complete" : state === "current" ? "in progress" : "upcoming"}
 </div>
 </div>
 );
 })}
 </div>
 );
}

function RequestForm({
 form,
 setForm,
 saving,
 onSubmit,
}: {
 form: {
 areaOfWork: string;
 currentWorkContext: string;
 availability: string;
 timeZone: string;
 additionalContext: string;
 };
 setForm: React.Dispatch<React.SetStateAction<{
 areaOfWork: string;
 currentWorkContext: string;
 availability: string;
 timeZone: string;
 additionalContext: string;
 }>>;
 saving: boolean;
 onSubmit: () => void;
}) {
 const canSubmit = form.areaOfWork.trim() && form.availability.trim() && form.timeZone.trim();
 return (
 <form
 onSubmit={(e) => { e.preventDefault(); if (canSubmit && !saving) onSubmit(); }}
 className="space-y-6"
 >
 <RequestField
 label="Area of work"
 hint="Captured as context for the assigner."
 value={form.areaOfWork}
 onChange={(v) => setForm((f) => ({ ...f, areaOfWork: v }))}
 required
 placeholder="e.g. software engineering, hospitality operations, K–12 teaching"
 />
 <RequestField
 label="Current work context"
 hint="Captured as context for the assigner. Not everyone requesting observation is in a conventional role."
 value={form.currentWorkContext}
 onChange={(v) => setForm((f) => ({ ...f, currentWorkContext: v }))}
 multiline
 placeholder="What you are doing right now — a role, a project, self-employment, care work, a career change in progress."
 />
 <RequestField
 label="Availability"
 hint="Days and times you can meet."
 value={form.availability}
 onChange={(v) => setForm((f) => ({ ...f, availability: v }))}
 required
 placeholder="e.g. weekday evenings after 6pm, Saturday mornings"
 />
 <RequestField
 label="Time zone"
 hint="Needed to schedule a live session across time zones."
 value={form.timeZone}
 onChange={(v) => setForm((f) => ({ ...f, timeZone: v }))}
 required
 placeholder="e.g. America/Edmonton"
 />
 <RequestField
 label="Anything we should know before a mentor is assigned"
 hint="Optional."
 value={form.additionalContext}
 onChange={(v) => setForm((f) => ({ ...f, additionalContext: v }))}
 multiline
 placeholder="Optional free text."
 />

 <div className="pt-2 flex items-center justify-end gap-4">
 <Button
 type="submit"
 disabled={!canSubmit || saving}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-3 text-sm font-medium tracking-wide"
 >
 {saving ? (
 <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
 ) : (
 <>Submit Mentor Request <Send className="w-4 h-4 ml-2" /></>
 )}
 </Button>
 </div>
 </form>
 );
}

function RequestField({
 label,
 hint,
 value,
 onChange,
 required,
 multiline,
 placeholder,
}: {
 label: string;
 hint?: string;
 value: string;
 onChange: (v: string) => void;
 required?: boolean;
 multiline?: boolean;
 placeholder?: string;
}) {
 return (
 <div>
 <label className="mono-label text-foreground/60 block mb-1">
 {label}{required ? " *" : ""}
 </label>
 {hint && <p className="text-xs text-foreground/60 mb-2">{hint}</p>}
 {multiline ? (
 <textarea
 value={value}
 onChange={(e) => onChange(e.target.value)}
 required={required}
 rows={3}
 placeholder={placeholder}
 className="w-full rounded-none border border-foreground/40 focus:border-foreground focus:outline-none bg-background/40 px-3 py-2 text-foreground display-serif text-base resize-y"
 />
 ) : (
 <input
 type="text"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 required={required}
 placeholder={placeholder}
 className="w-full rounded-none border border-foreground/40 focus:border-foreground focus:outline-none bg-background/40 px-3 py-2 text-foreground display-serif text-base"
 />
 )}
 </div>
 );
}

// Messages Page component
const MessagesPage = () => {
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
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
 const [replyTo, setReplyTo] = useState<any | null>(null);
 const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

 const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || !user?.id) return;
 setIsProcessingFile(true);
 try {
 const uploaded = await uploadMessageAttachment(file, user.id);
 if (!uploaded) {
 toast({ title: "Upload Failed", description: "File too large or type not supported.", variant: "destructive" });
 setAttachedFile(null);
 } else {
 setAttachedFile(uploaded);
 toast({ title: "File Attached", description: `"${uploaded.name}" ready to send.` });
 }
 } catch {
 toast({ title: "Error", description: "Failed to upload file.", variant: "destructive" });
 } finally {
 setIsProcessingFile(false);
 if (fileInputRef.current) fileInputRef.current.value = "";
 }
 };

 // Search for users to start new conversation
 const searchUsers = async (query: string) => {
 if (!query.trim() || query.length < 2) {
 setSearchResults([]);
 return;
 }
 setIsSearching(true);
 try {
 const { data, error } = await supabase
 .from("profiles")
 .select("id, first_name, last_name, avatar_url, role")
 .neq("id", user?.id)
 .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
 .limit(20);

 if (error) {
 console.error("Error searching users:", error);
 toast({
 title: "Search Error",
 description: "Failed to search for users. Please try again.",
 variant: "destructive",
 });
 setSearchResults([]);
 } else {
 setSearchResults(data || []);
 }
 } catch (error) {
 console.error("Error searching users:", error);
 toast({
 title: "Search Error",
 description: "An unexpected error occurred while searching.",
 variant: "destructive",
 });
 setSearchResults([]);
 } finally {
 setIsSearching(false);
 }
 };

 useEffect(() => {
 const timer = setTimeout(() => {
 if (userSearchQuery) searchUsers(userSearchQuery);
 else setSearchResults([]);
 }, 300);
 return () => clearTimeout(timer);
 }, [userSearchQuery]);

 const startConversation = async (targetUserId: string) => {
 if (!user?.id || isCreatingConversation) return;
 setIsCreatingConversation(true);

 try {
 // Check if conversation already exists
 const { data: myConvs, error: myConvsError } = await supabase
 .from("conversation_participants")
 .select("conversation_id")
 .eq("user_id", user.id);

 if (myConvsError) {
 console.error("Error fetching user conversations:", myConvsError);
 toast({
 title: "Connection Error",
 description: "Failed to check existing conversations. Please try again.",
 variant: "destructive",
 });
 setIsCreatingConversation(false);
 return;
 }

 if (myConvs && myConvs.length > 0) {
 const myConvIds = myConvs.map((c) => c.conversation_id);
 const { data: theirConvs, error: theirConvsError } = await supabase
 .from("conversation_participants")
 .select("conversation_id")
 .eq("user_id", targetUserId)
 .in("conversation_id", myConvIds);

 if (theirConvsError) {
 console.error("Error checking for existing conversation:", theirConvsError);
 toast({
 title: "Connection Error",
 description: "Failed to verify conversation status. Please try again.",
 variant: "destructive",
 });
 setIsCreatingConversation(false);
 return;
 }

 if (theirConvs && theirConvs.length > 0) {
 // Existing conversation found — switch to it
 const existingConvId = theirConvs[0].conversation_id;
 const existing = conversations.find((c) => c.id === existingConvId);
 if (existing) {
 setActiveConversation(existing);
 setShowNewChat(false);
 setUserSearchQuery("");
 setSearchResults([]);
 toast({
 title: "Conversation Opened",
 description: "Switched to existing conversation.",
 });
 setIsCreatingConversation(false);
 return;
 }
 }
 }

 // Create new conversation
 const { data: conv, error: convError } = await supabase
 .from("conversations")
 .insert({ last_message_at: new Date().toISOString() })
 .select()
 .single();

 if (convError || !conv) {
 console.error("Error creating conversation:", convError);
 toast({
 title: "Failed to Create Conversation",
 description: convError?.message || "Could not create a new conversation. Please try again.",
 variant: "destructive",
 });
 setIsCreatingConversation(false);
 return;
 }

 // Add participants — seed self first (RLS: user_id must equal auth.uid()),
 // then the target (RLS: allowed once caller is a participant of the conv).
 const { error: selfParticipantErr } = await supabase
 .from("conversation_participants")
 .insert({ conversation_id: conv.id, user_id: user.id });
 if (selfParticipantErr) {
 console.error("Error adding self as participant:", selfParticipantErr);
 toast({
 title: "Failed to Start Conversation",
 description: "Could not join the conversation. Please try again.",
 variant: "destructive",
 });
 setIsCreatingConversation(false);
 return;
 }
 const { error: targetParticipantErr } = await supabase
 .from("conversation_participants")
 .insert({ conversation_id: conv.id, user_id: targetUserId });
 if (targetParticipantErr) {
 console.error("Error adding target participant:", targetParticipantErr);
 toast({
 title: "Failed to Add Recipient",
 description: "Could not add the other user. Please try again.",
 variant: "destructive",
 });
 setIsCreatingConversation(false);
 return;
 }

 // Fetch target user profile
 const { data: targetProfile, error: profileError } = await supabase
 .from("profiles")
 .select("id, first_name, last_name, avatar_url, role")
 .eq("id", targetUserId)
 .single();

 if (profileError) {
 console.error("Error fetching target profile:", profileError);
 // Continue anyway - conversation was created successfully
 }

 const newConv = { ...conv, other_user: targetProfile };
 setConversations((prev) => [newConv, ...prev]);
 setActiveConversation(newConv);
 setShowNewChat(false);
 setUserSearchQuery("");
 setSearchResults([]);

 toast({
 title: "Conversation Started",
 description: `You can now message ${targetProfile?.first_name || "this user"}.`,
 });
 } catch (error) {
 console.error("Unexpected error creating conversation:", error);
 toast({
 title: "Unexpected Error",
 description: "An unexpected error occurred. Please try again.",
 variant: "destructive",
 });
 } finally {
 setIsCreatingConversation(false);
 }
 };

 // Fetch conversations
 useEffect(() => {
 const fetchConversations = async () => {
 if (!user?.id) return;

 // Get conversation IDs where user is a participant
 const { data: participantData } = await supabase
 .from("conversation_participants")
 .select("conversation_id, last_read_at")
 .eq("user_id", user.id);

 if (participantData && participantData.length > 0) {
 const conversationIds = participantData.map((p) => p.conversation_id);

 // Get conversation details
 const { data: convData } = await supabase
 .from("conversations")
 .select("*")
 .in("id", conversationIds)
 .order("last_message_at", { ascending: false });

 // For each conversation, get the other participant's info
 const enrichedConversations = await Promise.all(
 (convData || []).map(async (conv) => {
 const { data: participants } = await supabase
 .from("conversation_participants")
 .select("user_id")
 .eq("conversation_id", conv.id)
 .neq("user_id", user.id);

 let otherUser = null;
 if (participants && participants.length > 0) {
 const { data: profileData } = await supabase
 .from("profiles")
 .select("id, first_name, last_name, avatar_url, role, last_seen")
 .eq("id", participants[0].user_id)
 .single();
 otherUser = profileData;
 if (profileData?.last_seen) {
 setOnlineUsers((prev) => ({ ...prev, [profileData.id]: profileData.last_seen }));
 }
 }

 const myParticipant = participantData.find((p) => p.conversation_id === conv.id);

 return {
 ...conv,
 other_user: otherUser,
 last_read_at: myParticipant?.last_read_at,
 };
 })
 );

 setConversations(enrichedConversations);
 }

 setIsLoading(false);
 };

 fetchConversations();

 // Poll the conversation list instead of holding a realtime channel open
 if (!user?.id) return;
 const timer = setInterval(() => {
 if (!document.hidden) void fetchConversations();
 }, 15000);

 return () => clearInterval(timer);
 }, [user?.id]);

 // Fetch messages for active conversation
 useEffect(() => {
 if (!activeConversation) {
 setMessages([]);
 return;
 }

 const fetchMessages = async () => {
 const { data } = await supabase
 .from("messages")
 .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
 .eq("conversation_id", activeConversation.id)
 .order("created_at", { ascending: true });

 // Enrich with reply_to data
 const enriched = (data || []).map((msg: any) => {
 if (msg.reply_to_id) {
 const repliedMsg = (data || []).find((m: any) => m.id === msg.reply_to_id);
 if (repliedMsg) {
 return { ...msg, reply_to: { id: repliedMsg.id, content: repliedMsg.content, sender: repliedMsg.sender } };
 }
 }
 return msg;
 });

 setMessages(enriched);

 // Mark as read
 await supabase
 .from("conversation_participants")
 .update({ last_read_at: new Date().toISOString() })
 .eq("conversation_id", activeConversation.id)
 .eq("user_id", user?.id);
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
 const seen = new Set(prev.map((m) => m.id));
 const fresh = incoming.filter((m: { id: string }) => !seen.has(m.id));
 return fresh.length ? [...prev, ...fresh] : prev;
 });
 } else if (!lastAt) {
 lastAt = new Date().toISOString();
 }
 };
 const timer = setInterval(() => {
 if (!document.hidden) void tick();
 }, 5000);

 return () => clearInterval(timer);
 }, [activeConversation?.id, user?.id]);

 const sendMessage = async () => {
 if ((!newMessage.trim() && !attachedFile) || !activeConversation || !user?.id) return;

 setIsSending(true);
 const messageContent = newMessage.trim();
 setNewMessage("");
 const currentFile = attachedFile;
 const hadFile = !!attachedFile;
 setAttachedFile(null);
 const replyMsg = replyTo;
 setReplyTo(null);

 // Create optimistic message object to show immediately in UI
 const optimisticMessage = {
 id: `temp-${Date.now()}`,
 conversation_id: activeConversation.id,
 sender_id: user.id,
 content: messageContent,
 message_type: hadFile ? "file" : "text",
 created_at: new Date().toISOString(),
 reply_to_id: replyMsg?.id || null,
 reply_to: replyMsg ? { id: replyMsg.id, content: replyMsg.content, sender: replyMsg.sender } : null,
 sender: {
 id: user.id,
 first_name: profile?.first_name || "",
 last_name: profile?.last_name || "",
 avatar_url: profile?.avatar_url || null,
 },
 };

 // Optimistically add message to UI immediately
 setMessages((prev) => [...prev, optimisticMessage]);

 try {
 // Insert message to database
 const { data: insertedMessage, error: insertError } = await supabase
 .from("messages")
 .insert({
 conversation_id: activeConversation.id,
 sender_id: user.id,
 content: messageContent || (currentFile ? `Sent a file: ${currentFile.name}` : ""),
 message_type: hadFile ? "file" : "text",
 ...(replyMsg?.id ? { reply_to_id: replyMsg.id } : {}),
 ...(currentFile ? {
 file_url: currentFile.url,
 metadata: { file_name: currentFile.name, file_size: currentFile.size, file_type: currentFile.type },
 } : {}),
 })
 .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
 .single();

 if (insertError) {
 console.error("Error sending message:", insertError);
 toast({
 title: "Failed to Send Message",
 description: insertError.message || "Could not send message. Please try again.",
 variant: "destructive",
 });
 // Remove optimistic message on error
 setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
 setNewMessage(messageContent);
 setIsSending(false);
 return;
 }

 // Replace optimistic message with real message from database
 if (insertedMessage) {
 setMessages((prev) =>
 prev.map((m) => (m.id === optimisticMessage.id ? insertedMessage : m))
 );
 }

 // Update conversation metadata
 await supabase
 .from("conversations")
 .update({
 last_message_at: new Date().toISOString(),
 last_message_preview: messageContent.substring(0, 100),
 updated_at: new Date().toISOString(),
 })
 .eq("id", activeConversation.id);

 // Send notification to the other user
 if (activeConversation.other_user?.id) {
 const senderName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
 await sendMessageNotification(
 user.id,
 senderName,
 activeConversation.other_user.id,
 messageContent,
 activeConversation.id
 );
 }
 } catch (error) {
 console.error("Error sending message:", error);
 toast({
 title: "Unexpected Error",
 description: "An unexpected error occurred while sending the message.",
 variant: "destructive",
 });
 // Remove optimistic message on error
 setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
 setNewMessage(messageContent);
 } finally {
 setIsSending(false);
 }
 };

 const formatMessageTime = (dateStr: string) => {
 const date = new Date(dateStr);
 const now = new Date();
 const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

 if (diffDays === 0) {
 return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
 } else if (diffDays === 1) {
 return "Yesterday";
 } else if (diffDays < 7) {
 return date.toLocaleDateString("en-US", { weekday: "short" });
 }
 return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
 };

 const filteredConversations = conversations.filter((c) => {
 if (!searchQuery) return true;
 const otherName = `${c.other_user?.first_name || ""} ${c.other_user?.last_name || ""}`.toLowerCase();
 return otherName.includes(searchQuery.toLowerCase());
 });

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
 className="h-[calc(100vh-12rem)]"
 >
 <motion.div variants={itemVariants} className="mb-6">
 <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
 <p className="text-foreground/60">Connect with mentors and employers.</p>
 </motion.div>

 <motion.div
 variants={itemVariants}
 className="h-[calc(100%-5rem)] rounded-xl bg-background border border-foreground/25 overflow-hidden flex"
 >
 {/* Conversations List */}
 <div className="w-80 border-r border-foreground/25 flex flex-col">
 {/* Search + New Chat */}
 <div className="p-4 border-b border-foreground/25 space-y-3">
 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <input
 type="text"
 placeholder="Search conversations..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-background border border-foreground/25 rounded-lg px-4 py-2 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-foreground"
 />
 </div>
 <Button
 onClick={() => setShowNewChat(!showNewChat)}
 className="bg-foreground/10 hover:bg-foreground/10 rounded-lg px-3 py-2 flex-shrink-0"
 title="New conversation"
 >
 <Plus className="w-4 h-4" />
 </Button>
 </div>

 {/* New Chat User Search */}
 {showNewChat && (
 <div className="bg-background/90 border border-foreground/25 rounded-xl p-3 space-y-3">
 <p className="text-xs ink-vermilion font-medium">Find someone to message</p>
 <input
 type="text"
 placeholder="Search by name..."
 value={userSearchQuery}
 onChange={(e) => setUserSearchQuery(e.target.value)}
 autoFocus
 className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-foreground"
 />
 <div className="max-h-48 overflow-y-auto space-y-1">
 {isSearching && (
 <div className="flex items-center justify-center py-3">
 <Loader2 className="w-4 h-4 animate-spin text-foreground" />
 </div>
 )}
 {!isSearching && searchResults.length === 0 && userSearchQuery.length >= 2 && (
 <p className="text-xs text-foreground/50 text-center py-2">No users found</p>
 )}
 {!isSearching && userSearchQuery.length > 0 && userSearchQuery.length < 2 && (
 <p className="text-xs text-foreground/50 text-center py-2">Type at least 2 characters</p>
 )}
 {searchResults.map((result) => (
 <button
 key={result.id}
 onClick={() => startConversation(result.id)}
 disabled={isCreatingConversation}
 className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/10 transition-colors text-left"
 >
 <div className="w-8 h-8 rounded-full bg-foreground/[0.03] flex items-center justify-center flex-shrink-0">
 {result.avatar_url ? (
 <img src={result.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
 ) : (
 <User className="w-4 h-4 ink-vermilion" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-foreground truncate">
 {result.first_name} {result.last_name}
 </p>
 <p className="text-xs text-foreground/50 capitalize">{result.role}</p>
 </div>
 <Send className="w-3.5 h-3.5 ink-vermilion flex-shrink-0" />
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Conversation List */}
 <div className="flex-1 overflow-y-auto">
 {filteredConversations.length === 0 ? (
 <div className="p-8 text-center">
 <MessageSquare className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No conversations yet</p>
 <p className="text-sm text-foreground/50 mt-1">
 Click the <span className="ink-vermilion">+</span> button to find and message anyone on the platform
 </p>
 </div>
 ) : (
 filteredConversations.map((conv) => {
 const hasUnread = conv.last_message_at && (!conv.last_read_at || new Date(conv.last_message_at) > new Date(conv.last_read_at));

 return (
 <button
 key={conv.id}
 onClick={() => setActiveConversation(conv)}
 className={`w-full p-4 flex items-start gap-3 hover:bg-foreground/5 transition-colors text-left ${
 activeConversation?.id === conv.id ? "bg-foreground/30 border-l-2 border-foreground" : ""
 }`}
 >
 <div className="relative">
 <div className="w-12 h-12 rounded-full bg-foreground/[0.03] flex items-center justify-center flex-shrink-0">
 {conv.other_user?.avatar_url ? (
 <img
 src={conv.other_user.avatar_url}
 alt=""
 className="w-full h-full rounded-full object-cover"
 />
 ) : (
 <User className="w-6 h-6 ink-vermilion" />
 )}
 </div>
 {hasUnread ? (
 <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-foreground/10" />
 ) : (
 <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[conv.other_user?.id]) ? "bg-vermilion/10" : "bg-foreground/10"}`} />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <p className={`font-medium truncate ${hasUnread ? "text-foreground" : "text-foreground/75"}`}>
 {conv.other_user?.first_name} {conv.other_user?.last_name}
 </p>
 <span className="text-xs text-foreground/50">
 {conv.last_message_at ? formatMessageTime(conv.last_message_at) : ""}
 </span>
 </div>
 <p className={`text-sm truncate ${hasUnread ? "text-foreground/75" : "text-foreground/50"}`}>
 {conv.last_message_preview || "No messages yet"}
 </p>
 </div>
 </button>
 );
 })
 )}
 </div>
 </div>

 {/* Chat Area */}
 <div className="flex-1 flex flex-col">
 {activeConversation ? (
 <>
 {/* Chat Header */}
 <div className="p-4 border-b border-foreground/25 flex items-center gap-4">
 <div className="relative">
 <div className="w-10 h-10 rounded-full bg-foreground/[0.03] flex items-center justify-center">
 {activeConversation.other_user?.avatar_url ? (
 <img
 src={activeConversation.other_user.avatar_url}
 alt=""
 className="w-full h-full rounded-full object-cover"
 />
 ) : (
 <User className="w-5 h-5 ink-vermilion" />
 )}
 </div>
 <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? "bg-vermilion/10" : "bg-foreground/10"}`} />
 </div>
 <div>
 <p className="font-medium text-foreground">
 {activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}
 </p>
 <p className="text-xs text-foreground/50">
 {isUserOnline(onlineUsers[activeConversation.other_user?.id]) ? (
 <span className="text-foreground">Online</span>
 ) : (
 <span className="capitalize">{activeConversation.other_user?.role}</span>
 )}
 </p>
 </div>
 </div>

 {/* Messages */}
 <div className="flex-1 overflow-y-auto p-4 space-y-4">
 {messages.map((msg, idx) => {
 const isOwn = msg.sender_id === user?.id;
 const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
 const showActions = activeMsgId === msg.id;

 return (
 <div
 key={msg.id}
 className={`flex ${isOwn ? "justify-end" : "justify-start"} group/msg`}
 onMouseEnter={() => setActiveMsgId(msg.id)}
 onMouseLeave={() => setActiveMsgId(null)}
 >
 <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
 {!isOwn && showAvatar && (
 <div className="w-8 h-8 rounded-full bg-foreground/[0.05] flex items-center justify-center flex-shrink-0">
 {msg.sender?.avatar_url ? (
 <img
 src={msg.sender.avatar_url}
 alt=""
 className="w-full h-full rounded-full object-cover"
 />
 ) : (
 <User className="w-4 h-4 ink-vermilion" />
 )}
 </div>
 )}
 {!isOwn && !showAvatar && <div className="w-8" />}
 <div className="relative">
 {/* Action buttons — visible on hover (desktop) or tap (mobile) */}
 <div className={`flex items-center gap-1 mb-1 transition-opacity duration-150 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"} ${isOwn ? "justify-end" : "justify-start"}`}>
 <button
 onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setActiveMsgId(null); }}
 className="p-1.5 rounded-lg bg-background/80 border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors"
 title="Reply"
 >
 <Reply className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 navigator.clipboard.writeText(msg.content || "");
 toast({ title: "Copied", description: "Message copied to clipboard." });
 }}
 className="p-1.5 rounded-lg bg-background/80 border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors"
 title="Copy"
 >
 <Copy className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Reply quote */}
 {msg.reply_to && (
 <div
 className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 text-xs cursor-pointer ${
 isOwn
 ? "bg-foreground/40 border-foreground/60 text-foreground"
 : "bg-white/5 border-foreground/40 text-foreground/60"
 }`}
 onClick={() => {
 const el = document.getElementById(`msg-${msg.reply_to.id}`);
 if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("ring-2", "ring-indigo-500/50"); setTimeout(() => el.classList.remove("ring-2", "ring-indigo-500/50"), 2000); }
 }}
 >
 <p className="font-medium text-[11px] mb-0.5">
 {msg.reply_to.sender?.first_name || "User"}
 </p>
 <p className="truncate opacity-80">{msg.reply_to.content?.substring(0, 80)}</p>
 </div>
 )}

 <div
 id={`msg-${msg.id}`}
 onClick={() => setActiveMsgId(showActions ? null : msg.id)}
 className={`px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${
 isOwn
 ? "bg-foreground text-background rounded-br-md"
 : "bg-background text-foreground/80 rounded-bl-md"
 }`}
 >
 {msg.content && !msg.content.startsWith("Sent a file:") && (
 <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
 )}
 {msg.file_url && (() => {
 const meta = msg.metadata as Record<string, unknown> | null;
 const fileName = (meta?.file_name as string) || 'Attachment';
 const fileSize = meta?.file_size as number | undefined;
 const fileType = (meta?.file_type as string) || '';
 const isImg = fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(msg.file_url);
 return (
 <div className="mt-1">
 {isImg ? (
 <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
 <img src={msg.file_url} alt={fileName} className="max-w-[280px] rounded-lg border border-foreground/15" />
 </a>
 ) : (
 <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
 className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${
 isOwn ? "border-white/15 bg-white/5 hover:bg-foreground/8" : "border-foreground/25 bg-foreground/30 hover:bg-foreground/50"
 }`}>
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
 isOwn ? "bg-white/10" : "bg-foreground/30"
 }`}>
 <FileText className="w-4 h-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-medium truncate">{fileName}</p>
 {fileSize && <p className="text-[10px] opacity-60">{formatFileSize(fileSize)}</p>}
 </div>
 <Download className="w-4 h-4 opacity-50" />
 </a>
 )}
 </div>
 );
 })()}
 </div>
 <p className={`text-xs text-foreground/50 mt-1 ${isOwn ? "text-right" : ""}`}>
 {formatMessageTime(msg.created_at)}
 </p>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Message Input */}
 <div className="p-4 border-t border-foreground/25">
 {replyTo && (
 <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/10 border border-foreground/25">
 <Reply className="w-4 h-4 ink-vermilion flex-shrink-0" />
 <div className="flex-1 min-w-0 border-l-2 border-foreground/50 pl-2">
 <p className="text-xs font-medium ink-vermilion">{replyTo.sender?.first_name || "User"}</p>
 <p className="text-xs text-foreground/60 truncate">{replyTo.content?.substring(0, 100)}</p>
 </div>
 <button onClick={() => setReplyTo(null)} className="text-foreground/60 hover:text-foreground flex-shrink-0">
 <X className="w-4 h-4" />
 </button>
 </div>
 )}
 {attachedFile && (
 <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/10 border border-foreground/25">
 <Paperclip className="w-4 h-4 ink-vermilion flex-shrink-0" />
 <span className="text-sm ink-vermilion truncate flex-1">{attachedFile.name}</span>
 <span className="text-xs text-foreground/50">{formatFileSize(attachedFile.size)}</span>
 <button onClick={() => setAttachedFile(null)} className="text-foreground/60 hover:text-foreground">
 <X className="w-4 h-4" />
 </button>
 </div>
 )}
 <div className="flex items-center gap-3">
 <input
 type="file"
 ref={fileInputRef}
 onChange={handleFileAttach}
 accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
 className="hidden"
 />
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isProcessingFile}
 className="p-3 rounded-xl border border-foreground/25 text-foreground/60 hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
 title="Attach document (PDF, DOC, DOCX, TXT - max 5MB)"
 >
 {isProcessingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
 </button>
 <div className="flex-1 relative">
 <input
 type="text"
 placeholder="Type a message..."
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter" && !e.shiftKey) {
 e.preventDefault();
 sendMessage();
 }
 }}
 className="w-full bg-background border border-foreground/25 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-foreground"
 />
 </div>
 <Button
 onClick={sendMessage}
 disabled={(!newMessage.trim() && !attachedFile) || isSending}
 className="bg-foreground/10 hover:bg-foreground/10 rounded-xl px-6"
 >
 {isSending ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <Send className="w-5 h-5" />
 )}
 </Button>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex items-center justify-center">
 <div className="text-center">
 <MessageSquare className="w-16 h-16 text-foreground/40 mx-auto mb-4" />
 <h3 className="text-xl font-semibold text-foreground mb-2">Select a Conversation</h3>
 <p className="text-foreground/60 max-w-sm mb-4">
 Choose a conversation from the list or start a new one.
 </p>
 <Button
 onClick={() => setShowNewChat(true)}
 className="bg-foreground/10 hover:bg-foreground/10 rounded-xl px-6"
 >
 <Plus className="w-4 h-4 mr-2" />
 New Conversation
 </Button>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 );
};

// Notifications Page component
const NotificationsPage = () => {
 const { user } = useAuth();
 const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

 useEffect(() => {
 const fetchAllNotifications = async () => {
 if (!user?.id) return;

 let query = supabase
 .from("notifications")
 .select("*")
 .eq("user_id", user.id)
 .order("created_at", { ascending: false })
 .limit(50);

 if (filter === "unread") {
 query = query.eq("is_read", false);
 } else if (filter === "read") {
 query = query.eq("is_read", true);
 }

 const { data } = await query;
 setAllNotifications(data || []);
 setIsLoading(false);
 };

 fetchAllNotifications();
 }, [user?.id, filter]);

 const markAsRead = async (notificationId: string) => {
 await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("id", notificationId);

 setAllNotifications((prev) =>
 prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
 );
 };

 const markAllAsRead = async () => {
 if (!user?.id) return;

 await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("user_id", user.id)
 .eq("is_read", false);

 setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
 };

 const deleteNotification = async (notificationId: string) => {
 await supabase.from("notifications").delete().eq("id", notificationId);
 setAllNotifications((prev) => prev.filter((n) => n.id !== notificationId));
 };

 const getNotificationIcon = (type: string) => {
 switch (type) {
 case "connection_request":
 return Users;
 case "connection_accepted":
 return CheckCircle;
 case "application_accepted":
 return CheckCircle;
 case "endorsement":
 return Award;
 case "passport_issued":
 return Shield;
 case "training_assigned":
 return BookOpen;
 default:
 return Bell;
 }
 };

 const getNotificationColor = (type: string) => {
 switch (type) {
 case "connection_request":
 return "text-foreground bg-foreground/[0.06]";
 case "connection_accepted":
 case "application_accepted":
 return "text-foreground bg-foreground/[0.06]";
 case "endorsement":
 case "passport_issued":
 return "ink-vermilion bg-foreground/[0.06]";
 case "training_assigned":
 return "ink-vermilion bg-vermilion/10";
 default:
 return "text-foreground/60 bg-foreground/20";
 }
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 const unreadCount = allNotifications.filter((n) => !n.is_read).length;

 return (
 <motion.div
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="space-y-8"
 >
 <motion.div variants={itemVariants} className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
 <p className="text-foreground/60">
 Stay updated on your activity.
 {unreadCount > 0 && (
 <span className="ml-2 px-2 py-0.5 rounded-full bg-foreground/20 ink-vermilion text-sm">
 {unreadCount} unread
 </span>
 )}
 </p>
 </div>
 {unreadCount > 0 && (
 <Button
 onClick={markAllAsRead}
 variant="outline"
 className="border-foreground/25 text-foreground hover:bg-foreground/5"
 >
 <CheckCircle className="w-4 h-4 mr-2" />
 Mark all as read
 </Button>
 )}
 </motion.div>

 {/* Filter tabs */}
 <motion.div variants={itemVariants} className="flex gap-2">
 {(["all", "unread", "read"] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
 filter === f
 ? "bg-foreground text-background"
 : "bg-background text-foreground/60 hover:text-background"
 }`}
 >
 {f}
 </button>
 ))}
 </motion.div>

 {/* Notifications List */}
 <motion.div variants={itemVariants} className="space-y-3">
 {allNotifications.length > 0 ? (
 allNotifications.map((notification) => {
 const IconComponent = getNotificationIcon(notification.type);
 const colorClass = getNotificationColor(notification.type);

 return (
 <motion.div
 key={notification.id}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className={`p-4 rounded-xl border transition-colors ${
 notification.is_read
 ? "bg-background border-foreground/25"
 : "bg-foreground/[0.04] border-foreground/25"
 }`}
 >
 <div className="flex items-start gap-4">
 <div className={`p-2 rounded-lg ${colorClass}`}>
 <IconComponent className="w-5 h-5" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className={`font-medium ${notification.is_read ? "text-foreground/75" : "text-foreground"}`}>
 {notification.title}
 </p>
 <p className="text-sm text-foreground/60 mt-1">{notification.message}</p>
 </div>
 {!notification.is_read && (
 <div className="w-2 h-2 rounded-full bg-foreground/10 flex-shrink-0 mt-2" />
 )}
 </div>
 <div className="flex items-center gap-4 mt-3">
 <span className="text-xs text-foreground/50">
 {new Date(notification.created_at).toLocaleString()}
 </span>
 <div className="flex gap-2">
 {!notification.is_read && (
 <button
 onClick={() => markAsRead(notification.id)}
 className="text-xs ink-vermilion hover:ink-vermilion"
 >
 Mark as read
 </button>
 )}
 <button
 onClick={() => deleteNotification(notification.id)}
 className="text-xs ink-vermilion hover:ink-vermilion"
 >
 Delete
 </button>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 );
 })
 ) : (
 <div className="p-12 rounded-2xl bg-background border border-foreground/25 text-center">
 <Bell className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
 <p className="text-foreground/60">No notifications</p>
 <p className="text-sm text-foreground/50 mt-1">
 {filter === "unread"
 ? "You're all caught up!"
 : filter === "read"
 ? "No read notifications yet"
 : "Notifications will appear here"}
 </p>
 </div>
 )}
 </motion.div>
 </motion.div>
 );
};

const CANDIDATE_SECTIONS: import("@/components/dashboard/DashboardLayout").DashboardSection[] = [
 { id: "observation", label: "§ I · Observation Platform" },
 { id: "preparation", label: "§ II · Preparation", chip: { text: "Self-directed" } },
 { id: "liveworks", label: "§ III · LiveWorks" },
 { id: "account", label: "§ IV · Account" },
];

const CandidateDashboard = () => {
 const { user } = useAuth();
 const [notifications, setNotifications] = useState<Notification[]>([]);
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
 setNotifications(data || []);
 };
 fetchNotifications();
 const timer = setInterval(() => {
 if (!document.hidden) void fetchNotifications();
 }, 15000);
 return () => clearInterval(timer);
 }, [user?.id]);

 const markAsRead = async (notificationId: string) => {
 await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
 setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
 };

 const markAllAsRead = async () => {
 if (!user?.id) return;
 await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("user_id", user.id)
 .eq("is_read", false);
 setNotifications([]);
 };

 const navWithBadges = navItems.map((n) =>
 n.name === "Messages" ? { ...n, badge: unreadMessageCount } : n
 );

 return (
 <DashboardLayout
 role="Individual"
 roleTagline="Your record of observed conduct — the register kept in your name."
 nav={navWithBadges}
 sections={CANDIDATE_SECTIONS}
 notifications={notifications}
 onMarkNotificationRead={markAsRead}
 onMarkAllRead={markAllAsRead}
 notificationsHref="/dashboard/candidate/notifications"
 >
 <Routes>
 <Route index element={<Overview />} />
 <Route path="observations" element={<ObservationPathway />} />
 <Route path="observations/session" element={<InteractiveSkillAssessment />} />
 <Route path="passport" element={<SkillPassport />} />
 <Route path="report-review" element={<ReportReview />} />
 <Route path="growth" element={<GrowthLog />} />
 <Route path="assessment" element={<SelfAssessmentPage />} />
 <Route path="assessment/interactive" element={<AssessmentViewer />} />
 <Route path="training" element={<Training />} />
 <Route path="training/module/:moduleId" element={<TrainingModuleViewer />} />
 <Route path="projects" element={<Projects />} />
 <Route path="mentors" element={<FindMentor />} />
 <Route path="connections" element={<Connections />} />
 <Route path="messages" element={<MessagesPage />} />
 <Route path="notifications" element={<NotificationsPage />} />
 <Route path="profile" element={<Profile />} />
 <Route path="agent" element={<AIAgent />} />
 <Route path="settings" element={<SettingsPage />} />
 </Routes>
 </DashboardLayout>
 );
};

// ─── LEGACY SHELL BELOW: intentionally unreachable; kept for reference until removal.

export default CandidateDashboard;
