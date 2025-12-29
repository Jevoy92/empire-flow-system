import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, LogOut, Save, User, Trophy } from 'lucide-react';
import AchievementsPanel from '@/components/AchievementsPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  const { user, profile, settings, loading, isAuthenticated, updateProfile, updateSettings, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('system');
  const [sessionDuration, setSessionDuration] = useState(25);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  if (loading) {
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
    <div className="min-h-screen bg-background p-8 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>

          {/* Your Journey Section */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Your Journey
            </h2>
            <AchievementsPanel />
          </div>

          {/* Preferences Section */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Preferences
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm text-muted-foreground">
                  Theme
                </Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm text-muted-foreground">
                  Default Session Duration (minutes)
                </Label>
                <Select
                  value={sessionDuration.toString()}
                  onValueChange={(v) => setSessionDuration(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="25">25 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}

          {/* Sign Out */}
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
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
    </div>
  );
}
