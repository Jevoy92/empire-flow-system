import { useState } from 'react';
import { Check, X, Save } from 'lucide-react';

interface SystemShutdownProps {
  onComplete: () => void;
  onPlanNext?: () => void;
  onSaveAsTemplate?: (name: string) => void;
}

const shutdownChecklist = [
  { id: 1, label: 'Files saved and named clearly' },
  { id: 2, label: 'Workspace cleaned up' },
  { id: 3, label: 'Status logged or updated' },
];

export function SystemShutdown({ onComplete, onPlanNext, onSaveAsTemplate }: SystemShutdownProps) {
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [nextNote, setNextNote] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleItem = (id: number) => {
    setCompletedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allComplete = completedItems.length === shutdownChecklist.length;

  const handleSaveTemplate = () => {
    if (templateName.trim() && onSaveAsTemplate) {
      onSaveAsTemplate(templateName.trim());
      setSaved(true);
      setShowSaveTemplate(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'hsl(var(--session-warm))' }}>
      <div className="w-full max-w-lg animate-fade-in">
        <div className="card-elevated p-8">
          {/* Checklist */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Organize & Save</h2>
            <p className="text-muted-foreground mb-6">Clean up before you stop.</p>
            
            <div className="space-y-3">
              {shutdownChecklist.map((item) => {
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
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Time Note */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Next time:
            </label>
            <input
              type="text"
              value={nextNote}
              onChange={(e) => setNextNote(e.target.value)}
              placeholder="One sentence for future you..."
              className="input-field"
              maxLength={100}
            />
          </div>

          {/* Save as Template */}
          {onSaveAsTemplate && !saved && (
            <div className="mb-6">
              {showSaveTemplate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="input-field flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                  />
                  <button onClick={handleSaveTemplate} className="btn-primary px-4 py-3">
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="btn-ghost w-full flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save as template
                </button>
              )}
            </div>
          )}

          {saved && (
            <div className="mb-6 p-3 rounded-lg bg-status-active/10 text-status-active text-sm text-center">
              Template saved!
            </div>
          )}

          {/* Complete Section */}
          {allComplete && (
            <div className="pt-6 border-t border-border animate-fade-in text-center">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Session Complete
              </h3>
              <p className="text-muted-foreground mb-8">
                You are done. Stopping is part of the work.
              </p>
              
              <div className="flex flex-col gap-3">
                {onPlanNext && (
                  <button onClick={onPlanNext} className="btn-primary w-full">
                    Plan Next Session
                  </button>
                )}
                <button
                  onClick={onComplete}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          )}

          {!allComplete && (
            <div className="pt-6 border-t border-border">
              <button
                disabled
                className="btn-primary w-full opacity-40 cursor-not-allowed"
              >
                Complete checklist to finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
