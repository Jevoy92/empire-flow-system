import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { achievements } from '@/data/achievements';
import { characterAvatars } from '@/data/avatars';
import { ArrowLeft, Loader2, LogOut, User, Trophy, Flame, Clock, CheckCircle2, FolderKanban, ChevronRight, Palette, Timer, Info, Lock, Trash2, Camera, AlertCircle } from 'lucide-react';
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
import StatDetailSheet from '@/components/StatDetailSheet';
import { AvatarPicker } from '@/components/AvatarPicker';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { useDemo } from '@/contexts/DemoContext';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgColor?: string;
  onClick?: () => void;
}

function StatCard({ icon, label, value, bgColor = 'bg-primary/10', onClick }: StatCardProps) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-4 rounded-2xl ${bgColor} border border-border/50 text-left w-full transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]`}
    >
      <div className="absolute top-2 right-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-background/80">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </button>
  );
}

export default function Settings() {
  const { user, profile, settings, loading, isAuthenticated, updateProfile, updateSettings, signOut, refetchProfile } = useAuth();
  const { stats, loading: statsLoading, unlockedCount, totalCount, progressPercentage } = useUserStats();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: currentTheme, setTheme: setAppTheme } = useTheme();
  const demo = useDemo();
  
  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';

  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('system');
  const [sessionDuration, setSessionDuration] = useState(25);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeStatSheet, setActiveStatSheet] = useState<'sessions' | 'time' | 'streak' | 'projects' | null>(null);
  
  // New state for modals
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Use demo data if in demo mode
  const displayedStats = isDemo && demo ? demo.stats : stats;
  const displayedProfile = isDemo && demo ? demo.profile : profile;

  useEffect(() => {
    if (isDemo && demo) {
      setDisplayName(demo.profile.display_name);
      setAvatarUrl(demo.profile.avatar_url);
    } else if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url);
    }
    if (settings) {
      setTheme(settings.theme);
      setSessionDuration(settings.default_session_duration);
      // Apply saved theme on load
      setAppTheme(settings.theme);
    }
  }, [profile, settings, setAppTheme, isDemo, demo]);

  // Apply theme immediately when changed for preview
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setAppTheme(newTheme); // Apply immediately for preview
  };

  const handleSave = async () => {
    if (isDemo) {
      toast({
        title: 'Demo mode',
        description: "Settings don't persist in demo mode. Sign up to save your preferences!",
      });
      setIsEditing(false);
      return;
    }
    
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
    if (isDemo) {
      navigate('/');
      return;
    }
    
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

  const handleAvatarChange = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    refetchProfile();
  };

  const handleAccountDeleted = async () => {
    await signOut();
    navigate('/auth');
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get recently unlocked achievements (last 3)
  const recentlyUnlocked = achievements
    .filter(a => displayedStats.achievements_unlocked.includes(a.id))
    .slice(-3)
    .reverse();

  // Calculate achievement progress for demo
  const demoUnlockedCount = isDemo ? displayedStats.achievements_unlocked.length : unlockedCount;
  const demoTotalCount = isDemo ? achievements.length : totalCount;
  const demoProgressPercentage = isDemo ? Math.round((demoUnlockedCount / demoTotalCount) * 100) : progressPercentage;

  // Get avatar display
  const getAvatarDisplay = () => {
    if (avatarUrl?.startsWith('character:')) {
      const charId = avatarUrl.replace('character:', '');
      const char = characterAvatars.find(c => c.id === charId);
      if (char) {
        return (
          <div className={`w-16 h-16 rounded-full ${char.color} flex items-center justify-center text-2xl`}>
            {char.emoji}
          </div>
        );
      }
    }
    if (avatarUrl && !avatarUrl.startsWith('character:')) {
      return (
        <img 
          src={avatarUrl} 
          alt="Profile" 
          className="w-16 h-16 rounded-full object-cover"
        />
      );
    }
    // Default: initials
    const name = isDemo ? displayedProfile?.display_name : displayName;
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.[0]?.toUpperCase() || '?';
    return (
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
        {initials}
      </div>
    );
  };

  if ((loading || statsLoading) && !isDemo) {
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

  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-24 md:px-6 md:pb-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/' + demoSuffix)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Profile, preferences, and account controls.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 space-y-6">
            {/* Demo Mode Banner */}
            {isDemo && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Demo Mode</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You're exploring with sample data. Sign up to save your progress and unlock all features!
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate('/auth')}
                    >
                      Sign Up Free
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Hero */}
            <div className="relative p-6 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => !isDemo && setShowAvatarPicker(true)}
                  className={`relative group ${isDemo ? 'cursor-default' : ''}`}
                  disabled={isDemo}
                >
                  {getAvatarDisplay()}
                  {!isDemo && (
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  {isEditing && !isDemo ? (
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="font-semibold text-lg mb-1"
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-xl font-semibold text-foreground truncate">
                      {isDemo ? displayedProfile?.display_name : displayName || 'Set your name'}
                    </h2>
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {isDemo ? 'demo@example.com' : user?.email}
                  </p>
                  {/* Show character motivation */}
                  {avatarUrl?.startsWith('character:') && (() => {
                    const charId = avatarUrl.replace('character:', '');
                    const char = characterAvatars.find(c => c.id === charId);
                    return char ? (
                      <p className="text-xs text-primary/80 italic mt-1">"{char.motivation}"</p>
                    ) : null;
                  })()}
                </div>
                {!isEditing && !isDemo && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isEditing && !isDemo && (
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

            {/* Avatar Picker */}
            {user && !isDemo && (
              <AvatarPicker
                open={showAvatarPicker}
                onOpenChange={setShowAvatarPicker}
                currentAvatar={avatarUrl}
                userId={user.id}
                onAvatarChange={handleAvatarChange}
              />
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                label="Sessions"
                value={displayedStats.total_sessions_completed}
                bgColor="bg-emerald-500/10"
                onClick={() => !isDemo && setActiveStatSheet('sessions')}
              />
              <StatCard
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Time Focused"
                value={formatTime(displayedStats.total_minutes_worked)}
                bgColor="bg-blue-500/10"
                onClick={() => !isDemo && setActiveStatSheet('time')}
              />
              <StatCard
                icon={<Flame className="w-4 h-4 text-orange-500" />}
                label="Day Streak"
                value={displayedStats.current_streak}
                bgColor="bg-orange-500/10"
                onClick={() => !isDemo && setActiveStatSheet('streak')}
              />
              <StatCard
                icon={<FolderKanban className="w-4 h-4 text-violet-500" />}
                label="Projects Done"
                value={displayedStats.projects_completed}
                bgColor="bg-violet-500/10"
                onClick={() => !isDemo && setActiveStatSheet('projects')}
              />
            </div>

            {/* Achievements Preview */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors text-left">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Achievements</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{demoUnlockedCount}/{demoTotalCount}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <Progress value={demoProgressPercentage} className="h-2 mb-3" />

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
          </div>

          <div className="xl:col-span-5 xl:sticky xl:top-24 h-fit space-y-6">
            {/* Preferences */}
            <div className="p-4 rounded-2xl bg-card border border-border">
              <h3 className="font-medium text-foreground mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Theme</span>
                  </div>
                  <Select value={theme} onValueChange={handleThemeChange}>
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

              {hasChanges && !isEditing && !isDemo && (
                <Button onClick={handleSave} disabled={isSaving} className="w-full mt-4">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Preferences
                </Button>
              )}
            </div>

            {/* Account Section */}
            <div className="p-4 rounded-2xl bg-card border border-border">
              <h3 className="font-medium text-foreground mb-4">Account</h3>
              <div className="space-y-2">
                {!isDemo && (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Change Password</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{isDemo ? 'Exit Demo' : 'Sign Out'}</span>
                  </div>
                  {isSigningOut && <Loader2 className="w-4 h-4 animate-spin" />}
                </button>
              </div>
            </div>

            {/* Danger Zone - Hidden in Demo */}
            {!isDemo && (
              <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                <h3 className="font-medium text-destructive mb-4">Danger Zone</h3>
                <button
                  onClick={() => setShowDeleteAccount(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Delete Account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-destructive" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stat Detail Sheets - only for non-demo */}
        {!isDemo && (
          <>
            <StatDetailSheet
              open={activeStatSheet === 'sessions'}
              onOpenChange={(open) => !open && setActiveStatSheet(null)}
              type="sessions"
              stats={stats}
            />
            <StatDetailSheet
              open={activeStatSheet === 'time'}
              onOpenChange={(open) => !open && setActiveStatSheet(null)}
              type="time"
              stats={stats}
            />
            <StatDetailSheet
              open={activeStatSheet === 'streak'}
              onOpenChange={(open) => !open && setActiveStatSheet(null)}
              type="streak"
              stats={stats}
            />
            <StatDetailSheet
              open={activeStatSheet === 'projects'}
              onOpenChange={(open) => !open && setActiveStatSheet(null)}
              type="projects"
              stats={stats}
            />
          </>
        )}

        {/* Modals - Only for authenticated users */}
        {!isDemo && (
          <>
            <ChangePasswordModal
              open={showChangePassword}
              onOpenChange={setShowChangePassword}
            />

            {user && (
              <DeleteAccountDialog
                open={showDeleteAccount}
                onOpenChange={setShowDeleteAccount}
                userEmail={user.email || ''}
                onDeleted={handleAccountDeleted}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
