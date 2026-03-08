// Resume Enhancer AI Service
// Uses the same a0.dev LLM API as the chatbot to analyze resumes
// Creates a Basic Profile (non-credentialed) and identifies observation areas

const LLM_API_URL = "https://api.a0.dev/ai/llm";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  completion: string;
}

export interface ResumeEnhancerResult {
  summary: string;
  strengthAreas: string[];
  observationDimensions: string[];
  dimensionRationale: Record<string, string>;
  suggestedSkills: string[];
  experienceLevel: "entry" | "mid" | "senior" | "executive";
  industryFocus: string[];
}

const BEHAVIORAL_DIMENSIONS = [
  "integrity_ethics",
  "accountability_ownership",
  "execution_reliability",
  "communication_pressure",
  "collaboration_conflict",
  "adaptability_change",
  "initiative_drive",
  "problem_solving_judgment",
  "attention_to_detail",
  "resilience_composure",
  "customer_orientation",
  "learning_agility",
  "leadership_influence",
  "cultural_awareness",
];

const MVP_DIMENSIONS = [
  "integrity_ethics",
  "accountability_ownership",
  "execution_reliability",
  "communication_pressure",
  "collaboration_conflict",
];

const RESUME_ENHANCER_SYSTEM = `You are The 3rd Academy's Resume Enhancer AI. You analyze candidate resumes to create a Basic Profile (non-credentialed) and identify behavioral observation areas for mentor assessment.

Your task:
1. Summarize the candidate's professional background in 2-3 sentences
2. Identify their key strength areas from the resume
3. Determine which of the 5 MVP behavioral dimensions are MOST relevant for observation based on their experience:
   - integrity_ethics: Ethical decision-making, honesty, transparency
   - accountability_ownership: Taking responsibility, follow-through, ownership of outcomes
   - execution_reliability: Delivering on commitments, meeting deadlines, consistent output
   - communication_pressure: Communicating clearly under stress, difficult conversations
   - collaboration_conflict: Working in teams, resolving disagreements, building consensus
4. For each selected dimension, explain WHY it's relevant based on the resume
5. Suggest any additional skills not explicitly mentioned but implied by their experience
6. Assess experience level: entry (0-2 yrs), mid (3-6 yrs), senior (7-12 yrs), executive (13+ yrs)
7. Identify their industry focus areas

IMPORTANT: Always include ALL 5 MVP dimensions in observationDimensions — but rank them by relevance. The rationale should explain what in the resume connects to each dimension.

Return ONLY valid JSON in this exact format:
{
  "summary": "<2-3 sentence professional summary>",
  "strengthAreas": ["<area 1>", "<area 2>", ...],
  "observationDimensions": ["integrity_ethics", "accountability_ownership", "execution_reliability", "communication_pressure", "collaboration_conflict"],
  "dimensionRationale": {
    "integrity_ethics": "<why this dimension is relevant based on resume>",
    "accountability_ownership": "<why>",
    "execution_reliability": "<why>",
    "communication_pressure": "<why>",
    "collaboration_conflict": "<why>"
  },
  "suggestedSkills": ["<skill 1>", "<skill 2>", ...],
  "experienceLevel": "entry|mid|senior|executive",
  "industryFocus": ["<industry 1>", "<industry 2>"]
}`;

async function callLLM(messages: LLMMessage[], temperature: number = 0.3): Promise<string> {
  const response = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data: LLMResponse = await response.json();
  return data.completion || "";
}

/**
 * Analyze a resume using AI and return structured profile data
 * Falls back to default dimensions if AI fails
 */
export async function analyzeResume(resumeText: string): Promise<ResumeEnhancerResult> {
  // If resume text is too short or empty, return defaults
  if (!resumeText || resumeText.trim().length < 50) {
    return getDefaultResult("Resume text too short for AI analysis.");
  }

  try {
    // Truncate very long resumes to avoid token limits
    const truncatedText = resumeText.length > 4000
      ? resumeText.substring(0, 4000) + "\n[Resume truncated for analysis...]"
      : resumeText;

    const completion = await callLLM([
      { role: "system", content: RESUME_ENHANCER_SYSTEM },
      { role: "user", content: `Analyze this resume and create a Basic Profile:\n\n${truncatedText}` },
    ]);

    // Parse the JSON response
    const jsonMatch = completion.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Resume Enhancer: Could not parse JSON from LLM response");
      return getDefaultResult("AI analysis completed but output format was unexpected.");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ResumeEnhancerResult;

    // Validate and ensure all MVP dimensions are present
    const validDimensions = (parsed.observationDimensions || []).filter(
      (d) => MVP_DIMENSIONS.includes(d)
    );

    // If AI missed some MVP dimensions, add them
    const missingDimensions = MVP_DIMENSIONS.filter(
      (d) => !validDimensions.includes(d)
    );

    return {
      summary: parsed.summary || "Professional profile created from resume analysis.",
      strengthAreas: parsed.strengthAreas || [],
      observationDimensions: [...validDimensions, ...missingDimensions],
      dimensionRationale: {
        ...Object.fromEntries(MVP_DIMENSIONS.map((d) => [d, "Standard MVP observation dimension."])),
        ...(parsed.dimensionRationale || {}),
      },
      suggestedSkills: parsed.suggestedSkills || [],
      experienceLevel: parsed.experienceLevel || "mid",
      industryFocus: parsed.industryFocus || [],
    };
  } catch (error) {
    console.error("Resume Enhancer AI error:", error);
    return getDefaultResult("AI analysis encountered an error. Default profile created.");
  }
}

function getDefaultResult(summary: string): ResumeEnhancerResult {
  return {
    summary,
    strengthAreas: [],
    observationDimensions: [...MVP_DIMENSIONS],
    dimensionRationale: {
      integrity_ethics: "Core MVP dimension — will be assessed during mentor observations.",
      accountability_ownership: "Core MVP dimension — will be assessed during mentor observations.",
      execution_reliability: "Core MVP dimension — will be assessed during mentor observations.",
      communication_pressure: "Core MVP dimension — will be assessed during mentor observations.",
      collaboration_conflict: "Core MVP dimension — will be assessed during mentor observations.",
    },
    suggestedSkills: [],
    experienceLevel: "mid",
    industryFocus: [],
  };
}

export const ResumeEnhancer = {
  analyzeResume,
  BEHAVIORAL_DIMENSIONS,
  MVP_DIMENSIONS,
};

export default ResumeEnhancer;
