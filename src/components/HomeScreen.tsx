import { useState } from 'react';
import { Play, ArrowRight, Mic, Send, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from './WorkflowHierarchyExplainer';
import { useDemo } from '@/contexts/DemoContext';
import { buildWorkflowDraftFromInput, buildWorkflowDraftFromTemplate } from '@/lib/workflow-planner';
import { motion, useReducedMotion } from 'framer-motion';
import { HomeSuggestionCards } from './home/HomeSuggestionCards';
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
  const { profile, user } = useAuth();
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error, isModelLoading, engine } = useVoiceRecorder();
  const demo = useDemo();

  const {
    recentTemplates,
    activeProjects,
    suggestions,
    allSuggestions,
    isDemo,
    handleShuffle,
  } = useHomeData();

  const demoSuffix = isDemo ? '?demo=1' : '';
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer(isDemo ? 'demo' : user?.id);

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
    <motion.div className="min-h-[calc(100dvh-4rem)] page-shell flex flex-col items-center justify-center px-4 py-12 md:py-16" {...reveal()}>
      <WorkflowHierarchyExplainer isOpen={showHierarchyExplainer} onDismiss={dismissHierarchyExplainer} />

      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        {/* Greeting */}
        <motion.div className="text-center mb-10" {...reveal(0.06)}>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">What's on your mind?</p>
        </motion.div>

        {/* Mic button */}
        <motion.div className="flex flex-col items-center mb-10" {...reveal(0.12)}>
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isModelLoading}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${(isProcessing || isModelLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {!isRecording && !isProcessing && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
                <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
              </>
            )}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
              </>
            )}
            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${isRecording ? 'bg-destructive' : 'bg-primary hover:brightness-110'}`}>
              {isRecording ? (
                <Square className="w-5 h-5 text-destructive-foreground" />
              ) : (
                <Mic className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
          </button>

          <p className="mt-3 text-sm text-muted-foreground">
            {isModelLoading && `Loading ${engine === 'server' ? 'transcription engine' : 'voice engine'}...`}
            {isRecording && (
              <span className="flex items-center gap-2 text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {partialText ? 'Listening… tap to finish' : 'Listening… speak now'}
              </span>
            )}
            {isProcessing && 'Finalizing...'}
            {!isRecording && !isProcessing && !isModelLoading && 'Tap to talk'}
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </motion.div>

        {/* Text input */}
        <motion.div className="w-full mb-8" {...reveal(0.18)}>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell AI what to plan…"
              className="flex-1 px-4 py-3 rounded-xl bg-transparent text-base focus:outline-none placeholder:text-muted-foreground"
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
        </motion.div>

        {/* Suggestion cards */}
        <motion.div className="w-full mb-8" {...reveal(0.24)}>
          <HomeSuggestionCards
            suggestions={suggestions}
            allSuggestionCount={allSuggestions.length}
            title="Suggested starts"
            onSuggestionClick={handleSuggestionClick}
            onShuffle={handleShuffle}
          />
        </motion.div>

        {/* Start session CTA */}
        <motion.div className="w-full" {...reveal(0.3)}>
          <button
            onClick={onStartSession}
            className="w-full btn-primary py-4 text-lg font-medium flex items-center justify-center gap-3 group"
          >
            <Play className="w-5 h-5" />
            Start a Work Session
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
