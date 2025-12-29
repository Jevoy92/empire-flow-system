import { useState, useEffect } from 'react';
import { Check, X, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryById } from '@/data/ventures';

interface SystemShutdownProps {
  onComplete: () => void;
  onPlanNext?: () => void;
  onSaveAsTemplate?: (name: string) => void;
  sessionStats?: {
    durationMinutes: number;
    tasksCompleted: number;
    totalTasks: number;
  };
  sessionContext?: {
    categoryId: string;
    workType: string;
    sessionId?: string;
  };
}

const shutdownChecklist = [
  { id: 1, label: 'Files saved and named clearly' },
  { id: 2, label: 'Workspace cleaned up' },
  { id: 3, label: 'Status logged or updated' },
];

const encouragingMessages = [
  "You're building momentum.",
  "Consistency wins.",
  "Another session in the books.",
  "Progress over perfection.",
  "Small steps, big results.",
  "You showed up. That matters.",
];

// Generate sender role based on category and work type
const generateSenderRole = (categoryId: string, workType: string): string => {
  const category = getCategoryById(categoryId);
  const categoryName = category?.name || categoryId;
  
  // Map work types to role names
  const roleMap: Record<string, string> = {
    'Social Media': 'Marketing',
    'Content Creation': 'Creator',
    'Content Editing': 'Editor',
    'Strategic Planning': 'Strategist',
    'Client Communication': 'Account Manager',
    'Admin & Files': 'Admin',
    'Learning & Research': 'Student',
    'Daily Review': 'Planner',
    'Personal Admin': 'Life Admin',
  };

  const roleName = roleMap[workType] || workType.split(' ')[0];
  
  // For business ventures, use the venture name
  if (category?.type === 'business') {
    return `${categoryName} ${roleName}`;
  }
  
  return `${roleName} You`;
};

export function SystemShutdown({ onComplete, onPlanNext, onSaveAsTemplate, sessionStats, sessionContext }: SystemShutdownProps) {
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [nextNote, setNextNote] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saved, setSaved] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [encouragingMessage] = useState(() => 
    encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]
  );

  const toggleItem = (id: number) => {
    setCompletedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allComplete = completedItems.length === shutdownChecklist.length;

  // Trigger celebration when all items complete
  useEffect(() => {
    if (allComplete && !showCelebration) {
      setShowCelebration(true);
    }
  }, [allComplete, showCelebration]);

  const handleSaveTemplate = () => {
    if (templateName.trim() && onSaveAsTemplate) {
      onSaveAsTemplate(templateName.trim());
      setSaved(true);
      setShowSaveTemplate(false);
    }
  };

  // Save the "next time" note to future_notes table
  const saveNoteForFuture = async () => {
    if (!nextNote.trim() || !sessionContext) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const senderRole = generateSenderRole(sessionContext.categoryId, sessionContext.workType);

      await supabase
        .from('future_notes')
        .insert({
          user_id: user.id,
          category_id: sessionContext.categoryId,
          work_type: sessionContext.workType,
          note: nextNote.trim(),
          sender_role: senderRole,
          session_id: sessionContext.sessionId || null,
        });

      setNoteSaved(true);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  // Save note when checklist is complete and note exists
  useEffect(() => {
    if (allComplete && nextNote.trim() && !noteSaved && sessionContext) {
      saveNoteForFuture();
    }
  }, [allComplete, nextNote, noteSaved, sessionContext]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'hsl(var(--session-warm))' }}>
      <div className="w-full max-w-lg animate-fade-in">
        <div className="card-elevated p-8 relative overflow-hidden">
          {/* Confetti effect when complete */}
          {showCelebration && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-[confetti-fall_2s_ease-out_forwards]"
                  style={{
                    left: `${10 + (i * 7)}%`,
                    top: '-10px',
                    backgroundColor: i % 3 === 0 
                      ? 'hsl(248, 85%, 65%)' 
                      : i % 3 === 1 
                        ? 'hsl(145, 65%, 45%)' 
                        : 'hsl(35, 85%, 50%)',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

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
                    className={`checklist-item ${isComplete ? 'completed' : ''} ${isComplete ? 'animate-[celebrate-pop_0.3s_ease-out]' : ''}`}
                  >
                    <div className={`check-circle ${isComplete ? 'checked' : ''} transition-transform ${isComplete ? 'scale-110' : ''}`}>
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
            <div className="mb-6 p-3 rounded-lg bg-[hsl(145,65%,45%)]/10 text-[hsl(145,65%,45%)] text-sm text-center">
              Template saved!
            </div>
          )}

          {/* Complete Section */}
          {allComplete && (
            <div className="pt-6 border-t border-border animate-[celebration-burst_0.5s_ease-out] text-center">
              {/* Celebration Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[hsl(145,65%,45%)] flex items-center justify-center animate-[celebrate-pop_0.5s_ease-out]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Session Complete
              </h3>
              <p className="text-muted-foreground mb-4">
                {encouragingMessage}
              </p>

              {/* Session Stats */}
              {sessionStats && (
                <div className="flex justify-center gap-6 mb-6 py-3 px-4 rounded-lg bg-secondary/50">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {formatDuration(sessionStats.durationMinutes)}
                    </div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {sessionStats.tasksCompleted}/{sessionStats.totalTasks}
                    </div>
                    <div className="text-xs text-muted-foreground">Tasks Done</div>
                  </div>
                </div>
              )}
              
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