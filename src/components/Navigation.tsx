import { Home, History, Layout } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/templates', icon: Layout, label: 'Templates' },
];

export function Navigation() {
  const location = useLocation();

  // Hide navigation during active session
  if (location.pathname === '/session') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
