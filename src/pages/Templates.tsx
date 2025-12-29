import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout, Play, Trash2, Plus, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TemplateEditModal } from '@/components/TemplateEditModal';
import { categories, getCategoryById } from '@/data/ventures';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  user_id: string | null;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });

    loadTemplates();

    // Set up realtime subscription
    const channel = supabase
      .channel('templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'templates'
        },
        () => {
          loadTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    const initialTasks = (template.default_tasks || []).map((task, idx) => ({
      id: `task-${idx}`,
      text: typeof task === 'string' ? task : task.text || '',
      completed: false,
    }));

    navigate('/session', {
      state: {
        venture: template.venture,
        workType: template.work_type,
        focus: template.default_focus || template.name,
        completionCondition: template.default_completion_condition || 'Session complete',
        initialTasks,
      }
    });
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
      if (!userId) {
        console.error('No user logged in');
        return;
      }
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
          user_id: userId,
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

  // Split templates by type
  const { personalTemplates, businessTemplates } = useMemo(() => {
    const personal: Template[] = [];
    const business: Template[] = [];
    
    templates.forEach(template => {
      const category = getCategoryById(template.venture);
      if (category?.type === 'personal') {
        personal.push(template);
      } else {
        business.push(template);
      }
    });
    
    return { personalTemplates: personal, businessTemplates: business };
  }, [templates]);

  // Group templates by category within each type
  const groupByCategory = (templateList: Template[]) => {
    return templateList.reduce((acc, template) => {
      const categoryId = template.venture;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(template);
      return acc;
    }, {} as Record<string, Template[]>);
  };

  const renderTemplateList = (templateList: Template[]) => {
    if (templateList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No templates in this category yet.
        </div>
      );
    }

    const grouped = groupByCategory(templateList);
    const sortedCategoryIds = Object.keys(grouped).sort((a, b) => {
      const catA = getCategoryById(a);
      const catB = getCategoryById(b);
      return (catA?.name || a).localeCompare(catB?.name || b);
    });

    return (
      <div className="space-y-4">
        {sortedCategoryIds.map(categoryId => {
          const category = getCategoryById(categoryId);
          const categoryTemplates = grouped[categoryId];
          
          return (
            <div key={categoryId}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {category?.name || categoryId}
              </h3>
              <div className="space-y-1">
                {categoryTemplates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {template.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {template.work_type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => useTemplate(template)}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Use template"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditClick(template)}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit template"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
        <div className="flex items-center justify-between mb-4">
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
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="personal" className="gap-2">
                Personal
                <span className="text-xs text-muted-foreground">({personalTemplates.length})</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="gap-2">
                Business
                <span className="text-xs text-muted-foreground">({businessTemplates.length})</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-0">
              {renderTemplateList(personalTemplates)}
            </TabsContent>
            
            <TabsContent value="business" className="mt-0">
              {renderTemplateList(businessTemplates)}
            </TabsContent>
          </Tabs>
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
