import { useEffect, useState, useMemo } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { getCategoryColor } from '@/data/ventures';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from './WorkflowHierarchyExplainer';
import { useDemo } from '@/contexts/DemoContext';
import { DailyDigest } from './DailyDigest';
import { buildWorkflowDraftFromInput, buildWorkflowDraftFromTemplate } from '@/lib/workflow-planner';
import { motion, useReducedMotion } from 'framer-motion';
import { HomeAIWorkspacePanel } from './home/HomeAIWorkspacePanel';
import { HomeIntelligenceFeed } from './home/HomeIntelligenceFeed';
import { HomeMobileAIWorkspacePanel } from './home/HomeMobileAIWorkspacePanel';
import { HomeMobileIntelligenceFeed } from './home/HomeMobileIntelligenceFeed';
import { HomeProjectSidebar } from './home/HomeProjectSidebar';
import { FutureNote, Project, ProjectStageData, SmartSuggestion, Template } from './home/types';

interface HomeScreenProps {
  onStartSession: () => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error, isModelLoading, engine } = useVoiceRecorder();
  const demo = useDemo();
  
  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer(isDemo ? 'demo' : user?.id);

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
    if (isModelLoading) return;
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
  const isNewUserEmpty = activeProjects.length === 0 && recentTemplates.length === 0 && futureNotes.length === 0;
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
    <motion.div className="min-h-screen page-shell bg-warm-gradient px-4 py-6 md:px-6" {...reveal()}>
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

          {isNewUserEmpty ? (
            <motion.div className="card-elevated border border-border/70 p-10 text-center" {...reveal(0.16)}>
              <p className="text-2xl font-semibold text-foreground">Ready to start your first focused session?</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                We’ll generate a workflow from your voice or typed prompt, then you can approve it before starting the timer.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={onStartSession}
                  className="btn-primary py-3 px-5 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start your first session
                </button>
                <button
                  onClick={() => navigate('/workflows' + demoSuffix)}
                  className="btn-secondary py-3 px-5"
                >
                  Open workflow library
                </button>
              </div>
            </motion.div>
          ) : (
          <motion.div className="card-elevated border border-border/70 p-4" {...reveal(0.16)}>
            <div className="grid grid-cols-12 gap-4">
              <HomeIntelligenceFeed notes={futureNotes} onDismissNote={dismissNote} />

              <HomeAIWorkspacePanel
                input={input}
                onInputChange={setInput}
                onSend={handleSend}
                onStartSession={onStartSession}
                isRecording={isRecording}
                isProcessing={isProcessing}
                isModelLoading={isModelLoading}
                engine={engine}
                partialText={partialText}
                error={error}
                onMicPress={handleMicPress}
                suggestions={suggestions}
                allSuggestionCount={allSuggestions.length}
                onSuggestionClick={handleSuggestionClick}
                onShuffle={handleShuffle}
              />

              <HomeProjectSidebar
                activeProjects={activeProjects}
                recentTemplates={recentTemplates}
                futureNotesCount={futureNotes.length}
                onSuggestionClick={handleSuggestionClick}
                onStartFromTemplate={startFromTemplate}
              />
            </div>
          </motion.div>
          )}
        </motion.div>

        <motion.div className="xl:hidden w-full max-w-md mx-auto" {...reveal(0.08)}>
          {isNewUserEmpty && (
            <div className="mb-6 card-elevated border border-border/70 p-5 text-center">
              <p className="text-lg font-semibold text-foreground">Start your first session</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tell AI what you want to accomplish and approve the generated workflow.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={onStartSession}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Session
                </button>
                <button
                  onClick={() => navigate('/workflows' + demoSuffix)}
                  className="btn-secondary w-full py-2.5"
                >
                  Browse Workflows
                </button>
              </div>
            </div>
          )}

          <HomeMobileIntelligenceFeed notes={futureNotes} onDismissNote={dismissNote} />

          <DailyDigest />

          <HomeMobileAIWorkspacePanel
            greeting={greeting}
            firstName={firstName}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onStartSession={onStartSession}
            isRecording={isRecording}
            isProcessing={isProcessing}
            isModelLoading={isModelLoading}
            engine={engine}
            partialText={partialText}
            error={error}
            onMicPress={handleMicPress}
            suggestions={suggestions}
            allSuggestionCount={allSuggestions.length}
            onSuggestionClick={handleSuggestionClick}
            onShuffle={handleShuffle}
          />

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
