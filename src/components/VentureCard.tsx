import { Venture } from '@/types/empire';
import { ArrowRight, Folder, CheckSquare } from 'lucide-react';

interface VentureCardProps {
  venture: Venture;
  onClick?: () => void;
}

const statusStyles = {
  active: 'bg-status-active',
  developing: 'bg-status-warning',
  dormant: 'bg-status-offline',
};

const ventureColorMap: Record<string, string> = {
  'venture-palmer': 'text-venture-palmer border-venture-palmer/30 hover:border-venture-palmer/60',
  'venture-besettld': 'text-venture-besettld border-venture-besettld/30 hover:border-venture-besettld/60',
  'venture-yourboy': 'text-venture-yourboy border-venture-yourboy/30 hover:border-venture-yourboy/60',
  'venture-strinzees': 'text-venture-strinzees border-venture-strinzees/30 hover:border-venture-strinzees/60',
};

export function VentureCard({ venture, onClick }: VentureCardProps) {
  const colorClass = ventureColorMap[venture.color] || '';

  return (
    <div
      onClick={onClick}
      className={`venture-card cursor-pointer group ${colorClass} border-2`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`status-indicator ${statusStyles[venture.status]}`} />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {venture.status}
            </span>
          </div>
          <h3 className="text-xl font-display font-bold">{venture.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">{venture.tagline}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      <p className="text-sm text-secondary-foreground mb-6 line-clamp-2">
        {venture.description}
      </p>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Folder className="w-4 h-4" />
          <span className="font-mono">{venture.activeProjects} projects</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckSquare className="w-4 h-4" />
          <span className="font-mono">{venture.pendingTasks} tasks</span>
        </div>
      </div>
    </div>
  );
}
