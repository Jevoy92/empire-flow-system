import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, ChevronDown, ChevronRight, Sparkles, Play, ArrowLeft } from 'lucide-react';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { Json } from '@/integrations/supabase/types';
import { countDraftTasks, normalizeDraftForProject, WorkflowDraft } from '@/lib/workflow-planner';
import { toast } from 'sonner';

interface ReviewState {
  draft?: WorkflowDraft;
  source?: 'input' | 'template';
  templateId?: string;
}

export default function WorkflowReview() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';
  const state = (location.state as ReviewState | null) || null;

  const [draft, setDraft] = useState<WorkflowDraft | null>(state?.draft || null);
  const [isStarting, setIsStarting] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (!state?.draft) {
      navigate('/workflows' + demoSuffix, { replace: true });
    }
  }, [state, navigate, demoSuffix]);

  const totalStages = draft?.stages.length || 0;
  const totalTasks = draft ? countDraftTasks(draft) : 0;
  const ventureLabel = draft ? getCategoryById(draft.venture)?.name || draft.venture : 'Workflow';
  const ventureColor = draft ? getCategoryColor(draft.venture) : getCategoryColor('daily-maintenance');

  const firstStage = useMemo(() => {
    if (!draft) return null;
    return draft.stages.find((stage) => stage.tasks.length > 0) || draft.stages[0] || null;
  }, [draft]);

  const toggleStage = (index: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const startApprovedWorkflow = async () => {
    if (!draft) return;

    const workflowName = draft.name.trim();
    if (!workflowName) {
      toast.error('Please add a workflow name before starting.');
      return;
    }

    const normalizedDraft = normalizeDraftForProject({
      ...draft,
      name: workflowName,
      focus: draft.focus || workflowName,
    });

    const stageToStart = normalizedDraft.stages.find((stage) => stage.tasks.length > 0) || normalizedDraft.stages[0];
    if (!stageToStart) {
      toast.error('No stages are available to start.');
      return;
    }

    setIsStarting(true);

    try {
      let projectId: string | undefined;

      if (!isDemo) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId) {
          toast.error('You must be signed in to start this workflow.');
          return;
        }

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: normalizedDraft.name,
            description: normalizedDraft.focus,
            venture: normalizedDraft.venture,
            current_stage: 0,
            status: 'active',
            stages: JSON.parse(JSON.stringify(normalizedDraft.stages)) as Json,
          })
          .select('id')
          .single();

        if (projectError || !project?.id) {
          console.error('Error creating approved workflow project:', projectError);
          toast.error('Could not create workflow project. Please try again.');
          return;
        }

        projectId = project.id;

        if (state?.templateId) {
          await supabase
            .from('templates')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', state.templateId);
        }
      }

      navigate('/session' + demoSuffix, {
        state: {
          venture: stageToStart.venture || normalizedDraft.venture,
          workType: stageToStart.work_type || normalizedDraft.workType,
          focus: stageToStart.focus || `${normalizedDraft.name} - ${stageToStart.name}`,
          completionCondition: stageToStart.completion_condition || normalizedDraft.completionCondition || 'Stage complete',
          initialTasks: stageToStart.tasks,
          projectId,
          stageIndex: 0,
        },
      });
    } finally {
      setIsStarting(false);
    }
  };

  if (!draft) return null;

  return (
    <div className="min-h-screen page-shell p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-4">
        <button
          onClick={() => navigate(state?.source === 'template' ? '/workflows' + demoSuffix : '/' + demoSuffix)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 space-y-4">
            <div className="card-elevated p-4 border-l-4 border-primary">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Those are great tasks.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review this multi-workflow plan, then approve workflows and start your session.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {draft.stages.map((stage, stageIdx) => {
                const isExpanded = expandedStages.has(stageIdx);
                const stageColor = getCategoryColor(stage.venture || draft.venture);

                return (
                  <div key={`${stage.name}-${stageIdx}`} className="card-elevated overflow-hidden">
                    <button
                      onClick={() => toggleStage(stageIdx)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-full ${stageColor.bg} text-white text-xs font-semibold flex items-center justify-center`}>
                          {stageIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.work_type} • {stage.tasks.length} tasks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stageIdx === 0 && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">First session</span>
                        )}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        {stage.tasks.map((task) => (
                          <div key={task.id} className="rounded-lg border border-border px-3 py-2 bg-card">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground">{task.text}</p>
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {task.subtasks.map((subtask) => (
                                      <li key={subtask.id} className="text-xs text-muted-foreground">
                                        • {subtask.text}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="xl:sticky xl:top-6 space-y-4">
              <div className="card-elevated p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow Name</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    className="input-field mt-2"
                  />
                </div>

                <div className={`rounded-lg px-3 py-2 ${ventureColor.light}`}>
                  <p className={`text-sm font-medium ${ventureColor.text}`}>{ventureLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalStages} stages • {totalTasks} tasks • Starts with {firstStage?.name || 'Stage 1'}
                  </p>
                </div>
              </div>

              <button onClick={startApprovedWorkflow} disabled={isStarting} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                {isStarting ? 'Starting...' : 'Approve Workflows and Start Session'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
