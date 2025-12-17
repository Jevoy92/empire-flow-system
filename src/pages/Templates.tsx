import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout, Play, Trash2, Plus, Pencil, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { TemplateEditModal } from '@/components/TemplateEditModal';
import { categories, getCategoryById } from '@/data/ventures';

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: { id: string; text: string; completed: boolean }[];
  use_ai_tasks: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error loading templates:', error);
    } else {
      setTemplates((data || []).map(template => ({
        ...template,
        default_tasks: (template.default_tasks as { id: string; text: string; completed: boolean }[]) || []
      })));
    }
    setLoading(false);
  };

  const useTemplate = async (template: Template) => {
    await supabase
      .from('templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id);

    sessionStorage.setItem('prefill', JSON.stringify({
      venture: template.venture,
      workType: template.work_type,
      focus: template.default_focus || '',
      completionCondition: template.default_completion_condition || '',
      templateId: template.id,
      useAiTasks: template.use_ai_tasks,
    }));
    navigate('/');
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
    } else {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleEditClick = (template: Template) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setIsEditModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingTemplate(null);
    setIsCreating(true);
    setIsEditModalOpen(true);
  };

  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    if (isCreating) {
      // Create new template
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: templateData.name,
          venture: templateData.venture,
          work_type: templateData.work_type,
          default_focus: templateData.default_focus,
          default_completion_condition: templateData.default_completion_condition,
          use_ai_tasks: templateData.use_ai_tasks,
          default_tasks: templateData.default_tasks || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
      } else if (data) {
        setTemplates([{
          ...data,
          default_tasks: (data.default_tasks as { id: string; text: string; completed: boolean }[]) || []
        }, ...templates]);
      }
    } else if (templateData.id) {
      // Update existing template
      const { error } = await supabase
        .from('templates')
        .update({
          name: templateData.name,
          venture: templateData.venture,
          work_type: templateData.work_type,
          default_focus: templateData.default_focus,
          default_completion_condition: templateData.default_completion_condition,
          use_ai_tasks: templateData.use_ai_tasks,
          default_tasks: templateData.default_tasks || [],
        })
        .eq('id', templateData.id);

      if (error) {
        console.error('Error updating template:', error);
      } else {
        setTemplates(templates.map(t => 
          t.id === templateData.id 
            ? { ...t, ...templateData, default_tasks: templateData.default_tasks || [] } as Template
            : t
        ));
      }
    }
    setIsEditModalOpen(false);
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const categoryId = template.venture;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // Sort categories: personal first, then business
  const sortedCategoryIds = Object.keys(groupedTemplates).sort((a, b) => {
    const catA = getCategoryById(a);
    const catB = getCategoryById(b);
    if (catA?.type === 'personal' && catB?.type !== 'personal') return -1;
    if (catA?.type !== 'personal' && catB?.type === 'personal') return 1;
    return (catA?.name || a).localeCompare(catB?.name || b);
  });

  if (loading) {
    return (
      <div className="min-h-screen pb-20 p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold mb-6">Templates</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 p-6 animate-fade-in">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <button
            onClick={handleCreateClick}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Layout className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No templates yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first template to get started.
            </p>
            <button
              onClick={handleCreateClick}
              className="btn-primary mt-4"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategoryIds.map((categoryId) => {
              const categoryData = getCategoryById(categoryId);
              const categoryTemplates = groupedTemplates[categoryId];
              
              return (
                <div key={categoryId}>
                  <div className="flex items-center gap-2 mb-3">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-medium text-muted-foreground">
                      {categoryData?.name || categoryId}
                      {categoryData?.type === 'personal' && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          Personal
                        </span>
                      )}
                    </h2>
                  </div>
                  
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="card-elevated p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground mb-1 truncate">{template.name}</h3>
                            <div className="text-sm text-muted-foreground">
                              {template.work_type}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => useTemplate(template)}
                              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                              title="Use template"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(template)}
                              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit template"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {template.use_ai_tasks ? (
                            <span className="text-primary">AI tasks</span>
                          ) : (
                            <span>{template.default_tasks.length} preset tasks</span>
                          )}
                          {template.last_used_at && (
                            <span>
                              Used {formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TemplateEditModal
        template={editingTemplate}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveTemplate}
        isNew={isCreating}
      />
    </div>
  );
}
