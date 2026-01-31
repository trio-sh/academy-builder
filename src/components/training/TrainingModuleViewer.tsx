import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Unlock,
  CheckCircle,
  Circle,
  Play,
  Award,
  BookOpen,
  MessageSquare,
  FileText,
  Target,
  Clock,
  Star,
  Download,
  Home,
  Volume2,
  VolumeX,
  Pause,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INTERACTIVE_MODULES, InteractiveModule, ModuleScene, SceneChoice } from '@/data/interactiveTrainingModules';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  checkRetakeStatus,
  generateVariedTrainingScenes
} from '@/services/aiSceneGeneration';

// Declare GSAP as global
declare global {
  interface Window {
    gsap: any;
  }
}

interface SceneProgress {
  sceneId: string;
  completed: boolean;
  score: number;
  selectedChoice?: string;
  reflection?: string;
  quizAnswers?: number[];
}

export const TrainingModuleViewer = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [module, setModule] = useState<InteractiveModule | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState<Map<string, SceneProgress>>(new Map());
  const [totalScore, setTotalScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [moduleCompleted, setModuleCompleted] = useState(false);

  // AI-generated content for retakes
  const [isRetake, setIsRetake] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [aiGeneratedScenes, setAiGeneratedScenes] = useState<Map<string, Partial<ModuleScene>>>(new Map());
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const hasSpokenScene = useRef<Set<number>>(new Set());
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Find the module by slug or id
  useEffect(() => {
    const foundModule = INTERACTIVE_MODULES.find(
      m => m.slug === moduleId || m.id === moduleId
    );
    if (foundModule) {
      setModule(foundModule);
      // Initialize progress for all scenes
      const initialProgress = new Map<string, SceneProgress>();
      foundModule.scenes.forEach((scene, index) => {
        initialProgress.set(scene.id, {
          sceneId: scene.id,
          completed: false,
          score: 0
        });
      });
      setSceneProgress(initialProgress);
    }
  }, [moduleId]);

  // Check for retake status and generate AI content
  useEffect(() => {
    const initializeRetakeContent = async () => {
      if (!user?.id || !module) return;

      try {
        const retakeStatus = await checkRetakeStatus(user.id, module.id, supabase);
        setIsRetake(retakeStatus.isRetake);
        setAttemptNumber(retakeStatus.attemptNumber);

        if (retakeStatus.isRetake && retakeStatus.attemptNumber > 1) {
          setIsGeneratingContent(true);
          setGenerationProgress(10);

          try {
            // Generate varied content for choice, quiz, and reflection scenes
            const variedScenes = await generateVariedTrainingScenes(
              module.title,
              module.competencies,
              module.scenes,
              retakeStatus.attemptNumber
            );

            setGenerationProgress(90);
            setAiGeneratedScenes(variedScenes);
            setGenerationProgress(100);
          } catch (e) {
            console.error('Failed to generate AI content:', e);
          }

          setIsGeneratingContent(false);
        }
      } catch (error) {
        console.error('Error checking retake status:', error);
        setIsGeneratingContent(false);
      }
    };

    initializeRetakeContent();
  }, [user?.id, module]);

  // Initialize Text-to-Speech voice
  useEffect(() => {
    const initVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for Google US English voice first, then any US English voice
      const googleUSVoice = voices.find(v => v.name === 'Google US English' && v.lang === 'en-US');
      const anyUSVoice = voices.find(v => v.lang === 'en-US');
      const defaultVoice = voices.find(v => v.default);

      setTtsVoice(googleUSVoice || anyUSVoice || defaultVoice || voices[0] || null);
    };

    // Voices may load asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      initVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }

    // Cleanup on unmount
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Function to speak text
  const speakText = useCallback((text: string) => {
    if (isMuted || !ttsVoice) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text for TTS (remove markdown formatting)
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

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(prev => !prev);
  }, [isMuted, stopSpeaking]);

  // Parse duration string to seconds (e.g., "25 min" -> 1500)
  const parseDuration = useCallback((duration: string): number => {
    const match = duration.match(/(\d+)\s*min/i);
    if (match) {
      return parseInt(match[1]) * 60;
    }
    return 10 * 60; // Default 10 minutes
  }, []);

  // Initialize countdown timer when module loads
  useEffect(() => {
    if (module && !timerStarted) {
      const totalSeconds = parseDuration(module.duration);
      setTimeRemaining(totalSeconds);
      setTimerStarted(true);
    }
  }, [module, timerStarted, parseDuration]);

  // Countdown timer effect
  useEffect(() => {
    if (timerStarted && timeRemaining > 0 && !moduleCompleted) {
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
  }, [timerStarted, moduleCompleted, isExtraTime]);

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-speak narrative scenes when scene changes
  useEffect(() => {
    if (module && !isMuted && ttsVoice && !hasSpokenScene.current.has(currentSceneIndex)) {
      const scene = module.scenes[currentSceneIndex];
      if (scene?.type === 'narrative' && scene.content) {
        // Small delay to let the UI settle
        const timer = setTimeout(() => {
          speakText(scene.content);
          hasSpokenScene.current.add(currentSceneIndex);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [module, currentSceneIndex, isMuted, ttsVoice, speakText]);

  // GSAP animation for scene transitions
  const animateSceneIn = useCallback(() => {
    if (!contentRef.current || !window.gsap) return;

    const gsap = window.gsap;
    const scene = module?.scenes[currentSceneIndex];

    setIsAnimating(true);

    // Reset state
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
      case 'typewriter':
        gsap.to(contentRef.current, {
          opacity: 1,
          duration: 0.3,
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
  }, [currentSceneIndex, module]);

  useEffect(() => {
    if (module && contentRef.current) {
      animateSceneIn();
    }
  }, [currentSceneIndex, module, animateSceneIn]);

  const currentScene = module?.scenes[currentSceneIndex];

  // Check if a scene is unlocked
  const isSceneUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const previousScene = module?.scenes[index - 1];
    if (!previousScene) return false;
    const prevProgress = sceneProgress.get(previousScene.id);
    return prevProgress?.completed || false;
  };

  // Handle choice selection
  const handleChoiceSelect = (choice: SceneChoice) => {
    if (showFeedback) return;
    setSelectedChoice(choice.id);
  };

  // Submit choice
  const submitChoice = () => {
    if (!selectedChoice || !currentScene?.choices) return;

    const choice = currentScene.choices.find(c => c.id === selectedChoice);
    if (!choice) return;

    setShowFeedback(true);
    setTotalScore(prev => prev + choice.points);

    // Mark scene as completed
    setSceneProgress(prev => {
      const newProgress = new Map(prev);
      newProgress.set(currentScene.id, {
        sceneId: currentScene.id,
        completed: true,
        score: choice.points,
        selectedChoice: choice.id
      });
      return newProgress;
    });
  };

  // Handle reflection submission
  const submitReflection = () => {
    if (!currentScene?.reflection || reflectionText.length < currentScene.reflection.minLength) return;

    setSceneProgress(prev => {
      const newProgress = new Map(prev);
      newProgress.set(currentScene.id, {
        sceneId: currentScene.id,
        completed: true,
        score: 10, // Base points for completing reflection
        reflection: reflectionText
      });
      return newProgress;
    });

    setTotalScore(prev => prev + 10);
    goToNextScene();
  };

  // Handle quiz submission
  const submitQuiz = () => {
    if (!currentScene?.quiz) return;

    let correct = 0;
    currentScene.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correctIndex) correct++;
    });

    const quizScore = Math.round((correct / currentScene.quiz.length) * 30);
    setQuizSubmitted(true);
    setTotalScore(prev => prev + quizScore);

    setSceneProgress(prev => {
      const newProgress = new Map(prev);
      newProgress.set(currentScene.id, {
        sceneId: currentScene.id,
        completed: true,
        score: quizScore,
        quizAnswers: [...quizAnswers]
      });
      return newProgress;
    });
  };

  // Navigate to next scene
  const goToNextScene = () => {
    if (!module) return;

    // Stop any ongoing speech
    stopSpeaking();

    // Mark current scene as completed if not already
    if (currentScene && !sceneProgress.get(currentScene.id)?.completed) {
      setSceneProgress(prev => {
        const newProgress = new Map(prev);
        newProgress.set(currentScene.id, {
          sceneId: currentScene.id,
          completed: true,
          score: 0
        });
        return newProgress;
      });
    }

    // Reset states for next scene
    setSelectedChoice(null);
    setShowFeedback(false);
    setReflectionText('');
    setQuizAnswers([]);
    setQuizSubmitted(false);

    if (currentSceneIndex < module.scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    }
  };

  // Navigate to previous scene
  const goToPreviousScene = () => {
    if (currentSceneIndex > 0) {
      // Stop any ongoing speech
      stopSpeaking();
      setSelectedChoice(null);
      setShowFeedback(false);
      setReflectionText('');
      setQuizAnswers([]);
      setQuizSubmitted(false);
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  // Complete module
  const completeModule = async () => {
    if (!user?.id || !module) return;

    setModuleCompleted(true);

    // Save to database
    try {
      // Check if progress exists
      const { data: existingProgress } = await supabase
        .from('bridgefast_progress')
        .select('id')
        .eq('candidate_id', user.id)
        .eq('module_id', module.id)
        .single();

      if (existingProgress) {
        await supabase
          .from('bridgefast_progress')
          .update({
            status: 'completed',
            progress_percent: 100,
            final_score: totalScore,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('bridgefast_progress')
          .insert({
            candidate_id: user.id,
            module_id: module.id,
            status: 'completed',
            progress_percent: 100,
            final_score: totalScore,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          });
      }

      // Create growth log entry
      await supabase.from('growth_log_entries').insert({
        candidate_id: user.id,
        event_type: 'training',
        title: `Completed Interactive Module: ${module.title}`,
        description: `Completed ${module.title} with score ${totalScore}/${module.totalPoints}`,
        source_component: 'InteractiveTraining',
        metadata: { module_id: module.id, module_slug: module.slug, score: totalScore }
      });
    } catch (error) {
      console.error('Error saving module completion:', error);
    }
  };

  // Download certificate
  const downloadCertificate = () => {
    if (!module || !profile) return;

    const certWindow = window.open('', '_blank');
    if (!certWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${module.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Georgia', serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
            padding: 20px;
          }
          .certificate {
            width: 900px;
            padding: 60px;
            background: linear-gradient(135deg, #fff 0%, #f8f8f8 100%);
            border: 3px solid #1e3a5f;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 10px; left: 10px; right: 10px; bottom: 10px;
            border: 1px solid #d4af37;
          }
          .logo { font-size: 28px; color: #1e3a5f; margin-bottom: 10px; letter-spacing: 3px; }
          .title { font-size: 48px; color: #d4af37; margin: 20px 0; font-weight: normal; }
          .subtitle { font-size: 18px; color: #666; margin-bottom: 30px; }
          .recipient { font-size: 36px; color: #1e3a5f; margin: 20px 0; border-bottom: 2px solid #d4af37; display: inline-block; padding-bottom: 10px; }
          .course { font-size: 20px; color: #333; margin: 30px 0 10px; }
          .course-name { font-size: 28px; color: #1e3a5f; font-weight: bold; }
          .competencies { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 20px 0; }
          .competency { padding: 6px 16px; background: #1e3a5f; color: #fff; border-radius: 20px; font-size: 12px; }
          .score { font-size: 18px; color: #666; margin: 20px 0; }
          .date { font-size: 14px; color: #888; margin-top: 30px; }
          .footer { display: flex; justify-content: space-around; margin-top: 40px; }
          .signature { text-align: center; }
          .signature-line { width: 150px; border-top: 1px solid #333; margin: 10px auto 5px; }
          .signature-title { font-size: 12px; color: #666; }
          .badge { position: absolute; top: 20px; right: 30px; width: 90px; height: 90px; background: linear-gradient(135deg, #d4af37, #b8962e); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; text-align: center; line-height: 1.2; }
          @media print {
            body { background: white; }
            .certificate { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="badge">BEHAVIORAL<br/>READY</div>
          <div class="logo">THE 3RD ACADEMY</div>
          <div class="title">Certificate of Completion</div>
          <div class="subtitle">This is to certify that</div>
          <div class="recipient">${profile.first_name} ${profile.last_name}</div>
          <div class="course">has successfully completed the interactive behavioral training module</div>
          <div class="course-name">${module.certificateTitle}</div>
          <div class="competencies">
            ${module.competencies.map(c => `<span class="competency">${c}</span>`).join('')}
          </div>
          <div class="score">Final Score: ${totalScore}/${module.totalPoints} | Duration: ${module.duration}</div>
          <div class="date">Issued on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <div class="signature-title">Program Director</div>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <div class="signature-title">Certificate ID: IM-${Date.now().toString(36).toUpperCase()}</div>
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    certWindow.document.write(html);
    certWindow.document.close();
  };

  // Get scene with AI variations applied
  const getSceneWithAIContent = useCallback((scene: ModuleScene): ModuleScene => {
    if (!isRetake || aiGeneratedScenes.size === 0) {
      return scene;
    }

    const aiVariation = aiGeneratedScenes.get(scene.id);
    if (!aiVariation) {
      return scene;
    }

    // Merge AI-generated content with original scene
    return {
      ...scene,
      ...aiVariation,
      // For choice scenes, use AI-generated choices if available
      choices: aiVariation.choices || scene.choices,
      // For quiz scenes, use AI-generated quiz if available
      quiz: aiVariation.quiz || scene.quiz,
      // For reflection scenes, use AI-generated reflection if available
      reflection: aiVariation.reflection || scene.reflection
    };
  }, [isRetake, aiGeneratedScenes]);

  if (!module) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading module...</p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-white mb-3">Preparing Your Training</h2>
          <p className="text-gray-400 mb-6">
            Since this is attempt #{attemptNumber}, we're generating fresh scenarios and questions to give you a unique learning experience.
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

  const progress = ((currentSceneIndex + 1) / module.scenes.length) * 100;
  const completedScenes = Array.from(sceneProgress.values()).filter(p => p.completed).length;

  // Get the current scene with any AI variations applied
  const currentSceneWithAI = currentScene ? getSceneWithAIContent(currentScene) : null;

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
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/candidate/training')}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-semibold text-lg text-white" title={module.title}>
                  {module.title.substring(0, 4)}...
                </h1>
                <p className="text-sm text-gray-500">{module.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* TTS Control Button */}
              <div className="flex items-center gap-2">
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
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-semibold">{totalScore}</span>
                <span className="text-amber-400/50">/ {module.totalPoints}</span>
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
          </div>
        </div>
      </div>

      {/* Progress bar - separate fixed element */}
      <div className="absolute top-[72px] left-0 right-0 z-40">
        <div className="h-1 bg-gray-800/50">
          <motion.div
            className={`h-full bg-gradient-to-r ${module.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Scene navigation - left sidebar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
        <div className="flex flex-col gap-3 p-3 rounded-2xl bg-gray-900/50 backdrop-blur border border-white/5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 text-center mb-1">Scenes</span>
          {module.scenes.map((scene, index) => {
            const isCompleted = sceneProgress.get(scene.id)?.completed;
            const isUnlocked = isSceneUnlocked(index);
            const isCurrent = index === currentSceneIndex;

            return (
              <button
                key={scene.id}
                onClick={() => {
                  if (isUnlocked) {
                    setCurrentSceneIndex(index);
                    setSelectedChoice(null);
                    setShowFeedback(false);
                  }
                }}
                disabled={!isUnlocked}
                className={`group relative w-4 h-4 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? `bg-gradient-to-r ${module.color} scale-125 shadow-lg shadow-indigo-500/30`
                    : isCompleted
                    ? 'bg-emerald-500'
                    : isUnlocked
                    ? 'bg-gray-600 hover:bg-gray-500 hover:scale-110'
                    : 'bg-gray-800/50'
                }`}
                title={scene.title}
              >
                {!isUnlocked && (
                  <Lock className="w-2 h-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                )}
                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap bg-gray-800/95 px-3 py-1.5 rounded-lg border border-white/10 shadow-xl">
                  {index + 1}. {scene.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content area - scrollable */}
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
                    currentScene?.type === 'narrative' ? 'bg-blue-500/10' :
                    currentScene?.type === 'choice' ? 'bg-purple-500/10' :
                    currentScene?.type === 'reflection' ? 'bg-amber-500/10' :
                    currentScene?.type === 'quiz' ? 'bg-emerald-500/10' :
                    'bg-amber-500/10'
                  }`}>
                    {currentScene?.type === 'narrative' && <BookOpen className="w-5 h-5 text-blue-400" />}
                    {currentScene?.type === 'choice' && <Target className="w-5 h-5 text-purple-400" />}
                    {currentScene?.type === 'reflection' && <MessageSquare className="w-5 h-5 text-amber-400" />}
                    {currentScene?.type === 'quiz' && <FileText className="w-5 h-5 text-emerald-400" />}
                    {currentScene?.type === 'completion' && <Award className="w-5 h-5 text-amber-400" />}
                  </div>
                  <span className="text-sm text-gray-400 capitalize font-medium">{currentScene?.type}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-500">Scene {currentSceneIndex + 1}</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{currentScene?.title}</h2>
                {currentScene?.setting && (
                  <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                    <span className="inline-block w-4 h-px bg-gray-600" />
                    <span className="italic">{currentScene.setting}</span>
                  </p>
                )}
              </div>

              {/* Scene content */}
              <div className="px-8 py-6">
                {/* Character indicator */}
                {currentScene?.character && (
                  <div className="mb-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-indigo-500/20">
                      {currentScene.character.charAt(0)}
                    </div>
                    <div>
                      <span className="text-white font-medium">{currentScene.character}</span>
                      <p className="text-xs text-gray-500">Speaking</p>
                    </div>
                  </div>
                )}

                {/* Narrative content */}
                {currentScene?.type === 'narrative' && (
                  <div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
                        {currentScene.content.split('\n').map((line, i) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <h4 key={i} className="text-white font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                          }
                          if (line.startsWith('•')) {
                            return <p key={i} className="ml-4 my-1">{line}</p>;
                          }
                          if (line.match(/^\d+\./)) {
                            return <p key={i} className="ml-4 my-1">{line}</p>;
                          }
                          return <p key={i} className="my-2">{line}</p>;
                        })}
                      </div>
                    </div>
                    {/* Play narration button */}
                    {!isMuted && (
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(currentScene.content)}
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
                )}

                {/* Choice content */}
                {currentScene?.type === 'choice' && currentSceneWithAI && (
                  <div>
                    {isRetake && attemptNumber > 1 && aiGeneratedScenes.has(currentScene.id) && (
                      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Fresh scenario for attempt #{attemptNumber}</span>
                      </div>
                    )}
                    <p className="text-gray-300 mb-6">{currentSceneWithAI.content}</p>
                    <div className="space-y-3">
                      {currentSceneWithAI.choices?.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoiceSelect(choice)}
                          disabled={showFeedback}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedChoice === choice.id
                              ? showFeedback
                                ? choice.isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-500/50'
                                  : 'bg-red-500/20 border-red-500/50'
                                : 'bg-indigo-500/20 border-indigo-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          } ${showFeedback && choice.isCorrect ? 'bg-emerald-500/20 border-emerald-500/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                              selectedChoice === choice.id
                                ? showFeedback
                                  ? choice.isCorrect
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-red-500 bg-red-500'
                                  : 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-500'
                            }`}>
                              {selectedChoice === choice.id && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="text-gray-300">{choice.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Feedback */}
                    {showFeedback && selectedChoice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-6 p-4 rounded-xl ${
                          currentSceneWithAI.choices?.find(c => c.id === selectedChoice)?.isCorrect
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'bg-amber-500/10 border border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {currentSceneWithAI.choices?.find(c => c.id === selectedChoice)?.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-white mb-1">
                              {currentSceneWithAI.choices?.find(c => c.id === selectedChoice)?.isCorrect
                                ? 'Great choice!'
                                : 'Learning opportunity'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {currentSceneWithAI.choices?.find(c => c.id === selectedChoice)?.feedback}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              +{currentSceneWithAI.choices?.find(c => c.id === selectedChoice)?.points} points
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Submit button for choice */}
                    {!showFeedback && selectedChoice && (
                      <Button
                        onClick={submitChoice}
                        className={`mt-6 bg-gradient-to-r ${module.color} hover:opacity-90`}
                      >
                        Submit Answer
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Reflection content */}
                {currentScene?.type === 'reflection' && currentSceneWithAI && (
                  <div>
                    {isRetake && attemptNumber > 1 && aiGeneratedScenes.has(currentScene.id) && (
                      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Fresh reflection prompt for attempt #{attemptNumber}</span>
                      </div>
                    )}
                    <p className="text-gray-300 mb-4">{currentSceneWithAI.content}</p>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                      <p className="text-amber-400 text-sm">{currentSceneWithAI.reflection?.prompt}</p>
                    </div>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="Write your reflection here..."
                      className="w-full h-40 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm ${
                        reflectionText.length >= (currentSceneWithAI.reflection?.minLength || 0)
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                      }`}>
                        {reflectionText.length} / {currentSceneWithAI.reflection?.minLength} characters minimum
                      </span>
                      <Button
                        onClick={submitReflection}
                        disabled={reflectionText.length < (currentSceneWithAI.reflection?.minLength || 0)}
                        className={`bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-50`}
                      >
                        Submit Reflection
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quiz content */}
                {currentScene?.type === 'quiz' && currentSceneWithAI && (
                  <div>
                    {isRetake && attemptNumber > 1 && aiGeneratedScenes.has(currentScene.id) && (
                      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Fresh questions for attempt #{attemptNumber}</span>
                      </div>
                    )}
                    <p className="text-gray-300 mb-6">{currentSceneWithAI.content}</p>
                    <div className="space-y-6">
                      {currentSceneWithAI.quiz?.map((q, qIndex) => (
                        <div key={qIndex} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <p className="font-medium text-white mb-3">
                            {qIndex + 1}. {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.options.map((option, oIndex) => (
                              <button
                                key={oIndex}
                                onClick={() => {
                                  if (!quizSubmitted) {
                                    const newAnswers = [...quizAnswers];
                                    newAnswers[qIndex] = oIndex;
                                    setQuizAnswers(newAnswers);
                                  }
                                }}
                                disabled={quizSubmitted}
                                className={`w-full text-left p-3 rounded-lg transition-all ${
                                  quizAnswers[qIndex] === oIndex
                                    ? quizSubmitted
                                      ? oIndex === q.correctIndex
                                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                                        : 'bg-red-500/20 border border-red-500/50'
                                      : 'bg-indigo-500/20 border border-indigo-500/50'
                                    : quizSubmitted && oIndex === q.correctIndex
                                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    quizAnswers[qIndex] === oIndex
                                      ? quizSubmitted
                                        ? oIndex === q.correctIndex
                                          ? 'border-emerald-500 bg-emerald-500'
                                          : 'border-red-500 bg-red-500'
                                        : 'border-indigo-500 bg-indigo-500'
                                      : 'border-gray-500'
                                  }`}>
                                    {quizAnswers[qIndex] === oIndex && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-300">{option}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          {quizSubmitted && quizAnswers[qIndex] !== q.correctIndex && (
                            <p className="text-sm text-emerald-400 mt-2 pl-7">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {!quizSubmitted ? (
                      <Button
                        onClick={submitQuiz}
                        disabled={quizAnswers.length < (currentSceneWithAI.quiz?.length || 0)}
                        className={`mt-6 bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-50`}
                      >
                        Submit Quiz
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                        <p className="text-indigo-400 font-medium">
                          Quiz Complete! You answered {quizAnswers.filter((a, i) => a === currentSceneWithAI.quiz?.[i].correctIndex).length} of {currentSceneWithAI.quiz?.length} correctly.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Completion content */}
                {currentScene?.type === 'completion' && (
                  <div className="text-center py-8">
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${module.color} flex items-center justify-center mx-auto mb-6`}>
                      <Award className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">{currentScene.content}</h3>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-2xl font-bold text-emerald-400">{totalScore}</p>
                        <p className="text-sm text-gray-400">Points Earned</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-2xl font-bold text-indigo-400">{completedScenes}</p>
                        <p className="text-sm text-gray-400">Scenes Completed</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                      {module.competencies.map((comp, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 rounded-full text-sm bg-gradient-to-r ${module.color} bg-opacity-20 text-white`}
                        >
                          {comp}
                        </span>
                      ))}
                    </div>

                    {!moduleCompleted ? (
                      <Button
                        onClick={completeModule}
                        className={`bg-gradient-to-r ${module.color} hover:opacity-90`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Module
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-4">
                          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-emerald-400 font-medium">Module Completed!</p>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                          <Button
                            onClick={downloadCertificate}
                            variant="outline"
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Certificate
                          </Button>
                          <Button
                            onClick={() => navigate('/dashboard/candidate/training')}
                            className="bg-indigo-600 hover:bg-indigo-500"
                          >
                            <Home className="w-4 h-4 mr-2" />
                            Back to Training
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              {module.scenes.slice(
                Math.max(0, currentSceneIndex - 3),
                Math.min(module.scenes.length, currentSceneIndex + 4)
              ).map((scene, i) => {
                const actualIndex = Math.max(0, currentSceneIndex - 3) + i;
                const isCompleted = sceneProgress.get(scene.id)?.completed;
                const isCurrent = actualIndex === currentSceneIndex;

                return (
                  <div
                    key={scene.id}
                    className={`transition-all duration-300 rounded-full ${
                      isCurrent
                        ? 'w-6 h-2 bg-indigo-500'
                        : isCompleted
                        ? 'w-2 h-2 bg-emerald-500'
                        : 'w-2 h-2 bg-gray-700'
                    }`}
                  />
                );
              })}
            </div>

            {currentScene?.type === 'completion' ? (
              <div className="w-28" />
            ) : currentScene?.type === 'choice' && !showFeedback ? (
              <div className="w-28" />
            ) : currentScene?.type === 'reflection' ? (
              <div className="w-28" />
            ) : currentScene?.type === 'quiz' && !quizSubmitted ? (
              <div className="w-28" />
            ) : (
              <Button
                onClick={goToNextScene}
                disabled={currentSceneIndex === module.scenes.length - 1}
                className={`bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-30 px-6 shadow-lg`}
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

export default TrainingModuleViewer;
