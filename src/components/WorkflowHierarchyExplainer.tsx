import { useState, useEffect } from 'react';
import { X, FolderOpen, ListChecks, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

interface WorkflowHierarchyExplainerProps {
  onDismiss: () => void;
}

export function WorkflowHierarchyExplainer({ onDismiss }: WorkflowHierarchyExplainerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store in localStorage so it doesn't show again
    localStorage.setItem('workflow-hierarchy-dismissed', 'true');
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 animate-fade-in">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">How Your Work Is Organized</h3>
      </div>

      {/* Hierarchy Visualization */}
      <div className="space-y-3">
        {/* Project Level */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 pt-1.5">
            <p className="font-medium text-foreground">PROJECT</p>
            <p className="text-sm text-muted-foreground">
              A goal with multiple phases
            </p>
            <p className="text-xs text-muted-foreground/70 italic mt-0.5">
              e.g., "Create a YouTube video"
            </p>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex items-center gap-3 pl-4">
          <div className="w-0.5 h-3 bg-border" />
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
        </div>

        {/* Stage/Workflow Level */}
        <div className="flex items-start gap-3 pl-4">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 pt-1.5">
            <p className="font-medium text-foreground">WORKFLOW (Stage)</p>
            <p className="text-sm text-muted-foreground">
              A focused work session
            </p>
            <p className="text-xs text-muted-foreground/70 italic mt-0.5">
              e.g., "Research", "Scripting", "Editing"
            </p>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex items-center gap-3 pl-8">
          <div className="w-0.5 h-3 bg-border" />
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
        </div>

        {/* Task Level */}
        <div className="flex items-start gap-3 pl-8">
          <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 pt-1.5">
            <p className="font-medium text-foreground">TASK</p>
            <p className="text-sm text-muted-foreground">
              The smallest unit of work
            </p>
            <p className="text-xs text-muted-foreground/70 italic mt-0.5">
              e.g., "Outline main points", "Draft intro"
            </p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Single-stage workflows are perfect for routines and quick tasks that don't need multiple phases.
        </p>
      </div>

      {/* Got it button */}
      <button
        onClick={handleDismiss}
        className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:brightness-105 transition-all flex items-center justify-center gap-2"
      >
        Got it!
        <CheckCircle2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Hook to check if explainer should be shown
export function useShowHierarchyExplainer() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('workflow-hierarchy-dismissed');
    setShouldShow(!dismissed);
  }, []);

  const dismiss = () => {
    setShouldShow(false);
    localStorage.setItem('workflow-hierarchy-dismissed', 'true');
  };

  return { shouldShow, dismiss };
}
