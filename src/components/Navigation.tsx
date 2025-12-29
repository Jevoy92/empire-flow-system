import { useState } from 'react';
import { Home, History, Layers, Settings, Sparkles } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { AICommandCenter } from '@/components/AICommandCenter';
import { useSession } from '@/contexts/SessionContext';
import { useAuth } from '@/hooks/useAuth';

export function Navigation() {
  const location = useLocation();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { isActive, isMinimized } = useSession();
  const { isAuthenticated } = useAuth();

  // Hide navigation during active full-screen session, onboarding, auth, or landing page
  const isFullScreenSession = location.pathname === '/session' && isActive && !isMinimized;
  const isLandingOrAuth = location.pathname === '/auth' || location.pathname === '/onboarding';
  const isDemo = location.search.includes('demo=1');
  
  // Hide nav on landing page (when on "/" AND not authenticated AND not in demo mode)
  const isLandingPage = location.pathname === '/' && !isAuthenticated && !isDemo;
  
  if (isFullScreenSession || isLandingOrAuth || isLandingPage) {
    return null;
  }

  const isWorkflowsActive = location.pathname === '/workflows' || location.pathname === '/templates' || location.pathname === '/projects';

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-between px-6 py-2 relative">
          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* History */}
          <Link
            to="/history"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/history'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-xs font-medium">History</span>
          </Link>

          {/* Center AI Orb Button */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:brightness-105 transition-all active:scale-95 group"
            aria-label="Open AI Assistant"
          >
            {/* Outer breathing ring */}
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-breathe" />
            {/* Secondary ripple */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" />
            {/* Inner orb */}
            <div className="relative z-10 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
          </button>

          {/* Workflows (merged Projects + Templates) */}
          <Link
            to="/workflows"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              isWorkflowsActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-xs font-medium">Workflows</span>
          </Link>

          {/* Settings */}
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/settings'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* AI Command Center Sheet */}
      <AICommandCenter isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </>
  );
}
