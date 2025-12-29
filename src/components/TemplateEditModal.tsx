import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { categories, workTypesByCategory, defaultTasks, getCategoryById } from '@/data/ventures';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [workType, setWorkType] = useState('');
  const [focus, setFocus] = useState('');
  const [completionCondition, setCompletionCondition] = useState('');
  const [useAiTasks, setUseAiTasks] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  // Get available work types for selected category
  const availableWorkTypes = category ? (workTypesByCategory[category] || []) : [];

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

  const handleSave = () => {
    if (!name.trim() || !category || !workType) return;
    
    onSave({
      id: template?.id,
      name: name.trim(),
      venture: category,
      work_type: workType,
      default_focus: focus.trim() || null,
      default_completion_condition: completionCondition.trim() || null,
      use_ai_tasks: useAiTasks,
      default_tasks: useAiTasks ? [] : tasks,
    });
    onClose();
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
      const defaults = defaultTasks[workType] || [];
      setTasks(defaults.map((text, idx) => ({
        id: `task-${idx}`,
        text,
        completed: false,
      })));
    }
  };

  const categoryData = getCategoryById(category);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Create Template' : 'Edit Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Content Edit"
              className="input-field"
            />
          </div>

          {/* Category */}
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
              <optgroup label="Personal">
                {categories.filter(c => c.type === 'personal').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Projects">
                {categories.filter(c => c.type === 'project').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Business">
                {categories.filter(c => c.type === 'business').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            </select>
            {categoryData && (
              <p className="text-xs text-muted-foreground mt-1">{categoryData.tagline}</p>
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
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !category || !workType}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isNew ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
