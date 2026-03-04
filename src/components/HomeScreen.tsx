import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Play, Mic, Send, Square, MessageSquare, Check, Sparkles, FolderOpen, ListChecks, CheckCircle2, Shuffle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { formatDistanceToNow } from 'date-fns';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from './WorkflowHierarchyExplainer';
import { useDemo } from '@/contexts/DemoContext';
import { DailyDigest } from './DailyDigest';
import { buildWorkflowDraftFromInput, buildWorkflowDraftFromTemplate } from '@/lib/workflow-planner';
import { motion, useReducedMotion } from 'framer-motion';

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

interface ProjectStageData {
  name?: string;
  work_type?: string;
  workType?: string;
  completion_condition?: string;
  completionCondition?: string;
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
  const location = useLocation();
  const { profile, user } = useAuth();
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error } = useVoiceRecorder();
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer();
  const demo = useDemo();
  
  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';

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

  // Clear state when user changes to prevent data leakage
  useEffect(() => {
    if (!isDemo) {
      // Clear previous user's data immediately when user changes
      setRecentTemplates([]);
      setActiveProjects([]);
      setFutureNotes([]);
    }
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (isDemo && demo) {
      // Use demo data
      setRecentTemplates(demo.templates as Template[]);
      setActiveProjects(demo.projects.map(p => ({
        id: p.id,
        name: p.name,
        venture: p.venture,
        current_stage: p.current_stage,
        stages: p.stages,
      })));
      setFutureNotes(demo.futureNotes as FutureNote[]);
    } else if (user?.id) {
      // Only fetch data if we have a valid user
      loadRecentTemplates();
      loadFutureNotes();
      loadActiveProjects();
    }
  }, [isDemo, demo, user?.id]);

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
    if (isDemo && demo) {
      demo.markNoteAsRead(noteId);
      setFutureNotes(prev => prev.filter(n => n.id !== noteId));
      return;
    }
    
    await supabase
      .from('future_notes')
      .update({ is_read: true })
      .eq('id', noteId);

    setFutureNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const dismissNote = async (noteId: string) => {
    await markNoteAsRead(noteId);
  };

  const startFromTemplate = async (template: Template) => {
    if (!isDemo) {
      await supabase
        .from('templates')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', template.id);
    }

    const draft = buildWorkflowDraftFromTemplate(template);
    navigate('/workflow-review' + demoSuffix, {
      state: {
        draft,
        source: 'template',
        templateId: template.id,
      },
    });
  };

  const handleSuggestionClick = async (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'project':
        if (suggestion.data.projectId) {
          // For demo mode, use demo data directly
          if (isDemo && demo) {
            const project = demo.projects.find(p => p.id === suggestion.data.projectId);
            if (project) {
              const currentStage = project.stages[suggestion.data.stageIndex || project.current_stage];
              navigate('/session' + demoSuffix, {
                state: {
                  venture: project.venture,
                  workType: currentStage?.work_type || 'Deep Work',
                  focus: currentStage?.name || project.name,
                  completionCondition: currentStage?.completion_condition || 'Stage complete',
                  projectId: project.id,
                  stageIndex: suggestion.data.stageIndex ?? project.current_stage,
                }
              });
            }
            return;
          }
          
          // Navigate to session with project context
          const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', suggestion.data.projectId)
            .single();
          
          if (project) {
            const stages = Array.isArray(project.stages) ? project.stages : [];
            const currentStage = stages[suggestion.data.stageIndex || project.current_stage] as ProjectStageData | undefined;
            
            navigate('/session', {
              state: {
                venture: project.venture,
                workType: currentStage?.work_type || currentStage?.workType || 'Deep Work',
                focus: currentStage?.name || project.name,
                completionCondition: currentStage?.completion_condition || currentStage?.completionCondition || 'Stage complete',
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
            await startFromTemplate(template);
          } else if (!isDemo) {
            // Fetch template if not in recent
            const { data: templateData } = await supabase
              .from('templates')
              .select('*')
              .eq('id', suggestion.data.templateId)
              .single();
            if (templateData) {
              await startFromTemplate(templateData);
            }
          }
        }
        break;
      
      case 'routine':
        navigate('/workflow-review' + demoSuffix, {
          state: {
            draft: buildWorkflowDraftFromInput(suggestion.label, {
              venture: suggestion.data.venture || 'daily-maintenance',
              workType: suggestion.data.workType || 'Morning Routine',
            }),
            source: 'input',
          },
        });
        break;
      
      case 'session':
      default:
        if (suggestion.label.toLowerCase().includes('yesterday') || suggestion.label.toLowerCase().includes('history')) {
          navigate('/history' + demoSuffix);
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
    const text = input.trim();
    if (!text) return;

    const lower = text.toLowerCase();

    if (lower.includes('yesterday') || lower.includes('history')) {
      navigate('/history' + demoSuffix);
      setInput('');
      return;
    }

    if (lower === 'start session' || lower === 'new session') {
      onStartSession();
      setInput('');
      return;
    }

    const draft = buildWorkflowDraftFromInput(text, {
      venture: 'daily-maintenance',
      workType: 'AI Planned Sprint',
    });

    navigate('/workflow-review' + demoSuffix, {
      state: {
        draft,
        source: 'input',
      },
    });

    setInput('');
  };

  const displayName = isDemo && demo ? demo.profile.display_name : profile?.display_name;
  const firstName = displayName?.split(' ')[0];
  const prefersReducedMotion = useReducedMotion();
  const reveal = (delay = 0) =>
    prefersReducedMotion
      ? { initial: false, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <motion.div className="min-h-screen bg-warm-gradient px-4 py-6 pb-24 md:px-6 md:pb-10" {...reveal()}>
      <motion.div className="mx-auto w-full max-w-7xl" {...reveal(0.04)}>

        {/* Workflow Hierarchy Explainer - Modal for first time users */}
        <WorkflowHierarchyExplainer
          isOpen={showHierarchyExplainer}
          onDismiss={dismissHierarchyExplainer}
        />

        <motion.div className="hidden xl:block space-y-5" {...reveal(0.08)}>
          <motion.div className="card-elevated border border-border/70 p-5" {...reveal(0.12)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                  {greeting}{firstName ? `, ${firstName}` : ''}.
                </h1>
                <p className="text-muted-foreground mt-1">Build momentum from one command deck.</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{activeProjects.length} active projects</span>
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{recentTemplates.length} quick starts</span>
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{futureNotes.length} notes</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="card-elevated border border-border/70 p-4" {...reveal(0.16)}>
            <div className="grid grid-cols-12 gap-4">
              <aside className="col-span-3 rounded-2xl border border-border/70 bg-card/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  Intelligence Feed
                </div>
                {futureNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No unread notes from past sessions.</p>
                ) : (
                  futureNotes.map((note) => {
                    const catColor = getCategoryColor(note.category_id);
                    const category = getCategoryById(note.category_id);
                    return (
                      <div key={note.id} className={`rounded-xl border border-border ${catColor.light} p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium ${catColor.text}`}>{note.sender_role}</p>
                          <button
                            onClick={() => dismissNote(note.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Dismiss"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground mt-1 line-clamp-3">"{note.note}"</p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {category?.name || note.category_id}
                          {note.work_type ? ` • ${note.work_type}` : ''} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    );
                  })
                )}
              </aside>

              <section className="col-span-6 rounded-2xl border border-border/70 bg-card p-6">
                <div className="text-center mb-8">
                  <p className="text-sm text-muted-foreground">AI Workspace</p>
                  <h2 className="text-4xl font-semibold text-foreground tracking-tight mt-1">What&apos;s on your mind?</h2>
                </div>

                <div className="flex flex-col items-center mb-8">
                  <button
                    onClick={handleMicPress}
                    disabled={isProcessing}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {!isRecording && !isProcessing && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
                        <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
                        <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
                      </>
                    )}

                    {isRecording && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
                      </>
                    )}

                    <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                      isRecording ? 'bg-destructive' : 'bg-primary hover:brightness-110'
                    }`}>
                      {isRecording ? (
                        <Square className="w-6 h-6 text-destructive-foreground" />
                      ) : (
                        <Mic className="w-7 h-7 text-primary-foreground" />
                      )}
                    </div>
                  </button>

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

                  {error && (
                    <p className="mt-2 text-sm text-destructive">{error}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Tell AI what to plan..."
                      className="flex-1 px-4 py-3 rounded-xl bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
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
                </div>

                {suggestions.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Suggested starts
                      </h3>
                      {allSuggestions.length > 4 && (
                        <button
                          onClick={handleShuffle}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Shuffle suggestions"
                        >
                          <Shuffle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={`desktop-suggestion-${idx}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {suggestion.type === 'project' && <FolderOpen className="w-3.5 h-3.5 text-primary" />}
                            {suggestion.type === 'template' && <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />}
                            {suggestion.type === 'routine' && <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
                            {suggestion.type === 'session' && <Play className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="text-sm font-medium text-foreground truncate">{suggestion.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={onStartSession}
                  className="w-full btn-primary py-4 text-lg font-medium flex items-center justify-center gap-3 group"
                >
                  <Play className="w-5 h-5" />
                  Start a Work Session
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </section>

              <aside className="col-span-3 rounded-2xl border border-border/70 bg-card/40 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Continue Projects</h3>
                  <div className="space-y-2 mt-2">
                    {activeProjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No active projects yet.</p>
                    ) : (
                      activeProjects.map((project) => {
                        const stages = Array.isArray(project.stages) ? project.stages as { name?: string }[] : [];
                        const stageName = stages[project.current_stage]?.name || 'Current Stage';
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleSuggestionClick({
                              label: `Continue: ${project.name}`,
                              description: `Resume ${stageName}`,
                              type: 'project',
                              data: { projectId: project.id, stageIndex: project.current_stage },
                            })}
                            className="w-full rounded-xl border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{stageName}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground">Quick Start Templates</h3>
                  <div className="space-y-2 mt-2">
                    {recentTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No templates yet.</p>
                    ) : (
                      recentTemplates.slice(0, 4).map((template) => {
                        const catColor = getCategoryColor(template.venture);
                        return (
                          <button
                            key={template.id}
                            onClick={() => startFromTemplate(template)}
                            className={`w-full rounded-xl border border-border border-l-4 ${catColor.border} bg-card p-3 text-left hover:bg-secondary/50 transition-colors`}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{template.work_type}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Today Snapshot</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                    <div className="rounded-md bg-card border border-border/70 py-2">
                      <p className="text-sm font-semibold text-foreground">{activeProjects.length}</p>
                      <p className="text-[10px] text-muted-foreground">Projects</p>
                    </div>
                    <div className="rounded-md bg-card border border-border/70 py-2">
                      <p className="text-sm font-semibold text-foreground">{recentTemplates.length}</p>
                      <p className="text-[10px] text-muted-foreground">Templates</p>
                    </div>
                    <div className="rounded-md bg-card border border-border/70 py-2">
                      <p className="text-sm font-semibold text-foreground">{futureNotes.length}</p>
                      <p className="text-[10px] text-muted-foreground">Notes</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>

        <motion.div className="xl:hidden w-full max-w-md mx-auto" {...reveal(0.08)}>
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

          <DailyDigest />

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
              {!isRecording && !isProcessing && (
                <>
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
                  <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
                  <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
                </>
              )}

              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
                </>
              )}

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

            {error && (
              <p className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Secondary Text Input */}
          <div className="card-elevated p-4 mb-4 border border-border/60">
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
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Suggestions
                </h2>
                {allSuggestions.length > 4 && (
                  <button
                    onClick={handleShuffle}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Shuffle suggestions"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`mobile-suggestion-${idx}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {suggestion.type === 'project' && <FolderOpen className="w-3.5 h-3.5 text-primary" />}
                      {suggestion.type === 'template' && <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />}
                      {suggestion.type === 'routine' && <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
                      {suggestion.type === 'session' && <Play className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-medium text-foreground truncate">
                        {suggestion.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {suggestion.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main CTA - Start Session */}
          <button
            onClick={onStartSession}
            className="w-full btn-primary py-4 text-lg font-medium flex items-center justify-center gap-3 group"
          >
            <Play className="w-5 h-5" />
            Start a Work Session
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Quick Start Templates */}
          {recentTemplates.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                Quick Start
              </h2>
              <div className="space-y-2">
                {recentTemplates.slice(0, 3).map((template) => {
                  const catColor = getCategoryColor(template.venture);

                  return (
                    <button
                      key={template.id}
                      onClick={() => startFromTemplate(template)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border border-l-4 ${catColor.border} hover:bg-secondary/50 transition-all group`}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium text-foreground truncate">
                          {template.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.work_type}
                        </div>
                      </div>
                      <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
