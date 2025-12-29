import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserStats } from '@/data/achievements';
import { CheckCircle2, Clock, Flame, FolderKanban, Calendar, TrendingUp, Zap, Target, Award, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type StatType = 'sessions' | 'time' | 'streak' | 'projects';

interface StatDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: StatType;
  stats: UserStats;
}

interface DetailedSessionData {
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  ventureBreakdown: Record<string, number>;
  workTypeBreakdown: Record<string, number>;
  sessionsThisWeek: number;
  longestSession: number;
  averageSessionLength: number;
}

function DetailCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function StatDetailSheet({ open, onOpenChange, type, stats }: StatDetailSheetProps) {
  const { user } = useAuth();
  const [detailedData, setDetailedData] = useState<DetailedSessionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      fetchDetailedData();
    }
  }, [open, user?.id]);

  const fetchDetailedData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('started_at, completed_at, duration_minutes, venture, work_type, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: true });

      if (sessions && sessions.length > 0) {
        const ventureBreakdown: Record<string, number> = {};
        const workTypeBreakdown: Record<string, number> = {};
        let totalDuration = 0;
        let longestSession = 0;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        let sessionsThisWeek = 0;

        sessions.forEach(session => {
          // Venture breakdown
          ventureBreakdown[session.venture] = (ventureBreakdown[session.venture] || 0) + 1;
          
          // Work type breakdown
          workTypeBreakdown[session.work_type] = (workTypeBreakdown[session.work_type] || 0) + 1;
          
          // Duration tracking
          const duration = session.duration_minutes || 0;
          totalDuration += duration;
          if (duration > longestSession) longestSession = duration;
          
          // Sessions this week
          if (new Date(session.started_at) >= weekAgo) {
            sessionsThisWeek++;
          }
        });

        setDetailedData({
          firstSessionDate: sessions[0]?.started_at || null,
          lastSessionDate: sessions[sessions.length - 1]?.started_at || null,
          ventureBreakdown,
          workTypeBreakdown,
          sessionsThisWeek,
          longestSession,
          averageSessionLength: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
        });
      } else {
        setDetailedData({
          firstSessionDate: null,
          lastSessionDate: null,
          ventureBreakdown: {},
          workTypeBreakdown: {},
          sessionsThisWeek: 0,
          longestSession: 0,
          averageSessionLength: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  const getConfig = () => {
    switch (type) {
      case 'sessions':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
          title: 'Sessions',
          bgColor: 'bg-emerald-500/10',
          heroValue: stats.total_sessions_completed,
          heroLabel: 'Sessions Completed',
        };
      case 'time':
        return {
          icon: <Clock className="w-6 h-6 text-blue-500" />,
          title: 'Time Focused',
          bgColor: 'bg-blue-500/10',
          heroValue: formatTime(stats.total_minutes_worked),
          heroLabel: 'Total Focus Time',
        };
      case 'streak':
        return {
          icon: <Flame className="w-6 h-6 text-orange-500" />,
          title: 'Day Streak',
          bgColor: 'bg-orange-500/10',
          heroValue: stats.current_streak,
          heroLabel: 'Current Streak',
        };
      case 'projects':
        return {
          icon: <FolderKanban className="w-6 h-6 text-violet-500" />,
          title: 'Projects',
          bgColor: 'bg-violet-500/10',
          heroValue: stats.projects_completed,
          heroLabel: 'Projects Completed',
        };
    }
  };

  const config = getConfig();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (type) {
      case 'sessions':
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="First Session"
                value={formatDate(detailedData?.firstSessionDate || null)}
                icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Last Active"
                value={detailedData?.lastSessionDate 
                  ? formatDistanceToNow(new Date(detailedData.lastSessionDate), { addSuffix: true })
                  : 'N/A'}
                icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="This Week"
                value={`${detailedData?.sessionsThisWeek || 0} sessions`}
                icon={<TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Tasks Done"
                value={stats.total_tasks_completed}
                icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            {detailedData && Object.keys(detailedData.ventureBreakdown).length > 0 && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <h4 className="text-sm font-medium text-foreground mb-3">By Category</h4>
                <div className="space-y-2">
                  {Object.entries(detailedData.ventureBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([venture, count]) => (
                      <div key={venture} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground capitalize">{venture.replace(/-/g, ' ')}</span>
                        <span className="text-sm font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        );

      case 'time':
        const hours = Math.floor(stats.total_minutes_worked / 60);
        const funFact = hours >= 2 
          ? `That's about ${Math.round(hours / 2)} movies worth of focus!`
          : 'Keep going to build your focus time!';
        
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Average Session"
                value={formatTime(detailedData?.averageSessionLength || 0)}
                icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Longest Session"
                value={formatTime(detailedData?.longestSession || 0)}
                icon={<Zap className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Total Sessions"
                value={stats.total_sessions_completed}
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Tasks Completed"
                value={stats.total_tasks_completed}
                icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-sm text-muted-foreground">{funFact}</p>
            </div>
          </>
        );

      case 'streak':
        const streakMessage = stats.current_streak === 0
          ? "Start a session today to begin your streak!"
          : stats.current_streak >= 7
          ? "🔥 You're on fire! Keep the momentum going!"
          : stats.current_streak >= 3
          ? "Great consistency! You're building a habit."
          : "Nice start! Keep showing up daily.";
        
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Longest Streak"
                value={`${stats.longest_streak} days`}
                icon={<Award className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Last Session"
                value={stats.last_session_date 
                  ? formatDistanceToNow(new Date(stats.last_session_date), { addSuffix: true })
                  : 'Never'}
                icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Total Sessions"
                value={stats.total_sessions_completed}
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Member Since"
                value={formatDate(detailedData?.firstSessionDate || null)}
                icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-sm text-muted-foreground">{streakMessage}</p>
            </div>
          </>
        );

      case 'projects':
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Tasks Completed"
                value={stats.total_tasks_completed}
                icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Templates Created"
                value={stats.templates_created}
                icon={<FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailCard
                label="Categories Explored"
                value={stats.unique_categories_used.length}
                icon={<TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />}
              />
              <DetailCard
                label="Notes Sent"
                value={stats.notes_sent}
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>
            {stats.unique_categories_used.length > 0 && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <h4 className="text-sm font-medium text-foreground mb-3">Categories Used</h4>
                <div className="flex flex-wrap gap-2">
                  {stats.unique_categories_used.map((cat) => (
                    <span 
                      key={cat} 
                      className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary capitalize"
                    >
                      {cat.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </SheetTitle>
        </SheetHeader>
        
        {/* Hero Stat */}
        <div className={`p-6 rounded-2xl ${config.bgColor} border border-border/50 mb-4 text-center`}>
          <p className="text-4xl font-bold text-foreground mb-1">{config.heroValue}</p>
          <p className="text-sm text-muted-foreground">{config.heroLabel}</p>
        </div>

        {/* Detailed Content */}
        <div className="pb-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
