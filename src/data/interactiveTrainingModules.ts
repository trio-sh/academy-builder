// Interactive Training Modules - Based on The 3rd Academy Behavioral Assessment System
// Each module contains multi-scene scenarios with locks/unlocks progression

export interface SceneChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  points: number;
}

export interface ModuleScene {
  id: string;
  title: string;
  type: 'narrative' | 'choice' | 'reflection' | 'video' | 'quiz' | 'completion';
  content: string;
  character?: string;
  setting?: string;
  choices?: SceneChoice[];
  reflection?: {
    prompt: string;
    minLength: number;
  };
  videoUrl?: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  nextSceneId?: string;
  isLocked?: boolean;
  unlockCondition?: string;
  animationType?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'typewriter';
  duration?: number;
}

export interface InteractiveModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  competencies: string[];
  icon: string;
  color: string;
  scenes: ModuleScene[];
  totalPoints: number;
  passingScore: number;
  certificateTitle: string;
}

export const INTERACTIVE_MODULES: InteractiveModule[] = [
  // MODULE 1: Professional Boundaries
  {
    id: 'module-1',
    slug: 'professional-boundaries',
    title: 'Professional Boundaries',
    subtitle: 'Workplace Relationships',
    description: 'Learn to maintain appropriate professional boundaries while remaining compassionate and effective in workplace relationships.',
    duration: '25 min',
    difficulty: 'intermediate',
    competencies: ['Professionalism', 'Communication Clarity', 'Judgment Quality'],
    icon: 'Shield',
    color: 'from-indigo-500 to-purple-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Professional Boundaries Mastery',
    scenes: [
      {
        id: 'scene-1-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Professional Boundaries training. In this module, you\'ll navigate real workplace scenarios that test your ability to maintain appropriate boundaries while building positive relationships.',
        setting: 'Modern office lobby',
        animationType: 'fadeIn',
        nextSceneId: 'scene-1-2'
      },
      {
        id: 'scene-1-2',
        title: 'The Context',
        type: 'narrative',
        content: 'You\'ve been at Calderstone Enterprises for two months. A colleague named Janet, who sits near you, has started sharing increasingly personal information with you.',
        setting: 'Open office workspace',
        character: 'Janet',
        animationType: 'slideUp',
        nextSceneId: 'scene-1-3'
      },
      {
        id: 'scene-1-3',
        title: 'Background',
        type: 'narrative',
        content: 'Over the past few weeks:\n\n• She told you detailed stories about her divorce proceedings\n• She showed you text messages from her ex-husband\n• She cried at her desk twice and expected you to comfort her\n• She now comes to your desk multiple times per day to chat\n• Your work is being interrupted, and you\'ve missed a deadline partly because of these conversations',
        animationType: 'typewriter',
        nextSceneId: 'scene-1-4'
      },
      {
        id: 'scene-1-4',
        title: 'The Moment',
        type: 'narrative',
        content: 'Today, Janet comes to your desk at 10 AM. Her eyes are red, and she looks distressed.',
        character: 'Janet',
        setting: 'Your desk',
        animationType: 'fadeIn',
        nextSceneId: 'scene-1-5'
      },
      {
        id: 'scene-1-5',
        title: 'Janet Speaks',
        type: 'narrative',
        content: '"You won\'t believe what happened last night. My ex showed up at my apartment drunk. I need to tell you everything. Do you have a minute?"',
        character: 'Janet',
        animationType: 'typewriter',
        nextSceneId: 'scene-1-6'
      },
      {
        id: 'scene-1-6',
        title: 'Your Response',
        type: 'choice',
        content: 'How do you respond to Janet?',
        choices: [
          {
            id: 'choice-1a',
            text: '"Of course! Tell me everything. That sounds terrible."',
            isCorrect: false,
            feedback: 'While compassionate, this response abandons your professional boundaries and work responsibilities. It invites an extended personal conversation during work hours.',
            points: 10
          },
          {
            id: 'choice-1b',
            text: '"I\'m really sorry, but I don\'t have time for this. I have work to do."',
            isCorrect: false,
            feedback: 'This response is too harsh and dismissive. While it sets a boundary, it lacks empathy and could damage your working relationship.',
            points: 20
          },
          {
            id: 'choice-1c',
            text: '"That sounds really difficult, Janet. I\'m not able to talk right now—I have a deadline I need to focus on. Have you thought about talking to someone through the EAP?"',
            isCorrect: true,
            feedback: 'Excellent! You expressed brief compassion, set a clear boundary about time, and redirected to appropriate resources without making false promises.',
            points: 50
          },
          {
            id: 'choice-1d',
            text: '"I\'m about to go to a meeting, sorry!" (even though you\'re not)',
            isCorrect: false,
            feedback: 'Lying to avoid difficult conversations is unprofessional and unsustainable. It doesn\'t address the underlying pattern.',
            points: 15
          }
        ],
        nextSceneId: 'scene-1-7'
      },
      {
        id: 'scene-1-7',
        title: 'Reflection',
        type: 'reflection',
        content: 'Think about a time when you had to set a boundary with a colleague or friend. What made it challenging?',
        reflection: {
          prompt: 'Describe a situation where you had to balance compassion with maintaining appropriate limits. What did you learn?',
          minLength: 50
        },
        nextSceneId: 'scene-1-8'
      },
      {
        id: 'scene-1-8',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Key Principles for Professional Boundaries:**\n\n1. **Brief Compassion** - Acknowledge the person\'s situation without diving deep\n2. **Clear Limits** - State your boundary directly and honestly\n3. **Redirect Appropriately** - Suggest proper resources (EAP, HR, professional help)\n4. **No False Promises** - Don\'t offer to continue the conversation later if you don\'t intend to\n5. **Maintain Warmth** - Be firm but kind',
        animationType: 'slideUp',
        nextSceneId: 'scene-1-9'
      },
      {
        id: 'scene-1-9',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of professional boundaries.',
        quiz: [
          {
            question: 'What is the MOST important element when setting a boundary with a colleague?',
            options: [
              'Making them feel bad so they don\'t ask again',
              'Being clear and direct while maintaining respect',
              'Avoiding the person entirely',
              'Agreeing to help later to avoid conflict now'
            ],
            correctIndex: 1,
            explanation: 'Effective boundary-setting requires clarity and directness while still treating the other person with respect and dignity.'
          },
          {
            question: 'When a colleague shares too much personal information, what is an appropriate response?',
            options: [
              'Listen to everything to be polite',
              'Report them to HR immediately',
              'Acknowledge briefly and redirect to appropriate resources',
              'Share your own personal problems to balance the conversation'
            ],
            correctIndex: 2,
            explanation: 'Brief acknowledgment combined with redirection to proper resources (like EAP) maintains professionalism while showing you care.'
          },
          {
            question: 'Why is it problematic to make up excuses to avoid difficult conversations?',
            options: [
              'It\'s dishonest and doesn\'t address the underlying pattern',
              'The person might find out and get angry',
              'It takes too much effort to remember lies',
              'HR might get involved'
            ],
            correctIndex: 0,
            explanation: 'Making up excuses is dishonest and fails to address the actual issue, allowing the problematic pattern to continue.'
          }
        ],
        nextSceneId: 'scene-1-10'
      },
      {
        id: 'scene-1-10',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Professional Boundaries module. You\'ve learned how to maintain appropriate workplace limits while remaining compassionate and professional.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 2: Social Media & Digital Boundaries
  {
    id: 'module-2',
    slug: 'digital-boundaries',
    title: 'Digital Boundaries',
    subtitle: 'Social Media & Manager Relationships',
    description: 'Navigate the complex world of social media connections with colleagues and managers while protecting your professional reputation.',
    duration: '20 min',
    difficulty: 'beginner',
    competencies: ['Judgment Quality', 'Professionalism'],
    icon: 'Smartphone',
    color: 'from-blue-500 to-cyan-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Digital Professionalism Certificate',
    scenes: [
      {
        id: 'scene-2-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Digital Boundaries training. In today\'s connected world, navigating social media relationships with colleagues requires careful judgment.',
        setting: 'Modern office with screens',
        animationType: 'fadeIn',
        nextSceneId: 'scene-2-2'
      },
      {
        id: 'scene-2-2',
        title: 'The Scenario',
        type: 'narrative',
        content: 'You\'ve been at Meridian Crestwood Industries for three weeks. Your manager, David, sends you a LinkedIn connection request.',
        setting: 'Home office',
        character: 'David (Manager)',
        animationType: 'slideUp',
        nextSceneId: 'scene-2-3'
      },
      {
        id: 'scene-2-3',
        title: 'Multiple Requests',
        type: 'narrative',
        content: 'That same day, David also sends you:\n\n• A Facebook friend request\n• An Instagram follow request\n\nYou notice that David\'s Instagram is personal — photos of his family, vacations, and occasional political posts.',
        animationType: 'typewriter',
        nextSceneId: 'scene-2-4'
      },
      {
        id: 'scene-2-4',
        title: 'Your Social Media',
        type: 'narrative',
        content: 'You\'re friendly with David at work, but you keep your personal social media fairly private. Your Facebook includes photos of you at parties and some posts that are politically charged.',
        animationType: 'fadeIn',
        nextSceneId: 'scene-2-5'
      },
      {
        id: 'scene-2-5',
        title: 'LinkedIn Decision',
        type: 'choice',
        content: 'How do you handle the LinkedIn request from your manager?',
        choices: [
          {
            id: 'choice-2a',
            text: 'Accept the LinkedIn request',
            isCorrect: true,
            feedback: 'Good choice! LinkedIn is a professional platform, and connecting with your manager there is appropriate and expected.',
            points: 25
          },
          {
            id: 'choice-2b',
            text: 'Decline the LinkedIn request',
            isCorrect: false,
            feedback: 'Declining a LinkedIn request from your manager may seem unfriendly and create unnecessary distance in a professional context.',
            points: 5
          },
          {
            id: 'choice-2c',
            text: 'Ignore the request and hope he forgets',
            isCorrect: false,
            feedback: 'Ignoring professional networking requests from your direct manager can create awkwardness and seem dismissive.',
            points: 10
          }
        ],
        nextSceneId: 'scene-2-6'
      },
      {
        id: 'scene-2-6',
        title: 'Facebook & Instagram Decision',
        type: 'choice',
        content: 'How do you handle the Facebook and Instagram requests?',
        choices: [
          {
            id: 'choice-2d',
            text: 'Accept both to be friendly and not offend your manager',
            isCorrect: false,
            feedback: 'Accepting personal social media requests just to please your boss can expose content that affects your professional relationship. Your manager seeing party photos or political posts could create bias.',
            points: 10
          },
          {
            id: 'choice-2e',
            text: 'Quietly decline or ignore both without explanation',
            isCorrect: true,
            feedback: 'Excellent judgment! Declining personal platform requests without making it a confrontation maintains boundaries appropriately. Most people don\'t expect explanations for personal social media decisions.',
            points: 35
          },
          {
            id: 'choice-2f',
            text: 'Send David a message explaining why you can\'t accept personal requests',
            isCorrect: false,
            feedback: 'While well-intentioned, sending an explanation makes the situation awkward and draws more attention to the boundary than necessary.',
            points: 15
          },
          {
            id: 'choice-2g',
            text: 'Accept Facebook but decline Instagram',
            isCorrect: false,
            feedback: 'This inconsistent approach doesn\'t address the core issue of personal content visibility and may confuse your manager.',
            points: 10
          }
        ],
        nextSceneId: 'scene-2-7'
      },
      {
        id: 'scene-2-7',
        title: 'Why This Matters',
        type: 'narrative',
        content: '**Why Platform Differentiation Matters:**\n\n• **LinkedIn** = Professional context, appropriate for work relationships\n• **Facebook/Instagram** = Personal content that could affect professional perceptions\n• **Asymmetry Risk** = Your manager seeing personal content creates power imbalance\n• **Political Content** = Different political views visible to your manager could create unconscious bias',
        animationType: 'slideUp',
        nextSceneId: 'scene-2-8'
      },
      {
        id: 'scene-2-8',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of digital boundaries.',
        quiz: [
          {
            question: 'What is the key difference between LinkedIn and personal social media platforms in a workplace context?',
            options: [
              'LinkedIn has more users',
              'LinkedIn is designed for professional networking while personal platforms contain personal content',
              'Personal platforms are more secure',
              'There is no meaningful difference'
            ],
            correctIndex: 1,
            explanation: 'LinkedIn is specifically designed for professional networking, making it appropriate for manager connections, while personal platforms contain content that could affect professional relationships.'
          },
          {
            question: 'If you decline a personal social media request from your manager, what is the best approach?',
            options: [
              'Send a detailed explanation of your social media policy',
              'Report them to HR for inappropriate behavior',
              'Quietly decline without making it a confrontation',
              'Accept temporarily then unfriend later'
            ],
            correctIndex: 2,
            explanation: 'Most people don\'t expect explanations for personal social media decisions. Quietly declining maintains the boundary without creating awkwardness.'
          }
        ],
        nextSceneId: 'scene-2-9'
      },
      {
        id: 'scene-2-9',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Digital Boundaries module. You now understand how to navigate social media connections with colleagues professionally.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 3: The Credit Thief - Handling Recognition Issues
  {
    id: 'module-3',
    slug: 'credit-and-recognition',
    title: 'Credit & Recognition',
    subtitle: 'Handling Contribution Disputes',
    description: 'Learn to address situations where your work contributions are not properly recognized, while maintaining professionalism and relationships.',
    duration: '30 min',
    difficulty: 'advanced',
    competencies: ['Judgment Quality', 'Communication Clarity', 'Professionalism', 'Composure Under Pressure'],
    icon: 'Award',
    color: 'from-amber-500 to-orange-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Professional Advocacy Certificate',
    scenes: [
      {
        id: 'scene-3-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to the Credit & Recognition module. One of the most challenging workplace situations is when your contributions aren\'t properly acknowledged. How you handle this reveals your professional maturity.',
        setting: 'Conference room',
        animationType: 'fadeIn',
        nextSceneId: 'scene-3-2'
      },
      {
        id: 'scene-3-2',
        title: 'The Project',
        type: 'narrative',
        content: 'You\'ve been working on a project at Bridgemont Solutions with a colleague named Alex. You did approximately 70% of the work — the research, the analysis, and most of the writing. Alex helped with formatting and attended a few meetings.',
        setting: 'Open office',
        character: 'Alex',
        animationType: 'slideUp',
        nextSceneId: 'scene-3-3'
      },
      {
        id: 'scene-3-3',
        title: 'The Presentation',
        type: 'narrative',
        content: 'Yesterday, in a department-wide presentation, Alex presented the project to leadership. During the presentation, Alex consistently used "I" language:\n\n• "I found that..."\n• "My analysis showed..."\n• "I recommend..."',
        character: 'Alex',
        setting: 'Large conference room',
        animationType: 'typewriter',
        nextSceneId: 'scene-3-4'
      },
      {
        id: 'scene-3-4',
        title: 'The Aftermath',
        type: 'narrative',
        content: 'Several leaders congratulated Alex afterward. Your manager, who knows you worked on the project, hasn\'t said anything to you.\n\nYou feel a mix of frustration and disappointment.',
        animationType: 'fadeIn',
        nextSceneId: 'scene-3-5'
      },
      {
        id: 'scene-3-5',
        title: 'A Colleague Approaches',
        type: 'narrative',
        content: 'A trusted colleague approaches you after the meeting:\n\n"Hey, I was in that presentation. Did Alex really do all that work? I thought you were on that project too."',
        character: 'Trusted Colleague',
        animationType: 'slideUp',
        nextSceneId: 'scene-3-6'
      },
      {
        id: 'scene-3-6',
        title: 'Responding to Your Colleague',
        type: 'choice',
        content: 'How do you respond to your colleague\'s question?',
        choices: [
          {
            id: 'choice-3a',
            text: '"Can you believe Alex? They completely stole my work! I did everything and they took all the credit. I\'m so angry right now."',
            isCorrect: false,
            feedback: 'While your frustration is understandable, using this interaction to vent and trash Alex is unprofessional and could damage your own reputation through gossip.',
            points: 10
          },
          {
            id: 'choice-3b',
            text: '"Yeah, I did most of the analysis and writing. Alex handled some of the formatting. It was a team effort."',
            isCorrect: true,
            feedback: 'Excellent! You stated the facts without excessive venting or attacking Alex\'s character. This is professional and maintains your credibility.',
            points: 30
          },
          {
            id: 'choice-3c',
            text: '"I don\'t want to talk about it. It doesn\'t matter."',
            isCorrect: false,
            feedback: 'Dismissing your own contribution while clearly harboring resentment is passive and doesn\'t serve you. It\'s okay to acknowledge the situation factually.',
            points: 15
          },
          {
            id: 'choice-3d',
            text: '"Yeah, and I\'m going to make sure everyone knows the truth. I\'m sending an email to the whole department."',
            isCorrect: false,
            feedback: 'Public confrontation or mass emails about credit disputes almost always backfire and make you look petty, regardless of how justified you are.',
            points: 5
          }
        ],
        nextSceneId: 'scene-3-7'
      },
      {
        id: 'scene-3-7',
        title: 'Planning Your Next Step',
        type: 'narrative',
        content: 'Your colleague then asks: "What are you going to do about this situation?"',
        animationType: 'fadeIn',
        nextSceneId: 'scene-3-8'
      },
      {
        id: 'scene-3-8',
        title: 'Your Action Plan',
        type: 'choice',
        content: 'What is your plan to address this situation?',
        choices: [
          {
            id: 'choice-3e',
            text: 'Schedule a meeting with your manager to discuss visibility for your contributions on future projects',
            isCorrect: true,
            feedback: 'Perfect approach! Speaking with your manager through proper channels, focused on future improvement rather than attacking Alex, is professional and effective.',
            points: 35
          },
          {
            id: 'choice-3f',
            text: 'Confront Alex publicly at the next team meeting',
            isCorrect: false,
            feedback: 'Public confrontation creates awkwardness for everyone and often backfires. It makes you look unprofessional regardless of how right you are.',
            points: 5
          },
          {
            id: 'choice-3g',
            text: 'Send an email to leadership correcting the record about who did what',
            isCorrect: false,
            feedback: 'Sending correction emails to leadership without going through your manager first violates chain of command and appears petty.',
            points: 10
          },
          {
            id: 'choice-3h',
            text: 'Do nothing and just let it go completely',
            isCorrect: false,
            feedback: 'While not actively destructive, doing nothing when you\'re clearly resentful leads to disengagement. Addressing it constructively is healthier.',
            points: 15
          }
        ],
        nextSceneId: 'scene-3-9'
      },
      {
        id: 'scene-3-9',
        title: 'The Manager Conversation',
        type: 'reflection',
        content: 'Imagine you\'re now in the meeting with your manager. How would you frame this conversation constructively?',
        reflection: {
          prompt: 'Write 2-3 sentences about how you would open the conversation with your manager, focusing on future improvement rather than blame.',
          minLength: 50
        },
        nextSceneId: 'scene-3-10'
      },
      {
        id: 'scene-3-10',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Handling Credit Disputes Professionally:**\n\n1. **Stay Factual** - Describe contributions without character attacks\n2. **Use Proper Channels** - Go to your manager, not mass emails or public confrontation\n3. **Focus Forward** - Emphasize future visibility rather than past grievances\n4. **Avoid Gossip** - Don\'t use colleagues to vent extensively\n5. **Maintain Composure** - How you handle this affects your reputation too',
        animationType: 'slideUp',
        nextSceneId: 'scene-3-11'
      },
      {
        id: 'scene-3-11',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of handling credit disputes.',
        quiz: [
          {
            question: 'What is the most appropriate channel for addressing credit disputes?',
            options: [
              'Public team meeting',
              'Email to all leadership',
              'Private conversation with your direct manager',
              'Social media post'
            ],
            correctIndex: 2,
            explanation: 'Your direct manager is the appropriate channel for addressing workplace concerns, including credit disputes.'
          },
          {
            question: 'When discussing a credit issue with your manager, what should you focus on?',
            options: [
              'How terrible your colleague is',
              'Future visibility and contribution recognition',
              'Demanding your colleague be punished',
              'Threatening to quit if it happens again'
            ],
            correctIndex: 1,
            explanation: 'Focusing on future improvement and visibility is constructive and professional, rather than dwelling on blame.'
          },
          {
            question: 'If a colleague asks about a credit dispute, what\'s the best response?',
            options: [
              'Vent extensively about how unfair it is',
              'Deny there was any problem',
              'State facts briefly without character attacks',
              'Refuse to discuss anything work-related'
            ],
            correctIndex: 2,
            explanation: 'Brief, factual responses maintain your credibility without engaging in gossip or character assassination.'
          }
        ],
        nextSceneId: 'scene-3-12'
      },
      {
        id: 'scene-3-12',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Credit & Recognition module. You now understand how to advocate for yourself professionally while maintaining workplace relationships.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 4: Disagreement in Public - Collaborative Decision Making
  {
    id: 'module-4',
    slug: 'collaborative-disagreement',
    title: 'Collaborative Disagreement',
    subtitle: 'Navigating Team Conflicts',
    description: 'Master the art of disagreeing constructively in team settings while working toward consensus and maintaining relationships.',
    duration: '35 min',
    difficulty: 'advanced',
    competencies: ['Communication Clarity', 'Composure Under Pressure', 'Judgment Quality', 'Adaptability', 'Professionalism'],
    icon: 'Users',
    color: 'from-emerald-500 to-teal-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Collaborative Leadership Certificate',
    scenes: [
      {
        id: 'scene-4-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Collaborative Disagreement training. Real teamwork involves navigating disagreement. This module will help you advocate for your position while remaining open to other perspectives.',
        setting: 'Meeting room',
        animationType: 'fadeIn',
        nextSceneId: 'scene-4-2'
      },
      {
        id: 'scene-4-2',
        title: 'The Task',
        type: 'narrative',
        content: 'You are one of four team members at Veridian Crest Holdings tasked with recommending which of two software vendors the company should select.\n\nThe team has 45 minutes to reach a recommendation that will be presented to leadership.',
        setting: 'Conference room',
        animationType: 'slideUp',
        nextSceneId: 'scene-4-3'
      },
      {
        id: 'scene-4-3',
        title: 'Your Analysis',
        type: 'narrative',
        content: 'Based on your review of the background materials, you believe **Vendor A** is clearly superior:\n\n• Better pricing\n• Better features\n• Better customer reviews\n\nYou\'ve come prepared to advocate for this choice.',
        animationType: 'typewriter',
        nextSceneId: 'scene-4-4'
      },
      {
        id: 'scene-4-4',
        title: 'The Challenge',
        type: 'narrative',
        content: 'As the discussion begins, another team member, Taylor, strongly advocates for Vendor B, citing concerns about Vendor A\'s customer support reputation.\n\n"I\'ve heard nightmare stories about Vendor A\'s support. When things go wrong, they\'re impossible to reach. Vendor B has a dedicated account manager for every client."',
        character: 'Taylor',
        animationType: 'slideUp',
        nextSceneId: 'scene-4-5'
      },
      {
        id: 'scene-4-5',
        title: 'Your Initial Response',
        type: 'choice',
        content: 'How do you respond to Taylor\'s concerns about Vendor A?',
        choices: [
          {
            id: 'choice-4a',
            text: '"That\'s not a valid concern. The data clearly shows Vendor A is better across all metrics."',
            isCorrect: false,
            feedback: 'Dismissing someone\'s concerns as "not valid" shuts down dialogue and can make you appear rigid and unwilling to listen.',
            points: 10
          },
          {
            id: 'choice-4b',
            text: '"That\'s an interesting point about support. Can you tell me more about those experiences? I\'d also like to share some data on pricing and features that might be relevant."',
            isCorrect: true,
            feedback: 'Excellent! You acknowledged their concern, asked for more information, and set up sharing your own perspective. This is collaborative dialogue.',
            points: 30
          },
          {
            id: 'choice-4c',
            text: '"Well, I guess if you all want Vendor B, that\'s fine. I don\'t want to argue."',
            isCorrect: false,
            feedback: 'Capitulating immediately without advocating for your position doesn\'t serve the team. Good ideas need to be shared, even if they\'re challenged.',
            points: 10
          },
          {
            id: 'choice-4d',
            text: '"I did all the research here, so I think I know better than someone who just heard stories."',
            isCorrect: false,
            feedback: 'Making it personal and questioning someone\'s credibility damages relationships and doesn\'t advance the decision.',
            points: 5
          }
        ],
        nextSceneId: 'scene-4-6'
      },
      {
        id: 'scene-4-6',
        title: 'The Discussion Deepens',
        type: 'narrative',
        content: 'Taylor responds: "Look, I\'m not saying the features don\'t matter. But when implementation fails, none of those features help us. I\'ve seen companies lose months of productivity because their vendor ghosted them."\n\nAnother team member, Jordan, speaks up: "Both of you have good points. How do we weigh these factors?"',
        character: 'Taylor & Jordan',
        animationType: 'fadeIn',
        nextSceneId: 'scene-4-7'
      },
      {
        id: 'scene-4-7',
        title: 'Finding Common Ground',
        type: 'choice',
        content: 'How do you help the team move forward?',
        choices: [
          {
            id: 'choice-4e',
            text: '"What if we recommend Vendor A but build in contractual protections around customer support response times? That addresses Taylor\'s concern while getting the better features."',
            isCorrect: true,
            feedback: 'Perfect! You proposed a solution that incorporates both perspectives and moves the group toward consensus while addressing legitimate concerns.',
            points: 35
          },
          {
            id: 'choice-4f',
            text: '"Let\'s just vote. Majority wins."',
            isCorrect: false,
            feedback: 'Voting without full discussion can leave team members feeling unheard and doesn\'t ensure the best decision.',
            points: 10
          },
          {
            id: 'choice-4g',
            text: '"I think we should just let the manager decide since we can\'t agree."',
            isCorrect: false,
            feedback: 'Escalating to management when the team hasn\'t fully worked through the discussion abdicates your responsibility to contribute to the decision.',
            points: 10
          },
          {
            id: 'choice-4h',
            text: '"Taylor is wrong and we\'re wasting time. Let\'s move on with Vendor A."',
            isCorrect: false,
            feedback: 'Declaring someone "wrong" and trying to force your conclusion damages team dynamics and doesn\'t address legitimate concerns.',
            points: 5
          }
        ],
        nextSceneId: 'scene-4-8'
      },
      {
        id: 'scene-4-8',
        title: 'The Unexpected Turn',
        type: 'narrative',
        content: 'After more discussion, the team starts leaning toward Vendor B. Taylor\'s concerns have resonated with others, and someone found additional data suggesting Vendor A\'s support issues are more widespread than you realized.',
        animationType: 'slideUp',
        nextSceneId: 'scene-4-9'
      },
      {
        id: 'scene-4-9',
        title: 'Accepting a Different Outcome',
        type: 'choice',
        content: 'The group is moving toward recommending Vendor B. How do you respond?',
        choices: [
          {
            id: 'choice-4i',
            text: 'Accept it gracefully and contribute to strengthening the Vendor B recommendation with your analytical skills',
            isCorrect: true,
            feedback: 'Excellent maturity! The goal is a good team decision, not winning. Contributing to the final recommendation shows you\'re a true team player.',
            points: 30
          },
          {
            id: 'choice-4j',
            text: 'Disengage and let the others finish the recommendation without your input',
            isCorrect: false,
            feedback: 'Checking out when the decision doesn\'t go your way shows poor sportsmanship and deprives the team of your valuable input.',
            points: 10
          },
          {
            id: 'choice-4k',
            text: 'Keep arguing for Vendor A and refuse to participate in the Vendor B recommendation',
            isCorrect: false,
            feedback: 'Refusing to accept the group\'s direction after full discussion is obstructive and damages your reputation as a collaborator.',
            points: 5
          },
          {
            id: 'choice-4l',
            text: 'Agree outwardly but plan to undermine the recommendation later',
            isCorrect: false,
            feedback: 'Sabotaging team decisions is a serious breach of professional trust and can have significant career consequences.',
            points: 0
          }
        ],
        nextSceneId: 'scene-4-10'
      },
      {
        id: 'scene-4-10',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Principles for Collaborative Disagreement:**\n\n1. **Advocate Clearly** - Share your position with reasoning\n2. **Listen Actively** - Understand others\' concerns fully\n3. **Stay Flexible** - Be willing to adjust based on new information\n4. **Seek Integration** - Look for solutions that address multiple concerns\n5. **Accept Outcomes** - If the group decides differently, contribute to making that decision succeed',
        animationType: 'slideUp',
        nextSceneId: 'scene-4-11'
      },
      {
        id: 'scene-4-11',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of collaborative disagreement.',
        quiz: [
          {
            question: 'What should you do when a colleague raises a concern that challenges your position?',
            options: [
              'Dismiss it as invalid and move on',
              'Acknowledge the concern and ask for more information',
              'Immediately change your position to avoid conflict',
              'Argue more forcefully to overpower them'
            ],
            correctIndex: 1,
            explanation: 'Acknowledging concerns and seeking to understand them demonstrates respect and often leads to better solutions.'
          },
          {
            question: 'If the team decides against your recommendation after full discussion, you should:',
            options: [
              'Disengage and let others finish',
              'Keep arguing until they change their minds',
              'Contribute to making the team\'s decision successful',
              'Undermine the decision in the implementation phase'
            ],
            correctIndex: 2,
            explanation: 'A true team player contributes to the success of team decisions, even when their preferred option wasn\'t chosen.'
          }
        ],
        nextSceneId: 'scene-4-12'
      },
      {
        id: 'scene-4-12',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Collaborative Disagreement module. You now understand how to navigate team conflicts while maintaining relationships and reaching good decisions.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 5: The Difficult Teammate
  {
    id: 'module-5',
    slug: 'difficult-teammates',
    title: 'Difficult Teammates',
    subtitle: 'Working with Challenging Colleagues',
    description: 'Learn to work effectively with difficult colleagues while maintaining project success and your own professional standing.',
    duration: '30 min',
    difficulty: 'advanced',
    competencies: ['Communication Clarity', 'Judgment Quality', 'Professionalism', 'Accountability'],
    icon: 'UserX',
    color: 'from-red-500 to-rose-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Conflict Navigation Certificate',
    scenes: [
      {
        id: 'scene-5-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to the Difficult Teammates module. Every workplace has challenging colleagues. This module will help you navigate these situations professionally while protecting your work and reputation.',
        setting: 'Office hallway',
        animationType: 'fadeIn',
        nextSceneId: 'scene-5-2'
      },
      {
        id: 'scene-5-2',
        title: 'The Situation',
        type: 'narrative',
        content: 'You\'ve been assigned to a three-month project at Thornbury Consulting Group with four teammates. One teammate, Jordan, has become increasingly difficult to work with.',
        setting: 'Project room',
        character: 'Jordan',
        animationType: 'slideUp',
        nextSceneId: 'scene-5-3'
      },
      {
        id: 'scene-5-3',
        title: 'Jordan\'s Behavior',
        type: 'narrative',
        content: 'Jordan\'s problematic behaviors include:\n\n• Misses deadlines and gives last-minute excuses\n• In meetings, interrupts others and dismisses their ideas\n• Takes credit for team successes but blames others for problems\n• Has complained about you to your manager (you learned through a colleague)\n• Is technically skilled and has been with the company longer than you',
        animationType: 'typewriter',
        nextSceneId: 'scene-5-4'
      },
      {
        id: 'scene-5-4',
        title: 'The Stakes',
        type: 'narrative',
        content: 'It\'s now month two. The project is at risk because Jordan\'s deliverables are consistently late.\n\nYour manager has asked to meet with you tomorrow to discuss "how the project is going."',
        animationType: 'fadeIn',
        nextSceneId: 'scene-5-5'
      },
      {
        id: 'scene-5-5',
        title: 'Preparing for the Manager Meeting',
        type: 'narrative',
        content: 'You need to prepare what to say to your manager. This is a critical conversation that will shape how the situation is addressed.',
        setting: 'Your desk, evening',
        animationType: 'slideUp',
        nextSceneId: 'scene-5-6'
      },
      {
        id: 'scene-5-6',
        title: 'Describing the Situation',
        type: 'choice',
        content: 'How will you describe the situation to your manager?',
        choices: [
          {
            id: 'choice-5a',
            text: '"Jordan is toxic and impossible to work with. They\'re ruining everything and the project is going to fail because of them."',
            isCorrect: false,
            feedback: 'Vague complaints about someone being "toxic" without specific examples come across as personal attacks rather than professional observations.',
            points: 10
          },
          {
            id: 'choice-5b',
            text: '"We\'ve had some deadline challenges. Jordan\'s deliverables have been late three times, which pushed our Phase 2 start date back two weeks. I want to discuss how we can address this."',
            isCorrect: true,
            feedback: 'Excellent! You focused on specific, work-related impacts without personal attacks. This is professional and actionable.',
            points: 35
          },
          {
            id: 'choice-5c',
            text: '"Everything is fine. No problems to report."',
            isCorrect: false,
            feedback: 'Hiding problems from your manager doesn\'t serve the project and may make things worse when issues inevitably surface.',
            points: 5
          },
          {
            id: 'choice-5d',
            text: '"Did you know Jordan has been complaining about me? I need to defend myself against whatever they said."',
            isCorrect: false,
            feedback: 'Getting defensive about what Jordan may have said shifts the conversation away from project concerns and makes it personal.',
            points: 10
          }
        ],
        nextSceneId: 'scene-5-7'
      },
      {
        id: 'scene-5-7',
        title: 'Manager Asks for Solutions',
        type: 'narrative',
        content: 'Your manager listens and then asks: "What specific actions would you recommend to address the project risk?"',
        character: 'Manager',
        animationType: 'fadeIn',
        nextSceneId: 'scene-5-8'
      },
      {
        id: 'scene-5-8',
        title: 'Proposing Solutions',
        type: 'choice',
        content: 'What specific actions do you recommend?',
        choices: [
          {
            id: 'choice-5e',
            text: '"Remove Jordan from the project immediately."',
            isCorrect: false,
            feedback: 'Jumping straight to removal is disproportionate and doesn\'t show you\'ve tried to address the situation constructively.',
            points: 10
          },
          {
            id: 'choice-5f',
            text: '"I recommend we implement earlier check-ins with clearer deliverable milestones. Maybe weekly 15-minute syncs where everyone reports progress. This creates accountability without singling anyone out."',
            isCorrect: true,
            feedback: 'Excellent! You proposed a structural solution that addresses the accountability issue without making it a personal attack on Jordan.',
            points: 35
          },
          {
            id: 'choice-5g',
            text: '"That\'s not my job to figure out. You\'re the manager."',
            isCorrect: false,
            feedback: 'Expecting your manager to solve problems without your input shows poor initiative and doesn\'t leverage your on-the-ground knowledge.',
            points: 5
          },
          {
            id: 'choice-5h',
            text: '"I\'ll just do Jordan\'s work myself to make sure things get done on time."',
            isCorrect: false,
            feedback: 'Taking on someone else\'s work doesn\'t solve the underlying problem and will lead to burnout and resentment.',
            points: 10
          }
        ],
        nextSceneId: 'scene-5-9'
      },
      {
        id: 'scene-5-9',
        title: 'Reflection',
        type: 'reflection',
        content: 'Think about how you would contribute to the proposed solution.',
        reflection: {
          prompt: 'Write 2-3 sentences about what you personally would commit to doing to help the project succeed, even with a difficult teammate.',
          minLength: 40
        },
        nextSceneId: 'scene-5-10'
      },
      {
        id: 'scene-5-10',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Working with Difficult Colleagues:**\n\n1. **Focus on Impact** - Describe work effects, not personality flaws\n2. **Use Specifics** - Cite concrete examples, not generalizations\n3. **Propose Solutions** - Don\'t just complain; suggest fixes\n4. **Stay Professional** - No personal attacks, even when justified\n5. **Take Ownership** - Position yourself as part of the solution',
        animationType: 'slideUp',
        nextSceneId: 'scene-5-11'
      },
      {
        id: 'scene-5-11',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of handling difficult teammates.',
        quiz: [
          {
            question: 'When describing a colleague\'s problematic behavior to your manager, you should focus on:',
            options: [
              'Their personality flaws',
              'Specific work impacts with examples',
              'What other colleagues think of them',
              'How much you dislike working with them'
            ],
            correctIndex: 1,
            explanation: 'Focusing on specific work impacts keeps the conversation professional and actionable, rather than personal.'
          },
          {
            question: 'What\'s the best approach when proposing solutions for team challenges?',
            options: [
              'Demand the difficult person be removed',
              'Suggest structural changes that create accountability for everyone',
              'Offer to do everyone\'s work yourself',
              'Tell your manager to figure it out'
            ],
            correctIndex: 1,
            explanation: 'Structural solutions address problems without singling people out and are more likely to be implemented.'
          }
        ],
        nextSceneId: 'scene-5-12'
      },
      {
        id: 'scene-5-12',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Difficult Teammates module. You now understand how to navigate challenging colleague situations professionally.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 6: Receiving Tough Feedback
  {
    id: 'module-6',
    slug: 'receiving-feedback',
    title: 'Receiving Tough Feedback',
    subtitle: 'Coachability Under Pressure',
    description: 'Develop the ability to receive difficult feedback gracefully and transform it into meaningful professional growth.',
    duration: '25 min',
    difficulty: 'intermediate',
    competencies: ['Coachability', 'Composure Under Pressure', 'Communication Clarity', 'Professionalism'],
    icon: 'MessageSquare',
    color: 'from-violet-500 to-purple-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Coachability Excellence Certificate',
    scenes: [
      {
        id: 'scene-6-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Receiving Tough Feedback training. The ability to receive feedback non-defensively—especially difficult feedback—is one of the most valuable professional skills you can develop.',
        setting: 'Manager\'s office',
        animationType: 'fadeIn',
        nextSceneId: 'scene-6-2'
      },
      {
        id: 'scene-6-2',
        title: 'The Meeting',
        type: 'narrative',
        content: 'Your manager, Patricia, has scheduled a one-on-one meeting labeled "Performance Discussion." You\'ve been with the company for eight months.',
        setting: 'Private office',
        character: 'Patricia (Manager)',
        animationType: 'slideUp',
        nextSceneId: 'scene-6-3'
      },
      {
        id: 'scene-6-3',
        title: 'The Feedback',
        type: 'narrative',
        content: 'Patricia begins: "I need to share some feedback that might be hard to hear. Over the past few months, I\'ve noticed a pattern that concerns me. When people give you suggestions or pushback, you tend to become defensive. You explain why you did what you did instead of really hearing what they\'re saying.\n\nI\'ve observed this in team meetings at least four times, and two colleagues have mentioned it to me independently. This is affecting how people perceive you and limiting your growth."',
        character: 'Patricia',
        animationType: 'typewriter',
        nextSceneId: 'scene-6-4'
      },
      {
        id: 'scene-6-4',
        title: 'Your Initial Response',
        type: 'choice',
        content: 'What is your immediate response to Patricia\'s feedback?',
        choices: [
          {
            id: 'choice-6a',
            text: '"That\'s not fair. Who said that about me? I\'m not defensive—I\'m just explaining my reasoning."',
            isCorrect: false,
            feedback: 'This response ironically demonstrates the exact defensive pattern Patricia described. Asking "who said that" and immediately arguing doesn\'t show receptivity.',
            points: 5
          },
          {
            id: 'choice-6b',
            text: '"Thank you for telling me directly. Can you give me a specific example so I can understand what this looks like?"',
            isCorrect: true,
            feedback: 'Excellent! You thanked her for the feedback and asked for specifics to understand better—not to argue, but to learn.',
            points: 35
          },
          {
            id: 'choice-6c',
            text: '"Okay." (Silence, visible frustration)',
            isCorrect: false,
            feedback: 'While not argumentative, shutting down and showing visible frustration signals you\'re not truly open to the feedback.',
            points: 15
          },
          {
            id: 'choice-6d',
            text: '"Why didn\'t you tell me this sooner? This is the first I\'m hearing of this."',
            isCorrect: false,
            feedback: 'Deflecting to blame the timing of feedback is another form of defensiveness that avoids engaging with the content.',
            points: 10
          }
        ],
        nextSceneId: 'scene-6-5'
      },
      {
        id: 'scene-6-5',
        title: 'Patricia Provides an Example',
        type: 'narrative',
        content: 'Patricia responds: "Sure. In last week\'s design review, when Morgan suggested a different approach to the user flow, you immediately started explaining why your approach was better. You didn\'t ask any questions about Morgan\'s idea or try to understand their perspective.\n\nI could see Morgan disengage after that. The goal isn\'t to defend your work—it\'s to get to the best solution."',
        character: 'Patricia',
        animationType: 'fadeIn',
        nextSceneId: 'scene-6-6'
      },
      {
        id: 'scene-6-6',
        title: 'Acknowledging the Pattern',
        type: 'choice',
        content: 'How do you respond to the specific example?',
        choices: [
          {
            id: 'choice-6e',
            text: '"But Morgan\'s suggestion wouldn\'t have worked because—"',
            isCorrect: false,
            feedback: 'Starting to justify the specific incident shows you\'re still in defense mode rather than learning mode.',
            points: 5
          },
          {
            id: 'choice-6f',
            text: '"I appreciate you sharing that example. I didn\'t realize I was coming across that way. I thought I was just explaining my thinking, but I can see how it shut down the conversation."',
            isCorrect: true,
            feedback: 'Perfect! You acknowledged the pattern and showed insight into how your behavior affected others, demonstrating genuine receptivity.',
            points: 35
          },
          {
            id: 'choice-6g',
            text: '"Morgan always has problems with my work. This is personal."',
            isCorrect: false,
            feedback: 'Suggesting the feedback is personal rather than professional shifts blame and avoids addressing your own behavior.',
            points: 5
          },
          {
            id: 'choice-6h',
            text: '"Fine, I\'ll just never share my opinion again."',
            isCorrect: false,
            feedback: 'This dramatic, passive-aggressive response shows you\'re hurt rather than receptive. It\'s not what\'s being asked of you.',
            points: 10
          }
        ],
        nextSceneId: 'scene-6-7'
      },
      {
        id: 'scene-6-7',
        title: 'The Stakes Are Raised',
        type: 'narrative',
        content: 'Patricia adds: "I want to be direct with you. This pattern is holding you back from a promotion. The senior roles require collaboration and the ability to incorporate feedback. If this doesn\'t change in the next quarter, it will be noted in your formal review."',
        character: 'Patricia',
        animationType: 'slideUp',
        nextSceneId: 'scene-6-8'
      },
      {
        id: 'scene-6-8',
        title: 'Responding to Stakes',
        type: 'choice',
        content: 'With the stakes now raised, how do you respond?',
        choices: [
          {
            id: 'choice-6i',
            text: '"I understand. I want to work on this. Can we set up check-ins so you can tell me if you see it happening?"',
            isCorrect: true,
            feedback: 'Excellent composure! You stayed steady, accepted the feedback, and proactively asked for ongoing support—exactly what coachability looks like.',
            points: 25
          },
          {
            id: 'choice-6j',
            text: '"So now my job is at risk? That seems like an overreaction."',
            isCorrect: false,
            feedback: 'Characterizing the consequence as an "overreaction" is defensive and misses the opportunity to demonstrate you can change.',
            points: 5
          },
          {
            id: 'choice-6k',
            text: '"Maybe this just isn\'t the right place for me then."',
            isCorrect: false,
            feedback: 'Threatening to leave when given constructive feedback shows you can\'t handle criticism—exactly the problem being addressed.',
            points: 5
          },
          {
            id: 'choice-6l',
            text: '"I guess I\'ll try to do better." (Deflated tone)',
            isCorrect: false,
            feedback: 'A deflated, resigned response lacks the commitment and energy needed to actually make a change. It suggests you feel defeated, not motivated.',
            points: 10
          }
        ],
        nextSceneId: 'scene-6-9'
      },
      {
        id: 'scene-6-9',
        title: 'Reflection',
        type: 'reflection',
        content: 'Think about how you typically respond to criticism.',
        reflection: {
          prompt: 'Describe a specific action you could take in the next meeting when someone challenges your idea. What would you do differently?',
          minLength: 40
        },
        nextSceneId: 'scene-6-10'
      },
      {
        id: 'scene-6-10',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Receiving Tough Feedback:**\n\n1. **Thank, Don\'t Argue** - Express gratitude for directness\n2. **Ask Questions to Understand** - Not "gotcha" questions, but genuine ones\n3. **Acknowledge the Pattern** - Even if it\'s hard to hear\n4. **Stay Steady Under Stakes** - Don\'t panic or become resentful\n5. **Commit to Action** - Ask for specific ways to improve and follow up',
        animationType: 'slideUp',
        nextSceneId: 'scene-6-11'
      },
      {
        id: 'scene-6-11',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of receiving feedback.',
        quiz: [
          {
            question: 'What\'s the most effective immediate response to difficult feedback?',
            options: [
              'Explain why your behavior was justified',
              'Ask who complained about you',
              'Thank them and ask for specific examples',
              'Promise to change without understanding the issue'
            ],
            correctIndex: 2,
            explanation: 'Thanking someone for direct feedback and asking for specifics shows you\'re open to learning, not defending.'
          },
          {
            question: 'When feedback has career consequences attached, you should:',
            options: [
              'Threaten to leave the company',
              'Stay steady and commit to working on it',
              'Argue that the consequences are unfair',
              'Become visibly upset to show you care'
            ],
            correctIndex: 1,
            explanation: 'Maintaining composure and demonstrating commitment to change is the only response that can actually help your situation.'
          }
        ],
        nextSceneId: 'scene-6-12'
      },
      {
        id: 'scene-6-12',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Receiving Tough Feedback module. You now understand how to transform criticism into professional growth.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 7: The Harsh Critic
  {
    id: 'module-7',
    slug: 'handling-harsh-criticism',
    title: 'Handling Harsh Critics',
    subtitle: 'Extracting Value from Difficult Delivery',
    description: 'Learn to extract valuable feedback from criticism delivered harshly, maintaining composure while preserving your professional dignity.',
    duration: '20 min',
    difficulty: 'advanced',
    competencies: ['Coachability', 'Composure Under Pressure', 'Communication Clarity', 'Professionalism'],
    icon: 'AlertTriangle',
    color: 'from-orange-500 to-red-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Professional Resilience Certificate',
    scenes: [
      {
        id: 'scene-7-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Handling Harsh Critics. Some brilliant colleagues deliver feedback poorly. Learning to extract value from harsh criticism—without matching their aggression or collapsing—is a rare and valuable skill.',
        setting: 'Conference room',
        animationType: 'fadeIn',
        nextSceneId: 'scene-7-2'
      },
      {
        id: 'scene-7-2',
        title: 'The Presentation',
        type: 'narrative',
        content: 'You\'ve just presented a project proposal to a cross-functional team at Meridian Crestwood Industries. You put significant effort into the research and recommendations.',
        setting: 'Large conference room',
        animationType: 'slideUp',
        nextSceneId: 'scene-7-3'
      },
      {
        id: 'scene-7-3',
        title: 'Victor Speaks',
        type: 'narrative',
        content: 'After your presentation, a senior colleague named Victor, who has a reputation for being blunt, speaks up:\n\n"I\'m going to be honest. This proposal has some serious problems. The timeline is unrealistic—I\'ve seen this exact approach fail twice before. Your cost estimates are missing at least three major line items. And the risk section reads like it was written by someone who\'s never actually run a project.\n\nDid you get any input from anyone who\'s done this before, or did you just put this together on your own?"',
        character: 'Victor',
        animationType: 'typewriter',
        nextSceneId: 'scene-7-4'
      },
      {
        id: 'scene-7-4',
        title: 'The Room Watches',
        type: 'narrative',
        content: 'Others in the room shift uncomfortably. All eyes are on you, waiting to see how you respond to Victor\'s harsh critique.',
        setting: 'Conference room, tension visible',
        animationType: 'fadeIn',
        nextSceneId: 'scene-7-5'
      },
      {
        id: 'scene-7-5',
        title: 'Your Response',
        type: 'choice',
        content: 'What do you say to Victor?',
        choices: [
          {
            id: 'choice-7a',
            text: '"There\'s no need to be so rude about it, Victor. I worked hard on this."',
            isCorrect: false,
            feedback: 'Attacking Victor\'s delivery shifts focus to tone rather than content and makes you look defensive. Others in the room may sympathize but won\'t respect it.',
            points: 10
          },
          {
            id: 'choice-7b',
            text: '"Thanks for the direct feedback, Victor. You\'re right that I should revisit the timeline and cost estimates. Can you tell me more about the previous attempts you mentioned? That context would help."',
            isCorrect: true,
            feedback: 'Excellent! You stayed calm, acknowledged valid points, and asked a substantive question to learn more. This maintains your dignity while showing you\'re coachable.',
            points: 40
          },
          {
            id: 'choice-7c',
            text: '"Actually, if you had read the appendix, you would see I addressed all of those concerns."',
            isCorrect: false,
            feedback: 'Counter-attacking with a "gotcha" response escalates the conflict and makes you look defensive, not confident.',
            points: 10
          },
          {
            id: 'choice-7d',
            text: '"I\'m sorry, you\'re right. I should never have presented this. It\'s not ready."',
            isCorrect: false,
            feedback: 'Collapsing into excessive apology shows you can\'t handle criticism and surrenders any ground for the valid parts of your work.',
            points: 10
          }
        ],
        nextSceneId: 'scene-7-6'
      },
      {
        id: 'scene-7-6',
        title: 'Victor Continues',
        type: 'narrative',
        content: 'Victor, slightly surprised by your measured response, continues: "Look, the previous projects failed because they underestimated the integration complexity. Your timeline assumes everything goes smoothly, which never happens. You need buffer time and contingency planning."',
        character: 'Victor',
        animationType: 'fadeIn',
        nextSceneId: 'scene-7-7'
      },
      {
        id: 'scene-7-7',
        title: 'Following Up',
        type: 'choice',
        content: 'How do you continue the conversation?',
        choices: [
          {
            id: 'choice-7e',
            text: '"That\'s really helpful context. Could we schedule time this week for you to walk me through what went wrong in those previous projects? I want to make sure I incorporate those lessons."',
            isCorrect: true,
            feedback: 'Perfect! You\'ve turned a harsh critic into a potential resource. By showing genuine interest in learning, you\'ve defused the tension and gained a mentor.',
            points: 35
          },
          {
            id: 'choice-7f',
            text: '"Well, my project is different from those failed ones."',
            isCorrect: false,
            feedback: 'Dismissing relevant historical experience shows you\'re not learning from Victor\'s feedback, just defending.',
            points: 10
          },
          {
            id: 'choice-7g',
            text: '"Can we move on? I think you\'ve made your point."',
            isCorrect: false,
            feedback: 'Trying to shut down the conversation shows you\'re uncomfortable and not interested in the valuable information being offered.',
            points: 10
          },
          {
            id: 'choice-7h',
            text: '"Maybe someone else should lead this project then."',
            isCorrect: false,
            feedback: 'Offering to give up shows you can\'t handle pressure. Leaders get criticized—the question is how they respond.',
            points: 5
          }
        ],
        nextSceneId: 'scene-7-8'
      },
      {
        id: 'scene-7-9',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Handling Harsh Critics:**\n\n1. **Separate Delivery from Content** - Focus on what\'s being said, not how\n2. **Stay Calm** - No visible anger or collapse\n3. **Acknowledge Valid Points** - Find the truth in the criticism\n4. **Ask Substance Questions** - Learn more rather than defend\n5. **Maintain Dignity** - Neither grovel nor attack\n6. **Transform Critics to Resources** - Harsh critics often have valuable knowledge',
        animationType: 'slideUp',
        nextSceneId: 'scene-7-10'
      },
      {
        id: 'scene-7-10',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of handling harsh criticism.',
        quiz: [
          {
            question: 'When someone delivers harsh but potentially valid criticism, you should:',
            options: [
              'Call out their rudeness first',
              'Acknowledge valid points and ask clarifying questions',
              'Apologize profusely and promise to redo everything',
              'Defend every point they raised'
            ],
            correctIndex: 1,
            explanation: 'Focusing on content rather than delivery allows you to extract value while maintaining your composure and dignity.'
          },
          {
            question: 'What opportunity do harsh critics often present?',
            options: [
              'A chance to prove them wrong publicly',
              'Valuable knowledge and experience that could help your work',
              'An excuse to escalate to HR',
              'Evidence for a hostile work environment claim'
            ],
            correctIndex: 1,
            explanation: 'Harsh critics are often harsh because they\'ve seen failures before. Their experience can be invaluable if you approach it as a learning opportunity.'
          }
        ],
        nextSceneId: 'scene-7-11'
      },
      {
        id: 'scene-7-11',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Handling Harsh Critics module. You now understand how to extract value from difficult feedback while maintaining your professional composure.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 8: Process vs. Judgment
  {
    id: 'module-8',
    slug: 'process-deviation',
    title: 'Process vs. Judgment',
    subtitle: 'When to Follow or Bend the Rules',
    description: 'Learn to navigate situations where strict process adherence conflicts with good judgment, understanding when deviation is appropriate.',
    duration: '25 min',
    difficulty: 'advanced',
    competencies: ['Judgment Quality', 'Accountability', 'Professionalism', 'Communication Clarity'],
    icon: 'Scale',
    color: 'from-cyan-500 to-blue-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Professional Judgment Certificate',
    scenes: [
      {
        id: 'scene-8-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Process vs. Judgment training. SOPs exist for good reasons, but rigid adherence can sometimes cause harm. This module helps you navigate the tension between following rules and exercising judgment.',
        setting: 'Customer service center',
        animationType: 'fadeIn',
        nextSceneId: 'scene-8-2'
      },
      {
        id: 'scene-8-2',
        title: 'The SOP',
        type: 'narrative',
        content: 'You work in operations at Novellum Services. Your team follows a Standard Operating Procedure for processing customer refund requests:\n\n1. Verify customer identity (two-factor)\n2. Check purchase in system\n3. Confirm refund eligibility (within 30-day window, item returned)\n4. Get supervisor approval for refunds over $500\n5. Process refund and send confirmation email',
        setting: 'Your workstation',
        animationType: 'slideUp',
        nextSceneId: 'scene-8-3'
      },
      {
        id: 'scene-8-3',
        title: 'The Customer Call',
        type: 'narrative',
        content: 'A customer calls, extremely upset. They purchased a $750 item 35 days ago. The item was defective, and they\'ve been trying to return it for a week but kept getting transferred between departments.',
        character: 'Upset Customer',
        animationType: 'typewriter',
        nextSceneId: 'scene-8-4'
      },
      {
        id: 'scene-8-4',
        title: 'The Threat',
        type: 'narrative',
        content: 'The customer says: "This is absolutely unacceptable. I\'ve wasted hours on this. I\'m going to dispute this charge with my credit card company and post reviews everywhere about how terrible your service is."\n\nYour supervisor is in a meeting for the next two hours. The customer is demanding an immediate refund.',
        character: 'Customer (angry)',
        animationType: 'fadeIn',
        nextSceneId: 'scene-8-5'
      },
      {
        id: 'scene-8-5',
        title: 'The Dilemma',
        type: 'narrative',
        content: '**The facts:**\n• SOP requires supervisor approval for $500+ refunds\n• Item is 5 days outside the 30-day window\n• Customer has legitimate grievance (company transfers caused delay)\n• Your commission/rating doesn\'t depend on this decision\n• A chargeback would cost the company more than the refund',
        animationType: 'slideUp',
        nextSceneId: 'scene-8-6'
      },
      {
        id: 'scene-8-6',
        title: 'Your Decision',
        type: 'choice',
        content: 'What do you do?',
        choices: [
          {
            id: 'choice-8a',
            text: '"I understand your frustration, but policy is policy. The return window was 30 days, and I can\'t process this without my supervisor. You\'ll have to call back."',
            isCorrect: false,
            feedback: 'Rigid adherence to policy when the company caused the delay is poor judgment. The customer has a legitimate grievance and you\'re not considering the bigger picture.',
            points: 10
          },
          {
            id: 'choice-8b',
            text: '"I can see our transfers caused this delay, which isn\'t fair to you. I can authorize up to $500 immediately, and I\'m escalating the remaining $250 to my supervisor with a strong recommendation for approval. Can I call you back within 2 hours?"',
            isCorrect: true,
            feedback: 'Excellent judgment! You acknowledged the company\'s fault, used your authority appropriately, and created a clear path forward without completely bypassing process.',
            points: 40
          },
          {
            id: 'choice-8c',
            text: '"Fine, I\'ll just process the full $750 refund. The policy is stupid anyway."',
            isCorrect: false,
            feedback: 'Bypassing process entirely and dismissing policy as "stupid" shows poor judgment. Even when deviation is warranted, it should be thoughtful and documented.',
            points: 15
          },
          {
            id: 'choice-8d',
            text: '"I\'m going to interrupt my supervisor\'s meeting because this is urgent."',
            isCorrect: false,
            feedback: 'Interrupting a meeting for a routine escalation (even an urgent one) shows poor judgment about organizational priorities.',
            points: 10
          }
        ],
        nextSceneId: 'scene-8-7'
      },
      {
        id: 'scene-8-7',
        title: 'After the Call',
        type: 'narrative',
        content: 'After handling the call, you need to decide how to document and follow up on this situation.',
        animationType: 'fadeIn',
        nextSceneId: 'scene-8-8'
      },
      {
        id: 'scene-8-8',
        title: 'Documentation',
        type: 'choice',
        content: 'How do you handle the documentation and follow-up?',
        choices: [
          {
            id: 'choice-8e',
            text: 'Document everything in detail, note the exception circumstances, and flag for supervisor review with your reasoning',
            isCorrect: true,
            feedback: 'Perfect! Transparency about deviations, with clear reasoning documented, allows the organization to learn and adjust processes appropriately.',
            points: 30
          },
          {
            id: 'choice-8f',
            text: 'Process it quietly and hope no one notices the policy deviation',
            isCorrect: false,
            feedback: 'Hiding deviations undermines trust and prevents organizational learning. If your judgment was sound, it should withstand scrutiny.',
            points: 5
          },
          {
            id: 'choice-8g',
            text: 'Wait until your supervisor is free and then ask what you should have done',
            isCorrect: false,
            feedback: 'Asking after the fact without having acted shows indecisiveness. The situation required action.',
            points: 10
          },
          {
            id: 'choice-8h',
            text: 'Blame the previous departments for creating this situation in your notes',
            isCorrect: false,
            feedback: 'While documenting facts is appropriate, framing notes as blame shifts focus from solving the problem to assigning fault.',
            points: 10
          }
        ],
        nextSceneId: 'scene-8-9'
      },
      {
        id: 'scene-8-9',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Navigating Process vs. Judgment:**\n\n1. **Understand the Why** - Know why the process exists before deviating\n2. **Consider All Stakeholders** - Customer, company, and precedent\n3. **Use Your Authority First** - Do what you can within your power\n4. **Document Deviations** - Be transparent about exceptions and reasoning\n5. **Own Your Decisions** - Take accountability for judgments you make',
        animationType: 'slideUp',
        nextSceneId: 'scene-8-10'
      },
      {
        id: 'scene-8-10',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of process vs. judgment.',
        quiz: [
          {
            question: 'When is it appropriate to deviate from standard process?',
            options: [
              'Whenever it makes the customer happy',
              'Never - process exists for a reason',
              'When rigid adherence would cause harm and you can document your reasoning',
              'Only when your supervisor explicitly approves in advance'
            ],
            correctIndex: 2,
            explanation: 'Good judgment involves knowing when process serves its purpose and when rigid adherence causes harm. Documentation ensures accountability.'
          },
          {
            question: 'What should you do when you make a judgment call that deviates from standard process?',
            options: [
              'Keep it quiet to avoid scrutiny',
              'Document the deviation and your reasoning transparently',
              'Blame the process for being flawed',
              'Wait until asked before mentioning it'
            ],
            correctIndex: 1,
            explanation: 'Transparency about deviations with clear reasoning allows organizational learning and demonstrates accountability.'
          }
        ],
        nextSceneId: 'scene-8-11'
      },
      {
        id: 'scene-8-11',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Process vs. Judgment module. You now understand how to navigate the tension between rules and good judgment.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 9: The Expense Report - Integrity in Small Things
  {
    id: 'module-9',
    slug: 'workplace-integrity',
    title: 'Workplace Integrity',
    subtitle: 'Ethics When No One is Watching',
    description: 'Develop unwavering integrity in everyday workplace situations, understanding that character is revealed in small choices.',
    duration: '20 min',
    difficulty: 'beginner',
    competencies: ['Judgment Quality', 'Professionalism', 'Accountability'],
    icon: 'FileCheck',
    color: 'from-emerald-500 to-green-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Professional Integrity Certificate',
    scenes: [
      {
        id: 'scene-9-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Workplace Integrity training. Character is revealed in small choices when no one is watching. This module explores everyday ethical situations that shape your professional reputation.',
        setting: 'Home office, evening',
        animationType: 'fadeIn',
        nextSceneId: 'scene-9-2'
      },
      {
        id: 'scene-9-2',
        title: 'The Expense Report',
        type: 'narrative',
        content: 'You\'re completing your expense report at Bridgemont Solutions after a business trip. Your company\'s policy states:\n\n"All expenses must be documented with receipts. Business meals require notation of attendees and business purpose."',
        setting: 'Your desk with receipts',
        animationType: 'slideUp',
        nextSceneId: 'scene-9-3'
      },
      {
        id: 'scene-9-3',
        title: 'Your Receipts',
        type: 'narrative',
        content: 'As you review your receipts, you find:\n\n1. **$45** - Dinner with a client (legitimate business expense)\n2. **$28** - Personal dinner alone (not business-related)\n3. **$52 or $82?** - Torn receipt from business lunch, amount unclear\n4. **$15** - Taxi to client meeting, but receipt is missing',
        animationType: 'typewriter',
        nextSceneId: 'scene-9-4'
      },
      {
        id: 'scene-9-4',
        title: 'The $28 Personal Dinner',
        type: 'choice',
        content: 'How do you handle the $28 personal dinner receipt?',
        choices: [
          {
            id: 'choice-9a',
            text: 'Include it anyway - who\'s going to notice one dinner?',
            isCorrect: false,
            feedback: 'Including personal expenses is dishonest regardless of whether you\'d be caught. Small integrity violations compound over time.',
            points: 0
          },
          {
            id: 'choice-9b',
            text: 'Leave it out - it wasn\'t a business expense',
            isCorrect: true,
            feedback: 'Correct! The meal wasn\'t business-related, so it shouldn\'t be included regardless of the low likelihood of detection.',
            points: 25
          },
          {
            id: 'choice-9c',
            text: 'Include it but change the description to look like a business meal',
            isCorrect: false,
            feedback: 'Falsifying documentation is fraud, even for small amounts. This is a serious integrity violation.',
            points: 0
          },
          {
            id: 'choice-9d',
            text: 'Include it because "the company owes me for all my extra work"',
            isCorrect: false,
            feedback: 'Rationalizing dishonesty with grievances doesn\'t make it ethical. If you have concerns about compensation, address them directly.',
            points: 5
          }
        ],
        nextSceneId: 'scene-9-5'
      },
      {
        id: 'scene-9-5',
        title: 'The Torn Receipt',
        type: 'choice',
        content: 'The torn receipt could be read as $52 or $82. It was a legitimate business lunch. What do you claim?',
        choices: [
          {
            id: 'choice-9e',
            text: 'Claim $82 - you deserve the benefit of the doubt',
            isCorrect: false,
            feedback: 'Taking the higher amount when uncertain is a form of padding expenses. Integrity means being conservative when facts are unclear.',
            points: 10
          },
          {
            id: 'choice-9f',
            text: 'Claim $52 (the conservative reading) and note the receipt damage',
            isCorrect: true,
            feedback: 'Excellent! Taking the conservative interpretation and documenting the issue shows integrity and transparency.',
            points: 25
          },
          {
            id: 'choice-9g',
            text: 'Try to find the original charge on your credit card statement',
            isCorrect: true,
            feedback: 'Even better! Making the effort to find the accurate amount shows thorough integrity.',
            points: 25
          },
          {
            id: 'choice-9h',
            text: 'Exclude it entirely since the receipt is damaged',
            isCorrect: false,
            feedback: 'While conservative, this unnecessarily penalizes yourself. Noting the issue and claiming the lower amount is sufficient.',
            points: 15
          }
        ],
        nextSceneId: 'scene-9-6'
      },
      {
        id: 'scene-9-6',
        title: 'The Missing Taxi Receipt',
        type: 'choice',
        content: 'The $15 taxi was a legitimate business expense to a client meeting, but you lost the receipt. How do you handle this?',
        choices: [
          {
            id: 'choice-9i',
            text: 'Include it with a note explaining the missing receipt and offer to exclude if required',
            isCorrect: true,
            feedback: 'Perfect! You\'re being honest about the situation while acknowledging the expense was legitimate. Transparency with flexibility is the right approach.',
            points: 25
          },
          {
            id: 'choice-9j',
            text: 'Create a fake receipt to document the expense',
            isCorrect: false,
            feedback: 'Creating fake documentation is fraud, regardless of whether the underlying expense was legitimate.',
            points: 0
          },
          {
            id: 'choice-9k',
            text: 'Exclude it entirely since you can\'t prove it',
            isCorrect: false,
            feedback: 'While technically compliant, you could simply disclose the missing receipt and let finance decide.',
            points: 15
          },
          {
            id: 'choice-9l',
            text: 'Add $15 to another receipt to make up for it',
            isCorrect: false,
            feedback: 'Inflating other receipts is falsification, even if it "balances out" a legitimate expense.',
            points: 0
          }
        ],
        nextSceneId: 'scene-9-7'
      },
      {
        id: 'scene-9-7',
        title: 'Why This Matters',
        type: 'narrative',
        content: '**Why Small Integrity Choices Matter:**\n\n• Most people wouldn\'t steal $28 from a colleague, but many would submit it on an expense report\n• Small rationalizations ("the company owes me") lead to larger ones over time\n• People who demonstrate integrity in small matters earn trust for large ones\n• Your reputation is built through accumulated small choices',
        animationType: 'slideUp',
        nextSceneId: 'scene-9-8'
      },
      {
        id: 'scene-9-8',
        title: 'Reflection',
        type: 'reflection',
        content: 'Think about integrity in your own life.',
        reflection: {
          prompt: 'Describe a time when you faced a small ethical choice when no one was watching. What did you decide and why?',
          minLength: 40
        },
        nextSceneId: 'scene-9-9'
      },
      {
        id: 'scene-9-9',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of workplace integrity.',
        quiz: [
          {
            question: 'When expense amounts are unclear, you should:',
            options: [
              'Claim the higher amount since it might be correct',
              'Claim the lower amount or verify the actual charge',
              'Average the two possible amounts',
              'Exclude it to avoid any questions'
            ],
            correctIndex: 1,
            explanation: 'Taking the conservative interpretation when facts are unclear demonstrates integrity and protects your reputation.'
          },
          {
            question: 'If you have a legitimate expense but lost the receipt, you should:',
            options: [
              'Create documentation to prove it happened',
              'Add the amount to another receipt',
              'Disclose the missing receipt and let finance decide',
              'Claim it was a larger amount to cover the hassle'
            ],
            correctIndex: 2,
            explanation: 'Transparency about missing documentation while noting the expense was legitimate is the honest approach.'
          }
        ],
        nextSceneId: 'scene-9-10'
      },
      {
        id: 'scene-9-10',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Workplace Integrity module. You understand how small ethical choices build your professional character and reputation.',
        animationType: 'scaleIn'
      }
    ]
  },

  // MODULE 10: The Grey Area - Sales Ethics
  {
    id: 'module-10',
    slug: 'ethical-negotiations',
    title: 'Ethical Negotiations',
    subtitle: 'Integrity Under Pressure',
    description: 'Navigate high-pressure situations where personal gain tempts you to bend the truth, learning to compete effectively while maintaining integrity.',
    duration: '25 min',
    difficulty: 'advanced',
    competencies: ['Judgment Quality', 'Professionalism', 'Accountability', 'Communication Clarity'],
    icon: 'Handshake',
    color: 'from-pink-500 to-rose-600',
    totalPoints: 100,
    passingScore: 70,
    certificateTitle: 'Ethical Leadership Certificate',
    scenes: [
      {
        id: 'scene-10-1',
        title: 'Welcome',
        type: 'narrative',
        content: 'Welcome to Ethical Negotiations training. This module explores situations where financial pressure and competitive dynamics test your integrity. You\'ll learn to compete effectively without compromising your ethics.',
        setting: 'Sales floor',
        animationType: 'fadeIn',
        nextSceneId: 'scene-10-2'
      },
      {
        id: 'scene-10-2',
        title: 'The Opportunity',
        type: 'narrative',
        content: 'You\'re a sales representative at Veridian Crest Holdings. You\'re competing for a major account against two other firms. This deal would hit your quarterly target, and your commission depends on it.',
        setting: 'Client meeting room',
        animationType: 'slideUp',
        nextSceneId: 'scene-10-3'
      },
      {
        id: 'scene-10-3',
        title: 'The Client\'s Claim',
        type: 'narrative',
        content: 'During the meeting, the client says:\n\n"Your competitor offered us a 40% discount. If you can match or beat that, we\'ll sign with you today."',
        character: 'Client',
        animationType: 'typewriter',
        nextSceneId: 'scene-10-4'
      },
      {
        id: 'scene-10-4',
        title: 'What You Know',
        type: 'narrative',
        content: '**Your situation:**\n• Your standard discount authority is up to 25%\n• Discounts above 25% require VP approval, which takes 2-3 days\n• You can\'t verify the competitor\'s offer\n• The quarter ends Friday; this deal would hit your target\n• A colleague mentioned clients sometimes exaggerate competitor offers',
        animationType: 'fadeIn',
        nextSceneId: 'scene-10-5'
      },
      {
        id: 'scene-10-5',
        title: 'Your Response',
        type: 'choice',
        content: 'What do you say to the client?',
        choices: [
          {
            id: 'choice-10a',
            text: '"We can absolutely match that 40%. Let me draw up the paperwork right now."',
            isCorrect: false,
            feedback: 'Promising a discount you can\'t authorize is dishonest and will create problems. You might lose the deal entirely when you can\'t deliver.',
            points: 5
          },
          {
            id: 'choice-10b',
            text: '"I can offer 25% today, which is my authorization limit. For 40%, I need VP approval which takes 2-3 days. Shall I start that process while we discuss what else might make this decision easier for you today?"',
            isCorrect: true,
            feedback: 'Excellent! You were honest about your limits, offered what you could, and kept the conversation moving forward without false promises.',
            points: 40
          },
          {
            id: 'choice-10c',
            text: '"Let me make a quick call." (Then pretend to get approval you don\'t have)',
            isCorrect: false,
            feedback: 'Faking approval is deceptive and will backfire when the real approval process catches up with you.',
            points: 0
          },
          {
            id: 'choice-10d',
            text: '"I don\'t believe your competitor actually offered 40%. Can you show me that in writing?"',
            isCorrect: false,
            feedback: 'Challenging the client\'s honesty directly is confrontational and likely to damage the relationship, even if you\'re right.',
            points: 10
          }
        ],
        nextSceneId: 'scene-10-6'
      },
      {
        id: 'scene-10-6',
        title: 'The Client Pushes Back',
        type: 'narrative',
        content: 'The client responds: "Look, I need to make a decision today. The other company can close right now. Can\'t you just commit to the 40% and figure out the paperwork later?"',
        character: 'Client (pressing)',
        animationType: 'slideUp',
        nextSceneId: 'scene-10-7'
      },
      {
        id: 'scene-10-7',
        title: 'Under Pressure',
        type: 'choice',
        content: 'The client is pressing hard. What do you do?',
        choices: [
          {
            id: 'choice-10e',
            text: '"I understand the time pressure. Here\'s what I can commit to: 25% today guaranteed, and I\'ll personally champion the additional discount with my VP first thing tomorrow. If we can\'t match, I\'ll call you before the competitor\'s deadline."',
            isCorrect: true,
            feedback: 'Perfect! You\'re maximizing what you can offer honestly while creating urgency on your end to get them an answer.',
            points: 35
          },
          {
            id: 'choice-10f',
            text: '"Fine, 40% it is. I\'ll make it work somehow."',
            isCorrect: false,
            feedback: 'Committing to something you can\'t deliver is a recipe for losing both the deal and your credibility.',
            points: 5
          },
          {
            id: 'choice-10g',
            text: '"If you have to decide today, I guess you should go with the competitor."',
            isCorrect: false,
            feedback: 'Giving up without maximizing your position unnecessarily loses a deal you might have won with honest effort.',
            points: 10
          },
          {
            id: 'choice-10h',
            text: '"Let me be honest—I\'ve heard clients sometimes exaggerate competitor offers. Is that really what they said?"',
            isCorrect: false,
            feedback: 'Implying the client is lying, even indirectly, damages trust and is likely to lose you the deal.',
            points: 5
          }
        ],
        nextSceneId: 'scene-10-8'
      },
      {
        id: 'scene-10-8',
        title: 'After the Meeting',
        type: 'narrative',
        content: 'After the meeting, regardless of the outcome, you need to follow through on your commitments and document the interaction appropriately.',
        animationType: 'fadeIn',
        nextSceneId: 'scene-10-9'
      },
      {
        id: 'scene-10-9',
        title: 'Follow Through',
        type: 'choice',
        content: 'What do you do immediately after the meeting?',
        choices: [
          {
            id: 'choice-10i',
            text: 'Contact your VP immediately to request expedited approval for the competitive pricing',
            isCorrect: true,
            feedback: 'Following through on your commitments promptly demonstrates integrity and gives you the best chance of winning the deal honestly.',
            points: 25
          },
          {
            id: 'choice-10j',
            text: 'Wait to see if the client follows up before doing anything',
            isCorrect: false,
            feedback: 'You made a commitment to champion the discount. Failing to follow through damages your integrity even if the client doesn\'t notice.',
            points: 10
          },
          {
            id: 'choice-10k',
            text: 'Try to process the 40% discount yourself and hope no one notices',
            isCorrect: false,
            feedback: 'Circumventing approval processes is a policy violation that could cost you your job, regardless of good intentions.',
            points: 0
          },
          {
            id: 'choice-10l',
            text: 'Forget about it - it\'s probably a lost deal anyway',
            isCorrect: false,
            feedback: 'Giving up on commitments because they\'re inconvenient shows poor integrity and work ethic.',
            points: 5
          }
        ],
        nextSceneId: 'scene-10-10'
      },
      {
        id: 'scene-10-10',
        title: 'Key Principles',
        type: 'narrative',
        content: '**Ethical Negotiations:**\n\n1. **Never Promise What You Can\'t Deliver** - Even under pressure\n2. **Be Honest About Constraints** - Transparency builds trust\n3. **Maximize Within Your Authority** - Offer what you can today\n4. **Create Urgency Honestly** - Champion their cause internally\n5. **Follow Through Always** - Your word is your reputation',
        animationType: 'slideUp',
        nextSceneId: 'scene-10-11'
      },
      {
        id: 'scene-10-11',
        title: 'Knowledge Check',
        type: 'quiz',
        content: 'Test your understanding of ethical negotiations.',
        quiz: [
          {
            question: 'When a client demands something beyond your authority, you should:',
            options: [
              'Promise it anyway and figure it out later',
              'Be honest about your limits while offering what you can',
              'Tell them to take the competitor\'s offer',
              'Pretend to get approval you don\'t have'
            ],
            correctIndex: 1,
            explanation: 'Honesty about constraints while maximizing your offering builds trust and gives you the best chance of winning the deal legitimately.'
          },
          {
            question: 'If you commit to championing a client request internally, you should:',
            options: [
              'Wait to see if they follow up first',
              'Follow through immediately regardless of outcome',
              'Only follow through if it seems like you might win',
              'Forget about it if it seems like a lost cause'
            ],
            correctIndex: 1,
            explanation: 'Your commitments reflect your integrity. Following through promptly demonstrates you\'re trustworthy regardless of the outcome.'
          }
        ],
        nextSceneId: 'scene-10-12'
      },
      {
        id: 'scene-10-12',
        title: 'Module Complete',
        type: 'completion',
        content: 'Congratulations! You\'ve completed the Ethical Negotiations module. You now understand how to compete effectively while maintaining your integrity under pressure.',
        animationType: 'scaleIn'
      }
    ]
  }
];
