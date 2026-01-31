// AI-Powered Scene Generation Service
// Uses the same LLM API as the chatbot for dynamic content generation
// This ensures retakes have varied content so users don't see the same questions

import type { AssessmentScene, AssessmentDimension } from '@/data/interactiveAssessment';
import type { ModuleScene, SceneChoice } from '@/data/interactiveTrainingModules';

const LLM_API_URL = "https://api.a0.dev/ai/llm";

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  completion: string;
}

// Helper to call the LLM API
async function callLLM(messages: LLMMessage[], temperature: number = 0.8): Promise<string> {
  try {
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
  } catch (error) {
    console.error("AI Scene Generation error:", error);
    throw error;
  }
}

// System prompts for different generation tasks
const ASSESSMENT_NARRATIVE_SYSTEM = `You are a professional career coach creating engaging narrative introductions for behavioral self-assessments.

Your task is to generate fresh, varied narrative content for behavioral dimensions. Each narrative should:
- Be engaging and conversational
- Connect the dimension to real workplace scenarios
- Include 3-4 reflection questions for the user
- Be 150-250 words
- Sound like a wise mentor speaking directly to the user
- NOT repeat exact phrases from previous versions

Format your response as plain text with bullet points for questions using • symbol.`;

const ASSESSMENT_SELECTION_SYSTEM = `You are a professional career coach helping users identify their strengths and growth areas.

Generate fresh, engaging content for a selection scene where users choose their top strengths or improvement areas. The content should:
- Be motivational and supportive
- Include 3-4 guiding questions or points
- Be 100-150 words
- Sound encouraging, not clinical
- Use • for bullet points

Return only the content text, no JSON.`;

const TRAINING_CHOICE_SYSTEM = `You are an expert workplace scenario designer creating interactive training content for professional development.

Your task is to generate a workplace scenario with multiple choice responses. The scenario should:
- Present a realistic workplace situation
- Include 4 response options with varying degrees of appropriateness
- Have clear feedback explaining why each choice is more or less effective
- Award points (best: 50, good: 30, okay: 20, poor: 10)
- Be relevant to the specified competency area

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "scenario": "The situation description here",
  "choices": [
    {"id": "a", "text": "Response option text", "isCorrect": true/false, "feedback": "Why this is good/not ideal", "points": 10-50},
    {"id": "b", "text": "Response option text", "isCorrect": true/false, "feedback": "Why this is good/not ideal", "points": 10-50},
    {"id": "c", "text": "Response option text", "isCorrect": true/false, "feedback": "Why this is good/not ideal", "points": 10-50},
    {"id": "d", "text": "Response option text", "isCorrect": true/false, "feedback": "Why this is good/not ideal", "points": 10-50}
  ]
}

Only ONE choice should have isCorrect: true.`;

const TRAINING_QUIZ_SYSTEM = `You are an expert workplace training content creator.

Generate a quiz question about professional workplace behaviors. The question should:
- Test understanding of the specified competency area
- Have 4 answer options
- Include an explanation for the correct answer
- Be relevant and practical

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "question": "The quiz question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0-3,
  "explanation": "Why the correct answer is best"
}`;

const TRAINING_REFLECTION_SYSTEM = `You are a thoughtful career development facilitator.

Generate a reflection prompt for professional development. The prompt should:
- Encourage deep self-reflection
- Connect to the specified competency area
- Be open-ended and thought-provoking
- Be 50-100 words

Return ONLY the prompt text, no JSON.`;

// Generate varied assessment narrative for a dimension
export async function generateAssessmentNarrative(
  dimension: AssessmentDimension,
  attemptNumber: number
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: ASSESSMENT_NARRATIVE_SYSTEM },
    {
      role: 'user',
      content: `Generate a fresh narrative introduction for the "${dimension.title}" behavioral dimension.

Description: ${dimension.description}

Examples of this skill in action:
${dimension.examples.map(e => `• ${e}`).join('\n')}

This is attempt #${attemptNumber} for this user, so create content that feels fresh and different from standard assessments. Vary the workplace scenarios and reflection questions.

Generate engaging narrative content that prepares the user to honestly rate themselves on this dimension.`
    }
  ];

  return await callLLM(messages);
}

// Generate varied selection scene content
export async function generateSelectionContent(
  type: 'strengths' | 'improvements',
  attemptNumber: number
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: ASSESSMENT_SELECTION_SYSTEM },
    {
      role: 'user',
      content: `Generate fresh content for a "${type}" selection scene where users choose their top ${type === 'strengths' ? 'strengths (areas of confidence)' : 'growth areas (areas to improve)'}.

This is attempt #${attemptNumber}, so make it feel different from standard prompts.

The content should guide users to thoughtfully select their ${type === 'strengths' ? '3 strongest' : '3 most important'} areas.`
    }
  ];

  return await callLLM(messages);
}

// Generate a varied training scenario with choices
export async function generateTrainingScenario(
  competencies: string[],
  moduleTitle: string,
  sceneNumber: number,
  attemptNumber: number
): Promise<{ scenario: string; choices: SceneChoice[] } | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: TRAINING_CHOICE_SYSTEM },
    {
      role: 'user',
      content: `Generate a workplace scenario for training module "${moduleTitle}".

Competencies being developed: ${competencies.join(', ')}

This is scene ${sceneNumber} and attempt #${attemptNumber} for this user.

Create a realistic, engaging workplace scenario that tests the user's judgment in these competency areas. Make sure the scenario is different from typical examples - be creative with the workplace context and characters involved.`
    }
  ];

  try {
    const response = await callLLM(messages, 0.9);
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        scenario: parsed.scenario,
        choices: parsed.choices.map((c: any, index: number) => ({
          id: `choice-${index + 1}`,
          text: c.text,
          isCorrect: c.isCorrect === true,
          feedback: c.feedback,
          points: c.points || (c.isCorrect ? 50 : 15)
        }))
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing training scenario:', error);
    return null;
  }
}

// Generate a quiz question
export async function generateQuizQuestion(
  competencies: string[],
  moduleTitle: string,
  attemptNumber: number
): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string } | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: TRAINING_QUIZ_SYSTEM },
    {
      role: 'user',
      content: `Generate a quiz question for training module "${moduleTitle}".

Competencies: ${competencies.join(', ')}

This is attempt #${attemptNumber}, so create a unique question that tests understanding differently than standard questions.`
    }
  ];

  try {
    const response = await callLLM(messages, 0.85);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Error parsing quiz question:', error);
    return null;
  }
}

// Generate a reflection prompt
export async function generateReflectionPrompt(
  competencies: string[],
  moduleTitle: string,
  attemptNumber: number
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: TRAINING_REFLECTION_SYSTEM },
    {
      role: 'user',
      content: `Generate a reflection prompt for training module "${moduleTitle}".

Competencies: ${competencies.join(', ')}

This is attempt #${attemptNumber}. Create a unique, thought-provoking reflection question that helps users connect the training to their own experiences.`
    }
  ];

  return await callLLM(messages, 0.8);
}

// Generate a complete set of varied assessment scenes for retake
export async function generateVariedAssessmentScenes(
  dimensions: AssessmentDimension[],
  attemptNumber: number
): Promise<Partial<AssessmentScene>[]> {
  const variedScenes: Partial<AssessmentScene>[] = [];

  // Generate varied narrative for first dimension
  try {
    const firstDimNarrative = await generateAssessmentNarrative(dimensions[0], attemptNumber);
    variedScenes.push({
      id: `varied-intro-${dimensions[0].id}`,
      type: 'narrative',
      title: `${dimensions[0].title} & Expression`,
      content: firstDimNarrative,
      character: 'Assessment Guide',
      animationType: 'slideUp'
    });
  } catch (e) {
    console.error('Failed to generate narrative for dimension:', dimensions[0].title);
  }

  // Generate varied strength selection content
  try {
    const strengthsContent = await generateSelectionContent('strengths', attemptNumber);
    variedScenes.push({
      id: 'varied-select-strengths',
      type: 'selection' as any,
      title: 'Identify Your Strengths',
      content: strengthsContent,
      selectionType: 'strengths' as any,
      maxSelections: 3,
      animationType: 'slideUp'
    });
  } catch (e) {
    console.error('Failed to generate strengths selection content');
  }

  // Generate varied improvement selection content
  try {
    const improvementsContent = await generateSelectionContent('improvements', attemptNumber);
    variedScenes.push({
      id: 'varied-select-improvements',
      type: 'selection' as any,
      title: 'Choose Growth Areas',
      content: improvementsContent,
      selectionType: 'improvements' as any,
      maxSelections: 3,
      animationType: 'slideUp'
    });
  } catch (e) {
    console.error('Failed to generate improvements selection content');
  }

  return variedScenes;
}

// Generate varied training module scenes for retake
export async function generateVariedTrainingScenes(
  moduleTitle: string,
  competencies: string[],
  originalScenes: ModuleScene[],
  attemptNumber: number
): Promise<Map<string, Partial<ModuleScene>>> {
  const variedScenes = new Map<string, Partial<ModuleScene>>();

  // Find and regenerate choice scenes
  const choiceScenes = originalScenes.filter(s => s.type === 'choice');

  for (let i = 0; i < Math.min(choiceScenes.length, 3); i++) {
    try {
      const newScenario = await generateTrainingScenario(
        competencies,
        moduleTitle,
        i + 1,
        attemptNumber
      );

      if (newScenario) {
        variedScenes.set(choiceScenes[i].id, {
          content: newScenario.scenario,
          choices: newScenario.choices
        });
      }
    } catch (e) {
      console.error(`Failed to generate choice scene ${i + 1}:`, e);
    }
  }

  // Find and regenerate quiz scenes
  const quizScenes = originalScenes.filter(s => s.type === 'quiz');

  for (const quizScene of quizScenes) {
    if (quizScene.quiz && quizScene.quiz.length > 0) {
      const newQuestions = [];
      for (let i = 0; i < Math.min(quizScene.quiz.length, 3); i++) {
        try {
          const newQuestion = await generateQuizQuestion(
            competencies,
            moduleTitle,
            attemptNumber
          );
          if (newQuestion) {
            newQuestions.push(newQuestion);
          }
        } catch (e) {
          // Keep original question if generation fails
          newQuestions.push(quizScene.quiz[i]);
        }
      }

      if (newQuestions.length > 0) {
        variedScenes.set(quizScene.id, {
          quiz: newQuestions
        });
      }
    }
  }

  // Find and regenerate reflection scenes
  const reflectionScenes = originalScenes.filter(s => s.type === 'reflection');

  for (const reflectionScene of reflectionScenes) {
    try {
      const newPrompt = await generateReflectionPrompt(
        competencies,
        moduleTitle,
        attemptNumber
      );

      if (newPrompt && reflectionScene.reflection) {
        variedScenes.set(reflectionScene.id, {
          reflection: {
            prompt: newPrompt,
            minLength: reflectionScene.reflection.minLength
          }
        });
      }
    } catch (e) {
      console.error('Failed to generate reflection prompt:', e);
    }
  }

  return variedScenes;
}

// Check if this is a retake (has previous attempts)
export async function checkRetakeStatus(
  userId: string,
  moduleId: string,
  supabase: any
): Promise<{ isRetake: boolean; attemptNumber: number }> {
  try {
    const { data, error } = await supabase
      .from('bridgefast_progress')
      .select('id, status, completed_at')
      .eq('candidate_id', userId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { isRetake: false, attemptNumber: 1 };
    }

    const completedAttempts = data.filter((d: any) => d.status === 'completed').length;
    return {
      isRetake: completedAttempts > 0,
      attemptNumber: completedAttempts + 1
    };
  } catch (e) {
    console.error('Error checking retake status:', e);
    return { isRetake: false, attemptNumber: 1 };
  }
}

export async function checkAssessmentRetakeStatus(
  userId: string,
  supabase: any
): Promise<{ isRetake: boolean; attemptNumber: number }> {
  try {
    const { data, error } = await supabase
      .from('self_assessments')
      .select('id, completed_at')
      .eq('candidate_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { isRetake: false, attemptNumber: 1 };
    }

    const completedAttempts = data.filter((d: any) => d.completed_at !== null).length;
    return {
      isRetake: completedAttempts > 0,
      attemptNumber: completedAttempts + 1
    };
  } catch (e) {
    console.error('Error checking assessment retake status:', e);
    return { isRetake: false, attemptNumber: 1 };
  }
}
