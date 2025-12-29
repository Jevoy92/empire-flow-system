import { useState } from 'react';
import { achievements, categoryLabels, getProgress, isAchievementUnlocked, UserStats } from '@/data/achievements';
import { useUserStats } from '@/hooks/useUserStats';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Flame, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl bg-muted/50', className)}>
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface AchievementBadgeProps {
  achievement: typeof achievements[0];
  stats: UserStats;
}

function AchievementBadge({ achievement, stats }: AchievementBadgeProps) {
  const unlocked = isAchievementUnlocked(stats, achievement);
  const progress = getProgress(stats, achievement);

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border transition-all duration-300',
        unlocked
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/30 border-border/50 opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'text-3xl transition-all duration-300',
            unlocked ? 'grayscale-0' : 'grayscale'
          )}
        >
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{achievement.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
          {!unlocked && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </div>
        {unlocked && (
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function AchievementsPanel() {
  const { stats, loading, unlockedCount, totalCount, progressPercentage } = useUserStats();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sessions']));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const groupedAchievements = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Your Journey</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {unlockedCount}/{totalCount} unlocked
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {progressPercentage}% of achievements unlocked
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Sessions"
          value={stats.total_sessions_completed}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Time Invested"
          value={formatTime(stats.total_minutes_worked)}
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats.current_streak} days`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Best Streak"
          value={`${stats.longest_streak} days`}
        />
      </div>

      {/* Achievement Categories */}
      <div className="space-y-3">
        {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
          const isExpanded = expandedCategories.has(category);
          const unlockedInCategory = categoryAchievements.filter(a => 
            isAchievementUnlocked(stats, a)
          ).length;

          return (
            <div key={category} className="border border-border/50 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {categoryAchievements[0].icon}
                  </span>
                  <span className="font-medium text-foreground">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    {unlockedInCategory}/{categoryAchievements.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {isExpanded && (
                <div className="p-4 pt-0 space-y-3">
                  {categoryAchievements.map(achievement => (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      stats={stats}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
