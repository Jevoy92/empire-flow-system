import { ventures } from '@/data/ventures';
import { VentureCard } from './VentureCard';
import { Crown, Zap, Calendar, TrendingUp } from 'lucide-react';

interface EmpireDashboardProps {
  onStartSession: () => void;
}

export function EmpireDashboard({ onStartSession }: EmpireDashboardProps) {
  const totalProjects = ventures.reduce((acc, v) => acc + v.activeProjects, 0);
  const totalTasks = ventures.reduce((acc, v) => acc + v.pendingTasks, 0);
  const activeVentures = ventures.filter(v => v.status === 'active').length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 cockpit-glow">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-mono text-muted-foreground">{today}</span>
          </div>
          <h1 className="text-4xl font-display font-bold mb-2">
            Welcome back, <span className="text-primary text-glow">Jevoy</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Here is your empire at a glance.
          </p>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="cockpit-panel p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{activeVentures}</div>
              <div className="text-sm text-muted-foreground">Active Ventures</div>
            </div>
          </div>
          <div className="cockpit-panel p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{totalProjects}</div>
              <div className="text-sm text-muted-foreground">Active Projects</div>
            </div>
          </div>
          <div className="cockpit-panel p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-status-warning/20">
              <TrendingUp className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Pending Tasks</div>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={onStartSession}
            className="w-full btn-launch py-6 text-lg flex items-center justify-center gap-3"
          >
            <Zap className="w-6 h-6" />
            Initiate Pre-Flight Sequence
          </button>
        </div>

        {/* Ventures Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <span className="text-muted-foreground">Empire</span>
            <span>Divisions</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {ventures.map((venture) => (
              <VentureCard key={venture.id} venture={venture} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
