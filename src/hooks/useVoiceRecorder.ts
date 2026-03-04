import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  partialText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
  isModelLoading: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: SpeechRecognitionCtor;
  SpeechRecognition?: SpeechRecognitionCtor;
}

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const toBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const getRecorderMimeType = (): string | undefined => {
  const preferredMimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  if (typeof MediaRecorder === 'undefined') return undefined;

  return preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
};

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const modeRef = useRef<'speech' | 'media' | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedTextRef = useRef('');
  const stopResolveRef = useRef<((value: string | null) => void) | null>(null);

  const cleanupMediaStream = () => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const transcribeWithEdgeFunction = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    try {
      const base64Audio = await toBase64(audioBlob);
      const { data, error: invokeError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      const text = data && typeof data === 'object' && 'text' in data
        ? data.text
        : null;

      return typeof text === 'string' && text.trim() ? text.trim() : null;
    } catch (err) {
      console.error('Voice transcription failed:', err);
      setError('Voice transcription failed. Please try again or type instead.');
      return null;
    }
  }, []);

  const startMediaRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const mimeType = getRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    modeRef.current = 'media';

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start();
    setIsRecording(true);
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not available');
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    modeRef.current = 'speech';

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let stable = accumulatedTextRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          stable = `${stable} ${transcript}`.trim();
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }

      accumulatedTextRef.current = stable;
      setPartialText(`${stable} ${interim}`.trim());
    };

    recognition.onerror = (event) => {
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsProcessing(false);
      modeRef.current = null;

      const finalText = accumulatedTextRef.current.trim() || null;
      setPartialText(finalText || '');

      if (stopResolveRef.current) {
        stopResolveRef.current(finalText);
        stopResolveRef.current = null;
      }
    };

    recognition.start();
    setIsRecording(true);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setPartialText('');
      accumulatedTextRef.current = '';
      setIsModelLoading(true);

      const SpeechRecognition = getSpeechRecognitionCtor();
      if (SpeechRecognition) {
        startSpeechRecognition();
      } else {
        await startMediaRecording();
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      setIsRecording(false);
      setIsProcessing(false);
    } finally {
      setIsModelLoading(false);
    }
  }, [startMediaRecording, startSpeechRecognition]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!isRecording) {
      return accumulatedTextRef.current.trim() || null;
    }

    setIsProcessing(true);

    if (modeRef.current === 'speech' && speechRecognitionRef.current) {
      return new Promise((resolve) => {
        stopResolveRef.current = resolve;
        speechRecognitionRef.current?.stop();
      });
    }

    if (modeRef.current === 'media' && mediaRecorderRef.current) {
      return new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          setIsRecording(false);
          setIsProcessing(false);
          resolve(accumulatedTextRef.current.trim() || null);
          return;
        }

        recorder.onstop = async () => {
          setIsRecording(false);
          modeRef.current = null;
          const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          chunksRef.current = [];

          const transcribed = audioBlob.size > 0
            ? await transcribeWithEdgeFunction(audioBlob)
            : null;

          if (transcribed) {
            accumulatedTextRef.current = transcribed;
          }

          setIsProcessing(false);
          cleanupMediaStream();
          resolve(accumulatedTextRef.current.trim() || null);
        };

        recorder.stop();
      });
    }

    setIsProcessing(false);
    setIsRecording(false);
    return accumulatedTextRef.current.trim() || null;
  }, [isRecording, transcribeWithEdgeFunction]);

  useEffect(() => {
    return () => {
      cleanupMediaStream();
      speechRecognitionRef.current?.abort();
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    partialText,
    startRecording,
    stopRecording,
    error,
    isModelLoading,
  };
}
