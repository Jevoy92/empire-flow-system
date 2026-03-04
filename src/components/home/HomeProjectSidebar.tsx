import { getCategoryColor } from '@/data/ventures';
import { Project, SmartSuggestion, Template } from './types';

interface HomeProjectSidebarProps {
  activeProjects: Project[];
  recentTemplates: Template[];
  futureNotesCount: number;
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
  onStartFromTemplate: (template: Template) => void;
}

export function HomeProjectSidebar({
  activeProjects,
  recentTemplates,
  futureNotesCount,
  onSuggestionClick,
  onStartFromTemplate,
}: HomeProjectSidebarProps) {
  return (
    <aside className="col-span-3 rounded-2xl border border-border/70 bg-card/40 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Continue Projects</h3>
        <div className="space-y-2 mt-2">
          {activeProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active projects yet.</p>
          ) : (
            activeProjects.map((project) => {
              const stages = Array.isArray(project.stages) ? project.stages as { name?: string }[] : [];
              const stageName = stages[project.current_stage]?.name || 'Current Stage';
              return (
                <button
                  key={project.id}
                  onClick={() => onSuggestionClick({
                    label: `Continue: ${project.name}`,
                    description: `Resume ${stageName}`,
                    type: 'project',
                    data: { projectId: project.id, stageIndex: project.current_stage },
                  })}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{stageName}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground">Quick Start Templates</h3>
        <div className="space-y-2 mt-2">
          {recentTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No templates yet.</p>
          ) : (
            recentTemplates.slice(0, 4).map((template) => {
              const catColor = getCategoryColor(template.venture);
              return (
                <button
                  key={template.id}
                  onClick={() => onStartFromTemplate(template)}
                  className={`w-full rounded-xl border border-border border-l-4 ${catColor.border} bg-card p-3 text-left hover:bg-secondary/50 transition-colors`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{template.work_type}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Today Snapshot</p>
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <div className="rounded-md bg-card border border-border/70 py-2">
            <p className="text-sm font-semibold text-foreground">{activeProjects.length}</p>
            <p className="text-[10px] text-muted-foreground">Projects</p>
          </div>
          <div className="rounded-md bg-card border border-border/70 py-2">
            <p className="text-sm font-semibold text-foreground">{recentTemplates.length}</p>
            <p className="text-[10px] text-muted-foreground">Templates</p>
          </div>
          <div className="rounded-md bg-card border border-border/70 py-2">
            <p className="text-sm font-semibold text-foreground">{futureNotesCount}</p>
            <p className="text-[10px] text-muted-foreground">Notes</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
