import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { useUserVentures } from '@/hooks/useUserVentures';
import { defaultTasks } from '@/data/ventures';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: Task[];
  use_ai_tasks: boolean;
}

interface TemplateEditModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Partial<Template>) => void;
  isNew?: boolean;
}

export function TemplateEditModal({ template, isOpen, onClose, onSave, isNew = false }: TemplateEditModalProps) {
  const { ventures, personalVentures, projectVentures, getWorkTypesForVenture, loading: venturesLoading } = useUserVentures();
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [workType, setWorkType] = useState('');
  const [focus, setFocus] = useState('');
  const [completionCondition, setCompletionCondition] = useState('');
  const [useAiTasks, setUseAiTasks] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get available work types for selected category (venture name)
  const availableWorkTypes = category ? getWorkTypesForVenture(category) : [];
  
  // Get the selected venture for tagline display
  const selectedVenture = ventures.find(v => v.name === category);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.venture);
      setWorkType(template.work_type);
      setFocus(template.default_focus || '');
      setCompletionCondition(template.default_completion_condition || '');
      setUseAiTasks(template.use_ai_tasks);
      setTasks(template.default_tasks || []);
    } else {
      // Reset for new template
      setName('');
      setCategory('');
      setWorkType('');
      setFocus('');
      setCompletionCondition('');
      setUseAiTasks(true);
      setTasks([]);
    }
  }, [template, isOpen]);

  // When category changes, reset work type if it's not available
  useEffect(() => {
    if (category && workType && !availableWorkTypes.includes(workType)) {
      setWorkType('');
    }
  }, [category, workType, availableWorkTypes]);

  // When work type changes and use AI tasks is off, load default tasks
  useEffect(() => {
    if (workType && !useAiTasks && tasks.length === 0) {
      const defaults = defaultTasks[workType] || [];
      setTasks(defaults.map((text, idx) => ({
        id: `task-${idx}`,
        text,
        completed: false,
      })));
    }
  }, [workType, useAiTasks]);

  const handleSave = async () => {
    if (!name.trim() || !category || !workType) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        id: template?.id,
        name: name.trim(),
        venture: category,
        work_type: workType,
        default_focus: focus.trim() || null,
        default_completion_condition: completionCondition.trim() || null,
        use_ai_tasks: useAiTasks,
        default_tasks: useAiTasks ? [] : tasks,
      });
      toast.success(isNew ? 'Workflow created!' : 'Workflow saved!');
      onClose();
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      setTasks([...tasks, {
        id: `task-${Date.now()}`,
        text: newTaskText.trim(),
        completed: false,
      }]);
      setNewTaskText('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTaskText = (id: string, text: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text } : t));
  };

  const loadDefaultTasks = () => {
    if (workType) {
      const defaults = defaultTasks[workType as keyof typeof defaultTasks] || [];
      setTasks(defaults.map((text, idx) => ({
        id: `task-${idx}`,
        text,
        completed: false,
      })));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Create Workflow' : 'Edit Workflow'}</DialogTitle>
        </DialogHeader>

        {venturesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : ventures.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No categories found.</p>
            <p className="text-sm text-muted-foreground">Complete onboarding to set up your categories.</p>
          </div>
        ) : (
        <>
        <div className="space-y-5 py-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Workflow Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Content Edit"
              className="input-field"
            />
          </div>

          {/* Category - Dynamic from user ventures */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              <option value="">Select category...</option>
              {personalVentures.length > 0 && (
                <optgroup label="Personal">
                  {personalVentures.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </optgroup>
              )}
              {projectVentures.length > 0 && (
                <optgroup label="Projects">
                  {projectVentures.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedVenture?.tagline && (
              <p className="text-xs text-muted-foreground mt-1">{selectedVenture.tagline}</p>
            )}
          </div>

          {/* Work Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Work Type
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="input-field"
              disabled={!category}
            >
              <option value="">Select work type...</option>
              {availableWorkTypes.map(wt => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>

          {/* Focus */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Default Focus <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="What are you trying to accomplish?"
              className="input-field"
            />
          </div>

          {/* Completion Condition */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Completion Condition <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={completionCondition}
              onChange={(e) => setCompletionCondition(e.target.value)}
              placeholder="How do you know you're done?"
              className="input-field"
            />
          </div>

          {/* AI Tasks Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <div className="font-medium text-foreground">Use AI-generated tasks</div>
              <div className="text-sm text-muted-foreground">
                Generate fresh tasks based on context
              </div>
            </div>
            <button
              onClick={() => setUseAiTasks(!useAiTasks)}
              className={`w-12 h-7 rounded-full transition-colors ${
                useAiTasks ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  useAiTasks ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preset Tasks (only if not using AI) */}
          {!useAiTasks && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Preset Tasks
                </label>
                {workType && (
                  <button
                    onClick={loadDefaultTasks}
                    className="text-xs text-primary hover:underline"
                  >
                    Load defaults for {workType}
                  </button>
                )}
              </div>
              
              <div className="space-y-2 mb-3">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTaskText(task.id, e.target.value)}
                      className="input-field flex-1 py-2"
                    />
                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add a task..."
                  className="input-field flex-1 py-2"
                />
                <button
                  onClick={addTask}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:brightness-105"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={isSaving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !category || !workType || isSaving}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              isNew ? 'Create' : 'Save Changes'
            )}
          </button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
