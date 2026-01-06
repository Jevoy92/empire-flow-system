import { useState, useRef, useCallback, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  partialText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
  isModelLoading: boolean;
}

// Singleton for the transcription pipeline
let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let isLoadingModel = false;
let modelLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

async function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (transcriber) return transcriber;
  
  if (modelLoadPromise) return modelLoadPromise;
  
  console.log('Loading Whisper model...');
  isLoadingModel = true;
  
  modelLoadPromise = (async () => {
    try {
      // Try WebGPU first
      const p = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { device: 'webgpu' }
      );
      console.log('Whisper model loaded with WebGPU');
      transcriber = p as AutomaticSpeechRecognitionPipeline;
      isLoadingModel = false;
      return transcriber;
    } catch (err) {
      console.log('WebGPU not available, falling back to CPU:', err);
      const p = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en'
      );
      console.log('Whisper model loaded with CPU');
      transcriber = p as AutomaticSpeechRecognitionPipeline;
      isLoadingModel = false;
      return transcriber;
    }
  })();
  
  return modelLoadPromise;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedTextRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);

  // Preload the model on mount
  useEffect(() => {
    if (!transcriber && !isLoadingModel) {
      setIsModelLoading(true);
      getTranscriber()
        .then(() => setIsModelLoading(false))
        .catch(() => setIsModelLoading(false));
    }
  }, []);

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      const transcriber = await getTranscriber();
      
      // Convert blob to audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const result = await transcriber(audioUrl);
      
      URL.revokeObjectURL(audioUrl);
      
      if (typeof result === 'object' && 'text' in result) {
        return result.text || null;
      }
      
      return null;
    } catch (err) {
      console.error('Transcription error:', err);
      return null;
    }
  };

  const startRecording = useCallback(async () => {
    console.log('startRecording called');
    try {
      setError(null);
      setPartialText('');
      accumulatedTextRef.current = '';
      
      // Ensure model is loaded before starting
      console.log('Loading model...');
      setIsModelLoading(true);
      await getTranscriber();
      setIsModelLoading(false);
      console.log('Model loaded, requesting mic access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Mic access granted');
      
      // Use audio/webm for recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('Recording started');
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsModelLoading(false);
      setError(err instanceof Error ? err.message : 'Microphone access denied. Please allow access in your browser settings.');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        resolve(accumulatedTextRef.current || null);
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // Create audio blob from all chunks
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          if (audioBlob.size >= 1000) {
            const text = await transcribeAudio(audioBlob);
            if (text && text.trim()) {
              accumulatedTextRef.current = text.trim();
            }
          }
          
          setIsProcessing(false);
          const finalText = accumulatedTextRef.current || null;
          setPartialText(finalText || '');
          resolve(finalText);
          
        } catch (err) {
          console.error('Audio processing error:', err);
          setError('Failed to process audio');
          setIsProcessing(false);
          resolve(accumulatedTextRef.current || null);
        }

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.stop();
    });
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
