import { useState } from 'react';
import { VentureId } from '@/types/empire';
import { ventures } from '@/data/ventures';
import { ChevronRight, ChevronDown, X } from 'lucide-react';

interface WorkSessionProps {
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  onComplete: () => void;
  onAbort: () => void;
}

const executionSteps = [
  {
    id: 1,
    instruction: 'Review',
    detail: 'Look through any feedback or notes once. Do not edit yet.',
  },
  {
    id: 2,
    instruction: 'Execute',
    detail: 'Do the core work. Stay focused on the task.',
  },
  {
    id: 3,
    instruction: 'Refine',
    detail: 'Make adjustments and polish your work.',
  },
  {
    id: 4,
    instruction: 'Save & Export',
    detail: 'Save your work. Export if needed. Name files clearly.',
  },
];

export function WorkSession({ venture, workType, focus, completionCondition, onComplete, onAbort }: WorkSessionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  const ventureData = ventures.find(v => v.id === venture);
  const step = executionSteps[currentStep];
  const isLastStep = currentStep === executionSteps.length - 1;

  const handleNextStep = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
      setShowDetails(false);
    }
  };

  return (
    <div className="w-full max-w-lg animate-fade-in">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-8 px-4">
        {executionSteps.map((_, idx) => (
          <div
            key={idx}
            className={`progress-segment ${idx <= currentStep ? 'complete' : ''}`}
          />
        ))}
      </div>

      <div className="card-elevated">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {ventureData?.name} • {workType}
            </div>
            <div className="font-medium text-foreground">{focus}</div>
          </div>
          <button
            onClick={onAbort}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Abort session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stage Header */}
        <div className="px-6 py-4 bg-secondary/30 border-b border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Current Stage: Step {currentStep + 1} of {executionSteps.length}
          </div>
        </div>

        {/* Main Instruction - ONE at a time */}
        <div className="p-8 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-4">
            {step.instruction}
          </h2>
          
          {/* Optional Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            {showDetails ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Hide details
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                Show details
              </>
            )}
          </button>

          {showDetails && (
            <p className="text-muted-foreground animate-fade-in mb-6 max-w-sm mx-auto">
              {step.detail}
            </p>
          )}

          {/* Next Button */}
          <button
            onClick={handleNextStep}
            className="btn-primary px-10 py-4 text-lg"
          >
            {isLastStep ? 'Complete Session' : 'Done — Next Step'}
          </button>
        </div>

        {/* Footer - Completion Condition Reminder */}
        <div className="px-6 py-4 bg-secondary/20 border-t border-border text-center">
          <div className="text-xs text-muted-foreground">
            Done when: <span className="text-foreground">{completionCondition}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
