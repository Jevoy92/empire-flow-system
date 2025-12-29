import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  partialText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

const CHUNK_INTERVAL_MS = 3000; // Send audio every 3 seconds

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const allChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          // Get user's actual session token for authentication
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ audio: base64Audio }),
            }
          );

          if (!response.ok) {
            console.error('Transcription chunk failed');
            resolve(null);
            return;
          }

          const data = await response.json();
          resolve(data.text || null);
        } catch (err) {
          console.error('Transcription error:', err);
          resolve(null);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    });
  };

  const processChunk = useCallback(async () => {
    if (chunksRef.current.length === 0) return;
    
    // Create blob from current chunks
    const currentChunks = [...chunksRef.current];
    chunksRef.current = [];
    
    const audioBlob = new Blob(currentChunks, { type: 'audio/webm' });
    
    // Only transcribe if we have meaningful audio (> 1KB)
    if (audioBlob.size < 1000) return;
    
    const text = await transcribeAudio(audioBlob);
    if (text && text.trim()) {
      accumulatedTextRef.current = accumulatedTextRef.current 
        ? `${accumulatedTextRef.current} ${text.trim()}`
        : text.trim();
      setPartialText(accumulatedTextRef.current);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setPartialText('');
      accumulatedTextRef.current = '';
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      allChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          allChunksRef.current.push(e.data);
        }
      };

      // Request data every 500ms for smoother chunking
      mediaRecorder.start(500);
      setIsRecording(true);
      
      // Process and transcribe chunks every 3 seconds
      intervalRef.current = setInterval(() => {
        processChunk();
      }, CHUNK_INTERVAL_MS);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied. Please allow access in your browser settings.');
    }
  }, [processChunk]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        // Return whatever we've accumulated so far
        resolve(accumulatedTextRef.current || null);
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // Process any remaining chunks
          if (chunksRef.current.length > 0) {
            const remainingBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            if (remainingBlob.size >= 1000) {
              const text = await transcribeAudio(remainingBlob);
              if (text && text.trim()) {
                accumulatedTextRef.current = accumulatedTextRef.current 
                  ? `${accumulatedTextRef.current} ${text.trim()}`
                  : text.trim();
              }
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
          // Still return what we have
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
  };
}
