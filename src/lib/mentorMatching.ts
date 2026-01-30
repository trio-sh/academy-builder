import { supabase } from "./supabase";
import type { Database } from "@/types/database.types";

type MentorProfile = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type CandidateProfile = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Mentor with full profile data
export interface MentorWithProfile extends MentorProfile {
  profile: Profile;
}

// Match score breakdown
export interface MatchScore {
  total: number;
  skillMatch: number;
  industryMatch: number;
  availabilityScore: number;
  experienceScore: number;
  ratingScore: number;
}

// Mentor match result
export interface MentorMatch {
  mentor: MentorWithProfile;
  score: MatchScore;
  matchReasons: string[];
  compatibilityLevel: "excellent" | "good" | "fair" | "low";
}

// Industry categories for matching
const INDUSTRY_GROUPS: Record<string, string[]> = {
  tech: [
    "technology",
    "software",
    "it",
    "engineering",
    "data science",
    "cybersecurity",
    "ai",
    "machine learning",
  ],
  business: [
    "finance",
    "accounting",
    "consulting",
    "banking",
    "investment",
    "business",
    "management",
  ],
  creative: [
    "design",
    "marketing",
    "advertising",
    "media",
    "entertainment",
    "content",
    "creative",
  ],
  healthcare: [
    "healthcare",
    "medical",
    "pharmaceutical",
    "biotech",
    "nursing",
    "health",
  ],
  education: [
    "education",
    "teaching",
    "training",
    "academic",
    "research",
    "learning",
  ],
  manufacturing: [
    "manufacturing",
    "production",
    "operations",
    "supply chain",
    "logistics",
    "industrial",
  ],
};

// Skill categories for matching
const SKILL_CATEGORIES: Record<string, string[]> = {
  programming: [
    "javascript",
    "typescript",
    "python",
    "java",
    "c++",
    "c#",
    "ruby",
    "go",
    "rust",
    "php",
    "swift",
    "kotlin",
    "scala",
  ],
  frontend: [
    "react",
    "vue",
    "angular",
    "svelte",
    "html",
    "css",
    "sass",
    "tailwind",
    "bootstrap",
    "next.js",
  ],
  backend: [
    "node.js",
    "express",
    "django",
    "flask",
    "spring",
    "rails",
    "laravel",
    "fastapi",
    "graphql",
  ],
  data: [
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "data science",
    "machine learning",
    "analytics",
  ],
  cloud: [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "devops",
    "ci/cd",
    "terraform",
  ],
  design: [
    "figma",
    "sketch",
    "adobe xd",
    "photoshop",
    "illustrator",
    "ui/ux",
    "user research",
  ],
  business: [
    "project management",
    "agile",
    "scrum",
    "product management",
    "marketing",
    "sales",
    "strategy",
  ],
  soft_skills: [
    "communication",
    "leadership",
    "teamwork",
    "problem solving",
    "critical thinking",
    "time management",
  ],
};

/**
 * Calculate skill match score between candidate and mentor
 */
function calculateSkillMatch(
  candidateSkills: string[],
  mentorSpecializations: string[]
): { score: number; matchedSkills: string[] } {
  if (!candidateSkills?.length || !mentorSpecializations?.length) {
    return { score: 0, matchedSkills: [] };
  }

  const normalizedCandidateSkills = candidateSkills.map((s) => s.toLowerCase().trim());
  const normalizedMentorSpecs = mentorSpecializations.map((s) => s.toLowerCase().trim());

  // Direct matches
  const directMatches = normalizedCandidateSkills.filter((skill) =>
    normalizedMentorSpecs.some(
      (spec) => spec.includes(skill) || skill.includes(spec)
    )
  );

  // Category-based matches
  const candidateCategories = new Set<string>();
  const mentorCategories = new Set<string>();

  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (
      normalizedCandidateSkills.some((s) =>
        skills.some((skill) => s.includes(skill) || skill.includes(s))
      )
    ) {
      candidateCategories.add(category);
    }
    if (
      normalizedMentorSpecs.some((s) =>
        skills.some((skill) => s.includes(skill) || skill.includes(s))
      )
    ) {
      mentorCategories.add(category);
    }
  }

  const categoryMatches = [...candidateCategories].filter((c) =>
    mentorCategories.has(c)
  );

  // Calculate score (0-100)
  const directMatchScore =
    directMatches.length > 0
      ? Math.min((directMatches.length / normalizedCandidateSkills.length) * 60, 60)
      : 0;

  const categoryMatchScore =
    categoryMatches.length > 0
      ? Math.min((categoryMatches.length / Math.max(candidateCategories.size, 1)) * 40, 40)
      : 0;

  return {
    score: Math.round(directMatchScore + categoryMatchScore),
    matchedSkills: directMatches,
  };
}

/**
 * Calculate industry match score
 */
function calculateIndustryMatch(
  candidateIndustry: string | null | undefined,
  mentorIndustry: string
): number {
  if (!candidateIndustry) return 50; // Neutral if candidate hasn't specified

  const normalizedCandidate = candidateIndustry.toLowerCase();
  const normalizedMentor = mentorIndustry.toLowerCase();

  // Direct match
  if (
    normalizedCandidate.includes(normalizedMentor) ||
    normalizedMentor.includes(normalizedCandidate)
  ) {
    return 100;
  }

  // Category match
  for (const industries of Object.values(INDUSTRY_GROUPS)) {
    const candidateInGroup = industries.some((i) =>
      normalizedCandidate.includes(i)
    );
    const mentorInGroup = industries.some((i) => normalizedMentor.includes(i));
    if (candidateInGroup && mentorInGroup) {
      return 75;
    }
  }

  return 25; // Different industries
}

/**
 * Calculate availability score
 */
function calculateAvailabilityScore(mentor: MentorProfile): number {
  if (!mentor.is_accepting) return 0;

  const availableSlots = mentor.max_mentees - mentor.current_mentees;
  if (availableSlots <= 0) return 0;

  // More available slots = higher score
  const slotsRatio = availableSlots / mentor.max_mentees;
  return Math.round(slotsRatio * 100);
}

/**
 * Calculate experience score
 */
function calculateExperienceScore(yearsExperience: number): number {
  // Optimal experience is 5-15 years
  if (yearsExperience >= 5 && yearsExperience <= 15) return 100;
  if (yearsExperience >= 3 && yearsExperience < 5) return 80;
  if (yearsExperience > 15 && yearsExperience <= 25) return 85;
  if (yearsExperience > 25) return 70;
  if (yearsExperience >= 1 && yearsExperience < 3) return 60;
  return 40;
}

/**
 * Calculate rating score
 */
function calculateRatingScore(
  avgRating: number | null,
  totalObservations: number,
  totalEndorsements: number
): number {
  let score = 50; // Base score

  // Rating component (0-40 points)
  if (avgRating) {
    score += (avgRating / 5) * 40;
  }

  // Experience component (0-10 points based on observations/endorsements)
  const experiencePoints = Math.min(
    (totalObservations + totalEndorsements) / 10,
    10
  );
  score += experiencePoints;

  return Math.round(Math.min(score, 100));
}

/**
 * Determine compatibility level based on total score
 */
function getCompatibilityLevel(
  score: number
): "excellent" | "good" | "fair" | "low" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "low";
}

/**
 * Generate match reasons based on score breakdown
 */
function generateMatchReasons(
  mentor: MentorWithProfile,
  score: MatchScore,
  matchedSkills: string[]
): string[] {
  const reasons: string[] = [];

  if (score.skillMatch >= 70) {
    reasons.push(`Strong skill alignment (${matchedSkills.slice(0, 3).join(", ")})`);
  } else if (score.skillMatch >= 40) {
    reasons.push("Related skill background");
  }

  if (score.industryMatch >= 75) {
    reasons.push(`Industry expertise in ${mentor.industry}`);
  }

  if (score.availabilityScore >= 70) {
    reasons.push("Highly available for new mentees");
  }

  if (score.experienceScore >= 80) {
    reasons.push(`${mentor.years_experience}+ years of experience`);
  }

  if (mentor.avg_rating && mentor.avg_rating >= 4.5) {
    reasons.push(`Highly rated (${mentor.avg_rating.toFixed(1)} stars)`);
  }

  if (mentor.total_endorsements >= 5) {
    reasons.push(`${mentor.total_endorsements} successful endorsements`);
  }

  return reasons;
}

/**
 * Main matching function - finds best mentor matches for a candidate
 */
export async function findMentorMatches(
  candidateId: string,
  limit: number = 10
): Promise<MentorMatch[]> {
  // Fetch candidate profile
  const { data: candidateData } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("profile_id", candidateId)
    .single();

  if (!candidateData) {
    return [];
  }

  // Fetch candidate's profile for industry info
  const { data: candidateProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", candidateId)
    .single();

  // Fetch all available mentors
  const { data: mentors } = await supabase
    .from("mentor_profiles")
    .select(
      `
      *,
      profile:profiles(*)
    `
    )
    .eq("is_accepting", true)
    .gt("max_mentees", supabase.rpc("current_mentees_placeholder")); // Will filter in JS

  if (!mentors || mentors.length === 0) {
    // Try fetching without the complex filter
    const { data: allMentors } = await supabase
      .from("mentor_profiles")
      .select(
        `
        *,
        profile:profiles(*)
      `
      )
      .eq("is_accepting", true);

    if (!allMentors) return [];

    // Filter to available mentors
    const availableMentors = allMentors.filter(
      (m) => m.current_mentees < m.max_mentees
    );

    return scoreMentors(
      availableMentors as unknown as MentorWithProfile[],
      candidateData,
      candidateProfile?.headline || null,
      limit
    );
  }

  return scoreMentors(
    mentors as unknown as MentorWithProfile[],
    candidateData,
    candidateProfile?.headline || null,
    limit
  );
}

/**
 * Score and rank mentors for a candidate
 */
function scoreMentors(
  mentors: MentorWithProfile[],
  candidate: CandidateProfile,
  candidateIndustry: string | null,
  limit: number
): MentorMatch[] {
  const matches: MentorMatch[] = [];

  for (const mentor of mentors) {
    const { score: skillScore, matchedSkills } = calculateSkillMatch(
      candidate.skills || [],
      mentor.specializations || []
    );

    const industryScore = calculateIndustryMatch(candidateIndustry, mentor.industry);
    const availabilityScore = calculateAvailabilityScore(mentor);
    const experienceScore = calculateExperienceScore(mentor.years_experience);
    const ratingScore = calculateRatingScore(
      mentor.avg_rating,
      mentor.total_observations,
      mentor.total_endorsements
    );

    // Weighted total score
    const totalScore =
      skillScore * 0.35 +
      industryScore * 0.2 +
      availabilityScore * 0.15 +
      experienceScore * 0.15 +
      ratingScore * 0.15;

    const score: MatchScore = {
      total: Math.round(totalScore),
      skillMatch: skillScore,
      industryMatch: industryScore,
      availabilityScore,
      experienceScore,
      ratingScore,
    };

    const matchReasons = generateMatchReasons(mentor, score, matchedSkills);

    matches.push({
      mentor,
      score,
      matchReasons,
      compatibilityLevel: getCompatibilityLevel(score.total),
    });
  }

  // Sort by total score descending
  matches.sort((a, b) => b.score.total - a.score.total);

  return matches.slice(0, limit);
}

/**
 * Get recommended mentors with simple algorithm (for quick matches)
 */
export async function getQuickMentorRecommendations(
  candidateSkills: string[],
  limit: number = 5
): Promise<MentorWithProfile[]> {
  const { data: mentors } = await supabase
    .from("mentor_profiles")
    .select(
      `
      *,
      profile:profiles(*)
    `
    )
    .eq("is_accepting", true)
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .limit(20);

  if (!mentors) return [];

  // Filter to available mentors
  const availableMentors = (mentors as unknown as MentorWithProfile[]).filter(
    (m) => m.current_mentees < m.max_mentees
  );

  // Score based on skill match
  const scored = availableMentors.map((mentor) => {
    const { score } = calculateSkillMatch(
      candidateSkills,
      mentor.specializations || []
    );
    return { mentor, score };
  });

  // Sort and return top matches
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.mentor);
}

/**
 * Check if a specific mentor is a good match for a candidate
 */
export async function checkMentorCompatibility(
  candidateId: string,
  mentorProfileId: string
): Promise<MentorMatch | null> {
  const matches = await findMentorMatches(candidateId, 100);
  return matches.find((m) => m.mentor.profile_id === mentorProfileId) || null;
}

export const MentorMatchingService = {
  findMentorMatches,
  getQuickMentorRecommendations,
  checkMentorCompatibility,
  calculateSkillMatch,
  calculateIndustryMatch,
};

export default MentorMatchingService;
