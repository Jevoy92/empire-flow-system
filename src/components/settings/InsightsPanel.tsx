import { useEffect, useState, useCallback } from 'react';
import { Check, MessageSquare, Clock, Calendar, CheckCircle2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { useLocation } from 'react-router-dom';
import { getCategoryById, getCategoryColor } from '@/data/ventures';

interface FutureNote {
  id: string;
  category_id: string;
  work_type: string | null;
  note: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface SessionSummary {
  id: string;
  focus: string;
  venture: string;
  work_type: string;
  duration_minutes: number | null;
  tasks: { text: string; completed: boolean }[];
}

const isSessionTask = (value: unknown): value is { text: string; completed: boolean } => {
  if (!value || typeof value !== 'object') return false;
  const task = value as { text?: unknown; completed?: unknown };
  return typeof task.text === 'string' && typeof task.completed === 'boolean';
};

export function InsightsPanel() {
  const [notes, setNotes] = useState<FutureNote[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionSummary[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);
  const [digestExpanded, setDigestExpanded] = useState(false);
  const { user } = useAuth();
  const demo = useDemo();
  const location = useLocation();
  const isDemo = location.search.includes('demo=1');

  const loadNotes = useCallback(async () => {
    if (isDemo && demo) {
      setNotes(demo.futureNotes as FutureNote[]);
      return;
    }
    if (!user?.id) return;
    const { data } = await supabase
      .from('future_notes')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setNotes(data as FutureNote[]);
  }, [user?.id, isDemo, demo]);

  const loadTodayDigest = useCallback(async () => {
    if (isDemo && demo) {
      setTodaySessions([
        { id: 'demo-1', focus: 'Morning routine', venture: 'daily-maintenance', work_type: 'Morning Routine', duration_minutes: 30, tasks: [{ text: 'Review calendar', completed: true }, { text: 'Set intentions', completed: true }] },
        { id: 'demo-2', focus: 'App design sprint', venture: 'side-project', work_type: 'Design', duration_minutes: 45, tasks: [{ text: 'Sketch wireframes', completed: true }, { text: 'Update Figma', completed: true }, { text: 'Review with team', completed: true }] },
      ]);
      setTodayMinutes(75);
      setTodayTasks(5);
      return;
    }
    if (!user?.id) return;
    const today = new Date();
    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, focus, venture, work_type, duration_minutes, tasks, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .order('completed_at', { ascending: false });

    let tasksCompleted = 0;
    let totalMinutes = 0;
    const summaries: SessionSummary[] = [];

    (sessions || []).forEach((session) => {
      const tasks = Array.isArray(session.tasks) ? session.tasks.filter(isSessionTask) : [];
      tasksCompleted += tasks.filter(t => t.completed).length;
      totalMinutes += session.duration_minutes || 0;
      summaries.push({ id: session.id, focus: session.focus, venture: session.venture, work_type: session.work_type, duration_minutes: session.duration_minutes, tasks });
    });

    setTodaySessions(summaries);
    setTodayMinutes(totalMinutes);
    setTodayTasks(tasksCompleted);
  }, [user?.id, isDemo, demo]);

  useEffect(() => {
    loadNotes();
    loadTodayDigest();
  }, [loadNotes, loadTodayDigest]);

  const dismissNote = async (noteId: string) => {
    if (isDemo && demo) {
      demo.markNoteAsRead(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      return;
    }
    await supabase.from('future_notes').update({ is_read: true }).eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const hasDigest = todaySessions.length > 0;
  const formattedDate = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="space-y-6">
      {/* Today's Activity */}
      {hasDigest && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <button
            onClick={() => setDigestExpanded(!digestExpanded)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">Today's Activity</span>
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
              </div>
              {digestExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-active))]" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{todaySessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{todayMinutes}</p>
                  <p className="text-xs text-muted-foreground">Minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[hsl(var(--status-warning))]" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{todayTasks}</p>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                </div>
              </div>
            </div>
          </button>

          {digestExpanded && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {todaySessions.map(session => {
                const catColor = getCategoryColor(session.venture);
                const completedTasks = session.tasks.filter(t => t.completed).length;
                return (
                  <div key={session.id} className={`p-3 rounded-lg bg-background border-l-4 ${catColor.border}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{session.focus}</p>
                        <p className="text-xs text-muted-foreground">{session.work_type} • {session.duration_minutes || 0} min</p>
                      </div>
                      {session.tasks.length > 0 && (
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {completedTasks}/{session.tasks.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Intelligence Feed / Notes */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">Notes from Past Sessions</span>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unread notes. Notes from your session AI assistant will appear here.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => {
              const catColor = getCategoryColor(note.category_id);
              const category = getCategoryById(note.category_id);
              return (
                <div key={note.id} className={`rounded-xl border border-border ${catColor.light} p-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-medium ${catColor.text}`}>{note.sender_role}</p>
                    <button
                      onClick={() => dismissNote(note.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-foreground mt-1 line-clamp-3">"{note.note}"</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {category?.name || note.category_id}
                    {note.work_type ? ` • ${note.work_type}` : ''} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
