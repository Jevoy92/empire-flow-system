import { useState } from 'react';
import { EmpireDashboard } from '@/components/EmpireDashboard';
import { FlightLaunchpad } from '@/components/FlightLaunchpad';
import { WorkSession } from '@/components/WorkSession';
import { SystemShutdown } from '@/components/SystemShutdown';
import { VentureId, EnergyLevel } from '@/types/empire';

type AppView = 'dashboard' | 'launchpad' | 'session' | 'shutdown';

interface SessionConfig {
  energy: EnergyLevel;
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
}

const Index = () => {
  const [view, setView] = useState<AppView>('dashboard');
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
    setView('dashboard');
  };

  const handleAbort = () => {
    setSessionConfig(null);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {view === 'dashboard' && (
        <EmpireDashboard onStartSession={() => setView('launchpad')} />
      )}

      {view === 'launchpad' && (
        <div className="min-h-screen flex items-center justify-center p-8">
          <FlightLaunchpad onLaunch={handleLaunch} />
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
            onAbort={handleAbort}
          />
        </div>
      )}

      {view === 'shutdown' && (
        <SystemShutdown onComplete={handleShutdownComplete} />
      )}
    </div>
  );
};

export default Index;
