import { CheckCircle, Circle, Timer, ListChecks, RotateCcw, Play } from 'lucide-react';

interface TaskBreakdownRow {
  id: string;
  text: string;
  completed: boolean;
  subtasksCompleted: number;
  subtasksTotal: number;
  minutes: number | null;
  isEstimated: boolean;
}

interface SessionDetailPanelProps {
  focus: string;
  ventureLabel: string;
  workType: string;
  durationMinutes: number | null;
  completedTaskCount: number;
  totalTaskCount: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  completionCondition: string;
  taskBreakdown: TaskBreakdownRow[];
  formatDuration: (m: number | null) => string;
  formatSessionTime: (s: string, e: string | null) => string;
  onStartSimilar: () => void;
  onResumeActive: () => void;
  isActive: boolean;
}

export function SessionDetailPanel({
  focus,
  ventureLabel,
  workType,
  durationMinutes,
  completedTaskCount,
  totalTaskCount,
  status,
  startedAt,
  completedAt,
  completionCondition,
  taskBreakdown,
  formatDuration,
  formatSessionTime,
  onStartSimilar,
  onResumeActive,
  isActive,
}: SessionDetailPanelProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-foreground truncate">{focus}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {ventureLabel} • {workType}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</p>
          <p className="text-sm font-semibold text-foreground mt-1">{formatDuration(durationMinutes)}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tasks</p>
          <p className="text-sm font-semibold text-foreground mt-1">
            {completedTaskCount}/{totalTaskCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-sm font-semibold capitalize text-foreground mt-1">{status}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5" />
          <span>{formatSessionTime(startedAt, completedAt)}</span>
        </div>
        {completionCondition && (
          <div className="mt-1.5">
            Done when: <span className="text-foreground/90">{completionCondition}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Task Breakdown</h3>
        </div>

        {taskBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks were captured for this session.</p>
        ) : (
          <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-1">
            {taskBreakdown.map((task) => (
              <div key={task.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {task.completed ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 text-[hsl(var(--status-active))] shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm ${task.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {task.text}
                      </p>
                      {task.subtasksTotal > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.subtasksCompleted}/{task.subtasksTotal} subtasks
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {task.minutes !== null ? `${task.minutes}m` : 'n/a'}
                    </p>
                    {task.isEstimated && (
                      <p className="text-[10px] text-[hsl(var(--status-warning))]">estimated</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3">
        <button
          onClick={onStartSimilar}
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Start Similar
        </button>
        <button
          onClick={onResumeActive}
          disabled={!isActive}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          Resume Active
        </button>
      </div>
    </>
  );
}
