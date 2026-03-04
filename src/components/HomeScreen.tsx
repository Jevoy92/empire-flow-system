import { useState } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
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
import { ProjectStageData, SmartSuggestion, Template } from './home/types';
import { useHomeData } from '@/hooks/useHomeData';

interface HomeScreenProps {
  onStartSession: () => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const [greeting] = useState(getGreeting());
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error, isModelLoading, engine } = useVoiceRecorder();
  const demo = useDemo();

  const {
    recentTemplates,
    activeProjects,
    futureNotes,
    suggestions,
    allSuggestions,
    isNewUserEmpty,
    isDemo,
    handleShuffle,
    markNoteAsRead,
  } = useHomeData();

  const demoSuffix = isDemo ? '?demo=1' : '';
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer(isDemo ? 'demo' : user?.id);

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
      state: { draft, source: 'template', templateId: template.id },
    });
  };

  const handleSuggestionClick = async (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'project':
        if (suggestion.data.projectId) {
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
      if (text) setInput(text);
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
    navigate('/workflow-review' + demoSuffix, { state: { draft, source: 'input' } });
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
    <motion.div className="min-h-screen page-shell bg-warm-gradient px-4 py-6 md:px-6" {...reveal()}>
      <motion.div className="mx-auto w-full max-w-7xl" {...reveal(0.04)}>
        <WorkflowHierarchyExplainer isOpen={showHierarchyExplainer} onDismiss={dismissHierarchyExplainer} />

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
                We'll generate a workflow from your voice or typed prompt, then you can approve it before starting the timer.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button onClick={onStartSession} className="btn-primary py-3 px-5 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start your first session
                </button>
                <button onClick={() => navigate('/workflows' + demoSuffix)} className="btn-secondary py-3 px-5">
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
                <button onClick={onStartSession} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Session
                </button>
                <button onClick={() => navigate('/workflows' + demoSuffix)} className="btn-secondary w-full py-2.5">
                  Open workflow library
                </button>
              </div>
            </div>
          )}

          {!isNewUserEmpty && (
            <>
              <HomeMobileAIWorkspacePanel
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
                greeting={greeting}
                firstName={firstName}
              />

              <HomeMobileIntelligenceFeed notes={futureNotes} onDismissNote={dismissNote} />
            </>
          )}

          <DailyDigest />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
