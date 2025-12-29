import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeScreen } from '@/components/HomeScreen';
import { SessionSetup } from '@/components/SessionSetup';
import { LandingPage } from '@/components/LandingPage';
import { useAuth } from '@/hooks/useAuth';
import { VentureId, EnergyLevel } from '@/types/empire';
import { Loader2 } from 'lucide-react';

type AppView = 'home' | 'setup';

interface SessionConfig {
  energy: EnergyLevel;
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
}

function useQueryFlag(key: string) {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get(key) === "1", [search, key]);
}

const Index = () => {
  const [view, setView] = useState<AppView>('home');
  const navigate = useNavigate();
  const { isAuthenticated, needsOnboarding, loading } = useAuth();
  const isDemo = useQueryFlag("demo");

  // Redirect to onboarding if user needs it
  useEffect(() => {
    if (!loading && isAuthenticated && needsOnboarding && !isDemo) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, isAuthenticated, needsOnboarding, isDemo, navigate]);

  // Check for prefill data from templates or history
  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill');
    if (prefill) {
      setView('setup');
    }
  }, []);

  const handleLaunch = (config: SessionConfig) => {
    // Clear any prefill data
    sessionStorage.removeItem('prefill');
    // Navigate to session page with config
    navigate('/session', { state: config });
  };

  const handleCancel = () => {
    sessionStorage.removeItem('prefill');
    setView('home');
  };

  const handleTryDemo = () => {
    navigate("/?demo=1");
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user needs onboarding, show loading while redirect happens
  if (isAuthenticated && needsOnboarding && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authenticated user or demo mode: show app
  if (isAuthenticated || isDemo) {
    return (
      <div className="min-h-screen bg-background">
        {view === 'home' && (
          <HomeScreen onStartSession={() => setView('setup')} />
        )}

        {view === 'setup' && (
          <div className="min-h-screen flex items-center justify-center p-8 pb-24">
            <SessionSetup onLaunch={handleLaunch} onCancel={handleCancel} />
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated: show landing page
  return <LandingPage onTryDemo={handleTryDemo} />;
};

export default Index;
