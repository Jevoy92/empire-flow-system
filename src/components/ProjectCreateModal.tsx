import { useState, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { categories, workTypesByCategory } from '@/data/ventures';
import { ProjectTemplate, ProjectStage } from '@/pages/Workflows';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  templates: ProjectTemplate[];
}

const emptyStage = (): ProjectStage => ({
  name: '',
  work_type: '',
  venture: '',
  tasks: [],
  completed: false,
});

export function ProjectCreateModal({ isOpen, onClose, onCreated, templates }: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venture, setVenture] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([emptyStage()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setVenture('');
      setSelectedTemplateId(null);
      setStages([emptyStage()]);
      setSaveAsTemplate(false);
      setTemplateName('');
    }
  }, [isOpen]);

  // Load template stages when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setStages(template.stages.map(s => ({ ...s, completed: false })));
        setVenture(template.default_venture);
      }
    }
  }, [selectedTemplateId, templates]);

  const addStage = () => {
    setStages([...stages, emptyStage()]);
  };

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      setStages(stages.filter((_, i) => i !== index));
    }
  };

  const updateStage = (index: number, updates: Partial<ProjectStage>) => {
    setStages(stages.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !venture || stages.some(s => !s.name || !s.work_type)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare stages with venture fallback
      const preparedStages = stages.map(s => ({
        ...s,
        venture: s.venture || venture,
        tasks: s.tasks || [],
      }));

      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        await supabase.from('project_templates').insert({
          user_id: user.id,
          name: templateName.trim(),
          description: description || null,
          default_venture: venture,
          stages: preparedStages,
        });
      }

      // Create project
      await supabase.from('projects').insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        venture,
        stages: preparedStages,
        project_template_id: selectedTemplateId,
      });

      onCreated();
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessCategories = categories.filter(c => c.type === 'business');
  const projectCategories = categories.filter(c => c.type === 'project');
  const personalCategories = categories.filter(c => c.type === 'personal');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., YouTube: How to Edit Fast"
              className="input-field"
            />
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Use Template (optional)</label>
              <Select value={selectedTemplateId || ''} onValueChange={(v) => setSelectedTemplateId(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Start from scratch or select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Start from scratch</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.stages.length} stages)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Primary Venture */}
          <div>
            <label className="block text-sm font-medium mb-2">Primary Category</label>
            <Select value={venture} onValueChange={setVenture}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Business</div>
                {businessCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Projects</div>
                {projectCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Personal</div>
                {personalCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stages */}
          <div>
            <label className="block text-sm font-medium mb-2">Stages</label>
            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="text-xs font-medium text-muted-foreground">Stage {idx + 1}</span>
                    {stages.length > 1 && (
                      <button
                        onClick={() => removeStage(idx)}
                        className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStage(idx, { name: e.target.value })}
                    placeholder="Stage name (e.g., Research, Shooting, Editing)"
                    className="input-field"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={stage.venture || venture} 
                      onValueChange={(v) => updateStage(idx, { venture: v })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={stage.work_type} 
                      onValueChange={(v) => updateStage(idx, { work_type: v })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Work type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(workTypesByCategory[stage.venture || venture] || []).map(wt => (
                          <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={addStage}
              className="mt-3 w-full btn-ghost flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Stage
            </button>
          </div>

          {/* Save as Template */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30">
            <input
              type="checkbox"
              id="saveTemplate"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="saveTemplate" className="text-sm font-medium cursor-pointer">
                Save as reusable template
              </label>
              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="input-field mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !venture || stages.some(s => !s.name || !s.work_type)}
            className="btn-primary flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
