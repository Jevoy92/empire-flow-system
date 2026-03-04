import { useNavigate } from 'react-router-dom';
import { Play, Pause, Maximize2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { ventures, getCategoryById } from '@/data/ventures';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function MiniSession() {
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(false);
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
    if (isRestoring) return;
    setIsRestoring(true);

    window.setTimeout(() => {
      restoreSession();
      navigate('/session');
    }, 260);
  };

  const handlePauseToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isRestoring) return;
    togglePause();
  };

  return (
    <motion.div
      className="fixed bottom-20 right-4 md:bottom-4 z-40"
      initial={{ opacity: 0, y: 28, scale: 0.84, rotate: -5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.8 }}
    >
      <motion.div 
        layoutId="active-session-pill"
        className="relative bg-card border border-border rounded-2xl shadow-lg p-3 flex items-center gap-3 cursor-pointer overflow-hidden"
        onClick={handleRestore}
        whileHover={{ y: -1, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        animate={isRestoring ? { scale: 1.06, y: -10, opacity: 0.9 } : { scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <motion.div
          className="absolute inset-0 border border-primary/20 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.12, 0.32, 0.12], scale: [1, 1.02, 1] }}
          transition={{ duration: isPaused ? 2.2 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Progress ring with category color indicator */}
        <motion.div className="relative w-12 h-12" animate={isPaused ? undefined : { rotate: [0, 4, 0, -4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="125.6"
              initial={false}
              animate={{ strokeDashoffset: 125.6 - progress * 1.256 }}
              transition={{ type: 'spring', stiffness: 250, damping: 30 }}
            />
          </svg>
          <div className={`absolute inset-2 rounded-full ${getCategoryColor()} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {(ventureData?.name || categoryData?.name || 'W')[0]}
            </span>
          </div>
        </motion.div>

        {/* Timer and info */}
        <motion.div className="flex flex-col min-w-0" animate={isPaused ? undefined : { y: [0, -1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <span className="font-mono text-lg font-semibold text-foreground">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-24">
            {completedCount}/{tasks.length} tasks
          </span>
        </motion.div>

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <motion.button
            onClick={handlePauseToggle}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            aria-label={isPaused ? 'Resume' : 'Pause'}
            whileTap={{ scale: 0.92 }}
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore();
            }}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:brightness-105 transition-all"
            aria-label="Expand session"
            whileTap={{ scale: 0.92 }}
            animate={isRestoring ? { rotate: 18 } : { rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
