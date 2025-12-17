import { useState } from 'react';
import { VentureId } from '@/types/empire';
import { ventures, defaultTasks } from '@/data/ventures';
import { X, Plus, Trash2, Check } from 'lucide-react';

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
  onComplete: (tasks: Task[]) => void;
  onAbort: () => void;
}

export function WorkSession({ venture, workType, focus, completionCondition, onComplete, onAbort }: WorkSessionProps) {
  const ventureData = ventures.find(v => v.id === venture);
  
  // Initialize tasks from default tasks for this work type
  const initialTasks: Task[] = (defaultTasks[workType] || []).map((text, idx) => ({
    id: `task-${idx}`,
    text,
    completed: false,
  }));
  
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

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
