import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeScreen } from '@/components/HomeScreen';
import { SessionSetup } from '@/components/SessionSetup';
import { VentureId, EnergyLevel } from '@/types/empire';

type AppView = 'home' | 'setup';

interface SessionConfig {
  energy: EnergyLevel;
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
}

const Index = () => {
  const [view, setView] = useState<AppView>('home');
  const navigate = useNavigate();

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
};

export default Index;
