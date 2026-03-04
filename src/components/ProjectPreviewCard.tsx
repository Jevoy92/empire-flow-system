import { Check, Layers, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectStage {
  name: string;
  workType: string;
  defaultFocus: string;
  defaultTasks: string[];
}

interface ProjectData {
  name: string;
  venture: string;
  description: string;
  stages: ProjectStage[];
}

interface ProjectPreviewCardProps {
  project: ProjectData;
  isApproved: boolean;
  onApprove: () => void;
}

export function ProjectPreviewCard({ project, isApproved, onApprove }: ProjectPreviewCardProps) {
  return (
    <div className={`rounded-xl border transition-all animate-message-in ${
      isApproved 
        ? 'border-[hsl(var(--status-active)/0.3)] bg-[hsl(var(--status-active)/0.05)]' 
        : 'border-primary/20 bg-card hover:border-primary/40'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{project.name}</h4>
              <p className="text-xs text-muted-foreground">{project.venture} • {project.stages.length} stages</p>
            </div>
          </div>
          {isApproved ? (
            <div className="flex items-center gap-1 text-[hsl(var(--status-active))] text-xs font-medium">
              <Check className="w-4 h-4" />
              Saved
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={onApprove} className="text-xs h-7">
              Save Project
            </Button>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      {/* Stages */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stages</p>
        <div className="flex flex-wrap items-center gap-1">
          {project.stages.map((stage, idx) => (
            <div key={idx} className="flex items-center">
              <div className="px-2 py-1 rounded-md bg-secondary/50 text-xs">
                <span className="font-medium">{stage.name}</span>
                <span className="text-muted-foreground ml-1">({stage.workType})</span>
              </div>
              {idx < project.stages.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* First stage preview */}
      {project.stages[0] && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-lg bg-secondary/30 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">First stage: {project.stages[0].name}</p>
            <ul className="space-y-0.5">
              {project.stages[0].defaultTasks.slice(0, 3).map((task, idx) => (
                <li key={idx} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-primary/60 mt-0.5">•</span>
                  <span>{task}</span>
                </li>
              ))}
              {project.stages[0].defaultTasks.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{project.stages[0].defaultTasks.length - 3} more tasks
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
