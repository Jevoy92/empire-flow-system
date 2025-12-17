import { useState } from 'react';
import { EnergyLevel, VentureId } from '@/types/empire';
import { ventures, workTypes } from '@/data/ventures';
import { Rocket, Battery, BatteryLow, BatteryMedium, BatteryFull, ChevronRight, Target, CheckCircle2 } from 'lucide-react';

interface FlightLaunchpadProps {
  onLaunch: (config: {
    energy: EnergyLevel;
    venture: VentureId;
    workType: string;
    focus: string;
    completionCondition: string;
  }) => void;
}

const energyLevels: { value: EnergyLevel; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'high', label: 'High Altitude', icon: BatteryFull, description: 'Ready for deep work' },
  { value: 'medium', label: 'Cruising', icon: BatteryMedium, description: 'Standard operations' },
  { value: 'low', label: 'Low Fuel', icon: BatteryLow, description: 'Light tasks only' },
  { value: 'depleted', label: 'Grounded', icon: Battery, description: 'Admin or rest' },
];

export function FlightLaunchpad({ onLaunch }: FlightLaunchpadProps) {
  const [step, setStep] = useState(1);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [venture, setVenture] = useState<VentureId | null>(null);
  const [workType, setWorkType] = useState<string>('');
  const [focus, setFocus] = useState('');
  const [completionCondition, setCompletionCondition] = useState('');

  const canProceed = () => {
    switch (step) {
      case 1: return energy !== null;
      case 2: return venture !== null;
      case 3: return workType !== '';
      case 4: return focus.trim() !== '' && completionCondition.trim() !== '';
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else if (energy && venture && workType) {
      onLaunch({ energy, venture, workType, focus, completionCondition });
    }
  };

  return (
    <div className="cockpit-panel p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Rocket className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold">Flight Launchpad</h2>
          <p className="text-sm text-muted-foreground">Pre-flight sequence initiated</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-secondary'
              }`}
            />
            {s < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Energy Check */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-display mb-2">Flight Check #1: Engine Status</h3>
          <p className="text-muted-foreground mb-6">How are your energy levels today?</p>
          
          <div className="grid grid-cols-2 gap-3">
            {energyLevels.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                onClick={() => setEnergy(value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  energy === value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${energy === value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-display font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Venture Selection */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-display mb-2">Flight Check #2: Domain Entry</h3>
          <p className="text-muted-foreground mb-6">Which venture are you entering?</p>
          
          <div className="grid grid-cols-2 gap-3">
            {ventures.map((v) => (
              <button
                key={v.id}
                onClick={() => setVenture(v.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  venture === v.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-display font-medium">{v.name}</div>
                <div className="text-sm text-muted-foreground">{v.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Work Type */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-display mb-2">Flight Check #3: Mission Type</h3>
          <p className="text-muted-foreground mb-6">What type of work are you doing?</p>
          
          <div className="grid grid-cols-2 gap-3">
            {workTypes.map((type) => (
              <button
                key={type}
                onClick={() => setWorkType(type)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  workType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-mono text-sm">{type}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Define Focus */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-display mb-2">Flight Check #4: Set Coordinates</h3>
          <p className="text-muted-foreground mb-6">Define your mission parameters.</p>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-2">
                <Target className="w-4 h-4" />
                Work Session Focus
              </label>
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="What specific task are you doing?"
                className="w-full p-3 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Completion Condition
              </label>
              <input
                type="text"
                value={completionCondition}
                onChange={(e) => setCompletionCondition(e.target.value)}
                placeholder="How will you know when you're done?"
                className="w-full p-3 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="btn-cockpit"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-launch disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 4 ? 'Clearance for Takeoff' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
