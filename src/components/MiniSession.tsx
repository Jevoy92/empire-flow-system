import { useNavigate } from 'react-router-dom';
import { Play, Pause, Maximize2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { ventures, getCategoryById } from '@/data/ventures';

export function MiniSession() {
  const navigate = useNavigate();
  const { 
    isActive, 
    isMinimized, 
    isPaused, 
    config, 
    tasks, 
    elapsedSeconds,
    restoreSession,
    togglePause 
  } = useSession();

  if (!isActive || !isMinimized || !config) {
    return null;
  }

  const ventureData = ventures.find(v => v.id === config.venture);
  const categoryData = getCategoryById(config.venture);
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      'palmer-house': 'bg-venture-palmer',
      'besettld': 'bg-venture-besettld',
      'yourboy': 'bg-venture-yourboy',
      'strinzees': 'bg-venture-strinzees',
      'daily-maintenance': 'bg-venture-maintenance',
      'body-energy': 'bg-venture-energy',
      'admin-life': 'bg-venture-admin',
      'transition': 'bg-venture-transition',
      'care-relationships': 'bg-venture-care',
    };
    return colors[config.venture] || 'bg-primary';
  };

  const handleRestore = () => {
    restoreSession();
    navigate('/session');
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 animate-fade-in">
      <div 
        className="bg-card border border-border rounded-2xl shadow-lg p-3 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={handleRestore}
      >
        {/* Progress ring with category color indicator */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 1.256} 125.6`}
              className="transition-all duration-300"
            />
          </svg>
          <div className={`absolute inset-2 rounded-full ${getCategoryColor()} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {(ventureData?.name || categoryData?.name || 'W')[0]}
            </span>
          </div>
        </div>

        {/* Timer and info */}
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-lg font-semibold text-foreground">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-24">
            {completedCount}/{tasks.length} tasks
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePause();
            }}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore();
            }}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:brightness-105 transition-all"
            aria-label="Expand session"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
