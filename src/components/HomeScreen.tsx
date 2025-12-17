import { useEffect, useState } from 'react';
import { ArrowRight, Layout } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  use_ai_tasks: boolean;
}

interface HomeScreenProps {
  onStartSession: () => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const [recentTemplates, setRecentTemplates] = useState<Template[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentTemplates();
  }, []);

  const loadRecentTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(3);

    if (data) {
      setRecentTemplates(data);
    }
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
    onStartSession();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 pb-24">
      <div className="w-full max-w-md animate-fade-in">
        <div className="card-elevated p-12">
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            What are you working on?
          </h1>
          <p className="text-muted-foreground mb-10">
            Start a session to focus on a single task.
          </p>
          
          <button
            onClick={onStartSession}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
          >
            Start a Work Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {recentTemplates.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              Quick Start
            </h2>
            <div className="space-y-2">
              {recentTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => useTemplate(template)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
                >
                  <Layout className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {template.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {template.venture} • {template.work_type}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
