import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  venture: string;
  work_type: string;
  focus: string;
  completion_condition: string;
  tasks: { id: string; text: string; completed: boolean }[];
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
}

export default function History() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error loading sessions:', error);
    } else {
      setSessions((data || []).map(session => ({
        ...session,
        tasks: (session.tasks as { id: string; text: string; completed: boolean }[]) || []
      })));
    }
    setLoading(false);
  };

  const startSimilar = (session: Session) => {
    // Store session config in sessionStorage and navigate to setup
    sessionStorage.setItem('prefill', JSON.stringify({
      venture: session.venture,
      workType: session.work_type,
      focus: session.focus,
      completionCondition: session.completion_condition,
    }));
    navigate('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-status-active" />;
      case 'abandoned':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold mb-6">Past Sessions</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 p-6 animate-fade-in">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Past Sessions</h1>

        {sessions.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete a work session to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const completedTasks = session.tasks.filter(t => t.completed).length;
              const totalTasks = session.tasks.length;

              return (
                <div
                  key={session.id}
                  className="card-elevated p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(session.status)}
                        <span className="text-sm text-muted-foreground">
                          {session.venture} • {session.work_type}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground">{session.focus}</h3>
                    </div>
                    <button
                      onClick={() => startSimilar(session)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                      title="Start similar session"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                    </span>
                    {totalTasks > 0 && (
                      <span>{completedTasks}/{totalTasks} tasks</span>
                    )}
                    {session.duration_minutes && (
                      <span>{session.duration_minutes} min</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
