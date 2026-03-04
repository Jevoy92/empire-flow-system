import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VentureId } from '@/types/empire';
import { ventures, defaultTasks, getCategoryById } from '@/data/ventures';
import { X, Plus, Trash2, Check, RotateCcw, Square, Pause, Play, Minimize2, Timer, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CircularProgress } from './CircularProgress';
import { SessionAssistant } from './SessionAssistant';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';

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

const parseDurationFromTaskText = (rawText: string): { text: string; durationSeconds?: number } => {
  const text = rawText.trim();
  if (!text) return { text };

  const durationPattern = /\s*(?:\(|\[)?(?:for\s+)?(\d{1,3})\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)(?:\)|\])?\s*$/i;
  const match = text.match(durationPattern);

  if (!match) return { text };

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return { text };

  const seconds = unit.startsWith('h') ? value * 3600 : value * 60;
  const cleanText = text.replace(durationPattern, '').trim();

  return { text: cleanText || text, durationSeconds: seconds };
};

const toNormalizedTask = (task: Task): Task => {
  const { text, durationSeconds } = parseDurationFromTaskText(task.text);
  const currentDuration = task.timerDurationSeconds ?? durationSeconds;
  const normalizedSubtasks = (task.subtasks || [])
    .map((subtask, index) => ({
      id: subtask.id || `subtask-${index}`,
      text: subtask.text.trim(),
      completed: Boolean(subtask.completed),
    }))
    .filter((subtask) => subtask.text.length > 0);

  const isTaskCompleted = normalizedSubtasks.length > 0
    ? normalizedSubtasks.every((subtask) => subtask.completed)
    : task.completed;

  if (!currentDuration || currentDuration <= 0) {
    return {
      ...task,
      text,
      completed: isTaskCompleted,
      subtasks: normalizedSubtasks.length > 0 ? normalizedSubtasks : undefined,
      timerDurationSeconds: undefined,
      timerRemainingSeconds: undefined,
      timerStatus: undefined,
      timerCompletedAt: undefined,
    };
  }

  const remaining = task.timerRemainingSeconds ?? currentDuration;
  const status = task.timerStatus ?? 'idle';

  return {
    ...task,
    text,
    completed: isTaskCompleted,
    subtasks: normalizedSubtasks.length > 0 ? normalizedSubtasks : undefined,
    timerDurationSeconds: currentDuration,
    timerRemainingSeconds: Math.max(0, remaining),
    timerStatus: remaining <= 0 ? 'done' : status,
    timerCompletedAt: task.timerCompletedAt ?? null,
  };
};

interface WorkSessionProps {
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  initialTasks?: Task[];
  startTime: Date;
  onComplete: (tasks: Task[]) => void;
  onAbort: () => void;
  onTasksChange?: (tasks: Task[]) => void;
}

export function WorkSession({ venture, workType, focus, completionCondition, initialTasks, startTime, onComplete, onAbort, onTasksChange }: WorkSessionProps) {
  const navigate = useNavigate();
  const ventureData = ventures.find(v => v.id === venture);
  const categoryData = getCategoryById(venture);
  const ventureLabel = ventureData?.name || categoryData?.name || venture;
  const [totalVentureMinutes, setTotalVentureMinutes] = useState(0);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const prevCompletedCountRef = useRef(0);
  const tasksRef = useRef<Task[]>([]);
  const previousRemainingRef = useRef<Record<string, number>>({});
  
  const { 
    elapsedSeconds, 
    isPaused, 
    tasks: contextTasks,
    togglePause, 
    minimizeSession,
    setTasks: setContextTasks 
  } = useSession();
  
  const getInitialTasks = (): Task[] => {
    if (initialTasks && initialTasks.length > 0) {
      return initialTasks.map(toNormalizedTask);
    }
    return (defaultTasks[workType] || []).map((text, idx) => toNormalizedTask({
      id: `task-${idx}`,
      text,
      completed: false,
    }));
  };
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Use context tasks if available, otherwise get initial
    if (contextTasks.length > 0) return contextTasks.map(toNormalizedTask);
    return getInitialTasks();
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Fetch total time for this venture
  useEffect(() => {
    const fetchVentureTime = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('duration_minutes')
        .eq('venture', venture)
        .eq('status', 'completed');
      
      if (data) {
        const total = data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        setTotalVentureMinutes(total);
      }
    };
    fetchVentureTime();
  }, [venture]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimer = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const totalUnits = tasks.reduce((sum, task) => {
    const subtaskCount = task.subtasks?.length || 0;
    return sum + (subtaskCount > 0 ? subtaskCount : 1);
  }, 0);
  const completedUnits = tasks.reduce((sum, task) => {
    const subtasks = task.subtasks || [];
    if (subtasks.length > 0) {
      return sum + subtasks.filter((subtask) => subtask.completed).length;
    }
    return sum + (task.completed ? 1 : 0);
  }, 0);
  const completedCount = tasks.filter((task) => task.completed).length;
  const ongoingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const leadTaskId = ongoingTasks[0]?.id;
  const progress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

  // Milestone celebrations and auto-complete for task-based sessions
  useEffect(() => {
    const prevCount = prevCompletedCountRef.current;
    const totalTasks = tasks.length;
    
    if (completedCount > prevCount && totalTasks > 0) {
      // Check for milestones
      const halfwayPoint = Math.ceil(totalTasks / 2);
      const almostDone = totalTasks - 1;
      
      if (completedCount === halfwayPoint && prevCount < halfwayPoint) {
        toast({
          title: "🔥 Halfway there!",
          description: "You're building momentum. Keep going!",
          variant: "celebration",
        });
      } else if (completedCount === almostDone && prevCount < almostDone && totalTasks > 2) {
        toast({
          title: "⚡ One more to go!",
          description: "Almost there. Finish strong!",
          variant: "celebration",
        });
      } else if (completedCount === totalTasks) {
        toast({
          title: "🎉 All tasks done!",
          description: completionCondition === 'task-based' 
            ? "Session completing..." 
            : "You completed everything. Nice work!",
          variant: "success",
        });
        
        // Auto-complete for task-based sessions after a short delay
        if (completionCondition === 'task-based') {
          setTimeout(() => {
            onComplete(tasksRef.current);
          }, 1500);
        }
      }
    }
    
    prevCompletedCountRef.current = completedCount;
  }, [completedCount, tasks.length, toast, completionCondition, onComplete, tasks]);

  // Keep tasksRef in sync for use in closures
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Allow multiple task timers to run concurrently.
  useEffect(() => {
    if (isPaused) return;
    const hasRunningTimer = tasks.some((task) => task.timerStatus === 'running' && (task.timerRemainingSeconds || 0) > 0);
    if (!hasRunningTimer) return;

    const interval = setInterval(() => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.timerStatus !== 'running') return task;

          const remaining = task.timerRemainingSeconds ?? task.timerDurationSeconds ?? 0;
          if (remaining <= 1) {
            return {
              ...task,
              timerRemainingSeconds: 0,
              timerStatus: 'done',
              timerCompletedAt: new Date().toISOString(),
            };
          }

          return {
            ...task,
            timerRemainingSeconds: remaining - 1,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, isPaused]);

  // Show toast once when an individual task timer completes.
  useEffect(() => {
    const previous = previousRemainingRef.current;
    const next: Record<string, number> = {};

    tasks.forEach((task) => {
      const remaining = task.timerRemainingSeconds ?? 0;
      next[task.id] = remaining;

      const prevRemaining = previous[task.id];
      if (
        typeof prevRemaining === 'number' &&
        prevRemaining > 0 &&
        remaining === 0 &&
        task.timerStatus === 'done'
      ) {
        toast({
          title: 'Task timer complete',
          description: task.text,
          variant: 'success',
        });
      }
    });

    previousRemainingRef.current = next;
  }, [tasks, toast]);

  // Notify parent and context of task changes
  useEffect(() => {
    onTasksChange?.(tasks);
    setContextTasks(tasks);
  }, [tasks, onTasksChange, setContextTasks]);

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      // Trigger celebration animation
      setCelebratingTaskId(id);
      setTimeout(() => setCelebratingTaskId(null), 400);
    }
    setTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      const nextCompleted = !t.completed;
      if (!t.subtasks || t.subtasks.length === 0) {
        return { ...t, completed: nextCompleted };
      }
      return {
        ...t,
        completed: nextCompleted,
        subtasks: t.subtasks.map((subtask) => ({ ...subtask, completed: nextCompleted })),
      };
    }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || !task.subtasks) return task;

        const subtasks = task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
        );

        return {
          ...task,
          subtasks,
          completed: subtasks.every((subtask) => subtask.completed),
        };
      })
    );
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const parsedTask = toNormalizedTask({
        id: `task-${Date.now()}`,
        text: newTaskText.trim(),
        completed: false,
      });
      setTasks([...tasks, parsedTask]);
      setNewTaskText('');
      setShowAddTask(false);
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const startTaskTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || !task.timerDurationSeconds) return task;

        const remaining = task.timerRemainingSeconds ?? task.timerDurationSeconds;
        if (remaining <= 0) {
          return {
            ...task,
            timerRemainingSeconds: task.timerDurationSeconds,
            timerStatus: 'running',
            timerCompletedAt: null,
          };
        }

        return {
          ...task,
          timerStatus: 'running',
          timerCompletedAt: null,
        };
      })
    );
  }, []);

  const pauseTaskTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId && task.timerDurationSeconds
          ? { ...task, timerStatus: 'paused' }
          : task
      )
    );
  }, []);

  const resetTaskTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId && task.timerDurationSeconds
          ? {
              ...task,
              timerRemainingSeconds: task.timerDurationSeconds,
              timerStatus: 'idle',
              timerCompletedAt: null,
            }
          : task
      )
    );
  }, []);

  const clearTaskTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              timerDurationSeconds: undefined,
              timerRemainingSeconds: undefined,
              timerStatus: undefined,
              timerCompletedAt: null,
            }
          : task
      )
    );
  }, []);

  const suggestSubtasks = useCallback((taskText: string): { id: string; text: string; completed: boolean }[] => {
    const clean = taskText.trim();
    if (!clean) return [];

    const lower = clean.toLowerCase();
    const outcomes = [
      `Define what done looks like for "${clean}"`,
      `Execute: ${clean}`,
      `Review and finalize ${clean}`,
    ];

    if (lower.includes('email') || lower.includes('message') || lower.includes('reach out')) {
      outcomes[0] = `Gather context and key points for ${clean}`;
      outcomes[1] = `Draft and send ${clean}`;
      outcomes[2] = `Log follow-up needed after ${clean}`;
    } else if (lower.includes('design') || lower.includes('mockup') || lower.includes('wireframe')) {
      outcomes[0] = `Collect requirements for ${clean}`;
      outcomes[1] = `Create draft version of ${clean}`;
      outcomes[2] = `Review and revise ${clean}`;
    } else if (lower.includes('write') || lower.includes('draft') || lower.includes('copy')) {
      outcomes[0] = `Outline key points for ${clean}`;
      outcomes[1] = `Draft ${clean}`;
      outcomes[2] = `Edit and polish ${clean}`;
    }

    return outcomes.map((text, idx) => ({
      id: `subtask-${Date.now()}-${idx}`,
      text,
      completed: false,
    }));
  }, []);

  const promptTaskTimer = useCallback((taskId: string) => {
    const input = window.prompt('Set a timer in minutes for this task:', '25');
    if (!input) return;

    const minutes = Number(input);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast({
        title: 'Invalid timer value',
        description: 'Please enter a positive number of minutes.',
        variant: 'destructive',
      });
      return;
    }

    const seconds = Math.round(minutes * 60);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              timerDurationSeconds: seconds,
              timerRemainingSeconds: seconds,
              timerStatus: 'idle',
              timerCompletedAt: null,
            }
          : task
      )
    );
  }, [toast]);

  const taskMatches = useCallback((task: Task, matcher: string) => {
    return task.text.toLowerCase().includes(matcher.toLowerCase());
  }, []);

  // AI-triggered task mutations
  const handleAIAddTasks = useCallback((newTasks: string[]) => {
    setTasks(prev => [
      ...prev,
      ...newTasks.map((text, idx) => toNormalizedTask({
        id: `task-ai-${Date.now()}-${idx}`,
        text,
        completed: false,
      })),
    ]);
  }, []);

  const handleAIAddTaskTree = useCallback((newTasks: { text: string; subtasks?: string[] }[]) => {
    setTasks((prev) => [
      ...prev,
      ...newTasks.map((task, idx) =>
        toNormalizedTask({
          id: `task-tree-${Date.now()}-${idx}`,
          text: task.text,
          completed: false,
          subtasks: (task.subtasks && task.subtasks.length > 0
            ? task.subtasks
            : suggestSubtasks(task.text)
          ).map((subtask, subtaskIdx) => ({
            id: `subtask-tree-${Date.now()}-${idx}-${subtaskIdx}`,
            text: typeof subtask === 'string' ? subtask : subtask.text,
            completed: false,
          })),
        })
      ),
    ]);
  }, [suggestSubtasks]);

  const handleAICompleteTasks = useCallback((matches: string[]) => {
    setTasks(prev =>
      prev.map(t => {
        const shouldComplete = matches.some((match) => taskMatches(t, match));
        return shouldComplete ? { ...t, completed: true } : t;
      })
    );
  }, [taskMatches]);

  const handleAIRemoveTasks = useCallback((matches: string[]) => {
    setTasks(prev =>
      prev.filter((t) => !matches.some((match) => taskMatches(t, match)))
    );
  }, [taskMatches]);

  const handleAIUpdateTask = useCallback((match: string, newText: string) => {
    setTasks(prev =>
      prev.map(t =>
        taskMatches(t, match)
          ? toNormalizedTask({ ...t, text: newText })
          : t
      )
    );
  }, [taskMatches]);

  const handleAISetTaskTimer = useCallback((match: string, minutes: number, autoStart?: boolean) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const seconds = Math.round(minutes * 60);

    setTasks((prev) =>
      prev.map((task) => {
        if (!taskMatches(task, match)) return task;
        return {
          ...task,
          timerDurationSeconds: seconds,
          timerRemainingSeconds: seconds,
          timerStatus: autoStart ? 'running' : 'idle',
          timerCompletedAt: null,
        };
      })
    );
  }, [taskMatches]);

  const handleAIStartTaskTimers = useCallback((matches?: string[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!task.timerDurationSeconds) return task;

        const matchAllowed = !matches || matches.length === 0 || matches.some((match) => taskMatches(task, match));
        if (!matchAllowed) return task;

        const remaining = task.timerRemainingSeconds ?? task.timerDurationSeconds;
        return {
          ...task,
          timerRemainingSeconds: remaining <= 0 ? task.timerDurationSeconds : remaining,
          timerStatus: 'running',
          timerCompletedAt: null,
        };
      })
    );
  }, [taskMatches]);

  const handleAIPauseTaskTimers = useCallback((matches?: string[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!task.timerDurationSeconds) return task;
        const matchAllowed = !matches || matches.length === 0 || matches.some((match) => taskMatches(task, match));
        if (!matchAllowed) return task;
        return { ...task, timerStatus: 'paused' };
      })
    );
  }, [taskMatches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    } else if (e.key === 'Escape') {
      setShowAddTask(false);
      setNewTaskText('');
    }
  };

  const handleComplete = () => {
    onComplete(tasks);
  };

  const handleMinimize = () => {
    minimizeSession();
    navigate('/');
  };

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      'palmer-house': 'bg-venture-palmer',
      'besettld': 'bg-venture-besettld',
      'yourboy': 'bg-venture-yourboy',
      'strinzees': 'bg-venture-strinzees',
      'daily-maintenance': 'bg-venture-maintenance',
      'body-energy': 'bg-venture-energy',
      'admin-life': 'bg-venture-admin',
      'transition': 'bg-venture-transition',
      'care-relationships': 'bg-venture-care',
    };
    return colors[venture] || 'bg-primary';
  };

  const renderTaskRow = (task: Task, options?: { emphasize?: boolean }) => (
    <div
      key={task.id}
      className={`rounded-xl border px-3 py-3 transition-all ${
        task.completed
          ? 'bg-[hsl(145,65%,45%)]/5 border-status-active/20'
          : 'bg-card border-border'
      } ${
        options?.emphasize && !task.completed
          ? 'ring-1 ring-primary/40 shadow-sm'
          : ''
      } ${
        celebratingTaskId === task.id ? 'animate-[celebrate-pop_0.3s_ease-out]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleTask(task.id)}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            task.completed
              ? 'bg-[hsl(145,65%,45%)] border-[hsl(145,65%,45%)] text-white scale-110'
              : 'border-muted-foreground/30 hover:border-primary hover:scale-105'
          } ${celebratingTaskId === task.id ? 'animate-[celebrate-pop_0.3s_ease-out]' : ''}`}
        >
          {task.completed && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`text-sm leading-tight transition-all ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {task.text}
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-2 space-y-1.5 pl-0.5">
              {task.subtasks.map((subtask) => (
                <button
                  key={subtask.id}
                  onClick={() => toggleSubtask(task.id, subtask.id)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    subtask.completed
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/40'
                  }`}>
                    {subtask.completed && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span className={`text-xs ${
                    subtask.completed
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground/75'
                  }`}>
                    {subtask.text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.timerDurationSeconds ? (
            <>
              <span className={`text-xs font-mono px-2 py-1 rounded-md ${
                task.timerStatus === 'running'
                  ? 'bg-primary/10 text-primary'
                  : task.timerStatus === 'done'
                  ? 'bg-status-active/10 text-status-active'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {formatTimer(task.timerRemainingSeconds ?? task.timerDurationSeconds)}
              </span>
              {task.timerStatus === 'running' ? (
                <button
                  onClick={() => pauseTaskTimer(task.id)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Pause task timer"
                  title="Pause timer"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => startTaskTimer(task.id)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Start task timer"
                  title="Start timer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => resetTaskTimer(task.id)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Reset task timer"
                title="Reset timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => clearTaskTimer(task.id)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear task timer"
                title="Clear timer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => promptTaskTimer(task.id)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Set timer"
              title="Set timer"
            >
              <Timer className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => removeTask(task.id)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/70 hover:text-destructive transition-colors"
            aria-label="Remove task"
            title="Remove task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 animate-fade-in">
      {/* Minimize Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleMinimize}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Minimize session"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Task Context Card */}
      <div className="card-elevated p-4 mb-6 border border-border/70">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${getCategoryColor()} flex items-center justify-center`}>
            <span className="text-white text-lg font-semibold">
              {(ventureLabel || 'W')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground/70">
              {ventureLabel} • {workType}
            </div>
            <div className="font-medium text-foreground truncate">{focus}</div>
          </div>
          {totalVentureMinutes > 0 && (
            <div className="text-xs text-foreground/70 text-right">
              <div className="font-medium text-foreground">{formatMinutes(totalVentureMinutes)}</div>
              <div>total</div>
            </div>
          )}
        </div>
      </div>

      {/* Circular Timer */}
      <div className="flex flex-col items-center mb-6">
        <CircularProgress progress={progress} size={220} strokeWidth={10}>
          <span className="text-5xl font-light text-foreground font-mono tracking-tight">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-sm text-foreground/70 mt-1">
            {completedUnits} of {totalUnits} steps
          </span>
        </CircularProgress>
        
        <p className="text-foreground/70 text-sm mt-4">
          {isPaused ? 'Paused' : 'Stay focused • You got this'}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <button
          onClick={onAbort}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          aria-label="Reset session"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <button
          onClick={togglePause}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:brightness-105 transition-all"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-7 h-7 ml-1" /> : <Pause className="w-7 h-7" />}
        </button>
        
        <button
          onClick={handleComplete}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-status-active hover:text-status-active transition-colors"
          aria-label="Complete session"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>

      {/* Task List */}
      <div className="card-elevated overflow-hidden border border-border/70">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Ongoing</p>
              <p className="text-xs text-foreground/65 mt-0.5">
                {ongoingTasks.length} active • {completedTasks.length} done
              </p>
            </div>
            {leadTaskId && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Focus now
              </span>
            )}
          </div>
        </div>

        <div className="p-3 space-y-2">
          {ongoingTasks.length === 0 && (
            <div className="text-sm text-foreground/70 px-1 py-2">
              No active tasks. Add one below or ask AI to generate a plan.
            </div>
          )}
          {ongoingTasks.map((task) => renderTaskRow(task, { emphasize: task.id === leadTaskId }))}
        </div>

        {completedTasks.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowCompletedTasks((prev) => !prev)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-foreground/70 hover:bg-secondary/40 transition-colors"
            >
              <span>Completed ({completedTasks.length})</span>
              {showCompletedTasks ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {showCompletedTasks && (
              <div className="p-3 pt-0 space-y-2">
                {completedTasks.map((task) => renderTaskRow(task))}
              </div>
            )}
          </div>
        )}

        {/* Add Task */}
        {showAddTask ? (
          <div className="p-3 border-t border-border flex items-center gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter task..."
              className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <button onClick={addTask} className="btn-primary px-3 py-2 text-sm">
              Add
            </button>
            <button
              onClick={() => { setShowAddTask(false); setNewTaskText(''); }}
              className="p-2 rounded-lg hover:bg-secondary text-foreground/65"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full p-3 border-t border-border text-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>

      {/* AI Session Assistant */}
      <SessionAssistant
        sessionContext={{
          venture: ventureData?.name || venture,
          workType,
          focus,
          completionCondition,
          tasks,
          elapsedMinutes: Math.floor(elapsedSeconds / 60),
        }}
        onAddTasks={handleAIAddTasks}
        onAddTaskTree={handleAIAddTaskTree}
        onCompleteTasks={handleAICompleteTasks}
        onRemoveTasks={handleAIRemoveTasks}
        onUpdateTask={handleAIUpdateTask}
        onSetTaskTimer={handleAISetTaskTimer}
        onStartTaskTimers={handleAIStartTaskTimers}
        onPauseTaskTimers={handleAIPauseTaskTimers}
      />

      {/* Completion Condition */}
      <div className="mt-4 text-center text-xs text-foreground/70">
        Done when: <span className="text-foreground font-medium">{completionCondition}</span>
      </div>
    </div>
  );
}
