import { useState } from 'react';
import { HomeScreen } from '@/components/HomeScreen';
import { SessionSetup } from '@/components/SessionSetup';
import { WorkSession } from '@/components/WorkSession';
import { SystemShutdown } from '@/components/SystemShutdown';
import { VentureId, EnergyLevel } from '@/types/empire';

type AppView = 'home' | 'setup' | 'session' | 'shutdown';

interface SessionConfig {
  energy: EnergyLevel;
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
}

const Index = () => {
  const [view, setView] = useState<AppView>('home');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  const handleLaunch = (config: SessionConfig) => {
    setSessionConfig(config);
    setView('session');
  };

  const handleSessionComplete = () => {
    setView('shutdown');
  };

  const handleShutdownComplete = () => {
    setSessionConfig(null);
    setView('home');
  };

  const handlePlanNext = () => {
    setSessionConfig(null);
    setView('setup');
  };

  const handleCancel = () => {
    setSessionConfig(null);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-background">
      {view === 'home' && (
        <HomeScreen onStartSession={() => setView('setup')} />
      )}

      {view === 'setup' && (
        <div className="min-h-screen flex items-center justify-center p-8">
          <SessionSetup onLaunch={handleLaunch} onCancel={handleCancel} />
        </div>
      )}

      {view === 'session' && sessionConfig && (
        <div className="min-h-screen flex items-center justify-center p-8">
          <WorkSession
            venture={sessionConfig.venture}
            workType={sessionConfig.workType}
            focus={sessionConfig.focus}
            completionCondition={sessionConfig.completionCondition}
            onComplete={handleSessionComplete}
            onAbort={handleCancel}
          />
        </div>
      )}

      {view === 'shutdown' && (
        <SystemShutdown 
          onComplete={handleShutdownComplete}
          onPlanNext={handlePlanNext}
        />
      )}
    </div>
  );
};

export default Index;
