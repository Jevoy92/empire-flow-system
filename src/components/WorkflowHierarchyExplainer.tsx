import { useState, useEffect } from 'react';
import { FolderOpen, ListChecks, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorkflowHierarchyExplainerProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export function WorkflowHierarchyExplainer({ isOpen, onDismiss }: WorkflowHierarchyExplainerProps) {
  const handleDismiss = () => {
    onDismiss();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            How Your Work Is Organized
          </DialogTitle>
        </DialogHeader>

        {/* Hierarchy Visualization */}
        <div className="space-y-3 py-2">
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
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Every workflow can grow into multiple stages, so your routines and projects stay connected in one system.
          </p>
        </div>

        {/* Got it button */}
        <button
          onClick={handleDismiss}
          className="mt-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:brightness-105 transition-all flex items-center justify-center gap-2"
        >
          Got it!
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if explainer should be shown
export function useShowHierarchyExplainer(scopeKey?: string | null) {
  const [shouldShow, setShouldShow] = useState(false);
  const resolvedScope = scopeKey?.trim() || null;
  const storageKey = resolvedScope
    ? `workflow-hierarchy-dismissed:v2:${resolvedScope}`
    : null;

  useEffect(() => {
    if (!storageKey) {
      setShouldShow(false);
      return;
    }
    const dismissedLocal = localStorage.getItem(storageKey);
    const dismissedSession = sessionStorage.getItem(storageKey);
    setShouldShow(!(dismissedLocal || dismissedSession));
  }, [storageKey]);

  const dismiss = () => {
    setShouldShow(false);
    if (!storageKey) return;
    localStorage.setItem(storageKey, 'true');
    sessionStorage.setItem(storageKey, 'true');
  };

  return { shouldShow, dismiss };
}
