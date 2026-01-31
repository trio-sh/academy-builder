// Interactive Assessment Configuration
// Multi-scene self-assessment with narrative introductions and interactive elements

export interface AssessmentDimension {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
  narrativeIntro: string;
  scaleLabels: {
    low: string;
    mid: string;
    high: string;
  };
}

export interface AssessmentScene {
  id: string;
  type: 'welcome' | 'narrative' | 'dimension' | 'multi-dimension' | 'selection' | 'goals' | 'review' | 'completion';
  title: string;
  subtitle?: string;
  content: string;
  character?: string;
  setting?: string;
  animationType?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'typewriter';
  dimensions?: string[]; // For dimension rating scenes
  selectionType?: 'strengths' | 'improvements';
  maxSelections?: number;
}

export const ASSESSMENT_DIMENSIONS: AssessmentDimension[] = [
  {
    id: 'communication',
    title: 'Communication',
    description: 'Your ability to express ideas clearly, listen actively, and adapt your message to different audiences.',
    icon: 'MessageCircle',
    color: 'from-blue-500 to-cyan-500',
    examples: [
      'Expressing ideas clearly in writing and speech',
      'Active listening and asking clarifying questions',
      'Adapting communication style to your audience',
      'Giving and receiving constructive feedback'
    ],
    narrativeIntro: 'Communication is the foundation of professional success. Whether you\'re presenting to executives, collaborating with teammates, or writing an email, your ability to convey ideas clearly and listen actively shapes how others perceive and work with you.',
    scaleLabels: {
      low: 'I often struggle to express my ideas clearly',
      mid: 'I can communicate effectively in most situations',
      high: 'I excel at adapting my communication to any audience'
    }
  },
  {
    id: 'problem_solving',
    title: 'Problem Solving',
    description: 'How you approach challenges, analyze issues, and develop effective solutions.',
    icon: 'Lightbulb',
    color: 'from-amber-500 to-orange-500',
    examples: [
      'Breaking down complex problems into manageable parts',
      'Identifying root causes rather than just symptoms',
      'Considering multiple solutions before deciding',
      'Learning from past mistakes to improve future decisions'
    ],
    narrativeIntro: 'Every workplace challenge is an opportunity to demonstrate your analytical thinking. Problem solvers don\'t just fix issues—they understand why problems occur and create solutions that prevent them from happening again.',
    scaleLabels: {
      low: 'I tend to react to problems rather than analyze them',
      mid: 'I can work through most problems methodically',
      high: 'I thrive on complex challenges and finding innovative solutions'
    }
  },
  {
    id: 'adaptability',
    title: 'Adaptability',
    description: 'Your flexibility when facing change and ability to thrive in dynamic environments.',
    icon: 'RefreshCw',
    color: 'from-emerald-500 to-teal-500',
    examples: [
      'Embracing new processes and technologies',
      'Staying calm under pressure or uncertainty',
      'Adjusting priorities when circumstances change',
      'Being open to feedback and new perspectives'
    ],
    narrativeIntro: 'In today\'s fast-paced world, adaptability is not just valuable—it\'s essential. The most successful professionals are those who see change not as a threat, but as an opportunity for growth and innovation.',
    scaleLabels: {
      low: 'I prefer stability and find change challenging',
      mid: 'I can adapt to change when needed',
      high: 'I embrace change and help others navigate it'
    }
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    description: 'How effectively you work with others and contribute to team success.',
    icon: 'Users',
    color: 'from-violet-500 to-purple-500',
    examples: [
      'Contributing ideas while respecting others\' input',
      'Supporting teammates and celebrating shared wins',
      'Resolving conflicts constructively',
      'Building trust through reliability and transparency'
    ],
    narrativeIntro: 'No one achieves great things alone. Collaboration is about more than just working together—it\'s about leveraging diverse perspectives, supporting each other through challenges, and creating something greater than any individual could alone.',
    scaleLabels: {
      low: 'I prefer working independently',
      mid: 'I work well with others in most situations',
      high: 'I actively build strong team relationships and foster collaboration'
    }
  },
  {
    id: 'initiative',
    title: 'Initiative',
    description: 'Your drive to take proactive action and seek opportunities without being asked.',
    icon: 'Rocket',
    color: 'from-rose-500 to-pink-500',
    examples: [
      'Identifying opportunities for improvement',
      'Volunteering for new projects or responsibilities',
      'Taking ownership of tasks beyond your job description',
      'Proposing solutions rather than just identifying problems'
    ],
    narrativeIntro: 'Initiative separates those who follow from those who lead. When you take proactive action—spotting opportunities, proposing improvements, or stepping up when needed—you demonstrate the kind of ownership that drives careers forward.',
    scaleLabels: {
      low: 'I typically wait for direction before acting',
      mid: 'I take initiative when opportunities are clear',
      high: 'I consistently seek out ways to contribute and improve'
    }
  },
  {
    id: 'time_management',
    title: 'Time Management',
    description: 'Your ability to prioritize tasks, meet deadlines, and manage your workload effectively.',
    icon: 'Clock',
    color: 'from-indigo-500 to-blue-500',
    examples: [
      'Prioritizing tasks based on importance and urgency',
      'Meeting deadlines consistently',
      'Managing multiple projects without dropping balls',
      'Knowing when to ask for help or delegate'
    ],
    narrativeIntro: 'Time is your most valuable resource. How you manage it reflects your professionalism and directly impacts your ability to deliver results. Great time managers don\'t just stay busy—they focus on what matters most.',
    scaleLabels: {
      low: 'I often feel overwhelmed by my workload',
      mid: 'I generally meet deadlines and manage tasks well',
      high: 'I excel at prioritization and always deliver on time'
    }
  },
  {
    id: 'professionalism',
    title: 'Professionalism',
    description: 'Your conduct, ethics, and reliability in professional settings.',
    icon: 'Briefcase',
    color: 'from-slate-500 to-gray-600',
    examples: [
      'Maintaining a positive attitude even in difficult situations',
      'Being punctual and prepared',
      'Acting with integrity and honesty',
      'Representing yourself and your organization well'
    ],
    narrativeIntro: 'Professionalism is how you show up every day. It\'s the consistency of your conduct, the integrity of your actions, and the reliability others can count on. It\'s not about perfection—it\'s about being someone others trust and respect.',
    scaleLabels: {
      low: 'I sometimes struggle with professional expectations',
      mid: 'I maintain professional standards consistently',
      high: 'I model professionalism and inspire it in others'
    }
  },
  {
    id: 'learning_agility',
    title: 'Learning Agility',
    description: 'How quickly you learn from experience and apply knowledge in new situations.',
    icon: 'GraduationCap',
    color: 'from-cyan-500 to-sky-500',
    examples: [
      'Seeking out new learning opportunities',
      'Applying lessons from past experiences',
      'Asking questions to deepen understanding',
      'Being curious about how things work'
    ],
    narrativeIntro: 'The most valuable professionals aren\'t those who know everything—they\'re those who learn anything. Learning agility is your capacity to absorb new information, adapt your approach, and continuously grow throughout your career.',
    scaleLabels: {
      low: 'I prefer familiar tasks over learning new things',
      mid: 'I learn new skills when required',
      high: 'I actively seek learning opportunities and apply insights quickly'
    }
  }
];

export const ASSESSMENT_SCENES: AssessmentScene[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Welcome to Your Self-Assessment',
    subtitle: 'A Journey of Self-Discovery',
    content: `Welcome to The 3rd Academy Behavioral Self-Assessment.

This interactive experience will guide you through a thoughtful evaluation of your professional strengths and growth areas. Over the next few minutes, you'll reflect on eight key behavioral dimensions that employers value most.

**What to expect:**
• Honest reflection prompts for each dimension
• A personalized strength and growth area profile
• Goal-setting to guide your development
• A comprehensive summary you can reference anytime

**Remember:** There are no right or wrong answers here. This assessment is for your benefit—the more honest you are, the more valuable your insights will be.

Take your time, reflect thoughtfully, and let's discover what makes you uniquely valuable.`,
    character: 'Assessment Guide',
    setting: 'Professional Development Center',
    animationType: 'fadeIn'
  },
  {
    id: 'intro-communication',
    type: 'narrative',
    title: 'Communication & Expression',
    content: `Let's begin with one of the most fundamental professional skills: Communication.

Communication isn't just about speaking clearly—it's about connecting with others, ensuring your message lands, and truly hearing what others have to say.

Think about your recent professional interactions:
• How do you feel when presenting ideas to a group?
• Do others often ask you to clarify what you mean?
• How well do you pick up on non-verbal cues?

As you rate yourself, consider both your written and verbal communication, as well as your listening skills.`,
    character: 'Assessment Guide',
    animationType: 'slideUp'
  },
  {
    id: 'rate-communication',
    type: 'dimension',
    title: 'Rate Your Communication Skills',
    content: 'Based on your reflection, how would you rate your overall communication abilities?',
    dimensions: ['communication'],
    animationType: 'fadeIn'
  },
  {
    id: 'intro-problem-adaptability',
    type: 'narrative',
    title: 'Thinking & Adapting',
    content: `Now let's explore how you approach challenges and change.

Problem Solving is about more than fixing things—it's how you think through complexity and find paths forward.

Adaptability shows how you respond when plans change, when new technologies emerge, or when unexpected challenges arise.

Consider these questions:
• When faced with a difficult problem, do you dive in or step back to analyze?
• How do you typically react when priorities shift unexpectedly?
• Are you energized or drained by change?`,
    character: 'Assessment Guide',
    animationType: 'slideUp'
  },
  {
    id: 'rate-problem-adaptability',
    type: 'multi-dimension',
    title: 'Problem Solving & Adaptability',
    content: 'Rate your abilities in these interconnected areas:',
    dimensions: ['problem_solving', 'adaptability'],
    animationType: 'fadeIn'
  },
  {
    id: 'intro-collaboration-initiative',
    type: 'narrative',
    title: 'Working With Others & Taking Action',
    content: `Success rarely happens in isolation. Let's look at how you work with others and drive action.

Collaboration is the art of combining individual strengths into collective achievement. It requires trust, communication, and the ability to both lead and follow.

Initiative is your internal drive—the spark that pushes you to act without waiting to be told, to see opportunities where others see obstacles.

Reflect on:
• Do you naturally gravitate toward teamwork or independent work?
• When you see something that could be improved, what do you do?
• How do you balance supporting others with advocating for your own ideas?`,
    character: 'Assessment Guide',
    animationType: 'slideUp'
  },
  {
    id: 'rate-collaboration-initiative',
    type: 'multi-dimension',
    title: 'Collaboration & Initiative',
    content: 'Consider your teamwork style and proactive nature:',
    dimensions: ['collaboration', 'initiative'],
    animationType: 'fadeIn'
  },
  {
    id: 'intro-time-professionalism',
    type: 'narrative',
    title: 'Managing Yourself',
    content: `The final dimensions focus on self-management—how you organize your work and present yourself professionally.

Time Management isn't about being busy—it's about being effective. It's knowing what matters most and ensuring it gets done.

Professionalism is your personal brand in action. It's consistency, reliability, and the way you carry yourself in every interaction.

Think about:
• How often do you feel in control of your workload versus overwhelmed?
• Do colleagues see you as reliable and dependable?
• What does your best professional self look like?`,
    character: 'Assessment Guide',
    animationType: 'slideUp'
  },
  {
    id: 'rate-time-professionalism',
    type: 'multi-dimension',
    title: 'Time Management & Professionalism',
    content: 'Reflect on how you manage your time and professional presence:',
    dimensions: ['time_management', 'professionalism'],
    animationType: 'fadeIn'
  },
  {
    id: 'intro-learning',
    type: 'narrative',
    title: 'The Growth Mindset',
    content: `Our final dimension might be the most important: Learning Agility.

In a world that changes constantly, your ability to learn, unlearn, and relearn is perhaps your greatest asset. Learning agility isn't about being the smartest—it's about being the most curious and adaptable.

Consider:
• Do you seek out feedback, even when it's uncomfortable?
• How do you approach tasks you've never done before?
• When you make a mistake, do you dwell on it or learn from it?

This dimension often predicts long-term career success more than any other.`,
    character: 'Assessment Guide',
    animationType: 'slideUp'
  },
  {
    id: 'rate-learning',
    type: 'dimension',
    title: 'Rate Your Learning Agility',
    content: 'How quickly and effectively do you learn and adapt?',
    dimensions: ['learning_agility'],
    animationType: 'fadeIn'
  },
  {
    id: 'select-strengths',
    type: 'selection',
    title: 'Identify Your Strengths',
    content: `Based on your ratings, let's identify what you do best.

Select up to 3 dimensions where you feel most confident. These are areas where you can lead, mentor others, and make your biggest immediate impact.

Think about:
• Where do you receive the most positive feedback?
• What comes naturally to you that others find difficult?
• What energizes you most in your work?`,
    selectionType: 'strengths',
    maxSelections: 3,
    animationType: 'slideUp'
  },
  {
    id: 'select-improvements',
    type: 'selection',
    title: 'Choose Growth Areas',
    content: `Now, let's be honest about where you can grow.

Select up to 3 dimensions you'd like to develop. These aren't weaknesses—they're opportunities. The most successful professionals continuously work on their growth areas.

Consider:
• Where do you receive constructive feedback?
• What would make the biggest difference in your effectiveness?
• What skills would help you reach your next career goal?`,
    selectionType: 'improvements',
    maxSelections: 3,
    animationType: 'slideUp'
  },
  {
    id: 'set-goals',
    type: 'goals',
    title: 'Set Your Development Goals',
    content: `Let's turn your insights into action.

Based on your growth areas, write 1-3 specific goals you want to work toward. Great goals are:

**Specific:** "Improve presentation skills" → "Practice presenting to small groups weekly"
**Measurable:** Include something you can track
**Time-bound:** Set a timeframe for achievement

What will you commit to developing?`,
    animationType: 'slideUp'
  },
  {
    id: 'review',
    type: 'review',
    title: 'Your Assessment Summary',
    content: `Excellent work completing your self-assessment!

Here's your comprehensive profile based on your honest reflections. This summary captures where you are today—but remember, these dimensions are all developable with intention and practice.

Use this profile to:
• Guide conversations with mentors and managers
• Focus your professional development efforts
• Track your growth over time with future assessments`,
    animationType: 'scaleIn'
  },
  {
    id: 'completion',
    type: 'completion',
    title: 'Assessment Complete!',
    content: `Congratulations on completing your Behavioral Self-Assessment!

You've taken an important step in your professional development journey. Self-awareness is the foundation of growth, and by honestly reflecting on your strengths and areas for improvement, you've created a roadmap for your development.

Your results have been saved and will be reflected in your Growth Log. Return to this assessment periodically to track your progress and celebrate your growth.

Remember: The goal isn't perfection—it's continuous improvement.`,
    character: 'Assessment Guide',
    animationType: 'scaleIn'
  }
];

export const SCORE_LABELS = [
  { min: 1, max: 1.4, label: 'Beginning', color: 'text-red-400', bg: 'bg-red-500/20' },
  { min: 1.5, max: 2.4, label: 'Emerging', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { min: 2.5, max: 3.4, label: 'Developing', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { min: 3.5, max: 4.4, label: 'Strong', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { min: 4.5, max: 5, label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
];

export const getScoreLabel = (score: number) => {
  const level = SCORE_LABELS.find(l => score >= l.min && score <= l.max);
  return level || SCORE_LABELS[2]; // Default to "Developing"
};

export const getOverallScore = (scores: Record<string, number>) => {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};
