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
  Mic,
  MicOff,
  Square,
  Send,
  RefreshCw,
  AlertCircle,
  Zap,
  Users,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Rocket,
  ListOrdered,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  INTERACTIVE_ASSESSMENT_SCENES,
  SKILL_DIMENSIONS,
  InteractiveAssessmentScene,
  ChallengeResult,
  calculateSkillProfile
} from '@/data/interactiveSkillAssessment';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  createSpeechRecognitionService,
  isSpeechRecognitionSupported,
  requestMicrophonePermission,
  analyzeSpeechMetrics,
  SpeechRecognitionService
} from '@/services/speechRecognition';
import {
  analyzeVoiceResponse,
  analyzeWrittenResponse,
  analyzePrioritization,
  analyzeQuickResponse,
  analyzeDialogueChoices,
  analyzeProblemSolvingPath,
  analyzeListeningComprehension,
  analyzeJudgmentChoice,
  VoiceAnalysisResult,
  WrittenAnalysisResult
} from '@/services/aiResponseAnalysis';
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

export const InteractiveSkillAssessment = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Scene navigation
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Results storage
  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);

  // Written challenge state
  const [writtenResponse, setWrittenResponse] = useState('');
  const [writtenAnalysis, setWrittenAnalysis] = useState<WrittenAnalysisResult | null>(null);

  // Prioritization state
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  const [prioritizationSubmitted, setPrioritizationSubmitted] = useState(false);

  // Role-play state
  const [currentDialogueTurn, setCurrentDialogueTurn] = useState(0);
  const [dialogueChoices, setDialogueChoices] = useState<{ quality: string; feedback: string }[]>([]);

  // Problem-solving state
  const [currentBranch, setCurrentBranch] = useState(0);
  const [problemChoices, setProblemChoices] = useState<{ choiceId: string; score: number; consequence: string }[]>([]);

  // Active listening state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [listeningAnswers, setListeningAnswers] = useState<number[]>([]);
  const [listeningSubmitted, setListeningSubmitted] = useState(false);

  // Judgment state
  const [judgmentChoice, setJudgmentChoice] = useState<string | null>(null);

  // Quick response state
  const [quickResponse, setQuickResponse] = useState('');
  const [quickResponseSubmitted, setQuickResponseSubmitted] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const hasSpokenScene = useRef<Set<number>>(new Set());

  // Speech recognition ref
  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);

  // Ref to track latest transcript (solves timing issue with stopRecording)
  const transcriptRef = useRef<string>('');

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);

  const currentScene = INTERACTIVE_ASSESSMENT_SCENES[currentSceneIndex];
  const progress = ((currentSceneIndex + 1) / INTERACTIVE_ASSESSMENT_SCENES.length) * 100;

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize TTS voice
  useEffect(() => {
    const initVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const googleUSVoice = voices.find(v => v.name === 'Google US English' && v.lang === 'en-US');
      const anyUSVoice = voices.find(v => v.lang === 'en-US');
      setTtsVoice(googleUSVoice || anyUSVoice || voices[0] || null);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      initVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Check microphone permission
  useEffect(() => {
    const checkMic = async () => {
      if (isSpeechRecognitionSupported()) {
        const permission = await requestMicrophonePermission();
        setMicPermission(permission);
      } else {
        setMicPermission(false);
      }
    };
    checkMic();
  }, []);

  // Initialize scene timer
  useEffect(() => {
    if (currentScene?.timeLimit && !timerRef.current) {
      setTimeRemaining(currentScene.timeLimit);

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentSceneIndex, currentScene?.timeLimit]);

  // Speak text function
  const speakText = useCallback((text: string) => {
    if (isMuted || !ttsVoice) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/•/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = ttsVoice;
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isMuted, ttsVoice]);

  // Auto-speak narrative scenes
  useEffect(() => {
    if (!isMuted && ttsVoice && !hasSpokenScene.current.has(currentSceneIndex)) {
      const scene = currentScene;
      if ((scene?.type === 'welcome' || scene?.type === 'narrative') && scene.content) {
        const timer = setTimeout(() => {
          speakText(scene.content);
          hasSpokenScene.current.add(currentSceneIndex);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSceneIndex, isMuted, ttsVoice, speakText, currentScene]);

  // Start voice recording
  const startRecording = useCallback(() => {
    if (!micPermission) return;

    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setVoiceAnalysis(null);
    transcriptRef.current = '';

    const service = createSpeechRecognitionService({
      onStart: () => setIsRecording(true),
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(prev => {
            const newTranscript = (prev + ' ' + text).trim();
            transcriptRef.current = newTranscript;
            return newTranscript;
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(text);
        }
      },
      onEnd: () => setIsRecording(false),
      onError: (error) => {
        console.error('Speech recognition error:', error);
        setIsRecording(false);
      }
    }, { continuous: true, interimResults: true });

    if (service) {
      speechRecognitionRef.current = service;
      service.start();

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, [micPermission]);

  // Stop voice recording
  const stopRecording = useCallback(async () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);

    // Small delay to allow final results to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the latest transcript from ref (handles timing issue)
    const finalTranscript = transcriptRef.current || transcript;

    // Analyze the recording
    if (finalTranscript && currentScene?.voicePrompt) {
      setIsAnalyzing(true);
      try {
        const metrics = analyzeSpeechMetrics(finalTranscript, recordingTime);
        const analysis = await analyzeVoiceResponse(
          currentScene.voicePrompt,
          finalTranscript,
          metrics
        );
        setVoiceAnalysis(analysis);

        // Save result
        setChallengeResults(prev => [...prev, {
          sceneId: currentScene.id,
          dimension: currentScene.dimension,
          scores: analysis.scores,
          rawResponse: finalTranscript,
          aiAnalysis: analysis.feedback,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [transcript, recordingTime, currentScene]);

  // Submit written response
  const submitWrittenResponse = useCallback(async () => {
    if (!writtenResponse || !currentScene?.writtenChallenge) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeWrittenResponse(
        currentScene.writtenChallenge,
        writtenResponse
      );
      setWrittenAnalysis(analysis);

      setChallengeResults(prev => [...prev, {
        sceneId: currentScene.id,
        dimension: currentScene.dimension,
        scores: analysis.scores,
        rawResponse: writtenResponse,
        aiAnalysis: analysis.feedback,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Written analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [writtenResponse, currentScene]);

  // Handle prioritization drag
  const handleTaskReorder = (fromIndex: number, toIndex: number) => {
    if (prioritizationSubmitted) return;
    const newOrder = [...taskOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setTaskOrder(newOrder);
  };

  // Initialize prioritization tasks
  useEffect(() => {
    if (currentScene?.type === 'prioritization' && currentScene.prioritizationTasks) {
      setTaskOrder(currentScene.prioritizationTasks.map(t => t.id));
      setPrioritizationSubmitted(false);
    }
  }, [currentSceneIndex, currentScene]);

  // Submit prioritization
  const submitPrioritization = useCallback(async () => {
    if (!currentScene?.prioritizationTasks) return;

    setPrioritizationSubmitted(true);
    const tasks = currentScene.prioritizationTasks.map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      urgency: t.urgency,
      importance: t.importance,
      dependencies: t.dependencies
    }));

    const result = await analyzePrioritization(tasks, taskOrder);

    setChallengeResults(prev => [...prev, {
      sceneId: currentScene.id,
      dimension: currentScene.dimension,
      scores: { prioritization: result.score },
      rawResponse: taskOrder.join(', '),
      aiAnalysis: result.feedback,
      timestamp: new Date()
    }]);
  }, [currentScene, taskOrder]);

  // Handle role-play choice
  const handleDialogueChoice = (option: { quality: string; feedback: string; nextTurnId?: string }) => {
    setDialogueChoices(prev => [...prev, { quality: option.quality, feedback: option.feedback }]);
    setCurrentDialogueTurn(prev => prev + 1);
  };

  // Handle problem-solving choice
  const handleProblemChoice = (choice: { id: string; score: number; consequence: string; leadsTo?: string }) => {
    setProblemChoices(prev => [...prev, {
      choiceId: choice.id,
      score: choice.score,
      consequence: choice.consequence
    }]);
    setCurrentBranch(prev => prev + 1);
  };

  // Play audio for listening test
  const playListeningAudio = () => {
    if (!currentScene?.audioScript || !ttsVoice) return;

    setIsPlayingAudio(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentScene.audioScript);
    utterance.voice = ttsVoice;
    utterance.rate = 0.9;
    utterance.onend = () => {
      setIsPlayingAudio(false);
      setAudioPlayed(true);
    };
    window.speechSynthesis.speak(utterance);
  };

  // Submit listening answers
  const submitListeningAnswers = () => {
    if (!currentScene?.comprehensionQuestions) return;

    setListeningSubmitted(true);
    const correctIndices = currentScene.comprehensionQuestions.map(q => q.correctIndex);
    const result = analyzeListeningComprehension(listeningAnswers, correctIndices);

    setChallengeResults(prev => [...prev, {
      sceneId: currentScene.id,
      dimension: currentScene.dimension,
      scores: { listening: result.score },
      rawResponse: listeningAnswers.join(', '),
      aiAnalysis: result.feedback,
      timestamp: new Date()
    }]);
  };

  // Handle judgment choice
  const handleJudgmentChoice = (option: any) => {
    setJudgmentChoice(option.id);

    if (currentScene?.judgmentScenario) {
      const result = analyzeJudgmentChoice(option, currentScene.judgmentScenario.stakeholders);

      setChallengeResults(prev => [...prev, {
        sceneId: currentScene.id,
        dimension: currentScene.dimension,
        scores: {
          ethical: result.ethicalScore,
          practical: result.practicalScore
        },
        rawResponse: option.action,
        aiAnalysis: result.feedback,
        timestamp: new Date()
      }]);
    }
  };

  // Submit quick response
  const submitQuickResponse = async () => {
    if (!quickResponse) return;

    setQuickResponseSubmitted(true);
    const result = await analyzeQuickResponse(
      'You finished your assigned task early. What do you do?',
      quickResponse,
      30 - timeRemaining
    );

    setChallengeResults(prev => [...prev, {
      sceneId: currentScene.id,
      dimension: currentScene.dimension,
      scores: { initiative: result.score },
      rawResponse: quickResponse,
      aiAnalysis: result.feedback,
      timestamp: new Date()
    }]);
  };

  // Navigation
  const goToNextScene = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Reset scene-specific state
    setTranscript('');
    setInterimTranscript('');
    setVoiceAnalysis(null);
    setWrittenResponse('');
    setWrittenAnalysis(null);
    setCurrentDialogueTurn(0);
    setCurrentBranch(0);
    setAudioPlayed(false);
    setListeningAnswers([]);
    setListeningSubmitted(false);
    setJudgmentChoice(null);
    setQuickResponse('');
    setQuickResponseSubmitted(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (currentSceneIndex < INTERACTIVE_ASSESSMENT_SCENES.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    }
  };

  const goToPreviousScene = () => {
    window.speechSynthesis.cancel();
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  // Check if can proceed
  const canProceed = (): boolean => {
    const scene = currentScene;

    switch (scene.type) {
      case 'voice-response':
        return voiceAnalysis !== null;
      case 'written-challenge':
        return writtenAnalysis !== null;
      case 'prioritization':
        return prioritizationSubmitted;
      case 'role-play':
        return dialogueChoices.length >= 2;
      case 'problem-solving':
        return problemChoices.length >= 1;
      case 'active-listening':
        return listeningSubmitted;
      case 'judgment':
        return judgmentChoice !== null;
      case 'quick-response':
        return quickResponseSubmitted;
      default:
        return true;
    }
  };

  // Calculate skill profile from results
  const skillProfile = calculateSkillProfile(challengeResults);

  // Get radar data for review
  const getRadarData = () => {
    return SKILL_DIMENSIONS.map(dim => ({
      dimension: dim.title.split(' ')[0],
      score: skillProfile[dim.id]?.score || 0,
      fullMark: 5
    }));
  };

  // Render scene content based on type
  const renderSceneContent = () => {
    const scene = currentScene;

    // Welcome / Narrative
    if (scene.type === 'welcome' || scene.type === 'narrative') {
      return (
        <div>
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
              {scene.content.split('\n').map((line, i) => {
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
                onClick={() => speakText(scene.content)}
                disabled={isSpeaking}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {isSpeaking ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isSpeaking ? 'Speaking...' : 'Play Narration'}
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Voice Response Challenge
    if (scene.type === 'voice-response' && scene.voicePrompt) {
      return (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-medium mb-2">Scenario:</p>
            <p className="text-gray-300">{scene.voicePrompt.scenario}</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-medium mb-2">Your Task:</p>
            <p className="text-gray-300">{scene.voicePrompt.prompt}</p>
          </div>

          {/* Recording UI */}
          <div className="flex flex-col items-center gap-4 py-6">
            {!micPermission ? (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-red-400">Microphone access required for voice challenges.</p>
                <Button
                  onClick={async () => {
                    const permission = await requestMicrophonePermission();
                    setMicPermission(permission);
                  }}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500"
                >
                  Enable Microphone
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  {!isRecording && !voiceAnalysis && (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-red-600 hover:bg-red-500 rounded-full w-16 h-16"
                    >
                      <Mic className="w-8 h-8" />
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="bg-gray-600 hover:bg-gray-500 rounded-full w-16 h-16 animate-pulse"
                    >
                      <Square className="w-6 h-6" />
                    </Button>
                  )}
                </div>

                {isRecording && (
                  <div className="text-center">
                    <p className="text-red-400 font-mono text-xl">{formatTime(recordingTime)}</p>
                    <p className="text-gray-400 text-sm">Recording in progress...</p>
                  </div>
                )}

                {/* Transcript display */}
                {(transcript || interimTranscript) && (
                  <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">Transcript:</p>
                    <p className="text-gray-300">
                      {transcript}
                      <span className="text-gray-500">{interimTranscript}</span>
                    </p>
                  </div>
                )}

                {/* Analysis loading */}
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing your response...</span>
                  </div>
                )}

                {/* Analysis results */}
                {voiceAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-4"
                  >
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(voiceAnalysis.scores).map(([key, value]) => (
                        <div key={key} className="p-3 rounded-xl bg-white/5 text-center">
                          <p className="text-2xl font-bold text-white">{value.toFixed(1)}</p>
                          <p className="text-xs text-gray-400 capitalize">{key}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-400">{voiceAnalysis.feedback}</p>
                    </div>

                    {voiceAnalysis.strengths.length > 0 && (
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-sm text-gray-400 mb-2">Strengths:</p>
                        <ul className="space-y-1">
                          {voiceAnalysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    // Written Challenge
    if (scene.type === 'written-challenge' && scene.writtenChallenge) {
      const challenge = scene.writtenChallenge;
      const wordCount = writtenResponse.split(/\s+/).filter(w => w.length > 0).length;

      return (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-medium mb-2">Scenario:</p>
            <p className="text-gray-300">{challenge.scenario}</p>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400">
              Type: {challenge.type}
            </div>
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400">
              To: {challenge.recipient}
            </div>
            {challenge.constraints?.maxWords && (
              <div className={`px-3 py-1 rounded-full ${
                wordCount > challenge.constraints.maxWords
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {wordCount}/{challenge.constraints.maxWords} words
              </div>
            )}
          </div>

          <Textarea
            value={writtenResponse}
            onChange={(e) => setWrittenResponse(e.target.value)}
            placeholder={`Write your ${challenge.type} here...`}
            className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            disabled={writtenAnalysis !== null}
          />

          {!writtenAnalysis && (
            <Button
              onClick={submitWrittenResponse}
              disabled={wordCount < (challenge.constraints?.minWords || 10) || isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Analysis
                </>
              )}
            </Button>
          )}

          {/* Analysis results */}
          {writtenAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(writtenAnalysis.scores).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-2xl font-bold text-white">{value.toFixed(1)}</p>
                    <p className="text-xs text-gray-400 capitalize">{key}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400">{writtenAnalysis.feedback}</p>
              </div>

              {writtenAnalysis.suggestedRevision && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-400 mb-2">Suggested improvement:</p>
                  <p className="text-gray-300 italic">"{writtenAnalysis.suggestedRevision}"</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      );
    }

    // Prioritization Challenge
    if (scene.type === 'prioritization' && scene.prioritizationTasks) {
      return (
        <div className="space-y-6">
          <p className="text-gray-300">{scene.content}</p>

          {timeRemaining > 0 && !prioritizationSubmitted && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
              timeRemaining < 30 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            } w-fit`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          )}

          <div className="space-y-3">
            {taskOrder.map((taskId, index) => {
              const task = scene.prioritizationTasks!.find(t => t.id === taskId)!;
              const urgencyColors = {
                critical: 'border-red-500/50 bg-red-500/10',
                high: 'border-orange-500/50 bg-orange-500/10',
                medium: 'border-yellow-500/50 bg-yellow-500/10',
                low: 'border-gray-500/50 bg-gray-500/10'
              };

              return (
                <motion.div
                  key={task.id}
                  layout
                  className={`p-4 rounded-xl border ${urgencyColors[task.urgency]} cursor-move`}
                  draggable={!prioritizationSubmitted}
                  onDragStart={(e: any) => e.dataTransfer.setData('index', index.toString())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('index'));
                    handleTaskReorder(fromIndex, index);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="text-sm text-gray-400">{task.description}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {task.deadline}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {task.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {!prioritizationSubmitted ? (
            <Button
              onClick={submitPrioritization}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <ListOrdered className="w-4 h-4 mr-2" />
              Submit Prioritization
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-emerald-400">Prioritization submitted and analyzed!</p>
            </div>
          )}
        </div>
      );
    }

    // Role-play Dialogue
    if (scene.type === 'role-play' && scene.rolePlay) {
      const rolePlay = scene.rolePlay;
      const displayTurns = rolePlay.turns.slice(0, (currentDialogueTurn + 1) * 2);

      return (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-medium mb-2">{rolePlay.title}</p>
            <p className="text-gray-300 text-sm">{rolePlay.context}</p>
            <p className="text-gray-400 text-sm mt-2">
              <strong>Objective:</strong> {rolePlay.objective}
            </p>
          </div>

          <div className="space-y-4">
            {displayTurns.map((turn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${turn.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                {turn.speaker === 'ai' && turn.message && (
                  <div className="max-w-[80%] p-4 rounded-2xl bg-gray-800 text-gray-300">
                    <p className="text-xs text-purple-400 mb-1">{rolePlay.aiRole}</p>
                    <p>{turn.message}</p>
                  </div>
                )}

                {turn.speaker === 'user' && turn.options && currentDialogueTurn === Math.floor(i / 2) && (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-gray-400">Choose your response:</p>
                    {turn.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleDialogueChoice(option)}
                        className="w-full p-3 text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-all"
                      >
                        <p className="text-gray-300">{option.text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {dialogueChoices.length >= 2 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-emerald-400">Dialogue completed! Your choices have been analyzed.</p>
            </div>
          )}
        </div>
      );
    }

    // Problem Solving
    if (scene.type === 'problem-solving' && scene.problemSolving) {
      const problem = scene.problemSolving;
      const currentBranchData = problem.branches[currentBranch];

      return (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-medium mb-2">{problem.title}</p>
            <p className="text-gray-300">{problem.initialSituation}</p>
          </div>

          {/* Show consequences of previous choices */}
          {problemChoices.map((choice, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-white/5 border-l-4 border-indigo-500"
            >
              <p className="text-gray-400 text-sm">{choice.consequence}</p>
            </motion.div>
          ))}

          {/* Current branch choices */}
          {currentBranchData && problemChoices.length < problem.branches.length && (
            <div className="space-y-3">
              <p className="text-white font-medium">{currentBranchData.situation}</p>
              {currentBranchData.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleProblemChoice(choice)}
                  className="w-full p-4 text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/50 transition-all"
                >
                  <p className="text-gray-300">{choice.text}</p>
                </button>
              ))}
            </div>
          )}

          {problemChoices.length >= 1 && !currentBranchData && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-emerald-400">Scenario completed! Your decision path has been analyzed.</p>
            </div>
          )}
        </div>
      );
    }

    // Active Listening
    if (scene.type === 'active-listening') {
      return (
        <div className="space-y-6">
          <p className="text-gray-300">{scene.content}</p>

          {!audioPlayed ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Button
                onClick={playListeningAudio}
                disabled={isPlayingAudio}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                {isPlayingAudio ? (
                  <>
                    <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                    Playing... Listen carefully
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Play Audio Briefing
                  </>
                )}
              </Button>
              <p className="text-gray-500 text-sm">You can only play this once</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-emerald-400 text-sm">Audio completed. Answer the questions below:</p>

              {scene.comprehensionQuestions?.map((q, qIndex) => (
                <div key={qIndex} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => {
                          if (!listeningSubmitted) {
                            const newAnswers = [...listeningAnswers];
                            newAnswers[qIndex] = oIndex;
                            setListeningAnswers(newAnswers);
                          }
                        }}
                        disabled={listeningSubmitted}
                        className={`w-full p-3 text-left rounded-lg transition-all ${
                          listeningAnswers[qIndex] === oIndex
                            ? listeningSubmitted
                              ? oIndex === q.correctIndex
                                ? 'bg-emerald-500/20 border border-emerald-500/50'
                                : 'bg-red-500/20 border border-red-500/50'
                              : 'bg-indigo-500/20 border border-indigo-500/50'
                            : listeningSubmitted && oIndex === q.correctIndex
                              ? 'bg-emerald-500/20 border border-emerald-500/50'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-gray-300">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {!listeningSubmitted && (
                <Button
                  onClick={submitListeningAnswers}
                  disabled={listeningAnswers.length < (scene.comprehensionQuestions?.length || 0)}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Submit Answers
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }

    // Judgment Scenario
    if (scene.type === 'judgment' && scene.judgmentScenario) {
      const judgment = scene.judgmentScenario;

      return (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <p className="text-gray-300 whitespace-pre-line">{judgment.situation}</p>
          </div>

          <div className="text-sm text-gray-400">
            <p className="font-medium mb-2">Stakeholders affected:</p>
            <div className="flex flex-wrap gap-2">
              {judgment.stakeholders.map((s, i) => (
                <span key={i} className="px-2 py-1 rounded bg-white/10">{s}</span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {judgment.options.map((option) => (
              <button
                key={option.id}
                onClick={() => !judgmentChoice && handleJudgmentChoice(option)}
                disabled={judgmentChoice !== null}
                className={`w-full p-4 text-left rounded-xl border transition-all ${
                  judgmentChoice === option.id
                    ? 'bg-indigo-500/20 border-indigo-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="text-white font-medium mb-1">{option.action}</p>
                <p className="text-gray-400 text-sm">{option.reasoning}</p>
                {judgmentChoice === option.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-white/10"
                  >
                    <p className="text-emerald-400 text-sm">{option.feedback}</p>
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Quick Response
    if (scene.type === 'quick-response') {
      return (
        <div className="space-y-6">
          <p className="text-gray-300">{scene.content}</p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300">Scenario:</p>
            <p className="text-gray-300 mt-2">
              You've finished your assigned work early. Your teammate is visibly struggling with their task.
              Your manager didn't specifically ask you to help. What do you do?
            </p>
          </div>

          {timeRemaining > 0 && !quickResponseSubmitted && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
              timeRemaining < 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
            } w-fit`}>
              <Zap className="w-4 h-4" />
              <span className="font-mono">{timeRemaining}s remaining</span>
            </div>
          )}

          <Textarea
            value={quickResponse}
            onChange={(e) => setQuickResponse(e.target.value)}
            placeholder="Type your response quickly..."
            className="min-h-[120px] bg-white/5 border-white/10 text-white"
            disabled={quickResponseSubmitted}
          />

          {!quickResponseSubmitted ? (
            <Button
              onClick={submitQuickResponse}
              disabled={quickResponse.length < 10}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Submit Response
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-emerald-400">Response analyzed for initiative!</p>
            </div>
          )}
        </div>
      );
    }

    // Review
    if (scene.type === 'review') {
      return (
        <div className="space-y-6">
          <p className="text-gray-300">{scene.content}</p>

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

          {/* Dimension Scores */}
          <div className="grid grid-cols-2 gap-3">
            {SKILL_DIMENSIONS.map(dim => {
              const score = skillProfile[dim.id]?.score || 0;
              const IconComponent = DimensionIcons[dim.icon] || Star;

              return (
                <div key={dim.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${dim.color}`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{dim.title}</p>
                  </div>
                  <span className={`text-lg font-bold ${
                    score >= 4 ? 'text-emerald-400' :
                    score >= 3 ? 'text-amber-400' : 'text-gray-400'
                  }`}>
                    {score > 0 ? score.toFixed(1) : '-'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Evidence count */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-400 text-sm">
              <strong>{challengeResults.length}</strong> skill demonstrations captured as evidence for mentor review.
            </p>
          </div>
        </div>
      );
    }

    // Completion
    if (scene.type === 'completion') {
      return (
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <Award className="w-12 h-12 text-white" />
          </div>

          <div className="prose prose-invert max-w-md mx-auto mb-8">
            {scene.content.split('\n').map((line, i) => (
              line.trim() ? <p key={i} className="text-gray-300">{line}</p> : null
            ))}
          </div>

          <Button
            onClick={() => navigate('/dashboard/candidate/assessment')}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Assessment
          </Button>
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
      case 'voice-response':
        return <Mic className="w-5 h-5 text-red-400" />;
      case 'written-challenge':
        return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'prioritization':
        return <ListOrdered className="w-5 h-5 text-amber-400" />;
      case 'role-play':
        return <Users className="w-5 h-5 text-pink-400" />;
      case 'problem-solving':
        return <Lightbulb className="w-5 h-5 text-orange-400" />;
      case 'active-listening':
        return <Volume2 className="w-5 h-5 text-cyan-400" />;
      case 'judgment':
        return <Briefcase className="w-5 h-5 text-slate-400" />;
      case 'quick-response':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'review':
        return <Target className="w-5 h-5 text-emerald-400" />;
      case 'completion':
        return <Award className="w-5 h-5 text-amber-400" />;
      default:
        return <Star className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Background */}
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
                <h1 className="hidden md:block font-semibold text-lg text-white">Skill Assessment</h1>
                {/* Mobile: Truncated title */}
                <h1 className="md:hidden font-semibold text-base text-white truncate max-w-[140px]" title="Skill Assessment">
                  Skill Test
                </h1>
                <p className="text-xs md:text-sm text-gray-500 truncate">Interactive Challenges</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className={`${isMuted ? 'text-gray-500' : 'text-indigo-400'} hover:bg-white/10 hidden md:flex`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              {/* Desktop: Horizontal badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 font-semibold">{challengeResults.length}</span>
                <span className="text-indigo-400/50">challenges</span>
              </div>
              {/* Mobile: Compact badge */}
              <div className="flex md:hidden items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <Target className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-400 font-semibold text-xs">{challengeResults.length} done</span>
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
          />
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-[76px] bottom-[80px] overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene?.id}
                ref={contentRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-b from-gray-900/80 to-gray-900/60 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-2xl"
              >
                {/* Scene header */}
                <div className="px-8 pt-8 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-white/5">
                      {getSceneIcon()}
                    </div>
                    <span className="text-sm text-gray-400 capitalize font-medium">
                      {currentScene?.type.replace('-', ' ')}
                    </span>
                    {currentScene?.dimension !== 'all' && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-sm text-indigo-400">
                          {SKILL_DIMENSIONS.find(d => d.id === currentScene?.dimension)?.title}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{currentScene?.title}</h2>
                  {currentScene?.subtitle && (
                    <p className="text-sm text-gray-400 mt-2">{currentScene.subtitle}</p>
                  )}
                </div>

                {/* Scene content */}
                <div className="px-8 py-6">
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
              className="border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30 px-5"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {INTERACTIVE_ASSESSMENT_SCENES.slice(
                Math.max(0, currentSceneIndex - 3),
                Math.min(INTERACTIVE_ASSESSMENT_SCENES.length, currentSceneIndex + 4)
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
                disabled={currentSceneIndex === INTERACTIVE_ASSESSMENT_SCENES.length - 1 || !canProceed()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 disabled:opacity-30 px-6"
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

export default InteractiveSkillAssessment;
