import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Play, Mic, Send, Square, MessageSquare, Check, Sparkles, FolderOpen, ListChecks, CheckCircle2, Shuffle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { formatDistanceToNow } from 'date-fns';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from './WorkflowHierarchyExplainer';

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: unknown;
  use_ai_tasks: boolean;
}

interface FutureNote {
  id: string;
  category_id: string;
  work_type: string | null;
  note: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface SmartSuggestion {
  label: string;
  description: string;
  type: 'project' | 'template' | 'session' | 'routine';
  data: {
    projectId?: string;
    stageIndex?: number;
    templateId?: string;
    venture?: string;
    workType?: string;
  };
}

interface Project {
  id: string;
  name: string;
  venture: string;
  current_stage: number;
  stages: unknown;
}

interface HomeScreenProps {
  onStartSession: () => void;
}

const ventureColors: Record<string, string> = {
  'Palmer House': 'bg-venture-palmer',
  'beSettld': 'bg-venture-besettld',
  'YourBoyJevoy': 'bg-venture-jevoy',
  'Strinzees': 'bg-venture-strinzees',
  'Personal': 'bg-venture-personal',
  'Health': 'bg-venture-health',
  'Finance': 'bg-venture-finance',
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getVentureColor = (venture: string): string => {
  return ventureColors[venture] || 'bg-primary';
};

// Generate rule-based suggestions (no AI calls)
const generateSmartSuggestions = (
  projects: Project[],
  templates: Template[],
  hour: number
): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = [];
  
  // Priority 1: Active projects
  projects.forEach(project => {
    const stages = Array.isArray(project.stages) ? project.stages : [];
    const currentStage = stages[project.current_stage] as { name?: string } | undefined;
    suggestions.push({
      label: `Continue: ${project.name}`,
      description: currentStage?.name ? `Resume ${currentStage.name}` : 'Continue where you left off',
      type: 'project',
      data: { projectId: project.id, stageIndex: project.current_stage }
    });
  });
  
  // Priority 2: Time-based routines
  if (hour < 10) {
    suggestions.push({
      label: 'Morning startup',
      description: 'Start your day with intention',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Morning Routine' }
    });
  } else if (hour >= 17) {
    suggestions.push({
      label: 'Evening shutdown',
      description: 'Wrap up and plan tomorrow',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Evening Routine' }
    });
  }
  
  // Priority 3: Recent templates
  templates.slice(0, 3).forEach(template => {
    suggestions.push({
      label: `Quick: ${template.name}`,
      description: `${template.venture} • ${template.work_type}`,
      type: 'template',
      data: { templateId: template.id }
    });
  });
  
  // Priority 4: General suggestions
  suggestions.push({
    label: 'Start a focused session',
    description: 'Begin deep work',
    type: 'session',
    data: {}
  });
  
  suggestions.push({
    label: "What did I do yesterday?",
    description: 'Review your history',
    type: 'session',
    data: {}
  });
  
  return suggestions;
};

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const [recentTemplates, setRecentTemplates] = useState<Template[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [futureNotes, setFutureNotes] = useState<FutureNote[]>([]);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const [greeting] = useState(getGreeting());
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error } = useVoiceRecorder();
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer();

  // Generate suggestions locally (no AI call)
  const allSuggestions = useMemo(() => {
    const hour = new Date().getHours();
    return generateSmartSuggestions(activeProjects, recentTemplates, hour);
  }, [activeProjects, recentTemplates]);

  // Get current visible suggestions based on shuffle index
  const suggestions = useMemo(() => {
    if (allSuggestions.length <= 4) return allSuggestions;
    const startIdx = (shuffleIndex * 4) % allSuggestions.length;
    const result: SmartSuggestion[] = [];
    for (let i = 0; i < 4; i++) {
      result.push(allSuggestions[(startIdx + i) % allSuggestions.length]);
    }
    return result;
  }, [allSuggestions, shuffleIndex]);

  const handleShuffle = () => {
    setShuffleIndex(prev => prev + 1);
  };

  // Load active projects for suggestions
  const loadActiveProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, venture, current_stage, stages')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(3);
    
    if (data) {
      setActiveProjects(data);
    }
  };

  useEffect(() => {
    loadRecentTemplates();
    loadFutureNotes();
    loadActiveProjects();
  }, []);

  const loadRecentTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(3);

    if (data) {
      setRecentTemplates(data);
    }
  };

  const loadFutureNotes = async () => {
    const { data } = await supabase
      .from('future_notes')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) {
      setFutureNotes(data as FutureNote[]);
    }
  };

  const markNoteAsRead = async (noteId: string) => {
    await supabase
      .from('future_notes')
      .update({ is_read: true })
      .eq('id', noteId);

    setFutureNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const dismissNote = async (noteId: string) => {
    await markNoteAsRead(noteId);
  };

  const useTemplate = async (template: Template) => {
    await supabase
      .from('templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id);

    const defaultTasks = Array.isArray(template.default_tasks) 
      ? template.default_tasks 
      : [];
    
    const initialTasks = defaultTasks.map((task: any, idx: number) => ({
      id: `task-${idx}`,
      text: typeof task === 'string' ? task : task.text || '',
      completed: false,
    }));

    navigate('/session', {
      state: {
        venture: template.venture,
        workType: template.work_type,
        focus: template.default_focus || template.name,
        completionCondition: template.default_completion_condition || 'Session complete',
        initialTasks,
      }
    });
  };

  const handleSuggestionClick = async (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'project':
        if (suggestion.data.projectId) {
          // Navigate to session with project context
          const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', suggestion.data.projectId)
            .single();
          
          if (project) {
            const stages = Array.isArray(project.stages) ? project.stages : [];
            const currentStage = stages[suggestion.data.stageIndex || project.current_stage] as any;
            
            navigate('/session', {
              state: {
                venture: project.venture,
                workType: currentStage?.workType || 'Deep Work',
                focus: currentStage?.name || project.name,
                completionCondition: currentStage?.completionCondition || 'Stage complete',
                projectId: project.id,
                stageIndex: suggestion.data.stageIndex ?? project.current_stage,
              }
            });
          }
        }
        break;
      
      case 'template':
        if (suggestion.data.templateId) {
          const template = recentTemplates.find(t => t.id === suggestion.data.templateId);
          if (template) {
            await useTemplate(template);
          } else {
            // Fetch template if not in recent
            const { data: templateData } = await supabase
              .from('templates')
              .select('*')
              .eq('id', suggestion.data.templateId)
              .single();
            if (templateData) {
              await useTemplate(templateData);
            }
          }
        }
        break;
      
      case 'routine':
        navigate('/session', {
          state: {
            venture: suggestion.data.venture || 'daily-maintenance',
            workType: suggestion.data.workType || 'Morning Routine',
            focus: suggestion.label,
            completionCondition: 'Routine complete',
          }
        });
        break;
      
      case 'session':
      default:
        if (suggestion.label.toLowerCase().includes('yesterday') || suggestion.label.toLowerCase().includes('history')) {
          navigate('/history');
        } else {
          onStartSession();
        }
        break;
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setInput(text);
      }
    } else {
      await startRecording();
    }
  };

  const handleSend = () => {
    if (input.toLowerCase().includes('session') || input.toLowerCase().includes('work')) {
      onStartSession();
    } else if (input.toLowerCase().includes('yesterday') || input.toLowerCase().includes('history')) {
      navigate('/history');
    }
    setInput('');
  };

  const firstName = profile?.display_name?.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-24 bg-warm-gradient">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* Workflow Hierarchy Explainer - Modal for first time users */}
        <WorkflowHierarchyExplainer 
          isOpen={showHierarchyExplainer} 
          onDismiss={dismissHierarchyExplainer} 
        />

        {/* Notes from Past You */}
        {futureNotes.length > 0 && (
          <div className="mb-6 space-y-3 animate-fade-in">
            <h2 className="text-sm font-medium text-muted-foreground px-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes from Past You
            </h2>
            {futureNotes.map((note) => {
              const catColor = getCategoryColor(note.category_id);
              const category = getCategoryById(note.category_id);
              
              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-xl bg-card border border-border border-l-4 ${catColor.border} relative group`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full ${catColor.bg} flex items-center justify-center shrink-0`}>
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${catColor.text}`}>
                          {note.sender_role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-foreground">"{note.note}"</p>
                      {note.work_type && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {category?.name} • {note.work_type}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => dismissNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      title="Dismiss"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-muted-foreground">
            What's on your mind?
          </p>
        </div>

        {/* Primary Voice Input - Large Pulsing Mic Button */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={handleMicPress}
            disabled={isProcessing}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {/* Breathing pulse rings - only show when not recording */}
            {!isRecording && !isProcessing && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
                <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
                <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
              </>
            )}
            
            {/* Recording animation rings */}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
              </>
            )}
            
            {/* Core button */}
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isRecording 
                ? 'bg-destructive' 
                : 'bg-primary hover:brightness-110'
            }`}>
              {isRecording ? (
                <Square className="w-6 h-6 text-destructive-foreground" />
              ) : (
                <Mic className="w-7 h-7 text-primary-foreground" />
              )}
            </div>
          </button>
          
          {/* Status text below mic */}
          <p className="mt-4 text-sm text-muted-foreground">
          {isRecording && (
              <span className="flex items-center gap-2 text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {partialText ? 'Listening... tap to finish' : 'Listening... speak now'}
              </span>
            )}
            {isProcessing && 'Finalizing...'}
            {!isRecording && !isProcessing && 'Tap to talk'}
          </p>
          
          {/* Error message */}
          {error && (
            <p className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Secondary Text Input */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type here..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            {input.trim() && (
              <button
                onClick={handleSend}
                className="p-3 rounded-xl bg-primary text-primary-foreground hover:brightness-105 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

        {/* Smart Suggestions */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Smart Suggestions</span>
              </div>
              {allSuggestions.length > 4 && (
                <button
                  onClick={handleShuffle}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Shuffle suggestions"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => {
                const getIcon = () => {
                  switch (suggestion.type) {
                    case 'project': return <FolderOpen className="w-3.5 h-3.5" />;
                    case 'template': return <ListChecks className="w-3.5 h-3.5" />;
                    case 'routine': return <CheckCircle2 className="w-3.5 h-3.5" />;
                    default: return <Sparkles className="w-3.5 h-3.5" />;
                  }
                };
                
                const getBg = () => {
                  switch (suggestion.type) {
                    case 'project': return 'bg-primary/10 hover:bg-primary/20 border-primary/20';
                    case 'template': return 'bg-secondary/50 hover:bg-secondary border-border/50';
                    case 'routine': return 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20';
                    default: return 'bg-secondary/50 hover:bg-secondary border-border/50';
                  }
                };
                
                return (
                  <button
                    key={`${suggestion.label}-${idx}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`group px-3 py-2 rounded-lg text-sm text-foreground transition-all flex items-center gap-1.5 border ${getBg()}`}
                    title={suggestion.description}
                  >
                    <span className="text-primary">{getIcon()}</span>
                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Session CTA */}
        <button
          onClick={onStartSession}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 group mb-6"
        >
          Start a Work Session
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Quick Start Templates */}
        {recentTemplates.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              Quick Start
            </h2>
            <div className="space-y-2">
              {recentTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => useTemplate(template)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl ${getVentureColor(template.venture)} flex items-center justify-center`}>
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {template.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {template.venture} • {template.work_type}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}