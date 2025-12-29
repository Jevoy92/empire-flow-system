import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Clock, CheckCircle, XCircle, Play, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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

// Venture colors mapping
const ventureColors: Record<string, string> = {
  'palmer-house': 'bg-venture-palmer',
  'besettld': 'bg-venture-besettld',
  'yourboy': 'bg-venture-yourboy',
  'strinzees': 'bg-venture-strinzees',
  'daily-maintenance': 'bg-venture-maintenance',
  'body-energy': 'bg-venture-energy',
  'admin-life': 'bg-venture-admin',
  'transition': 'bg-venture-transition',
  'care-relationships': 'bg-venture-care',
};

const ventureNames: Record<string, string> = {
  'palmer-house': 'Palmer House',
  'besettld': 'beSettld',
  'yourboy': 'YourBoyJevoy',
  'strinzees': 'Strinzees',
  'daily-maintenance': 'Daily Maintenance',
  'body-energy': 'Body & Energy',
  'admin-life': 'Admin Life',
  'transition': 'Transition',
  'care-relationships': 'Care & Relationships',
};

export default function History() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  useEffect(() => {
    loadSessions();

    // Set up realtime subscription
    const channel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    sessionStorage.setItem('prefill', JSON.stringify({
      venture: session.venture,
      workType: session.work_type,
      focus: session.focus,
      completionCondition: session.completion_condition,
    }));
    navigate('/');
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const formatSessionTime = (startedAt: string, completedAt: string | null) => {
    const start = parseISO(startedAt);
    const startTime = format(start, 'h:mm a');
    if (completedAt) {
      const end = parseISO(completedAt);
      const endTime = format(end, 'h:mm a');
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const dateKey = format(parseISO(session.started_at), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  if (loading) {
    return (
      <div className="min-h-screen pb-24 p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold mb-6">History</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 p-6 animate-fade-in">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-6">History</h1>

        {sessions.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete a work session to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {getDateLabel(daySessions[0].started_at)}
                </h2>
                <div className="space-y-2">
                  {daySessions.map((session) => {
                    const completedTasks = session.tasks.filter(t => t.completed).length;
                    const totalTasks = session.tasks.length;
                    const colorClass = ventureColors[session.venture] || 'bg-primary';

                    return (
                      <div
                        key={session.id}
                        className="card-elevated p-3 flex items-center gap-3"
                      >
                        {/* Category Icon */}
                        <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                          {session.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : session.status === 'abandoned' ? (
                            <XCircle className="w-5 h-5 text-white" />
                          ) : (
                            <Clock className="w-5 h-5 text-white" />
                          )}
                        </div>

                        {/* Session Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">
                            {session.focus}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ventureNames[session.venture] || session.venture} • {session.work_type}
                          </div>
                        </div>

                        {/* Duration & Time */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-foreground">
                            {formatDuration(session.duration_minutes)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalTasks > 0 && `${completedTasks}/${totalTasks}`}
                          </div>
                        </div>

                        {/* Play Button */}
                        <button
                          onClick={() => startSimilar(session)}
                          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
                          title="Start similar session"
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
