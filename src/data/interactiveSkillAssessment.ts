// Interactive Skill Assessment - Actually tests skills instead of self-reported ratings
// Uses Speech Recognition, AI Analysis, Timed Challenges, and Role-Play Dialogues

export interface VoicePrompt {
  id: string;
  scenario: string;
  prompt: string;
  duration: number; // seconds for response
  evaluationCriteria: {
    clarity: string;
    structure: string;
    professionalism: string;
    completeness: string;
  };
}

export interface WrittenChallenge {
  id: string;
  type: 'email' | 'message' | 'report' | 'feedback';
  scenario: string;
  context: string;
  recipient: string;
  constraints?: {
    maxWords?: number;
    minWords?: number;
    mustInclude?: string[];
    mustAvoid?: string[];
  };
  evaluationCriteria: {
    tone: string;
    clarity: string;
    actionability: string;
    professionalism: string;
  };
}

export interface PrioritizationTask {
  id: string;
  title: string;
  description: string;
  deadline: string; // e.g., "Today 5pm", "Tomorrow", "This week"
  urgency: 'critical' | 'high' | 'medium' | 'low';
  importance: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: string;
  dependencies?: string[];
  hiddenContext?: string; // Revealed after submission
}

export interface DialogueTurn {
  speaker: 'ai' | 'user';
  message: string;
  emotion?: 'neutral' | 'frustrated' | 'confused' | 'happy' | 'defensive';
  options?: {
    id: string;
    text: string;
    quality: 'excellent' | 'good' | 'acceptable' | 'poor';
    feedback: string;
    nextTurnId?: string;
  }[];
}

export interface RolePlayScenario {
  id: string;
  title: string;
  context: string;
  aiRole: string;
  userRole: string;
  objective: string;
  turns: DialogueTurn[];
  evaluationCriteria: {
    empathy: string;
    problemSolving: string;
    communication: string;
    outcome: string;
  };
}

export interface ScenarioBranch {
  id: string;
  situation: string;
  choices: {
    id: string;
    text: string;
    consequence: string;
    score: number;
    leadsTo?: string;
  }[];
}

export interface ProblemSolvingScenario {
  id: string;
  title: string;
  initialSituation: string;
  branches: ScenarioBranch[];
  optimalPath: string[];
  evaluationCriteria: {
    analysis: string;
    creativity: string;
    practicality: string;
    riskAwareness: string;
  };
}

export interface JudgmentScenario {
  id: string;
  situation: string;
  stakeholders: string[];
  options: {
    id: string;
    action: string;
    reasoning: string;
    ethicalScore: number;
    practicalScore: number;
    feedback: string;
  }[];
}

// Enhanced Assessment Scene Types
export type InteractiveSceneType =
  | 'welcome'
  | 'narrative'
  | 'voice-response'      // Speech recognition challenge
  | 'written-challenge'   // Email/message writing
  | 'prioritization'      // Task prioritization
  | 'role-play'           // AI dialogue simulation
  | 'problem-solving'     // Branching scenarios
  | 'judgment'            // Ethical/professional judgment
  | 'active-listening'    // Listen and recall
  | 'quick-response'      // Timed responses
  | 'review'
  | 'completion';

export interface InteractiveAssessmentScene {
  id: string;
  type: InteractiveSceneType;
  title: string;
  subtitle?: string;
  dimension: string; // Which skill dimension this tests
  content: string;
  character?: string;
  animationType?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'typewriter';

  // Scene-specific data
  voicePrompt?: VoicePrompt;
  writtenChallenge?: WrittenChallenge;
  prioritizationTasks?: PrioritizationTask[];
  rolePlay?: RolePlayScenario;
  problemSolving?: ProblemSolvingScenario;
  judgmentScenario?: JudgmentScenario;

  // For active listening
  audioScript?: string;
  comprehensionQuestions?: {
    question: string;
    options: string[];
    correctIndex: number;
  }[];

  // Timing
  timeLimit?: number; // seconds
}

// Skill Dimensions with actual testing methods
export const SKILL_DIMENSIONS = [
  {
    id: 'communication',
    title: 'Communication',
    description: 'Verbal and written clarity, active listening, professional tone',
    testMethods: ['voice-response', 'written-challenge', 'active-listening'],
    icon: 'MessageCircle',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'problem_solving',
    title: 'Problem Solving',
    description: 'Analysis, creativity, structured thinking, practical solutions',
    testMethods: ['problem-solving', 'quick-response'],
    icon: 'Lightbulb',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'adaptability',
    title: 'Adaptability',
    description: 'Flexibility, handling change, pivoting under pressure',
    testMethods: ['problem-solving', 'role-play'],
    icon: 'RefreshCw',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    description: 'Teamwork, conflict resolution, building consensus',
    testMethods: ['role-play', 'written-challenge'],
    icon: 'Users',
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'initiative',
    title: 'Initiative',
    description: 'Proactiveness, identifying opportunities, taking ownership',
    testMethods: ['problem-solving', 'judgment'],
    icon: 'Rocket',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'time_management',
    title: 'Time Management',
    description: 'Prioritization, deadline management, efficient execution',
    testMethods: ['prioritization', 'quick-response'],
    icon: 'Clock',
    color: 'from-cyan-500 to-sky-600'
  },
  {
    id: 'professionalism',
    title: 'Professionalism',
    description: 'Ethics, judgment, workplace conduct, accountability',
    testMethods: ['judgment', 'written-challenge'],
    icon: 'Briefcase',
    color: 'from-slate-500 to-gray-600'
  },
  {
    id: 'learning_agility',
    title: 'Learning Agility',
    description: 'Quick comprehension, applying new concepts, curiosity',
    testMethods: ['active-listening', 'quick-response'],
    icon: 'GraduationCap',
    color: 'from-indigo-500 to-purple-600'
  }
];

// The actual interactive assessment scenes
export const INTERACTIVE_ASSESSMENT_SCENES: InteractiveAssessmentScene[] = [
  // WELCOME
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Interactive Skill Assessment',
    dimension: 'all',
    content: `Welcome to the Interactive Skill Assessment.

Unlike traditional self-assessments where you rate yourself, this assessment will actually test your skills through real challenges:

• **Voice Responses** - Speak your answers and receive AI analysis
• **Written Challenges** - Compose professional communications
• **Prioritization Tests** - Organize tasks under time pressure
• **Role-Play Dialogues** - Navigate difficult conversations
• **Problem-Solving Scenarios** - Make decisions with consequences

Your responses will be analyzed to provide objective, evidence-based scores that mentors can validate.

Ready to demonstrate your actual abilities?`,
    character: 'Assessment Guide',
    animationType: 'fadeIn'
  },

  // COMMUNICATION - Voice Response
  {
    id: 'comm-voice-1',
    type: 'voice-response',
    title: 'Communication Challenge',
    subtitle: 'Verbal Response Test',
    dimension: 'communication',
    content: 'You will be given a workplace scenario. Speak your response clearly and professionally. Your response will be analyzed for clarity, structure, and tone.',
    voicePrompt: {
      id: 'voice-1',
      scenario: 'Your manager just informed you that the project deadline has been moved up by two weeks. The team is already stretched thin. She asks you to present options to the stakeholders in an emergency meeting in 30 minutes.',
      prompt: 'What do you say to your manager right now, and how would you structure your presentation to stakeholders?',
      duration: 90,
      evaluationCriteria: {
        clarity: 'Clear articulation of immediate response and presentation structure',
        structure: 'Logical flow: acknowledgment, clarification questions, proposed approach',
        professionalism: 'Calm, solution-focused tone without panic or blame',
        completeness: 'Addresses both immediate response and presentation planning'
      }
    },
    animationType: 'slideUp',
    timeLimit: 120
  },

  // COMMUNICATION - Written Challenge
  {
    id: 'comm-written-1',
    type: 'written-challenge',
    title: 'Written Communication',
    subtitle: 'Professional Email Composition',
    dimension: 'communication',
    content: 'Compose a professional email based on the scenario below. Your writing will be analyzed for tone, clarity, and effectiveness.',
    writtenChallenge: {
      id: 'written-1',
      type: 'email',
      scenario: 'A colleague has missed an important deadline for the third time this quarter. This has impacted your ability to complete your own deliverables. You need to address this directly but maintain a positive working relationship.',
      context: 'You and this colleague will need to continue working closely together on future projects.',
      recipient: 'Colleague (same level, different team)',
      constraints: {
        maxWords: 150,
        minWords: 50,
        mustInclude: ['specific impact', 'path forward'],
        mustAvoid: ['accusations', 'threats', 'passive-aggressive language']
      },
      evaluationCriteria: {
        tone: 'Professional yet direct, maintains relationship',
        clarity: 'Specific about the issue and its impact',
        actionability: 'Clear next steps or request',
        professionalism: 'Appropriate for workplace communication'
      }
    },
    animationType: 'slideUp',
    timeLimit: 300
  },

  // COMMUNICATION - Active Listening
  {
    id: 'comm-listening-1',
    type: 'active-listening',
    title: 'Active Listening Test',
    subtitle: 'Comprehension Challenge',
    dimension: 'communication',
    content: 'Listen carefully to the following workplace scenario. You will be asked questions about the details afterward.',
    audioScript: `Good morning team. I wanted to brief you on the Henderson account situation.

Last Tuesday, Sarah from their procurement team called about the Q3 deliverables. They're concerned about three specific items: first, the API integration timeline - they need it moved from October 15th to September 28th. Second, the user training materials need to be available in Spanish, not just English. Third, they want to add 50 more user licenses, bringing the total from 200 to 250.

The budget impact is significant - approximately $34,000 additional for the accelerated timeline, plus $8,500 for translations. The license upgrade is already covered under their enterprise agreement.

Sarah needs our response by end of day Friday. She mentioned their CFO, Michael Torres, is reviewing all vendor contracts next Monday.

Any questions?`,
    comprehensionQuestions: [
      {
        question: 'What is the new requested deadline for the API integration?',
        options: ['October 15th', 'September 28th', 'End of Friday', 'Next Monday'],
        correctIndex: 1
      },
      {
        question: 'What is the total cost impact mentioned?',
        options: ['$34,000', '$8,500', '$42,500', '$50,000'],
        correctIndex: 2
      },
      {
        question: 'How many total user licenses do they want?',
        options: ['50', '200', '250', '300'],
        correctIndex: 2
      },
      {
        question: 'Who is reviewing vendor contracts on Monday?',
        options: ['Sarah', 'The procurement team', 'Michael Torres', 'The Henderson team'],
        correctIndex: 2
      }
    ],
    animationType: 'fadeIn',
    timeLimit: 60
  },

  // PROBLEM SOLVING - Branching Scenario
  {
    id: 'problem-scenario-1',
    type: 'problem-solving',
    title: 'Problem Solving Challenge',
    subtitle: 'Critical Decision Making',
    dimension: 'problem_solving',
    content: 'Navigate this workplace crisis. Your decisions will have consequences.',
    problemSolving: {
      id: 'problem-1',
      title: 'The Server Crisis',
      initialSituation: `It's 4:45 PM on Friday. You're the on-call engineer. The main production server just went down. Customer complaints are flooding in. Your senior engineer is on a flight and unreachable for 3 hours. IT says it's "not their issue." Your manager is in an executive meeting.

What do you do first?`,
      branches: [
        {
          id: 'branch-1',
          situation: 'Initial Response',
          choices: [
            {
              id: 'b1-c1',
              text: 'Immediately try to restart the server yourself',
              consequence: 'The server restarts but crashes again after 5 minutes. You\'ve now lost the error logs that could help diagnose the issue.',
              score: 30,
              leadsTo: 'branch-2a'
            },
            {
              id: 'b1-c2',
              text: 'Check monitoring dashboards and recent deployment logs first',
              consequence: 'You discover a memory leak was introduced in a deployment 2 hours ago. You now have actionable information.',
              score: 80,
              leadsTo: 'branch-2b'
            },
            {
              id: 'b1-c3',
              text: 'Send an email to the team asking what to do',
              consequence: 'No one responds immediately. Customers are still affected. 15 minutes pass.',
              score: 20,
              leadsTo: 'branch-2c'
            },
            {
              id: 'b1-c4',
              text: 'Interrupt the executive meeting to get your manager',
              consequence: 'Your manager is annoyed but comes to help. However, they also don\'t know the recent deployment history.',
              score: 50,
              leadsTo: 'branch-2d'
            }
          ]
        },
        {
          id: 'branch-2b',
          situation: 'You found the memory leak. The deployment was made by a contractor who left last week. What next?',
          choices: [
            {
              id: 'b2b-c1',
              text: 'Roll back to the previous stable version immediately',
              consequence: 'Service is restored in 10 minutes. Some data from the last 2 hours may be inconsistent.',
              score: 85
            },
            {
              id: 'b2b-c2',
              text: 'Try to hot-fix the memory leak in production',
              consequence: 'Risky. You make a mistake and the server goes down completely. Total outage time doubles.',
              score: 25
            },
            {
              id: 'b2b-c3',
              text: 'Document everything and wait for the senior engineer',
              consequence: 'Thorough but slow. Customers experience 3+ hours of downtime.',
              score: 40
            }
          ]
        }
      ],
      optimalPath: ['b1-c2', 'b2b-c1'],
      evaluationCriteria: {
        analysis: 'Gathered information before acting',
        creativity: 'Considered multiple approaches',
        practicality: 'Chose actionable solutions',
        riskAwareness: 'Balanced speed with caution'
      }
    },
    animationType: 'slideUp'
  },

  // TIME MANAGEMENT - Prioritization
  {
    id: 'time-priority-1',
    type: 'prioritization',
    title: 'Prioritization Challenge',
    subtitle: 'Task Management Under Pressure',
    dimension: 'time_management',
    content: 'It\'s Monday morning. You have these 8 tasks. Rank them in the order you would complete them. You have 60 seconds.',
    prioritizationTasks: [
      {
        id: 'task-1',
        title: 'Client presentation',
        description: 'Final review of slides for major client pitch',
        deadline: 'Today 2pm',
        urgency: 'critical',
        importance: 'critical',
        estimatedTime: '1 hour',
        hiddenContext: 'This is a $500K deal. CEO will be present.'
      },
      {
        id: 'task-2',
        title: 'Team meeting prep',
        description: 'Prepare agenda for weekly team standup',
        deadline: 'Today 10am',
        urgency: 'high',
        importance: 'medium',
        estimatedTime: '15 min'
      },
      {
        id: 'task-3',
        title: 'Expense report',
        description: 'Submit monthly expense report',
        deadline: 'Today (soft)',
        urgency: 'low',
        importance: 'low',
        estimatedTime: '30 min',
        hiddenContext: 'Finance processes these weekly anyway.'
      },
      {
        id: 'task-4',
        title: 'Email from VP',
        description: 'VP asked for your thoughts on new initiative',
        deadline: 'No specific deadline',
        urgency: 'medium',
        importance: 'high',
        estimatedTime: '20 min',
        hiddenContext: 'VP is deciding promotions this quarter.'
      },
      {
        id: 'task-5',
        title: 'Bug fix',
        description: 'Fix non-critical UI bug reported last week',
        deadline: 'This week',
        urgency: 'low',
        importance: 'medium',
        estimatedTime: '2 hours'
      },
      {
        id: 'task-6',
        title: 'New hire onboarding',
        description: 'Meet with new team member starting today',
        deadline: 'Today 9am',
        urgency: 'high',
        importance: 'high',
        estimatedTime: '30 min',
        dependencies: ['Team meeting happens at 10am']
      },
      {
        id: 'task-7',
        title: 'Code review',
        description: 'Review colleague\'s pull request',
        deadline: 'Today (blocking their work)',
        urgency: 'high',
        importance: 'medium',
        estimatedTime: '45 min',
        hiddenContext: 'Colleague is waiting and can\'t proceed without this.'
      },
      {
        id: 'task-8',
        title: 'Training video',
        description: 'Complete mandatory compliance training',
        deadline: 'End of month',
        urgency: 'low',
        importance: 'medium',
        estimatedTime: '1 hour'
      }
    ],
    animationType: 'scaleIn',
    timeLimit: 90
  },

  // COLLABORATION - Role Play
  {
    id: 'collab-roleplay-1',
    type: 'role-play',
    title: 'Collaboration Challenge',
    subtitle: 'Difficult Conversation Simulation',
    dimension: 'collaboration',
    content: 'Navigate this conversation with a frustrated teammate. Your goal is to resolve the conflict while maintaining the relationship.',
    rolePlay: {
      id: 'roleplay-1',
      title: 'The Credit Dispute',
      context: 'You and Alex worked together on a project. In the team meeting, you presented the results and received praise from leadership. Alex feels they did most of the work and didn\'t get proper credit.',
      aiRole: 'Alex - Your teammate who feels overlooked',
      userRole: 'You - Trying to address the situation',
      objective: 'Acknowledge Alex\'s contributions, repair the relationship, and establish better collaboration practices going forward',
      turns: [
        {
          speaker: 'ai',
          message: 'Hey, do you have a minute? I need to talk to you about that presentation yesterday. I\'m honestly pretty frustrated.',
          emotion: 'frustrated'
        },
        {
          speaker: 'user',
          message: '',
          options: [
            {
              id: 'r1-o1',
              text: '"What\'s wrong? I thought it went great!"',
              quality: 'poor',
              feedback: 'This dismisses Alex\'s feelings and shows you\'re not aware of the issue.',
              nextTurnId: 'turn-2a'
            },
            {
              id: 'r1-o2',
              text: '"I can see something\'s bothering you. What\'s on your mind?"',
              quality: 'excellent',
              feedback: 'Great opening - shows empathy and invites them to share.',
              nextTurnId: 'turn-2b'
            },
            {
              id: 'r1-o3',
              text: '"If this is about the presentation, I had to present because you weren\'t ready."',
              quality: 'poor',
              feedback: 'Defensive and accusatory - will escalate the conflict.',
              nextTurnId: 'turn-2c'
            },
            {
              id: 'r1-o4',
              text: '"Sure, let\'s talk. I have 5 minutes before my next meeting."',
              quality: 'acceptable',
              feedback: 'Willing to talk but setting a rushed boundary may not allow for resolution.',
              nextTurnId: 'turn-2d'
            }
          ]
        },
        {
          speaker: 'ai',
          message: 'I did 70% of the analysis on that project. But when you presented, it sounded like it was all your work. Leadership thinks you did everything.',
          emotion: 'frustrated'
        },
        {
          speaker: 'user',
          message: '',
          options: [
            {
              id: 'r2-o1',
              text: '"You\'re right, I should have been clearer about your contributions. I\'m sorry - that wasn\'t intentional."',
              quality: 'excellent',
              feedback: 'Acknowledges the issue, takes responsibility, and apologizes sincerely.',
              nextTurnId: 'turn-3a'
            },
            {
              id: 'r2-o2',
              text: '"I mentioned \'we\' several times. You\'re overreacting."',
              quality: 'poor',
              feedback: 'Minimizing their valid concern will damage the relationship further.',
              nextTurnId: 'turn-3b'
            },
            {
              id: 'r2-o3',
              text: '"Let\'s talk to our manager together and clarify your role."',
              quality: 'good',
              feedback: 'Offers a solution, but doesn\'t first acknowledge the emotional impact.',
              nextTurnId: 'turn-3c'
            }
          ]
        }
      ],
      evaluationCriteria: {
        empathy: 'Acknowledged feelings before jumping to solutions',
        problemSolving: 'Offered concrete ways to address the issue',
        communication: 'Used "I" statements, avoided blame',
        outcome: 'Maintained relationship while addressing the problem'
      }
    },
    animationType: 'fadeIn'
  },

  // PROFESSIONALISM - Judgment
  {
    id: 'prof-judgment-1',
    type: 'judgment',
    title: 'Professional Judgment',
    subtitle: 'Ethical Decision Making',
    dimension: 'professionalism',
    content: 'Evaluate this situation and choose the most appropriate course of action.',
    judgmentScenario: {
      id: 'judgment-1',
      situation: `You discover that a popular colleague has been padding their expense reports with personal items - roughly $200-300 per month. They're a top performer and well-liked by leadership. You're the only one who noticed because you accidentally saw their receipts while looking for a shared document.

What do you do?`,
      stakeholders: ['The colleague', 'The company', 'Your relationship with the colleague', 'Your own integrity', 'The team culture'],
      options: [
        {
          id: 'j1-o1',
          action: 'Report it directly to HR or management',
          reasoning: 'Policy violation should be reported through proper channels regardless of who commits it.',
          ethicalScore: 90,
          practicalScore: 70,
          feedback: 'Ethically sound and follows company policy. May affect your relationship with the colleague but maintains your integrity.'
        },
        {
          id: 'j1-o2',
          action: 'Talk to the colleague privately first',
          reasoning: 'Give them a chance to correct the behavior before escalating.',
          ethicalScore: 75,
          practicalScore: 80,
          feedback: 'Shows empathy and gives them a chance, but you\'re now involved in covering up if they don\'t stop.'
        },
        {
          id: 'j1-o3',
          action: 'Ignore it - it\'s not your business',
          reasoning: 'Not your job to police colleagues. Focus on your own work.',
          ethicalScore: 30,
          practicalScore: 60,
          feedback: 'Avoids conflict but makes you complicit in ongoing fraud. Could backfire if discovered later.'
        },
        {
          id: 'j1-o4',
          action: 'Anonymously tip off the finance team',
          reasoning: 'Let the right people handle it without directly involving yourself.',
          ethicalScore: 70,
          practicalScore: 75,
          feedback: 'Addresses the issue while protecting yourself, but lacks direct accountability.'
        }
      ]
    },
    animationType: 'slideUp'
  },

  // INITIATIVE - Quick Response
  {
    id: 'init-quick-1',
    type: 'quick-response',
    title: 'Initiative Test',
    subtitle: 'Opportunity Identification',
    dimension: 'initiative',
    content: 'You\'ll see a scenario and have 30 seconds to type what you would do. Focus on identifying opportunities beyond the minimum requirement.',
    animationType: 'scaleIn',
    timeLimit: 30
  },

  // REVIEW
  {
    id: 'review',
    type: 'review',
    title: 'Assessment Review',
    subtitle: 'Your Performance Summary',
    dimension: 'all',
    content: 'Here\'s a summary of your demonstrated skills based on your actual performance in each challenge.',
    animationType: 'fadeIn'
  },

  // COMPLETION
  {
    id: 'completion',
    type: 'completion',
    title: 'Assessment Complete',
    dimension: 'all',
    content: `Congratulations!

You've completed the Interactive Skill Assessment. Unlike self-reported ratings, your scores are based on actual demonstrated performance:

• Your voice responses were analyzed for clarity and professionalism
• Your written communications were evaluated for effectiveness
• Your prioritization choices were compared to optimal patterns
• Your dialogue choices were scored for empathy and resolution
• Your problem-solving path was evaluated for decision quality

This evidence-based assessment provides mentors with concrete data to validate and guide your development.`,
    animationType: 'scaleIn'
  }
];

// Scoring rubrics for AI analysis
export const SCORING_RUBRICS = {
  voiceResponse: {
    clarity: {
      5: 'Exceptionally clear, well-articulated, easy to follow',
      4: 'Clear with minor hesitations or filler words',
      3: 'Understandable but with noticeable unclear sections',
      2: 'Difficult to follow, many unclear portions',
      1: 'Very unclear, hard to understand main points'
    },
    structure: {
      5: 'Perfectly organized with clear beginning, middle, end',
      4: 'Well-organized with logical flow',
      3: 'Some organization but could be improved',
      2: 'Disorganized, jumps between topics',
      1: 'No discernible structure'
    },
    professionalism: {
      5: 'Highly professional, appropriate for any business context',
      4: 'Professional with minor informal elements',
      3: 'Generally professional, some improvements needed',
      2: 'Several unprofessional elements',
      1: 'Inappropriate for professional context'
    },
    completeness: {
      5: 'Addresses all aspects thoroughly',
      4: 'Addresses main points with minor gaps',
      3: 'Addresses some but misses key elements',
      2: 'Significant gaps in response',
      1: 'Fails to address the prompt'
    }
  },
  writtenChallenge: {
    tone: {
      5: 'Perfect tone for the context and recipient',
      4: 'Appropriate tone with minor adjustments needed',
      3: 'Acceptable but could better match the situation',
      2: 'Tone mismatch that could cause issues',
      1: 'Completely wrong tone for the situation'
    },
    clarity: {
      5: 'Crystal clear, no ambiguity',
      4: 'Clear with very minor ambiguities',
      3: 'Generally clear but some confusing parts',
      2: 'Unclear in several places',
      1: 'Very confusing, message lost'
    },
    actionability: {
      5: 'Specific, clear next steps that are easy to follow',
      4: 'Good next steps with minor clarity improvements needed',
      3: 'Some action items but vague',
      2: 'Unclear what action is expected',
      1: 'No actionable content'
    },
    professionalism: {
      5: 'Exemplary professional writing',
      4: 'Professional with minor issues',
      3: 'Acceptable for workplace',
      2: 'Several professional concerns',
      1: 'Inappropriate for workplace'
    }
  }
};

// Get dimension by ID
export const getDimensionById = (id: string) =>
  SKILL_DIMENSIONS.find(d => d.id === id);

// Calculate overall skill profile from challenge results
export interface ChallengeResult {
  sceneId: string;
  dimension: string;
  scores: Record<string, number>;
  rawResponse?: string;
  aiAnalysis?: string;
  timestamp: Date;
}

export const calculateSkillProfile = (results: ChallengeResult[]) => {
  const profile: Record<string, { score: number; evidence: string[] }> = {};

  SKILL_DIMENSIONS.forEach(dim => {
    const dimResults = results.filter(r => r.dimension === dim.id);
    if (dimResults.length === 0) {
      profile[dim.id] = { score: 0, evidence: [] };
      return;
    }

    const avgScore = dimResults.reduce((sum, r) => {
      const scores = Object.values(r.scores);
      return sum + (scores.reduce((a, b) => a + b, 0) / scores.length);
    }, 0) / dimResults.length;

    profile[dim.id] = {
      score: Math.round(avgScore * 10) / 10,
      evidence: dimResults.map(r => r.aiAnalysis || 'Completed challenge').filter(Boolean)
    };
  });

  return profile;
};
