import { useState } from 'react';
import { VentureId } from '@/types/empire';
import { ventures } from '@/data/ventures';
import { 
  CheckCircle2, 
  Circle, 
  Play, 
  Square,
  Settings,
  Folder,
  Save,
  Power
} from 'lucide-react';

interface WorkSessionProps {
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  onComplete: () => void;
  onAbort: () => void;
}

const stages = [
  {
    id: 1,
    name: 'Work Definition',
    icon: Settings,
    description: 'Define exactly what you are doing',
  },
  {
    id: 2,
    name: 'Setup',
    icon: Folder,
    description: 'Open tools, files, and workspace',
  },
  {
    id: 3,
    name: 'Execute',
    icon: Play,
    description: 'Do the work. No distractions.',
  },
  {
    id: 4,
    name: 'Organize & Save',
    icon: Save,
    description: 'Name files, close tabs, clear workspace',
  },
  {
    id: 5,
    name: 'Stop',
    icon: Power,
    description: 'You are done. Do not extend.',
  },
];

export function WorkSession({ venture, workType, focus, completionCondition, onComplete, onAbort }: WorkSessionProps) {
  const [currentStage, setCurrentStage] = useState(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  
  const ventureData = ventures.find(v => v.id === venture);

  const handleStageComplete = (stageId: number) => {
    if (!completedStages.includes(stageId)) {
      setCompletedStages([...completedStages, stageId]);
      if (stageId < 5) {
        setCurrentStage(stageId + 1);
      }
    }
  };

  const isStageComplete = (stageId: number) => completedStages.includes(stageId);
  const isStageActive = (stageId: number) => stageId === currentStage;
  const isStageAvailable = (stageId: number) => stageId <= currentStage;

  return (
    <div className="panel p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Active Session • {ventureData?.name}
          </div>
          <h2 className="text-2xl font-display font-bold">{workType}</h2>
        </div>
        <button
          onClick={onAbort}
          className="btn-secondary text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Square className="w-4 h-4 mr-2 inline" />
          Abort Session
        </button>
      </div>

      {/* Task Details */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-secondary/50">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Focus</div>
          <div className="font-medium">{focus}</div>
        </div>
        <div className="p-4 rounded-lg bg-secondary/50">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Done When</div>
          <div className="font-medium">{completionCondition}</div>
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isComplete = isStageComplete(stage.id);
          const isActive = isStageActive(stage.id);
          const isAvailable = isStageAvailable(stage.id);

          return (
            <div
              key={stage.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isComplete
                  ? 'border-status-active/50 bg-status-active/5'
                  : isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card/50'
              } ${!isAvailable ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      isComplete
                        ? 'bg-status-active/20 text-status-active'
                        : isActive
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">Stage {stage.id}</span>
                      <span className="font-display font-medium">{stage.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
                
                {isAvailable && !isComplete && (
                  <button
                    onClick={() => handleStageComplete(stage.id)}
                    className="btn-secondary"
                  >
                    <Circle className="w-4 h-4 mr-2 inline" />
                    Complete
                  </button>
                )}
                
                {isComplete && (
                  <CheckCircle2 className="w-6 h-6 text-status-active" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Session */}
      {completedStages.length === 5 && (
        <div className="mt-8 pt-6 border-t border-border text-center animate-fade-in">
          <p className="text-lg font-display text-primary mb-4">Session Complete</p>
          <button onClick={onComplete} className="btn-primary">
            End Session
          </button>
        </div>
      )}
    </div>
  );
}