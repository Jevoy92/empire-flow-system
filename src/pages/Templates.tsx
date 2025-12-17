import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout, Play, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

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
    // Update last_used_at
    await supabase
      .from('templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id);

    // Store template data and navigate to setup
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
        </div>

        {templates.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Layout className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No templates yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Save a session as a template to reuse it later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="card-elevated p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{template.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {template.venture} • {template.work_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => useTemplate(template)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                      title="Use template"
                    >
                      <Play className="w-4 h-4" />
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
                    <span className="text-primary">AI-generated tasks</span>
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
        )}
      </div>
    </div>
  );
}
