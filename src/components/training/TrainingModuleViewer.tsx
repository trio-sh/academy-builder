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
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INTERACTIVE_MODULES, InteractiveModule, ModuleScene, SceneChoice } from '@/data/interactiveTrainingModules';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading module...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentSceneIndex + 1) / module.scenes.length) * 100;
  const completedScenes = Array.from(sceneProgress.values()).filter(p => p.completed).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/candidate/training')}
                className="text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Exit
              </Button>
              <div>
                <h1 className="font-semibold text-white">{module.title}</h1>
                <p className="text-xs text-gray-400">{module.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">{totalScore}</span>
                <span className="text-gray-500">/ {module.totalPoints}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                {module.duration}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Scene {currentSceneIndex + 1} of {module.scenes.length}</span>
              <span className="text-indigo-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${module.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scene navigation dots */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
        <div className="flex flex-col gap-2">
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
                className={`group relative w-3 h-3 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-indigo-500 scale-125'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : isUnlocked
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-gray-800'
                }`}
                title={scene.title}
              >
                {!isUnlocked && (
                  <Lock className="w-2 h-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                )}
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded">
                  {scene.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto" ref={sceneRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene?.id}
              ref={contentRef}
              className="bg-gray-900/50 rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Scene header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  {currentScene?.type === 'narrative' && <BookOpen className="w-5 h-5 text-blue-400" />}
                  {currentScene?.type === 'choice' && <Target className="w-5 h-5 text-purple-400" />}
                  {currentScene?.type === 'reflection' && <MessageSquare className="w-5 h-5 text-amber-400" />}
                  {currentScene?.type === 'quiz' && <FileText className="w-5 h-5 text-emerald-400" />}
                  {currentScene?.type === 'completion' && <Award className="w-5 h-5 text-amber-400" />}
                  <span className="text-sm text-gray-400 capitalize">{currentScene?.type}</span>
                </div>
                <h2 className="text-2xl font-bold text-white">{currentScene?.title}</h2>
                {currentScene?.setting && (
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="italic">{currentScene.setting}</span>
                  </p>
                )}
              </div>

              {/* Scene content */}
              <div className="p-6">
                {/* Character indicator */}
                {currentScene?.character && (
                  <div className="mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {currentScene.character.charAt(0)}
                    </div>
                    <span className="text-indigo-400 font-medium">{currentScene.character}</span>
                  </div>
                )}

                {/* Narrative content */}
                {currentScene?.type === 'narrative' && (
                  <div className="prose prose-invert max-w-none">
                    <div className="text-gray-300 leading-relaxed whitespace-pre-line">
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
                )}

                {/* Choice content */}
                {currentScene?.type === 'choice' && (
                  <div>
                    <p className="text-gray-300 mb-6">{currentScene.content}</p>
                    <div className="space-y-3">
                      {currentScene.choices?.map((choice) => (
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
                          currentScene.choices?.find(c => c.id === selectedChoice)?.isCorrect
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'bg-amber-500/10 border border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {currentScene.choices?.find(c => c.id === selectedChoice)?.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-white mb-1">
                              {currentScene.choices?.find(c => c.id === selectedChoice)?.isCorrect
                                ? 'Great choice!'
                                : 'Learning opportunity'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {currentScene.choices?.find(c => c.id === selectedChoice)?.feedback}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              +{currentScene.choices?.find(c => c.id === selectedChoice)?.points} points
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
                {currentScene?.type === 'reflection' && (
                  <div>
                    <p className="text-gray-300 mb-4">{currentScene.content}</p>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                      <p className="text-amber-400 text-sm">{currentScene.reflection?.prompt}</p>
                    </div>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="Write your reflection here..."
                      className="w-full h-40 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm ${
                        reflectionText.length >= (currentScene.reflection?.minLength || 0)
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                      }`}>
                        {reflectionText.length} / {currentScene.reflection?.minLength} characters minimum
                      </span>
                      <Button
                        onClick={submitReflection}
                        disabled={reflectionText.length < (currentScene.reflection?.minLength || 0)}
                        className={`bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-50`}
                      >
                        Submit Reflection
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quiz content */}
                {currentScene?.type === 'quiz' && (
                  <div>
                    <p className="text-gray-300 mb-6">{currentScene.content}</p>
                    <div className="space-y-6">
                      {currentScene.quiz?.map((q, qIndex) => (
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
                        disabled={quizAnswers.length < (currentScene.quiz?.length || 0)}
                        className={`mt-6 bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-50`}
                      >
                        Submit Quiz
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                        <p className="text-indigo-400 font-medium">
                          Quiz Complete! You answered {quizAnswers.filter((a, i) => a === currentScene.quiz?.[i].correctIndex).length} of {currentScene.quiz?.length} correctly.
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

      {/* Footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousScene}
              disabled={currentSceneIndex === 0}
              className="border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {module.scenes.slice(
                Math.max(0, currentSceneIndex - 2),
                Math.min(module.scenes.length, currentSceneIndex + 3)
              ).map((scene, i) => {
                const actualIndex = Math.max(0, currentSceneIndex - 2) + i;
                const isCompleted = sceneProgress.get(scene.id)?.completed;
                const isCurrent = actualIndex === currentSceneIndex;

                return (
                  <div
                    key={scene.id}
                    className={`w-2 h-2 rounded-full ${
                      isCurrent
                        ? 'bg-indigo-500'
                        : isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-gray-600'
                    }`}
                  />
                );
              })}
            </div>

            {currentScene?.type === 'completion' ? (
              <div className="w-24" /> // Spacer
            ) : currentScene?.type === 'choice' && !showFeedback ? (
              <div className="w-24" /> // Spacer - button is in content
            ) : currentScene?.type === 'reflection' ? (
              <div className="w-24" /> // Spacer - button is in content
            ) : currentScene?.type === 'quiz' && !quizSubmitted ? (
              <div className="w-24" /> // Spacer - button is in content
            ) : (
              <Button
                onClick={goToNextScene}
                disabled={currentSceneIndex === module.scenes.length - 1}
                className={`bg-gradient-to-r ${module.color} hover:opacity-90 disabled:opacity-30`}
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
