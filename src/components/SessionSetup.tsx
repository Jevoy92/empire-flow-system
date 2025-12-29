import { useState } from 'react';
import { EnergyLevel, VentureId } from '@/types/empire';
import { useUserVentures } from '@/hooks/useUserVentures';
import { Check, ChevronRight, Loader2 } from 'lucide-react';

interface SessionSetupProps {
  onLaunch: (config: {
    energy: EnergyLevel;
    venture: VentureId;
    workType: string;
    focus: string;
    completionCondition: string;
  }) => void;
  onCancel: () => void;
}

const setupChecklist = [
  { id: 1, label: 'Project folder is open' },
  { id: 2, label: 'Required software is open' },
  { id: 3, label: 'Assets are accessible' },
  { id: 4, label: 'Notifications are silenced' },
  { id: 5, label: 'Timer is set' },
];

export function SessionSetup({ onLaunch, onCancel }: SessionSetupProps) {
  const [step, setStep] = useState<'definition' | 'category' | 'worktype' | 'setup'>('definition');
  const [focus, setFocus] = useState('');
  const [completionCondition, setCompletionCondition] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [workType, setWorkType] = useState<string>('');
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  const { personalVentures, projectVentures, loading, getWorkTypesForVenture } = useUserVentures();

  const canContinueDefinition = focus.trim() !== '' && completionCondition.trim() !== '';
  const canContinueCategory = selectedCategory !== null;
  const canContinueWorktype = workType !== '';
  const allSetupComplete = completedItems.length === setupChecklist.length;

  // Get available work types for selected category
  const availableWorkTypes = selectedCategory ? getWorkTypesForVenture(selectedCategory) : [];

  const toggleItem = (id: number) => {
    setCompletedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selectedCategory && workType) {
      onLaunch({
        energy: 'high',
        venture: selectedCategory as VentureId,
        workType,
        focus,
        completionCondition,
      });
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case 'definition': return 1;
      case 'category': return 2;
      case 'worktype': return 3;
      case 'setup': return 4;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg animate-fade-in">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-8 px-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`progress-segment ${s <= getStepNumber() ? 'active' : ''}`} />
          </div>
        ))}
      </div>

      <div className="card-elevated p-8">
        {/* Step 1: Work Definition */}
        {step === 'definition' && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-semibold mb-2">Work Session Focus</h2>
            <p className="text-muted-foreground mb-8">Define exactly what you will accomplish.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What are you doing?
                </label>
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g., Edit podcast episode 12"
                  className="input-field"
                  maxLength={80}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How will you know when you're done?
                </label>
                <input
                  type="text"
                  value={completionCondition}
                  onChange={(e) => setCompletionCondition(e.target.value)}
                  placeholder="e.g., Audio is exported and uploaded"
                  className="input-field"
                  maxLength={80}
                />
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button onClick={onCancel} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => setStep('category')}
                disabled={!canContinueDefinition}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category Selection */}
        {step === 'category' && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-semibold mb-2">Select Category</h2>
            <p className="text-muted-foreground mb-6">What area is this for?</p>
            
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {/* Personal */}
              {personalVentures.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal</h3>
                  <div className="space-y-2">
                    {personalVentures.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setWorkType('');
                        }}
                        className={`checklist-item py-3 ${selectedCategory === cat.name ? 'completed border-primary' : ''}`}
                      >
                        <div className={`check-circle ${selectedCategory === cat.name ? 'checked' : ''}`}>
                          {selectedCategory === cat.name && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{cat.name}</div>
                          {cat.tagline && <div className="text-xs text-muted-foreground">{cat.tagline}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projectVentures.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Projects</h3>
                  <div className="space-y-2">
                    {projectVentures.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setWorkType('');
                        }}
                        className={`checklist-item py-3 ${selectedCategory === cat.name ? 'completed border-primary' : ''}`}
                      >
                        <div className={`check-circle ${selectedCategory === cat.name ? 'checked' : ''}`}>
                          {selectedCategory === cat.name && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{cat.name}</div>
                          {cat.tagline && <div className="text-xs text-muted-foreground">{cat.tagline}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-10">
              <button onClick={() => setStep('definition')} className="btn-ghost">
                Back
              </button>
              <button
                onClick={() => setStep('worktype')}
                disabled={!canContinueCategory}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Work Type */}
        {step === 'worktype' && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-semibold mb-2">Work Type</h2>
            <p className="text-muted-foreground mb-2">What kind of work is this?</p>
            {selectedCategory && (
              <p className="text-xs text-primary mb-6">{selectedCategory}</p>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {availableWorkTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setWorkType(type)}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    workType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="font-medium text-sm">{type}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-10">
              <button onClick={() => setStep('category')} className="btn-ghost">
                Back
              </button>
              <button
                onClick={() => setStep('setup')}
                disabled={!canContinueWorktype}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Setup Checklist */}
        {step === 'setup' && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-semibold mb-2">Setup Checklist</h2>
            <p className="text-muted-foreground mb-8">Prepare your workspace before starting.</p>
            
            <div className="space-y-3">
              {setupChecklist.map((item) => {
                const isComplete = completedItems.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`checklist-item ${isComplete ? 'completed' : ''}`}
                  >
                    <div className={`check-circle ${isComplete ? 'checked' : ''}`}>
                      {isComplete && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className={isComplete ? 'text-foreground' : 'text-foreground'}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-10">
              <button onClick={() => setStep('worktype')} className="btn-ghost">
                Back
              </button>
              <button
                onClick={handleStart}
                disabled={!allSetupComplete}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Execution
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
