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
3. From the 5 behavioral dimensions below, select the TOP 3 that are MOST relevant for this specific candidate based on evidence in their resume. Then include the remaining 2 at the end. The ORDER matters — put the most relevant dimensions first:
   - integrity_ethics: Ethical decision-making, honesty, transparency
   - accountability_ownership: Taking responsibility, follow-through, ownership of outcomes
   - execution_reliability: Delivering on commitments, meeting deadlines, consistent output
   - communication_pressure: Communicating clearly under stress, difficult conversations
   - collaboration_conflict: Working in teams, resolving disagreements, building consensus
4. For each dimension, write a SPECIFIC rationale tied to this candidate's actual resume content (job titles, responsibilities, achievements). Do NOT use generic phrases like "Core dimension" or "will be assessed." Reference specific details from the resume.
5. Suggest any additional skills not explicitly mentioned but implied by their experience
6. Assess experience level: entry (0-2 yrs), mid (3-6 yrs), senior (7-12 yrs), executive (13+ yrs)
7. Identify their industry focus areas

IMPORTANT: Include ALL 5 dimensions but RANK them by relevance to this specific candidate. The first 3 should be the strongest matches based on resume evidence. Each rationale MUST reference specific content from the resume.

Return ONLY valid JSON in this exact format:
{
  "summary": "<2-3 sentence professional summary based on their actual experience>",
  "strengthAreas": ["<area 1>", "<area 2>", ...],
  "observationDimensions": ["<most relevant dimension>", "<2nd most relevant>", "<3rd>", "<4th>", "<5th>"],
  "dimensionRationale": {
    "<dimension_1>": "<specific rationale referencing resume content>",
    "<dimension_2>": "<specific rationale referencing resume content>",
    "<dimension_3>": "<specific rationale referencing resume content>",
    "<dimension_4>": "<specific rationale referencing resume content>",
    "<dimension_5>": "<specific rationale referencing resume content>"
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

    // Validate dimensions — preserve the LLM's ranking order
    const validDimensions = (parsed.observationDimensions || []).filter(
      (d) => MVP_DIMENSIONS.includes(d)
    );

    // Append any MVP dimensions the AI missed, but at the end (lowest priority)
    const missingDimensions = MVP_DIMENSIONS.filter(
      (d) => !validDimensions.includes(d)
    );

    return {
      summary: parsed.summary || "Professional profile created from resume analysis.",
      strengthAreas: parsed.strengthAreas || [],
      observationDimensions: [...validDimensions, ...missingDimensions],
      dimensionRationale: {
        ...Object.fromEntries(missingDimensions.map((d) => [d, "Additional observation dimension for comprehensive assessment."])),
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
