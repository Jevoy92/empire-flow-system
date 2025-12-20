import { Home, History, Layout, Plus, Settings } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navigation during active session or onboarding
  if (location.pathname === '/session' || location.pathname === '/onboarding' || location.pathname === '/auth') {
    return null;
  }

  const handleQuickStart = () => {
    navigate('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-2 relative">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
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
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/history'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-xs font-medium">History</span>
        </Link>

        {/* Center Quick Start Button */}
        <button
          onClick={handleQuickStart}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:brightness-105 transition-all active:scale-95"
          aria-label="Start new session"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Templates */}
        <Link
          to="/templates"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/templates'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layout className="w-5 h-5" />
          <span className="text-xs font-medium">Templates</span>
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
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
  );
}
