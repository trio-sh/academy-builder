import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Award,
  BookOpen,
  MessageSquare,
  Target,
  Clock,
  Star,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Sliders,
  Users,
  Lightbulb,
  RefreshCw,
  Rocket,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_SCENES,
  AssessmentScene,
  AssessmentDimension,
  getScoreLabel,
  getOverallScore
} from '@/data/interactiveAssessment';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  checkAssessmentRetakeStatus,
  generateAssessmentNarrative,
  generateSelectionContent
} from '@/services/aiSceneGeneration';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

// Declare GSAP as global
declare global {
  interface Window {
    gsap: any;
  }
}

// Icon mapping for dimensions
const DimensionIcons: Record<string, React.ElementType> = {
  MessageCircle,
  Lightbulb,
  RefreshCw,
  Users,
  Rocket,
  Clock,
  Briefcase,
  GraduationCap
};

export const AssessmentViewer = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    communication: 3,
    problem_solving: 3,
    adaptability: 3,
    collaboration: 3,
    initiative: 3,
    time_management: 3,
    professionalism: 3,
    learning_agility: 3
  });
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // AI-generated content for retakes
  const [isRetake, setIsRetake] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<Map<string, string>>(new Map());
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const hasSpokenScene = useRef<Set<number>>(new Set());
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Countdown timer state (10 minutes for assessment)
  const [timeRemaining, setTimeRemaining] = useState<number>(10 * 60);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentScene = ASSESSMENT_SCENES[currentSceneIndex];
  const progress = ((currentSceneIndex + 1) / ASSESSMENT_SCENES.length) * 100;

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Text-to-Speech voice
  useEffect(() => {
    const initVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const googleUSVoice = voices.find(v => v.name === 'Google US English' && v.lang === 'en-US');
      const anyUSVoice = voices.find(v => v.lang === 'en-US');
      const defaultVoice = voices.find(v => v.default);
      setTtsVoice(googleUSVoice || anyUSVoice || defaultVoice || voices[0] || null);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      initVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Function to speak text
  const speakText = useCallback((text: string) => {
    if (isMuted || !ttsVoice) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/•/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = ttsVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted, ttsVoice]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(prev => !prev);
  }, [isMuted, stopSpeaking]);

  // Check for retake status and generate AI content
  useEffect(() => {
    const initializeRetakeContent = async () => {
      if (!user?.id) return;

      try {
        const retakeStatus = await checkAssessmentRetakeStatus(user.id, supabase);
        setIsRetake(retakeStatus.isRetake);
        setAttemptNumber(retakeStatus.attemptNumber);

        if (retakeStatus.isRetake && retakeStatus.attemptNumber > 1) {
          setIsGeneratingContent(true);
          const newContent = new Map<string, string>();
          const totalToGenerate = 4; // 2 narratives + 2 selection contents
          let generated = 0;

          // Generate varied narrative for first dimension (communication)
          try {
            const commNarrative = await generateAssessmentNarrative(
              ASSESSMENT_DIMENSIONS[0],
              retakeStatus.attemptNumber
            );
            if (commNarrative) {
              newContent.set('intro-communication', commNarrative);
            }
            generated++;
            setGenerationProgress((generated / totalToGenerate) * 100);
          } catch (e) {
            console.error('Failed to generate communication narrative:', e);
          }

          // Generate varied narrative for last dimension (learning agility)
          try {
            const lastDim = ASSESSMENT_DIMENSIONS[ASSESSMENT_DIMENSIONS.length - 1];
            const learningNarrative = await generateAssessmentNarrative(
              lastDim,
              retakeStatus.attemptNumber
            );
            if (learningNarrative) {
              newContent.set('intro-learning', learningNarrative);
            }
            generated++;
            setGenerationProgress((generated / totalToGenerate) * 100);
          } catch (e) {
            console.error('Failed to generate learning narrative:', e);
          }

          // Generate varied strengths selection content
          try {
            const strengthsContent = await generateSelectionContent('strengths', retakeStatus.attemptNumber);
            if (strengthsContent) {
              newContent.set('select-strengths', strengthsContent);
            }
            generated++;
            setGenerationProgress((generated / totalToGenerate) * 100);
          } catch (e) {
            console.error('Failed to generate strengths content:', e);
          }

          // Generate varied improvements selection content
          try {
            const improvementsContent = await generateSelectionContent('improvements', retakeStatus.attemptNumber);
            if (improvementsContent) {
              newContent.set('select-improvements', improvementsContent);
            }
            generated++;
            setGenerationProgress((generated / totalToGenerate) * 100);
          } catch (e) {
            console.error('Failed to generate improvements content:', e);
          }

          setAiGeneratedContent(newContent);
          setIsGeneratingContent(false);
        }
      } catch (error) {
        console.error('Error checking retake status:', error);
        setIsGeneratingContent(false);
      }
    };

    initializeRetakeContent();
  }, [user?.id]);

  // Initialize countdown timer
  useEffect(() => {
    if (!timerStarted) {
      setTimerStarted(true);
    }
  }, [timerStarted]);

  // Countdown timer effect
  useEffect(() => {
    if (timerStarted && timeRemaining > 0 && !isComplete) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (!isExtraTime) {
              // Add 3 minutes extra time
              setIsExtraTime(true);
              return 3 * 60;
            }
            // Extra time finished
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStarted, isComplete, isExtraTime]);

  // Auto-speak narrative/welcome scenes when scene changes
  useEffect(() => {
    if (!isMuted && ttsVoice && !hasSpokenScene.current.has(currentSceneIndex)) {
      const scene = ASSESSMENT_SCENES[currentSceneIndex];
      if ((scene?.type === 'welcome' || scene?.type === 'narrative') && scene.content) {
        const timer = setTimeout(() => {
          speakText(scene.content);
          hasSpokenScene.current.add(currentSceneIndex);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSceneIndex, isMuted, ttsVoice, speakText]);

  // GSAP animation for scene transitions
  const animateSceneIn = useCallback(() => {
    if (!contentRef.current || !window.gsap) return;

    const gsap = window.gsap;
    const scene = ASSESSMENT_SCENES[currentSceneIndex];

    setIsAnimating(true);
    gsap.set(contentRef.current, { opacity: 0 });

    switch (scene?.animationType) {
      case 'fadeIn':
        gsap.to(contentRef.current, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => setIsAnimating(false)
        });
        break;
      case 'slideUp':
        gsap.set(contentRef.current, { y: 50 });
        gsap.to(contentRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          onComplete: () => setIsAnimating(false)
        });
        break;
      case 'scaleIn':
        gsap.set(contentRef.current, { scale: 0.9 });
        gsap.to(contentRef.current, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.7)',
          onComplete: () => setIsAnimating(false)
        });
        break;
      default:
        gsap.to(contentRef.current, {
          opacity: 1,
          duration: 0.4,
          onComplete: () => setIsAnimating(false)
        });
    }
  }, [currentSceneIndex]);

  useEffect(() => {
    if (contentRef.current) {
      animateSceneIn();
    }
  }, [currentSceneIndex, animateSceneIn]);

  // Navigation
  const goToNextScene = () => {
    stopSpeaking();
    if (currentSceneIndex < ASSESSMENT_SCENES.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    }
  };

  const goToPreviousScene = () => {
    stopSpeaking();
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  // Score handlers
  const handleScoreChange = (dimensionId: string, value: number) => {
    setScores(prev => ({ ...prev, [dimensionId]: value }));
  };

  // Selection handlers
  const toggleSelection = (type: 'strengths' | 'improvements', dimensionId: string, max: number) => {
    if (type === 'strengths') {
      if (strengths.includes(dimensionId)) {
        setStrengths(prev => prev.filter(id => id !== dimensionId));
      } else if (strengths.length < max) {
        setStrengths(prev => [...prev, dimensionId]);
      }
    } else {
      if (improvements.includes(dimensionId)) {
        setImprovements(prev => prev.filter(id => id !== dimensionId));
      } else if (improvements.length < max) {
        setImprovements(prev => [...prev, dimensionId]);
      }
    }
  };

  // Save assessment
  const saveAssessment = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('candidate_self_assessments').insert({
        candidate_id: user.id,
        behavioral_scores: scores,
        strengths,
        areas_for_improvement: improvements,
        goals,
        notes,
        completed: true
      });

      if (error) throw error;

      // Create growth log entry
      await supabase.from('growth_log_entries').insert({
        candidate_id: user.id,
        event_type: 'assessment',
        title: 'Interactive Self-Assessment Completed',
        description: `Completed behavioral self-assessment with overall score of ${getOverallScore(scores).toFixed(1)}/5`,
        source_component: 'InteractiveAssessment',
        metadata: {
          scores,
          overall: getOverallScore(scores),
          strengths,
          improvements,
          goals
        }
      });

      setIsComplete(true);
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get radar chart data
  const getRadarData = () => {
    return ASSESSMENT_DIMENSIONS.map(dim => ({
      dimension: dim.title.split(' ')[0],
      score: scores[dim.id] || 3,
      fullMark: 5
    }));
  };

  // Get dimension by ID
  const getDimension = (id: string) => ASSESSMENT_DIMENSIONS.find(d => d.id === id);

  // Get icon component for dimension
  const getDimensionIcon = (iconName: string) => {
    return DimensionIcons[iconName] || Star;
  };

  // Check if can proceed
  const canProceed = () => {
    const scene = currentScene;
    if (scene.type === 'selection') {
      if (scene.selectionType === 'strengths') return strengths.length > 0;
      if (scene.selectionType === 'improvements') return improvements.length > 0;
    }
    if (scene.type === 'goals') return goals.trim().length >= 20;
    return true;
  };

  // Get content for a scene (AI-generated if available, otherwise original)
  const getSceneContent = (scene: AssessmentScene): string => {
    // Check for AI-generated content based on scene ID
    if (isRetake && aiGeneratedContent.size > 0) {
      const aiContent = aiGeneratedContent.get(scene.id);
      if (aiContent) {
        return aiContent;
      }
    }
    return scene.content;
  };

  // Render scene content
  const renderSceneContent = () => {
    const scene = currentScene;

    // Welcome / Narrative scenes
    if (scene.type === 'welcome' || scene.type === 'narrative') {
      const content = getSceneContent(scene);
      return (
        <div>
          {isRetake && attemptNumber > 1 && scene.type === 'narrative' && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Fresh content for attempt #{attemptNumber}</span>
            </div>
          )}
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
              {content.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h4 key={i} className="text-white font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                }
                if (line.startsWith('•')) {
                  return <p key={i} className="ml-4 my-1 text-gray-400">{line}</p>;
                }
                return line.trim() ? <p key={i} className="my-2">{line}</p> : <br key={i} />;
              })}
            </div>
          </div>
          {!isMuted && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakText(content)}
                disabled={isSpeaking}
                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Speaking...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play Narration
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Dimension rating scene (single)
    if (scene.type === 'dimension' && scene.dimensions) {
      const dimension = getDimension(scene.dimensions[0]);
      if (!dimension) return null;
      const IconComponent = getDimensionIcon(dimension.icon);
      const score = scores[dimension.id];
      const scoreInfo = getScoreLabel(score);

      return (
        <div className="space-y-8">
          <p className="text-gray-300 text-lg">{scene.content}</p>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${dimension.color}`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{dimension.title}</h3>
                <p className="text-gray-400 mt-1">{dimension.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{dimension.scaleLabels.low}</span>
                <span className="text-gray-500">{dimension.scaleLabels.high}</span>
              </div>

              <Slider
                value={[score]}
                onValueChange={(value) => handleScoreChange(dimension.id, value[0])}
                min={1}
                max={5}
                step={0.5}
                className="w-full"
              />

              <div className="flex items-center justify-center gap-3">
                <span className={`text-3xl font-bold ${scoreInfo.color}`}>{score.toFixed(1)}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${scoreInfo.bg} ${scoreInfo.color}`}>
                  {scoreInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {dimension.examples.map((example, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{example}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Multi-dimension rating scene
    if (scene.type === 'multi-dimension' && scene.dimensions) {
      return (
        <div className="space-y-6">
          <p className="text-gray-300 text-lg">{scene.content}</p>

          {scene.dimensions.map(dimId => {
            const dimension = getDimension(dimId);
            if (!dimension) return null;
            const IconComponent = getDimensionIcon(dimension.icon);
            const score = scores[dimension.id];
            const scoreInfo = getScoreLabel(score);

            return (
              <div key={dimId} className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${dimension.color}`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{dimension.title}</h4>
                    <p className="text-sm text-gray-500">{dimension.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${scoreInfo.color}`}>{score.toFixed(1)}</span>
                    <p className={`text-xs ${scoreInfo.color}`}>{scoreInfo.label}</p>
                  </div>
                </div>

                <Slider
                  value={[score]}
                  onValueChange={(value) => handleScoreChange(dimension.id, value[0])}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>{dimension.scaleLabels.low}</span>
                  <span>{dimension.scaleLabels.high}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Selection scene (strengths/improvements)
    if (scene.type === 'selection') {
      const isStrengths = scene.selectionType === 'strengths';
      const selected = isStrengths ? strengths : improvements;
      const maxSelect = scene.maxSelections || 3;
      const content = getSceneContent(scene);

      return (
        <div className="space-y-6">
          {isRetake && attemptNumber > 1 && aiGeneratedContent.has(scene.id) && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Fresh prompts for attempt #{attemptNumber}</span>
            </div>
          )}
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
              {content.split('\n').map((line, i) => {
                if (line.startsWith('•')) {
                  return <p key={i} className="ml-4 my-1 text-gray-400">{line}</p>;
                }
                return line.trim() ? <p key={i} className="my-2">{line}</p> : null;
              })}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Selected: {selected.length}/{maxSelect}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ASSESSMENT_DIMENSIONS.map(dimension => {
              const IconComponent = getDimensionIcon(dimension.icon);
              const isSelected = selected.includes(dimension.id);
              const score = scores[dimension.id];
              const scoreInfo = getScoreLabel(score);

              return (
                <button
                  key={dimension.id}
                  onClick={() => toggleSelection(scene.selectionType!, dimension.id, maxSelect)}
                  disabled={!isSelected && selected.length >= maxSelect}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${dimension.color}`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{dimension.title}</p>
                      <p className={`text-sm ${scoreInfo.color}`}>{score.toFixed(1)} - {scoreInfo.label}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Goals scene
    if (scene.type === 'goals') {
      return (
        <div className="space-y-6">
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
              {scene.content.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h4 key={i} className="text-white font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                }
                return line.trim() ? <p key={i} className="my-2">{line}</p> : null;
              })}
            </div>
          </div>

          {improvements.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400 mb-2">Focus areas based on your selections:</p>
              <div className="flex flex-wrap gap-2">
                {improvements.map(id => {
                  const dim = getDimension(id);
                  return dim ? (
                    <span key={id} className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                      {dim.title}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Example: Over the next 3 months, I will practice presenting to small groups at least twice a week to improve my communication confidence..."
              className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50"
            />
            <div className="flex items-center justify-between text-sm">
              <span className={goals.length >= 20 ? 'text-emerald-400' : 'text-gray-500'}>
                {goals.length} characters {goals.length < 20 && '(minimum 20)'}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Additional notes (optional):</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other reflections or context you want to capture..."
                className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50"
              />
            </div>
          </div>
        </div>
      );
    }

    // Review scene
    if (scene.type === 'review') {
      const overall = getOverallScore(scores);
      const overallInfo = getScoreLabel(overall);

      return (
        <div className="space-y-6">
          <p className="text-gray-300">{scene.content}</p>

          {/* Overall Score */}
          <div className="text-center py-6">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${overallInfo.bg} border-2 border-current ${overallInfo.color}`}>
              <span className="text-4xl font-bold">{overall.toFixed(1)}</span>
            </div>
            <p className={`mt-2 text-lg font-semibold ${overallInfo.color}`}>{overallInfo.label}</p>
            <p className="text-gray-500">Overall Score</p>
          </div>

          {/* Radar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={getRadarData()}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Dimension Scores Grid */}
          <div className="grid grid-cols-2 gap-3">
            {ASSESSMENT_DIMENSIONS.map(dim => {
              const score = scores[dim.id];
              const info = getScoreLabel(score);
              const IconComponent = getDimensionIcon(dim.icon);

              return (
                <div key={dim.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${dim.color}`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{dim.title}</p>
                  </div>
                  <span className={`text-lg font-bold ${info.color}`}>{score.toFixed(1)}</span>
                </div>
              );
            })}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 font-medium mb-2">Strengths</p>
              <div className="space-y-1">
                {strengths.map(id => {
                  const dim = getDimension(id);
                  return dim ? (
                    <p key={id} className="text-sm text-gray-300">{dim.title}</p>
                  ) : null;
                })}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400 font-medium mb-2">Growth Areas</p>
              <div className="space-y-1">
                {improvements.map(id => {
                  const dim = getDimension(id);
                  return dim ? (
                    <p key={id} className="text-sm text-gray-300">{dim.title}</p>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Goals Summary */}
          {goals && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-sm text-indigo-400 font-medium mb-2">Your Goals</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{goals}</p>
            </div>
          )}
        </div>
      );
    }

    // Completion scene
    if (scene.type === 'completion') {
      const overall = getOverallScore(scores);
      const overallInfo = getScoreLabel(overall);

      return (
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <Award className="w-12 h-12 text-white" />
          </div>

          <h3 className="text-3xl font-bold text-white mb-4">{scene.content.split('\n')[0]}</h3>

          <div className="prose prose-invert max-w-md mx-auto mb-8">
            {scene.content.split('\n').slice(1).map((line, i) => (
              line.trim() ? <p key={i} className="text-gray-400">{line}</p> : null
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className={`text-2xl font-bold ${overallInfo.color}`}>{overall.toFixed(1)}</p>
              <p className="text-xs text-gray-400">Overall Score</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-emerald-400">{strengths.length}</p>
              <p className="text-xs text-gray-400">Strengths</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-amber-400">{improvements.length}</p>
              <p className="text-xs text-gray-400">Growth Areas</p>
            </div>
          </div>

          {!isComplete ? (
            <Button
              onClick={saveAssessment}
              disabled={isSaving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 px-8"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Assessment
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 max-w-sm mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 font-medium">Assessment Saved!</p>
              </div>
              <Button
                onClick={() => navigate('/dashboard/candidate/assessment')}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Get scene icon
  const getSceneIcon = () => {
    const scene = currentScene;
    switch (scene.type) {
      case 'welcome':
      case 'narrative':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'dimension':
      case 'multi-dimension':
        return <Sliders className="w-5 h-5 text-purple-400" />;
      case 'selection':
        return <Target className="w-5 h-5 text-amber-400" />;
      case 'goals':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'review':
        return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'completion':
        return <Award className="w-5 h-5 text-amber-400" />;
      default:
        return <Star className="w-5 h-5 text-gray-400" />;
    }
  };

  // Show loading screen when generating AI content for retakes
  if (isGeneratingContent) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
              <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Preparing Your Assessment</h2>
          <p className="text-gray-400 mb-6">
            Since this is attempt #{attemptNumber}, we're generating fresh content to give you a unique experience.
          </p>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">Generating personalized content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }} />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/candidate/assessment')}
                className="text-gray-400 hover:text-white hover:bg-white/10 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="h-8 w-px bg-white/10 hidden md:block" />
              <div className="min-w-0">
                {/* Desktop: Full title */}
                <h1 className="hidden md:block font-semibold text-lg text-white">
                  Behavioral Self-Assessment
                </h1>
                {/* Mobile: Truncated title */}
                <h1 className="md:hidden font-semibold text-base text-white truncate max-w-[140px]" title="Behavioral Self-Assessment">
                  Self-Assessment
                </h1>
                <p className="text-xs md:text-sm text-gray-500 truncate">Interactive Assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {/* TTS Control Button */}
              <div className="hidden md:flex items-center gap-2">
                {isSpeaking ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopSpeaking}
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                    title="Stop speaking"
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className={`${isMuted ? 'text-gray-500' : 'text-indigo-400'} hover:bg-white/10`}
                    title={isMuted ? 'Unmute narration' : 'Mute narration'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-white/10 hidden md:block" />
              {/* Desktop: Horizontal badges */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <Star className="w-4 h-4 text-indigo-400" />
                  <span className="text-indigo-400 font-semibold">{getOverallScore(scores).toFixed(1)}</span>
                  <span className="text-indigo-400/50">/ 5.0</span>
                </div>
                {/* Countdown Timer */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isExtraTime
                    ? 'bg-red-500/20 border border-red-500/30'
                    : timeRemaining < 60
                      ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse'
                      : 'bg-white/5 border border-white/10'
                }`}>
                  <Clock className={`w-4 h-4 ${isExtraTime ? 'text-red-400' : timeRemaining < 60 ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span className={`font-mono font-semibold ${isExtraTime ? 'text-red-400' : timeRemaining < 60 ? 'text-amber-400' : 'text-white'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  {isExtraTime && <span className="text-xs text-red-400">+3</span>}
                </div>
              </div>
              {/* Mobile: Stacked compact badges */}
              <div className="flex md:hidden flex-col gap-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <Star className="w-3 h-3 text-indigo-400" />
                  <span className="text-indigo-400 font-semibold text-xs">{getOverallScore(scores).toFixed(1)}/5</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                  isExtraTime
                    ? 'bg-red-500/20 border border-red-500/30'
                    : timeRemaining < 60
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-white/5 border border-white/10'
                }`}>
                  <Clock className={`w-3 h-3 ${isExtraTime ? 'text-red-400' : timeRemaining < 60 ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span className={`font-mono font-semibold text-xs ${isExtraTime ? 'text-red-400' : timeRemaining < 60 ? 'text-amber-400' : 'text-white'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute top-[72px] left-0 right-0 z-40">
        <div className="h-1 bg-gray-800/50">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 top-[76px] bottom-[80px] overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-3xl" ref={sceneRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene?.id}
                ref={contentRef}
                className="bg-gradient-to-b from-gray-900/80 to-gray-900/60 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-2xl shadow-black/20"
              >
                {/* Scene header */}
                <div className="px-8 pt-8 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${
                      currentScene?.type === 'welcome' || currentScene?.type === 'narrative' ? 'bg-blue-500/10' :
                      currentScene?.type === 'dimension' || currentScene?.type === 'multi-dimension' ? 'bg-purple-500/10' :
                      currentScene?.type === 'selection' ? 'bg-amber-500/10' :
                      currentScene?.type === 'goals' ? 'bg-cyan-500/10' :
                      currentScene?.type === 'review' ? 'bg-emerald-500/10' :
                      'bg-amber-500/10'
                    }`}>
                      {getSceneIcon()}
                    </div>
                    <span className="text-sm text-gray-400 capitalize font-medium">{currentScene?.type.replace('-', ' ')}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-500">Step {currentSceneIndex + 1} of {ASSESSMENT_SCENES.length}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{currentScene?.title}</h2>
                  {currentScene?.subtitle && (
                    <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                      <span className="inline-block w-4 h-px bg-gray-600" />
                      <span className="italic">{currentScene.subtitle}</span>
                    </p>
                  )}
                </div>

                {/* Scene content */}
                <div className="px-8 py-6">
                  {currentScene?.character && (
                    <div className="mb-6 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-indigo-500/20">
                        {currentScene.character.charAt(0)}
                      </div>
                      <div>
                        <span className="text-white font-medium">{currentScene.character}</span>
                        <p className="text-xs text-gray-500">Your Guide</p>
                      </div>
                    </div>
                  )}
                  {renderSceneContent()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousScene}
              disabled={currentSceneIndex === 0}
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white disabled:opacity-30 px-5"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {ASSESSMENT_SCENES.slice(
                Math.max(0, currentSceneIndex - 3),
                Math.min(ASSESSMENT_SCENES.length, currentSceneIndex + 4)
              ).map((scene, i) => {
                const actualIndex = Math.max(0, currentSceneIndex - 3) + i;
                const isCurrent = actualIndex === currentSceneIndex;

                return (
                  <div
                    key={scene.id}
                    className={`transition-all duration-300 rounded-full ${
                      isCurrent
                        ? 'w-6 h-2 bg-indigo-500'
                        : actualIndex < currentSceneIndex
                        ? 'w-2 h-2 bg-emerald-500'
                        : 'w-2 h-2 bg-gray-700'
                    }`}
                  />
                );
              })}
            </div>

            {currentScene?.type === 'completion' ? (
              <div className="w-28" />
            ) : (
              <Button
                onClick={goToNextScene}
                disabled={currentSceneIndex === ASSESSMENT_SCENES.length - 1 || !canProceed()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 disabled:opacity-30 px-6 shadow-lg"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentViewer;
