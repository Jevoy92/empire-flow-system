import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { achievements, isAchievementUnlocked } from '@/data/achievements';
import { ArrowLeft, Loader2, LogOut, User, Trophy, Flame, Clock, CheckCircle2, FolderKanban, ChevronRight, Palette, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import AchievementsPanel from '@/components/AchievementsPanel';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient?: string;
}

function StatCard({ icon, label, value, gradient = 'from-primary/20 to-primary/5' }: StatCardProps) {
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} border border-border/50`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-background/50">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function Settings() {
  const { user, profile, settings, loading, isAuthenticated, updateProfile, updateSettings, signOut } = useAuth();
  const { stats, loading: statsLoading, unlockedCount, totalCount, progressPercentage } = useUserStats();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('system');
  const [sessionDuration, setSessionDuration] = useState(25);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
    if (settings) {
      setTheme(settings.theme);
      setSessionDuration(settings.default_session_duration);
    }
  }, [profile, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profileUpdates: { display_name?: string } = {};
      const settingsUpdates: { theme?: string; default_session_duration?: number } = {};

      if (displayName !== profile?.display_name) {
        profileUpdates.display_name = displayName;
      }
      if (theme !== settings?.theme) {
        settingsUpdates.theme = theme;
      }
      if (sessionDuration !== settings?.default_session_duration) {
        settingsUpdates.default_session_duration = sessionDuration;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await updateProfile(profileUpdates);
        if (error) throw error;
      }

      if (Object.keys(settingsUpdates).length > 0) {
        const { error } = await updateSettings(settingsUpdates);
        if (error) throw error;
      }

      setIsEditing(false);
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
      });
      setIsSigningOut(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get recently unlocked achievements (last 3)
  const recentlyUnlocked = achievements
    .filter(a => stats.achievements_unlocked.includes(a.id))
    .slice(-3)
    .reverse();

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasChanges =
    displayName !== (profile?.display_name || '') ||
    theme !== (settings?.theme || 'system') ||
    sessionDuration !== (settings?.default_session_duration || 25);

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Profile Hero */}
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="font-semibold text-lg mb-1"
                  autoFocus
                />
              ) : (
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {displayName || 'Set your name'}
                </h2>
              )}
              <p className="text-sm text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => {
                setIsEditing(false);
                setDisplayName(profile?.display_name || '');
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            label="Sessions"
            value={stats.total_sessions_completed}
            gradient="from-emerald-500/20 to-emerald-500/5"
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-blue-500" />}
            label="Time Focused"
            value={formatTime(stats.total_minutes_worked)}
            gradient="from-blue-500/20 to-blue-500/5"
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            label="Day Streak"
            value={stats.current_streak}
            gradient="from-orange-500/20 to-orange-500/5"
          />
          <StatCard
            icon={<FolderKanban className="w-4 h-4 text-violet-500" />}
            label="Projects Done"
            value={stats.projects_completed}
            gradient="from-violet-500/20 to-violet-500/5"
          />
        </div>

        {/* Achievements Preview */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors text-left mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Achievements</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{unlockedCount}/{totalCount}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-3" />
              
              {recentlyUnlocked.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Recent:</span>
                  <div className="flex gap-1">
                    {recentlyUnlocked.map(a => (
                      <span key={a.id} className="text-lg" title={a.name}>{a.icon}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Complete sessions to unlock achievements!
                </p>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Your Journey
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100%-60px)] pb-8">
              <AchievementsPanel />
            </div>
          </SheetContent>
        </Sheet>

        {/* Preferences */}
        <div className="p-4 rounded-2xl bg-card border border-border mb-6">
          <h3 className="font-medium text-foreground mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Theme</span>
              </div>
              <Select value={theme} onValueChange={(v) => { setTheme(v); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Session Duration</span>
              </div>
              <Select
                value={sessionDuration.toString()}
                onValueChange={(v) => setSessionDuration(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="25">25 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {hasChanges && !isEditing && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full mt-4">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Preferences
            </Button>
          )}
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Sign Out
            </>
          )}
        </Button>
      </div>
    </div>
  );
}