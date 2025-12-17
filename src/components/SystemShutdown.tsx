import { useState } from 'react';
import { Moon, CheckCircle2, Circle, Power } from 'lucide-react';

interface SystemShutdownProps {
  onComplete: () => void;
}

const shutdownChecklist = [
  { id: 1, label: 'Check tomorrow\'s calendar for first commitments' },
  { id: 2, label: 'Clear physical workspace' },
  { id: 3, label: 'Close all browser tabs' },
  { id: 4, label: 'Empty downloads folder' },
  { id: 5, label: 'Write one sentence about today' },
];

export function SystemShutdown({ onComplete }: SystemShutdownProps) {
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    setCompletedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allComplete = completedItems.length === shutdownChecklist.length;

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="panel p-8 max-w-lg w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Moon className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">End of Day</h2>
          <p className="text-muted-foreground">Complete the checklist to close out your day.</p>
        </div>

        <div className="space-y-3 mb-8">
          {shutdownChecklist.map((item) => {
            const isComplete = completedItems.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                  isComplete
                    ? 'border-status-active/50 bg-status-active/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-status-active flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={isComplete ? 'text-status-active' : ''}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {allComplete && (
          <div className="animate-fade-in">
            <button
              onClick={onComplete}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2"
            >
              <Power className="w-5 h-5" />
              Done for Today
            </button>
            <p className="text-center text-muted-foreground text-sm mt-4">
              Enjoy your evening, Jevoy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}