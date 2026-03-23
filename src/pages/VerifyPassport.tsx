import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
import {
  Shield,
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

type SkillPassport = Database["public"]["Tables"]["skill_passports"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];

// T3A 14 Behavioral Dimensions
const T3A_DIMENSIONS: Record<string, { label: string; color: string }> = {
  integrity_ethics: { label: "Integrity & Ethics", color: "from-emerald-500 to-teal-500" },
  accountability_ownership: { label: "Accountability & Ownership", color: "from-blue-500 to-indigo-500" },
  execution_reliability: { label: "Execution Reliability", color: "from-violet-500 to-purple-500" },
  communication_pressure: { label: "Communication Under Pressure", color: "from-sky-500 to-blue-500" },
  collaboration_conflict: { label: "Collaboration & Conflict Resolution", color: "from-pink-500 to-rose-500" },
  resilience_recovery: { label: "Resilience & Recovery", color: "from-red-500 to-rose-500" },
  learning_agility: { label: "Learning Agility", color: "from-cyan-500 to-sky-500" },
  workplace_adaptability: { label: "Workplace Adaptability", color: "from-amber-500 to-orange-500" },
  prioritization_time: { label: "Prioritization & Time Management", color: "from-lime-500 to-green-500" },
  professional_boundaries: { label: "Professional Boundaries", color: "from-slate-500 to-gray-500" },
  creative_problem_solving: { label: "Creative Problem-Solving", color: "from-purple-500 to-pink-500" },
  customer_service_focus: { label: "Customer & Service Focus", color: "from-teal-500 to-emerald-500" },
  influence_persuasion: { label: "Influence & Persuasion", color: "from-orange-500 to-amber-500" },
  relationship_building: { label: "Relationship Building", color: "from-indigo-500 to-violet-500" },
};

const getBarsLabel = (score: number) => {
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Competent";
  if (score >= 1.5) return "Emerging";
  return "Not Yet Demonstrated";
};

const getBarsColor = (score: number) => {
  if (score >= 3.5) return "text-emerald-400";
  if (score >= 2.5) return "text-blue-400";
  if (score >= 1.5) return "text-amber-400";
  return "text-orange-400";
};

const VerifyPassport = () => {
  const { code } = useParams<{ code: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPassport = async () => {
      if (!code) {
        setError("No verification code provided");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch passport by verification code
        const { data: passportData, error: passportError } = await supabase
          .from("skill_passports")
          .select("*")
          .eq("verification_code", code)
          .single();

        if (passportError || !passportData) {
          setError("Invalid verification code");
          setIsLoading(false);
          return;
        }

        setPassport(passportData);

        // Check if passport is active and not expired
        const now = new Date();
        const expiresAt = passportData.expires_at ? new Date(passportData.expires_at) : null;
        setIsValid((passportData.is_active ?? false) && (!expiresAt || expiresAt > now));

        // candidate_id in skill_passports = candidate_profiles.id
        const { data: candidateData } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("id", passportData.candidate_id)
          .single();

        if (candidateData) {
          setCandidateProfile(candidateData);
          // Get profiles data via profile_id
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", candidateData.profile_id)
            .single();
          if (profileData) setProfile(profileData);
        }
      } catch (err) {
        console.error("Error verifying passport:", err);
        setError("An error occurred while verifying the passport");
      } finally {
        setIsLoading(false);
      }
    };

    verifyPassport();
  }, [code]);

  const getTierInfo = (tier: string | null) => {
    const labels: Record<string, { label: string; color: string }> = {
      silver: { label: "Silver", color: "text-gray-300" },
      gold: { label: "Gold", color: "text-amber-400" },
      platinum: { label: "Platinum", color: "text-emerald-400" },
    };
    return labels[tier || "silver"] || { label: tier || "Unknown", color: "text-gray-400" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Verifying Skill Passport...</p>
        </div>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
          <p className="text-gray-400 mb-6">{error || "This Skill Passport could not be verified."}</p>
          <Link to="/">
            <Button variant="outline" className="border-white/20 text-white hover:bg-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const behavioralScores = (passport.behavioral_scores || {}) as Record<string, number>;
  const scoredDimensions = Object.entries(behavioralScores).filter(([, v]) => v > 0);
  const tierInfo = getTierInfo(passport.readiness_tier);
  const avgScore = scoredDimensions.length > 0
    ? scoredDimensions.reduce((a, [, b]) => a + b, 0) / scoredDimensions.length
    : 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Logo" className="w-8 h-8 rounded-full" />
            <span className="font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              The 3rd Academy
            </span>
          </Link>
          <span className="text-sm text-gray-500">Skill Passport Verification</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Verification Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-8 flex items-center gap-4 ${
            isValid
              ? "bg-emerald-500/10 border border-emerald-500/30"
              : "bg-amber-500/10 border border-amber-500/30"
          }`}
        >
          {isValid ? (
            <>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-400">Verified Skill Passport</p>
                <p className="text-sm text-gray-400">This credential has been verified and is currently active.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-400">Expired or Inactive</p>
                <p className="text-sm text-gray-400">This Skill Passport has expired or been deactivated.</p>
              </div>
            </>
          )}
        </motion.div>

        {/* Candidate Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 mb-8"
        >
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-emerald-400 font-medium">{profile?.headline || "Behavioral Readiness Credential Holder"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium text-sm">Verified</span>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-black/30">
              <p className="text-sm text-gray-400 mb-1">Readiness Tier</p>
              <p className={`text-lg font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/30">
              <p className="text-sm text-gray-400 mb-1">Dimensions Observed</p>
              <p className="text-lg font-bold text-white">{scoredDimensions.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/30">
              <p className="text-sm text-gray-400 mb-1">Issued</p>
              <p className="text-lg font-bold text-white">
                {passport.issued_at ? new Date(passport.issued_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-black/30">
              <p className="text-sm text-gray-400 mb-1">Expires</p>
              <p className="text-lg font-bold text-white">
                {passport.expires_at ? new Date(passport.expires_at).toLocaleDateString() : "Never"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Behavioral Scores — T3A Dimensions with BARS 1-4 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            Behavioral Assessment (BARS 4-Point Scale)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {scoredDimensions.map(([dimId, score]) => {
              const dim = T3A_DIMENSIONS[dimId];
              if (!dim) return null;
              const percentage = (score / 4) * 100;

              return (
                <div key={dimId} className="p-4 rounded-xl bg-black border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{dim.label}</span>
                    <span className={`text-lg font-bold ${getBarsColor(score)}`}>{score.toFixed(1)}/4</span>
                  </div>
                  <p className={`text-xs mb-2 ${getBarsColor(score)}`}>{getBarsLabel(score)}</p>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${dim.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Overall Behavioral Readiness</p>
              <p className={`text-3xl font-bold ${getBarsColor(avgScore)}`}>{avgScore.toFixed(1)}/4</p>
              <p className={`text-sm ${getBarsColor(avgScore)}`}>{getBarsLabel(avgScore)}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Award className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Verification Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl bg-black border border-white/10 text-center"
        >
          <p className="text-sm text-gray-400 mb-1">Verification Code</p>
          <p className="text-lg font-mono font-bold text-white tracking-wider">
            {passport.verification_code}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            This page serves as official verification of the above Skill Passport.
          </p>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="outline" className="border-white/20 text-white hover:bg-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to The 3rd Academy
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VerifyPassport;
