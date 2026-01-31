// Speech Recognition Service using Web Speech API
// Handles voice input for assessment challenges

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Check if browser supports Speech Recognition
export const isSpeechRecognitionSupported = (): boolean => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

// Get the SpeechRecognition constructor
const getSpeechRecognition = (): typeof SpeechRecognition | null => {
  if ('SpeechRecognition' in window) {
    return (window as any).SpeechRecognition;
  }
  if ('webkitSpeechRecognition' in window) {
    return (window as any).webkitSpeechRecognition;
  }
  return null;
};

export interface RecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onSoundStart?: () => void;
  onSoundEnd?: () => void;
}

export interface SpeechRecognitionService {
  start: () => void;
  stop: () => void;
  abort: () => void;
  isListening: () => boolean;
}

export const createSpeechRecognitionService = (
  callbacks: RecognitionCallbacks,
  options: {
    continuous?: boolean;
    interimResults?: boolean;
    language?: string;
    maxAlternatives?: number;
  } = {}
): SpeechRecognitionService | null => {
  const SpeechRecognitionClass = getSpeechRecognition();

  if (!SpeechRecognitionClass) {
    console.warn('Speech Recognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  let listening = false;

  // Configure recognition
  recognition.continuous = options.continuous ?? true;
  recognition.interimResults = options.interimResults ?? true;
  recognition.lang = options.language ?? 'en-US';
  recognition.maxAlternatives = options.maxAlternatives ?? 1;

  // Event handlers
  recognition.onstart = () => {
    listening = true;
    callbacks.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';
    let confidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      confidence = result[0].confidence;

      if (result.isFinal) {
        finalTranscript += transcript;
        callbacks.onResult?.(finalTranscript, true, confidence);
      } else {
        interimTranscript += transcript;
        callbacks.onResult?.(interimTranscript, false, confidence);
      }
    }
  };

  recognition.onend = () => {
    listening = false;
    callbacks.onEnd?.();
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    listening = false;
    let errorMessage = 'Speech recognition error';

    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not available. Please check permissions.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone access.';
        break;
      case 'network':
        errorMessage = 'Network error. Please check your connection.';
        break;
      case 'aborted':
        errorMessage = 'Recording stopped.';
        break;
      default:
        errorMessage = `Error: ${event.error}`;
    }

    callbacks.onError?.(errorMessage);
  };

  recognition.onsoundstart = () => {
    callbacks.onSoundStart?.();
  };

  recognition.onsoundend = () => {
    callbacks.onSoundEnd?.();
  };

  return {
    start: () => {
      if (!listening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to start recognition:', e);
        }
      }
    },
    stop: () => {
      if (listening) {
        recognition.stop();
      }
    },
    abort: () => {
      recognition.abort();
      listening = false;
    },
    isListening: () => listening
  };
};

// Helper to request microphone permission
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks immediately - we just needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

// Speech metrics analyzer
export interface SpeechMetrics {
  wordCount: number;
  averageWordLength: number;
  fillerWordCount: number;
  fillerWords: string[];
  speakingPace: number; // words per minute (estimated)
  sentenceCount: number;
  uniqueWordRatio: number;
}

export const analyzeSpeechMetrics = (
  transcript: string,
  durationSeconds: number
): SpeechMetrics => {
  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words);

  const fillerPatterns = [
    'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically',
    'actually', 'literally', 'right', 'so yeah', 'i mean'
  ];

  const fillerWords: string[] = [];
  fillerPatterns.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = transcript.match(regex);
    if (matches) {
      fillerWords.push(...matches);
    }
  });

  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    wordCount: words.length,
    averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1),
    fillerWordCount: fillerWords.length,
    fillerWords,
    speakingPace: durationSeconds > 0 ? (words.length / durationSeconds) * 60 : 0,
    sentenceCount: sentences.length,
    uniqueWordRatio: words.length > 0 ? uniqueWords.size / words.length : 0
  };
};

// Confidence level interpretation
export const interpretConfidence = (confidence: number): {
  level: 'high' | 'medium' | 'low';
  description: string;
} => {
  if (confidence >= 0.9) {
    return { level: 'high', description: 'Very clear speech detected' };
  }
  if (confidence >= 0.7) {
    return { level: 'medium', description: 'Mostly clear, some parts uncertain' };
  }
  return { level: 'low', description: 'Unclear speech, consider re-recording' };
};
