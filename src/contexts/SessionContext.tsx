import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { VentureId } from '@/types/empire';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: { id: string; text: string; completed: boolean }[];
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

export interface SessionConfig {
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  initialTasks?: Task[];
}

interface SessionState {
  isActive: boolean;
  isMinimized: boolean;
  isPaused: boolean;
  config: SessionConfig | null;
  sessionId: string | null;
  userId: string | null;
  startTime: Date | null;
  tasks: Task[];
  elapsedSeconds: number;
  pausedTime: number;
}

interface SessionContextType extends SessionState {
  startSession: (config: SessionConfig, sessionId: string, userId: string | null) => void;
  minimizeSession: () => void;
  restoreSession: () => void;
  endSession: () => void;
  abortSession: () => void;
  setTasks: (tasks: Task[]) => void;
  setSessionId: (id: string) => void;
  togglePause: () => void;
  updateElapsedSeconds: (seconds: number) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

const STORAGE_KEY = 'active-session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => {
    // Try to restore from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          startTime: parsed.startTime ? new Date(parsed.startTime) : null,
        };
      } catch {
        // Ignore parse errors
      }
    }
    return {
      isActive: false,
      isMinimized: false,
      isPaused: false,
      config: null,
      sessionId: null,
      userId: null,
      startTime: null,
      tasks: [],
      elapsedSeconds: 0,
      pausedTime: 0,
    };
  });

  // Persist to localStorage
  useEffect(() => {
    if (state.isActive) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        startTime: state.startTime?.toISOString(),
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  // Timer effect - only runs when active and not paused
  useEffect(() => {
    if (!state.isActive || state.isPaused || !state.startTime) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = state.startTime!.getTime();
      const elapsed = Math.floor((now - start) / 1000) - state.pausedTime;
      setState(prev => ({ ...prev, elapsedSeconds: elapsed }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.isActive, state.isPaused, state.startTime, state.pausedTime]);

  const startSession = useCallback((config: SessionConfig, sessionId: string, userId: string | null) => {
    setState({
      isActive: true,
      isMinimized: false,
      isPaused: false,
      config,
      sessionId,
      userId,
      startTime: new Date(),
      tasks: config.initialTasks || [],
      elapsedSeconds: 0,
      pausedTime: 0,
    });
  }, []);

  const minimizeSession = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }));
  }, []);

  const restoreSession = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }));
  }, []);

  const endSession = useCallback(() => {
    setState({
      isActive: false,
      isMinimized: false,
      isPaused: false,
      config: null,
      sessionId: null,
      userId: null,
      startTime: null,
      tasks: [],
      elapsedSeconds: 0,
      pausedTime: 0,
    });
  }, []);

  const abortSession = useCallback(() => {
    setState({
      isActive: false,
      isMinimized: false,
      isPaused: false,
      config: null,
      sessionId: null,
      userId: null,
      startTime: null,
      tasks: [],
      elapsedSeconds: 0,
      pausedTime: 0,
    });
  }, []);

  const setTasks = useCallback((tasks: Task[]) => {
    setState(prev => ({ ...prev, tasks }));
  }, []);

  const setSessionId = useCallback((id: string) => {
    setState(prev => ({ ...prev, sessionId: id }));
  }, []);

  const togglePause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const updateElapsedSeconds = useCallback((seconds: number) => {
    setState(prev => ({ ...prev, elapsedSeconds: seconds }));
  }, []);

  return (
    <SessionContext.Provider value={{
      ...state,
      startSession,
      minimizeSession,
      restoreSession,
      endSession,
      abortSession,
      setTasks,
      setSessionId,
      togglePause,
      updateElapsedSeconds,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
