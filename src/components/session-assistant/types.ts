export interface SessionTask {
  id: string;
  text: string;
  completed: boolean;
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionContext {
  venture: string;
  workType: string;
  focus: string;
  completionCondition: string;
  tasks: SessionTask[];
  elapsedMinutes: number;
  projectName?: string;
  currentStageName?: string;
  stageProgress?: string;
  nextStageName?: string;
  isProjectSession?: boolean;
}

export interface SessionAssistantActionHandlers {
  onAddTasks: (tasks: string[]) => void;
  onAddTaskTree: (tasks: { text: string; subtasks?: string[] }[]) => void;
  onCompleteTasks: (matches: string[]) => void;
  onRemoveTasks: (matches: string[]) => void;
  onUpdateTask: (match: string, newText: string) => void;
  onSetTaskTimer: (match: string, minutes: number, autoStart?: boolean) => void;
  onStartTaskTimers: (matches?: string[]) => void;
  onPauseTaskTimers: (matches?: string[]) => void;
}
