import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";
import type { Database } from "@/types/database.types";
import { CheckCircle, XCircle, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

type SkillPassport = Database["public"]["Tables"]["skill_passports"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];

// T3A 14 behavioural dimensions
const T3A_DIMENSIONS: Record<string, { label: string }> = {
  integrity_ethics: { label: "Integrity & Ethics" },
  accountability_ownership: { label: "Accountability & Ownership" },
  execution_reliability: { label: "Execution Reliability" },
  communication_pressure: { label: "Communication Under Pressure" },
  collaboration_conflict: { label: "Collaboration & Conflict Resolution" },
  resilience_recovery: { label: "Resilience & Recovery" },
  learning_agility: { label: "Learning Agility" },
  workplace_adaptability: { label: "Workplace Adaptability" },
  prioritization_time: { label: "Prioritization & Time Management" },
  professional_boundaries: { label: "Professional Boundaries" },
  creative_problem_solving: { label: "Creative Problem-Solving" },
  customer_service_focus: { label: "Customer & Service Focus" },
  influence_persuasion: { label: "Influence & Persuasion" },
  relationship_building: { label: "Relationship Building" },
};

const barsLabel = (score: number) => {
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Competent";
  if (score >= 1.5) return "Emerging";
  return "Not yet demonstrated";
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
        const now = new Date();
        const expiresAt = passportData.expires_at ? new Date(passportData.expires_at) : null;
        setIsValid((passportData.is_active ?? false) && (!expiresAt || expiresAt > now));

        const { data: candidateData } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("id", passportData.candidate_id)
          .single();
        if (candidateData) {
          setCandidateProfile(candidateData);
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", candidateData.profile_id)
            .single();
          if (profileData) setProfile(profileData);
        }
      } catch (err) {
        console.error("Error verifying:", err);
        setError("An error occurred while verifying the report");
      } finally {
        setIsLoading(false);
      }
    };
    verifyPassport();
  }, [code]);

  const behavioralScores = (passport?.behavioral_scores || {}) as Record<string, number>;
  const scoredDimensions = Object.entries(behavioralScores).filter(([, v]) => v > 0);
  const avgScore =
    scoredDimensions.length > 0
      ? scoredDimensions.reduce((a, [, b]) => a + b, 0) / scoredDimensions.length
      : 0;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="paper-grain min-h-[80vh] pt-40 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground mb-4" />
          <p className="mono-label text-foreground/60">Retrieving from the register…</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !passport) {
    return (
      <PublicLayout>
        <div className="paper-grain min-h-[80vh] pt-40 flex flex-col items-center justify-center px-6">
          <XCircle className="w-14 h-14 text-foreground mb-6" />
          <div className="mono-label text-foreground/60 mb-3">§ Not in the register</div>
          <h1 className="display-serif text-5xl md:text-6xl text-foreground leading-[0.95] mb-8 text-center">
            Verification <span className="italic display-serif-italic ink-vermilion">failed.</span>
          </h1>
          <p className="text-foreground/70 mb-8 max-w-lg text-center leading-relaxed">
            {error || "This Behavioral Evidence Report could not be verified. The code may be invalid, expired, or withdrawn by the bearer."}
          </p>
          <Link to="/">
            <Button variant="outline" className="border-foreground/30 text-foreground rounded-none hover:bg-foreground/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return home
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="paper-grain pt-40 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          {/* Verification banner — like a signed certificate stamp */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={
              "flex items-center gap-4 border-2 p-5 mb-12 " +
              (isValid ? "border-foreground bg-foreground/[0.03]" : "border-foreground/40")
            }
          >
            {isValid ? (
              <>
                <CheckCircle className="w-10 h-10 text-foreground" />
                <div>
                  <div className="display-serif text-2xl text-foreground leading-tight">
                    Verified · in good standing
                  </div>
                  <div className="mono-label text-foreground/60 mt-1">
                    Cross-referenced with the register on {new Date().toLocaleDateString()}
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-foreground" />
                <div>
                  <div className="display-serif text-2xl text-foreground leading-tight">
                    Expired or withdrawn
                  </div>
                  <div className="mono-label text-foreground/60 mt-1">
                    This report is no longer active in the register
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Certificate header */}
          <div className="mono-label text-foreground/60 mb-4">
            § Certificate of Behavioural Evidence · Ref. {passport.verification_code}
          </div>
          <h1 className="display-serif text-[3rem] md:text-[5rem] text-foreground leading-[0.95] mb-8">
            {profile?.first_name} <br />
            <span className="italic display-serif-italic">{profile?.last_name}</span>
          </h1>
          <p className="text-xl text-foreground/85 italic display-serif-italic leading-snug mb-10 border-l-2 border-foreground pl-6">
            {profile?.headline || "Bearer of a current Behavioral Evidence Report."}
          </p>

          {/* Metadata table */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-b border-foreground py-8 mb-16">
            <div>
              <dt className="mono-label text-foreground/60 mb-2">Readiness tier</dt>
              <dd className="display-serif text-2xl text-foreground capitalize">
                {passport.readiness_tier || "—"}
              </dd>
            </div>
            <div>
              <dt className="mono-label text-foreground/60 mb-2">Dimensions observed</dt>
              <dd className="ledger-num text-3xl text-foreground">{scoredDimensions.length}</dd>
            </div>
            <div>
              <dt className="mono-label text-foreground/60 mb-2">Issued</dt>
              <dd className="text-foreground text-lg">
                {passport.issued_at ? new Date(passport.issued_at).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="mono-label text-foreground/60 mb-2">Expires</dt>
              <dd className="text-foreground text-lg">
                {passport.expires_at ? new Date(passport.expires_at).toLocaleDateString() : "Never"}
              </dd>
            </div>
          </dl>

          {/* Behavioural readings */}
          <div className="mono-label text-foreground/60 mb-4">
            § Behavioural readings · BARS 4-point scale
          </div>
          <div className="border-t-2 border-foreground mb-10">
            {scoredDimensions.map(([dimId, score]) => {
              const dim = T3A_DIMENSIONS[dimId];
              if (!dim) return null;
              const pct = (score / 4) * 100;
              return (
                <div key={dimId} className="grid grid-cols-12 gap-4 py-4 border-b border-foreground/20 items-center">
                  <div className="col-span-6 md:col-span-5">
                    <div className="display-serif text-lg text-foreground">{dim.label}</div>
                    <div className="mono-label text-foreground/50 mt-1">{barsLabel(score)}</div>
                  </div>
                  <div className="col-span-4 md:col-span-6">
                    <div className="h-[2px] bg-foreground/15 relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1 text-right ledger-num text-xl text-foreground">
                    {score.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall summary */}
          <div className="border-2 border-foreground p-6 mb-14 flex items-center justify-between">
            <div>
              <div className="mono-label text-foreground/60 mb-1">Overall behavioural readiness</div>
              <div className="display-serif text-3xl text-foreground">{barsLabel(avgScore)}</div>
            </div>
            <div className="ledger-num text-6xl text-foreground">{avgScore.toFixed(1)}</div>
          </div>

          {/* Colophon */}
          <div className="mono-label text-foreground/50 text-center border-t border-foreground/25 pt-6">
            Verification code: <span className="text-foreground normal-case tracking-widest">{passport.verification_code}</span>
            <br />
            This page serves as the register's official confirmation of the above entry.
          </div>

          <div className="mt-10 text-center">
            <Link to="/">
              <Button variant="outline" className="border-foreground/30 text-foreground rounded-none hover:bg-foreground/5 px-6 py-5">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to The 3rd Academy
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default VerifyPassport;
