// AI Response Analysis Service
// Uses LLM API to evaluate voice transcripts, written responses, and other challenge outputs

import type {
  VoicePrompt,
  WrittenChallenge,
  SpeechMetrics
} from '@/data/interactiveSkillAssessment';

const LLM_API_URL = "https://api.a0.dev/ai/llm";

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  completion: string;
}

// Helper to call the LLM API
async function callLLM(messages: LLMMessage[], temperature: number = 0.3): Promise<string> {
  try {
    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data: LLMResponse = await response.json();
    return data.completion || "";
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
}

// Voice Response Analysis
export interface VoiceAnalysisResult {
  scores: {
    clarity: number;
    structure: number;
    professionalism: number;
    completeness: number;
  };
  overall: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  keyPoints: string[];
}

const VOICE_ANALYSIS_SYSTEM = `You are an expert communication coach analyzing spoken responses to workplace scenarios.

Evaluate the transcribed speech response based on these criteria (score 1-5):
1. CLARITY: How clear and well-articulated is the response? Consider filler words, coherence, and ease of understanding.
2. STRUCTURE: Is there a logical flow? Beginning, middle, end? Are ideas organized?
3. PROFESSIONALISM: Is the tone appropriate for a workplace? Solution-focused rather than panicked?
4. COMPLETENESS: Does it address all aspects of the prompt?

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "scores": {
    "clarity": <1-5>,
    "structure": <1-5>,
    "professionalism": <1-5>,
    "completeness": <1-5>
  },
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "keyPoints": ["<key point they made 1>", "<key point 2>"]
}`;

export async function analyzeVoiceResponse(
  prompt: VoicePrompt,
  transcript: string,
  speechMetrics: SpeechMetrics
): Promise<VoiceAnalysisResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: VOICE_ANALYSIS_SYSTEM },
    {
      role: 'user',
      content: `SCENARIO: ${prompt.scenario}

PROMPT: ${prompt.prompt}

EVALUATION CRITERIA:
- Clarity: ${prompt.evaluationCriteria.clarity}
- Structure: ${prompt.evaluationCriteria.structure}
- Professionalism: ${prompt.evaluationCriteria.professionalism}
- Completeness: ${prompt.evaluationCriteria.completeness}

TRANSCRIBED RESPONSE:
"${transcript}"

SPEECH METRICS:
- Word count: ${speechMetrics.wordCount}
- Speaking pace: ${Math.round(speechMetrics.speakingPace)} words/minute
- Filler words detected: ${speechMetrics.fillerWordCount} (${speechMetrics.fillerWords.join(', ') || 'none'})
- Sentence count: ${speechMetrics.sentenceCount}

Analyze this response and provide scores with feedback.`
    }
  ];

  try {
    const response = await callLLM(messages, 0.3);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        scores: {
          clarity: Math.min(5, Math.max(1, parsed.scores.clarity || 3)),
          structure: Math.min(5, Math.max(1, parsed.scores.structure || 3)),
          professionalism: Math.min(5, Math.max(1, parsed.scores.professionalism || 3)),
          completeness: Math.min(5, Math.max(1, parsed.scores.completeness || 3))
        },
        overall: (parsed.scores.clarity + parsed.scores.structure + parsed.scores.professionalism + parsed.scores.completeness) / 4,
        feedback: parsed.feedback || 'Response analyzed.',
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        keyPoints: parsed.keyPoints || []
      };
    }
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Voice analysis failed:', error);
    // Return default scores on error
    return {
      scores: { clarity: 3, structure: 3, professionalism: 3, completeness: 3 },
      overall: 3,
      feedback: 'Analysis could not be completed. Response recorded for manual review.',
      strengths: [],
      improvements: [],
      keyPoints: []
    };
  }
}

// Written Challenge Analysis
export interface WrittenAnalysisResult {
  scores: {
    tone: number;
    clarity: number;
    actionability: number;
    professionalism: number;
  };
  overall: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  grammarIssues: string[];
  suggestedRevision?: string;
}

const WRITTEN_ANALYSIS_SYSTEM = `You are an expert business writing coach analyzing professional communications.

Evaluate the written response based on these criteria (score 1-5):
1. TONE: Is it appropriate for the context and recipient?
2. CLARITY: Is the message clear and unambiguous?
3. ACTIONABILITY: Are there specific, clear next steps?
4. PROFESSIONALISM: Is it appropriate for workplace communication?

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "scores": {
    "tone": <1-5>,
    "clarity": <1-5>,
    "actionability": <1-5>,
    "professionalism": <1-5>
  },
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "grammarIssues": ["<issue 1 if any>"],
  "suggestedRevision": "<optional: improved version of key section>"
}`;

export async function analyzeWrittenResponse(
  challenge: WrittenChallenge,
  response: string
): Promise<WrittenAnalysisResult> {
  const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;

  const messages: LLMMessage[] = [
    { role: 'system', content: WRITTEN_ANALYSIS_SYSTEM },
    {
      role: 'user',
      content: `CHALLENGE TYPE: ${challenge.type}

SCENARIO: ${challenge.scenario}

CONTEXT: ${challenge.context}

RECIPIENT: ${challenge.recipient}

CONSTRAINTS:
${challenge.constraints?.maxWords ? `- Maximum words: ${challenge.constraints.maxWords}` : ''}
${challenge.constraints?.minWords ? `- Minimum words: ${challenge.constraints.minWords}` : ''}
${challenge.constraints?.mustInclude ? `- Must include: ${challenge.constraints.mustInclude.join(', ')}` : ''}
${challenge.constraints?.mustAvoid ? `- Must avoid: ${challenge.constraints.mustAvoid.join(', ')}` : ''}

EVALUATION CRITERIA:
- Tone: ${challenge.evaluationCriteria.tone}
- Clarity: ${challenge.evaluationCriteria.clarity}
- Actionability: ${challenge.evaluationCriteria.actionability}
- Professionalism: ${challenge.evaluationCriteria.professionalism}

USER'S RESPONSE (${wordCount} words):
"${response}"

Analyze this response and provide scores with feedback.`
    }
  ];

  try {
    const apiResponse = await callLLM(messages, 0.3);
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Check word count constraints
      let wordCountPenalty = 0;
      if (challenge.constraints?.maxWords && wordCount > challenge.constraints.maxWords) {
        wordCountPenalty = 0.5;
      }
      if (challenge.constraints?.minWords && wordCount < challenge.constraints.minWords) {
        wordCountPenalty = 0.5;
      }

      return {
        scores: {
          tone: Math.min(5, Math.max(1, (parsed.scores.tone || 3) - wordCountPenalty)),
          clarity: Math.min(5, Math.max(1, (parsed.scores.clarity || 3) - wordCountPenalty)),
          actionability: Math.min(5, Math.max(1, parsed.scores.actionability || 3)),
          professionalism: Math.min(5, Math.max(1, parsed.scores.professionalism || 3))
        },
        overall: ((parsed.scores.tone + parsed.scores.clarity + parsed.scores.actionability + parsed.scores.professionalism) / 4) - wordCountPenalty,
        feedback: parsed.feedback || 'Response analyzed.',
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        grammarIssues: parsed.grammarIssues || [],
        suggestedRevision: parsed.suggestedRevision
      };
    }
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Written analysis failed:', error);
    return {
      scores: { tone: 3, clarity: 3, actionability: 3, professionalism: 3 },
      overall: 3,
      feedback: 'Analysis could not be completed. Response recorded for manual review.',
      strengths: [],
      improvements: [],
      grammarIssues: []
    };
  }
}

// Prioritization Analysis
export interface PrioritizationAnalysisResult {
  score: number;
  feedback: string;
  optimalOrder: string[];
  userOrder: string[];
  analysis: {
    correctPlacements: number;
    criticalMisses: string[];
    goodChoices: string[];
  };
}

const PRIORITIZATION_ANALYSIS_SYSTEM = `You are an expert time management coach analyzing task prioritization.

Consider these factors when evaluating:
1. Urgent + Important tasks should come first
2. Dependencies between tasks
3. Deadlines (hard vs soft)
4. Impact on others (blocking colleagues)
5. Business impact

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "optimalOrder": ["task-id-1", "task-id-2", ...],
  "score": <1-5>,
  "feedback": "<2-3 sentence assessment>",
  "criticalMisses": ["<any critical errors>"],
  "goodChoices": ["<what they did well>"]
}`;

export async function analyzePrioritization(
  tasks: { id: string; title: string; deadline: string; urgency: string; importance: string; dependencies?: string[] }[],
  userOrder: string[]
): Promise<PrioritizationAnalysisResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: PRIORITIZATION_ANALYSIS_SYSTEM },
    {
      role: 'user',
      content: `TASKS TO PRIORITIZE:
${tasks.map(t => `- ${t.id}: "${t.title}" | Deadline: ${t.deadline} | Urgency: ${t.urgency} | Importance: ${t.importance}${t.dependencies ? ` | Dependencies: ${t.dependencies.join(', ')}` : ''}`).join('\n')}

USER'S PRIORITIZATION ORDER:
${userOrder.map((id, i) => `${i + 1}. ${id}`).join('\n')}

Analyze this prioritization and determine optimal order.`
    }
  ];

  try {
    const response = await callLLM(messages, 0.3);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate correct placements
      const optimalOrder = parsed.optimalOrder || userOrder;
      let correctPlacements = 0;
      for (let i = 0; i < Math.min(3, userOrder.length); i++) {
        if (userOrder[i] === optimalOrder[i]) {
          correctPlacements++;
        }
      }

      return {
        score: Math.min(5, Math.max(1, parsed.score || 3)),
        feedback: parsed.feedback || 'Prioritization analyzed.',
        optimalOrder,
        userOrder,
        analysis: {
          correctPlacements,
          criticalMisses: parsed.criticalMisses || [],
          goodChoices: parsed.goodChoices || []
        }
      };
    }
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Prioritization analysis failed:', error);
    return {
      score: 3,
      feedback: 'Analysis could not be completed.',
      optimalOrder: userOrder,
      userOrder,
      analysis: {
        correctPlacements: 0,
        criticalMisses: [],
        goodChoices: []
      }
    };
  }
}

// Quick Response Analysis
export interface QuickResponseAnalysisResult {
  score: number;
  feedback: string;
  initiativeLevel: 'high' | 'medium' | 'low';
  identifiedOpportunities: string[];
  missedOpportunities: string[];
}

const QUICK_RESPONSE_ANALYSIS_SYSTEM = `You are evaluating someone's initiative and proactiveness based on their response to an open-ended workplace scenario.

Look for:
1. Did they identify opportunities beyond the minimum?
2. Did they show ownership mentality?
3. Did they think about impact on others/the business?
4. Did they propose actionable improvements?

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "score": <1-5>,
  "initiativeLevel": "high" | "medium" | "low",
  "feedback": "<2-3 sentence assessment>",
  "identifiedOpportunities": ["<opportunity they identified>"],
  "missedOpportunities": ["<opportunity they could have mentioned>"]
}`;

export async function analyzeQuickResponse(
  scenario: string,
  response: string,
  timeSpent: number
): Promise<QuickResponseAnalysisResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: QUICK_RESPONSE_ANALYSIS_SYSTEM },
    {
      role: 'user',
      content: `SCENARIO: ${scenario}

USER'S RESPONSE (completed in ${timeSpent} seconds):
"${response}"

Evaluate the level of initiative and proactiveness demonstrated.`
    }
  ];

  try {
    const apiResponse = await callLLM(messages, 0.4);
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(5, Math.max(1, parsed.score || 3)),
        feedback: parsed.feedback || 'Response analyzed.',
        initiativeLevel: parsed.initiativeLevel || 'medium',
        identifiedOpportunities: parsed.identifiedOpportunities || [],
        missedOpportunities: parsed.missedOpportunities || []
      };
    }
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Quick response analysis failed:', error);
    return {
      score: 3,
      feedback: 'Analysis could not be completed.',
      initiativeLevel: 'medium',
      identifiedOpportunities: [],
      missedOpportunities: []
    };
  }
}

// Role-play dialogue evaluation
export interface DialogueAnalysisResult {
  overallScore: number;
  scores: {
    empathy: number;
    problemSolving: number;
    communication: number;
    outcome: number;
  };
  feedback: string;
  effectiveChoices: string[];
  improvementAreas: string[];
}

export function analyzeDialogueChoices(
  choices: { quality: 'excellent' | 'good' | 'acceptable' | 'poor'; feedback: string }[]
): DialogueAnalysisResult {
  const qualityScores = {
    excellent: 5,
    good: 4,
    acceptable: 3,
    poor: 1
  };

  const scores = choices.map(c => qualityScores[c.quality]);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const effectiveChoices = choices
    .filter(c => c.quality === 'excellent' || c.quality === 'good')
    .map(c => c.feedback);

  const improvementAreas = choices
    .filter(c => c.quality === 'acceptable' || c.quality === 'poor')
    .map(c => c.feedback);

  return {
    overallScore: Math.round(avgScore * 10) / 10,
    scores: {
      empathy: avgScore,
      problemSolving: avgScore,
      communication: avgScore,
      outcome: avgScore
    },
    feedback: avgScore >= 4 ? 'Excellent handling of the conversation!' :
              avgScore >= 3 ? 'Good effort with some room for improvement.' :
              'Consider how to approach difficult conversations more effectively.',
    effectiveChoices,
    improvementAreas
  };
}

// Problem-solving path evaluation
export interface ProblemSolvingAnalysisResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  pathAnalysis: {
    choiceId: string;
    score: number;
    consequence: string;
  }[];
  wasOptimal: boolean;
  feedback: string;
}

export function analyzeProblemSolvingPath(
  choices: { choiceId: string; score: number; consequence: string }[],
  optimalPath: string[]
): ProblemSolvingAnalysisResult {
  const totalScore = choices.reduce((sum, c) => sum + c.score, 0);
  const maxPossibleScore = choices.length * 85; // Assuming 85 is max per choice

  const choiceIds = choices.map(c => c.choiceId);
  const wasOptimal = JSON.stringify(choiceIds) === JSON.stringify(optimalPath.slice(0, choiceIds.length));

  const percentage = Math.round((totalScore / maxPossibleScore) * 100);

  return {
    totalScore,
    maxPossibleScore,
    percentage,
    pathAnalysis: choices,
    wasOptimal,
    feedback: wasOptimal ? 'Excellent decision-making! You followed the optimal path.' :
              percentage >= 70 ? 'Good problem-solving approach with some room for optimization.' :
              percentage >= 50 ? 'Reasonable decisions, but consider alternative approaches.' :
              'Review the consequences of each decision for learning opportunities.'
  };
}

// Active listening evaluation
export interface ListeningAnalysisResult {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  score: number;
  feedback: string;
}

export function analyzeListeningComprehension(
  answers: number[],
  correctIndices: number[]
): ListeningAnalysisResult {
  let correct = 0;
  answers.forEach((answer, i) => {
    if (answer === correctIndices[i]) {
      correct++;
    }
  });

  const percentage = Math.round((correct / correctIndices.length) * 100);
  const score = Math.round((correct / correctIndices.length) * 5);

  return {
    correctAnswers: correct,
    totalQuestions: correctIndices.length,
    percentage,
    score: Math.max(1, score),
    feedback: percentage === 100 ? 'Perfect! Excellent attention to detail.' :
              percentage >= 75 ? 'Good listening skills with minor misses.' :
              percentage >= 50 ? 'Moderate comprehension. Practice active listening.' :
              'Focus on capturing key details when listening.'
  };
}

// Judgment scenario evaluation
export interface JudgmentAnalysisResult {
  ethicalScore: number;
  practicalScore: number;
  combinedScore: number;
  feedback: string;
  stakeholderImpact: string;
}

export function analyzeJudgmentChoice(
  choice: {
    action: string;
    reasoning: string;
    ethicalScore: number;
    practicalScore: number;
    feedback: string;
  },
  stakeholders: string[]
): JudgmentAnalysisResult {
  const combinedScore = (choice.ethicalScore * 0.6 + choice.practicalScore * 0.4) / 20;

  return {
    ethicalScore: choice.ethicalScore / 20,
    practicalScore: choice.practicalScore / 20,
    combinedScore,
    feedback: choice.feedback,
    stakeholderImpact: `This decision affects: ${stakeholders.join(', ')}`
  };
}
