import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, MessageSquare, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { useLocation } from 'react-router-dom';
import { getCategoryColor } from '@/data/ventures';
import { format, startOfDay, endOfDay } from 'date-fns';

interface SessionSummary {
  id: string;
  focus: string;
  venture: string;
  work_type: string;
  duration_minutes: number | null;
  tasks: { text: string; completed: boolean }[];
}

interface NoteSummary {
  id: string;
  note: string;
  category_id: string;
  sender_role: string;
}

interface DigestData {
  sessionsCompleted: number;
  tasksCompleted: number;
  totalMinutes: number;
  notesDisplayed: number;
  sessions: SessionSummary[];
  notes: NoteSummary[];
}

export function DailyDigest() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const demo = useDemo();
  const location = useLocation();
  const isDemo = location.search.includes('demo=1');

  useEffect(() => {
    if (isDemo && demo) {
      // Generate demo digest data
      const demoDigest: DigestData = {
        sessionsCompleted: 2,
        tasksCompleted: 5,
        totalMinutes: 75,
        notesDisplayed: 1,
        sessions: [
          {
            id: 'demo-1',
            focus: 'Morning routine',
            venture: 'daily-maintenance',
            work_type: 'Morning Routine',
            duration_minutes: 30,
            tasks: [
              { text: 'Review calendar', completed: true },
              { text: 'Set daily intentions', completed: true },
            ],
          },
          {
            id: 'demo-2',
            focus: 'App design sprint',
            venture: 'side-project',
            work_type: 'Design',
            duration_minutes: 45,
            tasks: [
              { text: 'Sketch wireframes', completed: true },
              { text: 'Review with team', completed: true },
              { text: 'Update Figma', completed: true },
            ],
          },
        ],
        notes: [
          {
            id: 'note-1',
            note: 'Remember to follow up on the API integration',
            category_id: 'side-project',
            sender_role: 'Developer You',
          },
        ],
      };
      setDigest(demoDigest);
      setLoading(false);
      return;
    }

    if (user?.id) {
      loadTodayDigest();
    }
  }, [user?.id, isDemo, demo]);

  const loadTodayDigest = async () => {
    setLoading(true);
    const today = new Date();
    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    try {
      // Fetch completed sessions today
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, focus, venture, work_type, duration_minutes, tasks, completed_at')
        .eq('status', 'completed')
        .gte('completed_at', dayStart)
        .lte('completed_at', dayEnd)
        .order('completed_at', { ascending: false });

      // Fetch notes that were read (we can only know they're read, not when)
      // Show notes that are read and were created recently as a proxy
      const { data: notes } = await supabase
        .from('future_notes')
        .select('id, note, category_id, sender_role, created_at')
        .eq('is_read', true)
        .gte('created_at', dayStart)
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate totals
      let tasksCompleted = 0;
      let totalMinutes = 0;
      const sessionSummaries: SessionSummary[] = [];

      (sessions || []).forEach((session) => {
        const tasks = Array.isArray(session.tasks) ? session.tasks : [];
        const completedTasks = tasks.filter((t: any) => t.completed);
        tasksCompleted += completedTasks.length;
        totalMinutes += session.duration_minutes || 0;

        sessionSummaries.push({
          id: session.id,
          focus: session.focus,
          venture: session.venture,
          work_type: session.work_type,
          duration_minutes: session.duration_minutes,
          tasks: tasks as { text: string; completed: boolean }[],
        });
      });

      const noteSummaries: NoteSummary[] = (notes || []).map((n) => ({
        id: n.id,
        note: n.note,
        category_id: n.category_id,
        sender_role: n.sender_role,
      }));

      setDigest({
        sessionsCompleted: sessions?.length || 0,
        tasksCompleted,
        totalMinutes,
        notesDisplayed: notes?.length || 0,
        sessions: sessionSummaries,
        notes: noteSummaries,
      });
    } catch (error) {
      console.error('Error loading daily digest:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if loading or no activity today
  if (loading) return null;
  if (!digest || (digest.sessionsCompleted === 0 && digest.notesDisplayed === 0)) return null;

  const formattedDate = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="mb-6 animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Today's Progress</h3>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-semibold text-foreground">{digest.sessionsCompleted}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-semibold text-foreground">{digest.totalMinutes}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-lg font-semibold text-foreground">{digest.tasksCompleted}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-2 p-4 rounded-xl bg-card/50 border border-border space-y-4 animate-fade-in">
          {/* Sessions List */}
          {digest.sessions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Completed Sessions
              </h4>
              <div className="space-y-2">
                {digest.sessions.map((session) => {
                  const catColor = getCategoryColor(session.venture);
                  const completedTasks = session.tasks.filter((t) => t.completed).length;
                  return (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg bg-background border-l-4 ${catColor.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{session.focus}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.work_type} • {session.duration_minutes || 0} min
                          </p>
                        </div>
                        {session.tasks.length > 0 && (
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {completedTasks}/{session.tasks.length} tasks
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Read */}
          {digest.notes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Notes Reviewed
              </h4>
              <div className="space-y-2">
                {digest.notes.map((note) => {
                  const catColor = getCategoryColor(note.category_id);
                  return (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg bg-background border-l-4 ${catColor.border}`}
                    >
                      <p className="text-sm text-foreground">"{note.note}"</p>
                      <p className="text-xs text-muted-foreground mt-1">— {note.sender_role}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
