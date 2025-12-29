import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VentureId } from '@/types/empire';
import { ventures, defaultTasks, getCategoryById } from '@/data/ventures';
import { X, Plus, Trash2, Check, RotateCcw, Square, Pause, Play, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CircularProgress } from './CircularProgress';
import { SessionAssistant } from './SessionAssistant';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

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
  const [totalVentureMinutes, setTotalVentureMinutes] = useState(0);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const prevCompletedCountRef = useRef(0);
  
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
      return initialTasks;
    }
    return (defaultTasks[workType] || []).map((text, idx) => ({
      id: `task-${idx}`,
      text,
      completed: false,
    }));
  };
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Use context tasks if available, otherwise get initial
    if (contextTasks.length > 0) return contextTasks;
    return getInitialTasks();
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

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

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Milestone celebrations
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
          description: "You completed everything. Nice work!",
          variant: "success",
        });
      }
    }
    
    prevCompletedCountRef.current = completedCount;
  }, [completedCount, tasks.length, toast]);

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
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      setTasks([...tasks, {
        id: `task-${Date.now()}`,
        text: newTaskText.trim(),
        completed: false,
      }]);
      setNewTaskText('');
      setShowAddTask(false);
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // AI-triggered task mutations
  const handleAIAddTasks = useCallback((newTasks: string[]) => {
    setTasks(prev => [
      ...prev,
      ...newTasks.map((text, idx) => ({
        id: `task-ai-${Date.now()}-${idx}`,
        text,
        completed: false,
      })),
    ]);
  }, []);

  const handleAICompleteTasks = useCallback((matches: string[]) => {
    setTasks(prev =>
      prev.map(t => {
        const shouldComplete = matches.some(match =>
          t.text.toLowerCase().includes(match.toLowerCase())
        );
        return shouldComplete ? { ...t, completed: true } : t;
      })
    );
  }, []);

  const handleAIRemoveTasks = useCallback((matches: string[]) => {
    setTasks(prev =>
      prev.filter(t => !matches.some(match =>
        t.text.toLowerCase().includes(match.toLowerCase())
      ))
    );
  }, []);

  const handleAIUpdateTask = useCallback((match: string, newText: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.text.toLowerCase().includes(match.toLowerCase())
          ? { ...t, text: newText }
          : t
      )
    );
  }, []);

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

  return (
    <div className="w-full max-w-lg mx-auto px-4 animate-fade-in bg-session-warm min-h-screen py-6 -mt-6 -mx-4 px-8">
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
      <div className="card-elevated p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${getCategoryColor()} flex items-center justify-center`}>
            <span className="text-white text-lg font-semibold">
              {(ventureData?.name || categoryData?.name || 'W')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground">
              {ventureData?.name || categoryData?.name} • {workType}
            </div>
            <div className="font-medium text-foreground truncate">{focus}</div>
          </div>
          {totalVentureMinutes > 0 && (
            <div className="text-xs text-muted-foreground text-right">
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
          <span className="text-sm text-muted-foreground mt-1">
            {completedCount} of {tasks.length} tasks
          </span>
        </CircularProgress>
        
        <p className="text-muted-foreground text-sm mt-4">
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
      <div className="card-elevated overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 group ${
                task.completed ? 'bg-[hsl(145,65%,45%)]/5' : ''
              } ${celebratingTaskId === task.id ? 'animate-[celebrate-pop_0.3s_ease-out]' : ''}`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  task.completed
                    ? 'bg-[hsl(145,65%,45%)] border-[hsl(145,65%,45%)] text-white scale-110'
                    : 'border-muted-foreground/30 hover:border-primary hover:scale-105'
                } ${celebratingTaskId === task.id ? 'animate-[celebrate-pop_0.3s_ease-out]' : ''}`}
              >
                {task.completed && <Check className="w-4 h-4" />}
              </button>
              <span className={`flex-1 text-sm transition-all ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {task.text}
              </span>
              <button
                onClick={() => removeTask(task.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

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
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full p-3 border-t border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 text-sm"
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
        onCompleteTasks={handleAICompleteTasks}
        onRemoveTasks={handleAIRemoveTasks}
        onUpdateTask={handleAIUpdateTask}
      />

      {/* Completion Condition */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Done when: <span className="text-foreground">{completionCondition}</span>
      </div>
    </div>
  );
}
