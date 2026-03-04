import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Clock, CheckCircle, XCircle, Play, Eye, Circle, Timer, ListChecks, RotateCcw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { useSession } from '@/contexts/SessionContext';
import { motion, useReducedMotion } from 'framer-motion';
import { getCategoryColor, getVentureCardTone, getVentureLabel } from '@/data/ventures';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SessionDetailPanel } from '@/components/history/SessionDetailPanel';

interface SessionTask {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: { id: string; text: string; completed: boolean }[];
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

interface Session {
  id: string;
  venture: string;
  work_type: string;
  focus: string;
  completion_condition: string;
  tasks: SessionTask[];
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
}

const statusTone: Record<string, string> = {
  completed: 'bg-[hsl(var(--status-active)/0.15)] text-[hsl(var(--status-active))] border border-[hsl(var(--status-active)/0.28)]',
  abandoned: 'bg-destructive/15 text-destructive border border-destructive/30',
  active: 'bg-primary/15 text-primary border border-primary/30',
};

interface TaskBreakdownRow {
  id: string;
  text: string;
  completed: boolean;
  subtasksCompleted: number;
  subtasksTotal: number;
  minutes: number | null;
  isEstimated: boolean;
}

export default function History() {
  const PAGE_SIZE = 18;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const demo = useDemo();
  const { isActive, restoreSession } = useSession();
  const prefersReducedMotion = useReducedMotion();
  
  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDemo && demo) {
      const demoSessions = (demo.sessions as Session[]) || [];
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      setTotalSessions(demoSessions.length);
      setSessions(demoSessions.slice(start, end));
      setLoading(false);
    } else {
      loadSessions();
      const channel = supabase
        .channel('sessions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadSessions())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isDemo, demo, page]);

  const loadSessions = async () => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error loading sessions:', error);
    } else {
      setTotalSessions(count || 0);
      setSessions((data || []).map(session => ({
        ...session,
        tasks: (session.tasks as unknown as SessionTask[]) || []
      })));
    }
    setLoading(false);
  };

  const startSimilar = (session: Session) => {
    if (isActive) {
      sessionStorage.removeItem('prefill');
      restoreSession();
      navigate('/session' + demoSuffix);
      return;
    }
    sessionStorage.setItem('prefill', JSON.stringify({
      venture: session.venture,
      workType: session.work_type,
      focus: session.focus,
      completionCondition: session.completion_condition,
    }));
    navigate('/' + demoSuffix);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0m';
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
      return `${startTime} - ${format(end, 'h:mm a')}`;
    }
    return startTime;
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  const getTaskTrackedMinutes = (task: SessionTask): number | null => {
    if (typeof task.timerDurationSeconds !== 'number') return null;
    const total = Math.max(0, task.timerDurationSeconds);
    const remaining = typeof task.timerRemainingSeconds === 'number'
      ? Math.max(0, task.timerRemainingSeconds)
      : (task.completed ? 0 : total);
    const spentSeconds = task.completed ? total : Math.max(0, total - remaining);
    return Math.round(spentSeconds / 60);
  };

  const getTaskBreakdown = (session: Session): TaskBreakdownRow[] => {
    const completedTasks = session.tasks.filter((task) => task.completed);
    const trackedByTask = new Map<string, number>();
    let trackedMinutesSum = 0;

    completedTasks.forEach((task) => {
      const tracked = getTaskTrackedMinutes(task);
      if (tracked !== null) {
        trackedByTask.set(task.id, tracked);
        trackedMinutesSum += tracked;
      }
    });

    const untrackedCompletedCount = completedTasks.filter((task) => !trackedByTask.has(task.id)).length;
    const remainingMinutes = Math.max((session.duration_minutes || 0) - trackedMinutesSum, 0);
    const estimatedPerUntracked = untrackedCompletedCount > 0
      ? Math.max(1, Math.round(remainingMinutes / untrackedCompletedCount))
      : 0;

    return session.tasks.map((task) => {
      const subtasks = task.subtasks || [];
      const measured = trackedByTask.get(task.id);
      const minutes = measured ?? (task.completed && (session.duration_minutes || 0) > 0 ? estimatedPerUntracked : null);
      return {
        id: task.id,
        text: task.text,
        completed: task.completed,
        subtasksCompleted: subtasks.filter((subtask) => subtask.completed).length,
        subtasksTotal: subtasks.length,
        minutes,
        isEstimated: measured === undefined && task.completed && minutes !== null,
      };
    });
  };

  const groupedSessions = useMemo(() => {
    const groups = sessions.reduce((acc, session) => {
      const dateKey = format(parseISO(session.started_at), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(session);
      return acc;
    }, {} as Record<string, Session[]>);
    return Object.entries(groups);
  }, [sessions]);

  const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const desktopSession = selectedSession || sessions[0] || null;

  const handleSessionAction = (session: Session) => {
    if (isActive) {
      sessionStorage.removeItem('prefill');
      restoreSession();
      navigate('/session' + demoSuffix);
      return;
    }
    setSelectedSession(session);
  };

  const handleResumeActive = () => {
    if (!isActive) return;
    sessionStorage.removeItem('prefill');
    restoreSession();
    navigate('/session' + demoSuffix);
  };

  const reveal = (delay = 0) =>
    prefersReducedMotion
      ? { initial: false, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.26, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  if (loading) {
    return (
      <div className="min-h-screen page-shell p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">History</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen page-shell p-6 bg-background" {...reveal()}>
      <motion.div className="max-w-6xl mx-auto" {...reveal(0.04)}>
        <motion.h1 className="text-2xl font-semibold mb-6" {...reveal(0.08)}>
          History
        </motion.h1>

        {sessions.length === 0 ? (
          <motion.div className="card-elevated p-8 text-center" {...reveal(0.12)}>
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Complete a work session to see it here.</p>
          </motion.div>
        ) : (
          <motion.div className="grid grid-cols-1 xl:grid-cols-12 gap-6" {...reveal(0.12)}>
            <motion.div className="xl:col-span-7 space-y-5" {...reveal(0.16)}>
              {groupedSessions.map(([dateKey, daySessions]) => (
                <div key={dateKey} className="card-elevated p-4 border border-border/80">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-foreground/90">
                      {getDateLabel(daySessions[0].started_at)}
                    </h2>
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {daySessions.length} sessions
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {daySessions.map((session) => {
                      const completedTasks = session.tasks.filter(t => t.completed).length;
                      const totalTasks = session.tasks.length;
                      const colorClass = getCategoryColor(session.venture).bg;
                      const tone = getVentureCardTone(session.venture);
                      const badgeTone = statusTone[session.status] || 'bg-secondary text-secondary-foreground border border-border';

                      return (
                        <div
                          key={session.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSession(session)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedSession(session);
                            }
                          }}
                          className={`group relative overflow-hidden rounded-2xl border p-3 pl-4 flex items-center gap-3 cursor-pointer ${tone.bg} ${tone.border} hover:border-primary/40 transition-all shadow-sm hover:shadow-md`}
                        >
                          <div className={`absolute left-0 inset-y-0 w-1 ${tone.accent}`} />
                          <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                            {session.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : session.status === 'abandoned' ? (
                              <XCircle className="w-5 h-5 text-white" />
                            ) : (
                              <Clock className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm truncate group-hover:text-foreground">
                              {session.focus}
                            </div>
                            <div className="text-xs text-muted-foreground/90">
                              {getVentureLabel(session.venture)} • {session.work_type}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeTone}`}>
                                {session.status}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatSessionTime(session.started_at, session.completed_at)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-foreground">
                              {formatDuration(session.duration_minutes)}
                            </div>
                            <div className="text-xs text-muted-foreground/90">
                              {totalTasks > 0 && `${completedTasks}/${totalTasks}`}
                            </div>
                          </div>
                          <button
                            onClick={(event) => { event.stopPropagation(); handleSessionAction(session); }}
                            className="w-9 h-9 rounded-full bg-secondary/80 border border-border/70 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
                            title={isActive ? "Resume active session" : "View session details"}
                          >
                            {isActive ? <Play className="w-4 h-4 ml-0.5" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Desktop sidebar */}
            <motion.aside className="hidden xl:block xl:col-span-5" {...reveal(0.2)}>
              <div className="sticky top-24 card-elevated p-4 border border-border/80">
                {desktopSession ? (
                  <SessionDetailPanel
                    focus={desktopSession.focus}
                    ventureLabel={getVentureLabel(desktopSession.venture)}
                    workType={desktopSession.work_type}
                    durationMinutes={desktopSession.duration_minutes}
                    completedTaskCount={desktopSession.tasks.filter(t => t.completed).length}
                    totalTaskCount={desktopSession.tasks.length}
                    status={desktopSession.status}
                    startedAt={desktopSession.started_at}
                    completedAt={desktopSession.completed_at}
                    completionCondition={desktopSession.completion_condition}
                    taskBreakdown={getTaskBreakdown(desktopSession)}
                    formatDuration={formatDuration}
                    formatSessionTime={formatSessionTime}
                    onStartSimilar={() => startSimilar(desktopSession)}
                    onResumeActive={handleResumeActive}
                    isActive={isActive}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Select a session to view details.</div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}

        {totalSessions > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} • {totalSessions} total sessions
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1} className="btn-secondary px-3 py-1.5 disabled:opacity-50">Previous</button>
              <button onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="btn-secondary px-3 py-1.5 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mobile modal */}
      <Dialog open={!isDesktop && Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selectedSession.focus}</DialogTitle>
                <DialogDescription className="text-left">
                  {getVentureLabel(selectedSession.venture)} • {selectedSession.work_type}
                </DialogDescription>
              </DialogHeader>
              <SessionDetailPanel
                focus={selectedSession.focus}
                ventureLabel={getVentureLabel(selectedSession.venture)}
                workType={selectedSession.work_type}
                durationMinutes={selectedSession.duration_minutes}
                completedTaskCount={selectedSession.tasks.filter(t => t.completed).length}
                totalTaskCount={selectedSession.tasks.length}
                status={selectedSession.status}
                startedAt={selectedSession.started_at}
                completedAt={selectedSession.completed_at}
                completionCondition={selectedSession.completion_condition}
                taskBreakdown={getTaskBreakdown(selectedSession)}
                formatDuration={formatDuration}
                formatSessionTime={formatSessionTime}
                onStartSimilar={() => { startSimilar(selectedSession); setSelectedSession(null); }}
                onResumeActive={() => { handleResumeActive(); setSelectedSession(null); }}
                isActive={isActive}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
