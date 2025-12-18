import { useState, useEffect } from 'react';
import { VentureId } from '@/types/empire';
import { ventures, defaultTasks } from '@/data/ventures';
import { X, Plus, Trash2, Check, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
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
}

export function WorkSession({ venture, workType, focus, completionCondition, initialTasks, startTime, onComplete, onAbort }: WorkSessionProps) {
  const ventureData = ventures.find(v => v.id === venture);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalVentureMinutes, setTotalVentureMinutes] = useState(0);
  
  // Use provided initialTasks if available, otherwise fall back to default tasks for this work type
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
  
  const [tasks, setTasks] = useState<Task[]>(getInitialTasks);
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  // Running timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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

  const toggleTask = (id: string) => {
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

  return (
    <div className="w-full max-w-lg animate-fade-in">
      {/* Timer Display */}
      <div className="mb-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-primary font-mono text-lg">
          <Clock className="w-4 h-4" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
        {totalVentureMinutes > 0 && (
          <div className="text-muted-foreground">
            {ventureData?.name}: {formatMinutes(totalVentureMinutes)} total
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6 px-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{completedCount} of {tasks.length} tasks</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card-elevated">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {ventureData?.name} • {workType}
            </div>
            <div className="font-medium text-foreground">{focus}</div>
          </div>
          <button
            onClick={onAbort}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Abort session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <div className="p-6">
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  task.completed 
                    ? 'bg-status-active/5 border-status-active/20' 
                    : 'bg-background border-border hover:border-primary/30'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.completed
                      ? 'bg-status-active border-status-active text-primary-foreground'
                      : 'border-muted-foreground/30 hover:border-primary'
                  }`}
                >
                  {task.completed && <Check className="w-4 h-4" />}
                </button>
                <span className={`flex-1 ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {task.text}
                </span>
                <button
                  onClick={() => removeTask(task.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
                  aria-label="Remove task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Task */}
          {showAddTask ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter task..."
                className="input-field flex-1"
                autoFocus
              />
              <button
                onClick={addTask}
                className="btn-primary px-4 py-3"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskText('');
                }}
                className="p-3 rounded-xl hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="mt-4 w-full p-4 rounded-xl border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add task
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/20 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Done when: <span className="text-foreground">{completionCondition}</span>
            </div>
            <button
              onClick={handleComplete}
              className="btn-primary px-6 py-2"
            >
              Wrap Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
