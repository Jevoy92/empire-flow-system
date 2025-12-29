import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  id: string;
  theme: string;
  default_session_duration: number;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Refresh session - can be called manually or on window focus
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        // Session expired or invalid - user needs to sign in again
        if (error.message.includes('refresh_token') || error.message.includes('expired')) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSettings(null);
          toast({
            title: "Session expired",
            description: "Please sign in again to continue.",
            variant: "destructive",
          });
        }
        return null;
      }
      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
      }
      return refreshedSession;
    } catch (err) {
      console.error('Failed to refresh session:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
            fetchSettings(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setSettings(null);
        }
        
        // After initial load, auth state changes should immediately update loading
        if (initialized) {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
        fetchSettings(currentSession.user.id);
      }
      setInitialized(true);
      setLoading(false);
    });

    // Refresh session when window regains focus (prevents "locking out")
    const handleFocus = () => {
      if (session) {
        refreshSession();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialized, refreshSession, session]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const fetchSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setSettings(data);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setSettings(null);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error };
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', user.id);
    
    if (!error) {
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error };
  };

  const completeOnboarding = async () => {
    return updateProfile({ onboarding_completed: true });
  };

  return {
    user,
    session,
    profile,
    settings,
    loading,
    isAuthenticated: !!session,
    needsOnboarding: profile?.onboarding_completed === false,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateSettings,
    completeOnboarding,
    refreshSession,
    refetchProfile: () => user && fetchProfile(user.id),
    refetchSettings: () => user && fetchSettings(user.id),
  };
}
