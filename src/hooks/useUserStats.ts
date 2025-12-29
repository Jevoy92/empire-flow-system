import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserStats, achievements, isAchievementUnlocked } from '@/data/achievements';

const defaultStats: UserStats = {
  total_sessions_completed: 0,
  total_tasks_completed: 0,
  total_minutes_worked: 0,
  unique_categories_used: [],
  templates_created: 0,
  notes_sent: 0,
  notes_read: 0,
  current_streak: 0,
  longest_streak: 0,
  last_session_date: null,
  achievements_unlocked: [],
  projects_completed: 0,
};

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedAchievements = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const newStats = {
          total_sessions_completed: data.total_sessions_completed,
          total_tasks_completed: data.total_tasks_completed,
          total_minutes_worked: data.total_minutes_worked,
          unique_categories_used: data.unique_categories_used || [],
          templates_created: data.templates_created,
          notes_sent: data.notes_sent,
          notes_read: data.notes_read,
          current_streak: data.current_streak,
          longest_streak: data.longest_streak,
          last_session_date: data.last_session_date,
          achievements_unlocked: data.achievements_unlocked || [],
          projects_completed: data.projects_completed ?? 0,
        };
        setStats(newStats);
        
        // Check for new achievements after fetching stats
        if (!hasCheckedAchievements.current && newStats.total_sessions_completed > 0) {
          hasCheckedAchievements.current = true;
          checkAndUpdateAchievements(newStats, user.id);
        }
      } else {
        // Create stats record if it doesn't exist
        const { error: insertError } = await supabase
          .from('user_stats')
          .insert({ id: user.id });
        
        if (insertError && !insertError.message.includes('duplicate')) {
          throw insertError;
        }
        setStats(defaultStats);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Separate function to check achievements (not a hook dependency)
  const checkAndUpdateAchievements = async (currentStats: UserStats, userId: string) => {
    const newlyUnlocked: string[] = [];
    
    for (const achievement of achievements) {
      if (isAchievementUnlocked(currentStats, achievement) && !currentStats.achievements_unlocked.includes(achievement.id)) {
        newlyUnlocked.push(achievement.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      const updatedUnlocked = [...currentStats.achievements_unlocked, ...newlyUnlocked];
      
      await supabase
        .from('user_stats')
        .update({ achievements_unlocked: updatedUnlocked })
        .eq('id', userId);

      setStats(prev => ({
        ...prev,
        achievements_unlocked: updatedUnlocked,
      }));
    }

    return newlyUnlocked;
  };

  const checkForNewAchievements = useCallback(async (): Promise<string[]> => {
    if (!user?.id) return [];
    return checkAndUpdateAchievements(stats, user.id);
  }, [user?.id, stats]);

  const refreshStats = useCallback(async () => {
    hasCheckedAchievements.current = false;
    await fetchStats();
  }, [fetchStats]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_stats_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_stats',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          setStats({
            total_sessions_completed: data.total_sessions_completed,
            total_tasks_completed: data.total_tasks_completed,
            total_minutes_worked: data.total_minutes_worked,
            unique_categories_used: data.unique_categories_used || [],
            templates_created: data.templates_created,
            notes_sent: data.notes_sent,
            notes_read: data.notes_read,
            current_streak: data.current_streak,
            longest_streak: data.longest_streak,
            last_session_date: data.last_session_date,
            achievements_unlocked: data.achievements_unlocked || [],
            projects_completed: data.projects_completed ?? 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unlockedCount = stats.achievements_unlocked.length;
  const totalCount = achievements.length;
  const progressPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return {
    stats,
    loading,
    error,
    refreshStats,
    checkForNewAchievements,
    unlockedCount,
    totalCount,
    progressPercentage,
  };
}
