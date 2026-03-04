import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Plus, FolderOpen, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProjectCreateModal } from '@/components/ProjectCreateModal';
import { ProjectCard } from '@/components/ProjectCard';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from '@/components/WorkflowHierarchyExplainer';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { buildWorkflowDraftFromTemplate, countDraftTasks } from '@/lib/workflow-planner';
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
  created_at: string;
  last_used_at: string | null;
  user_id: string | null;
}

interface StageTask {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: { id: string; text: string; completed: boolean }[];
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

export interface ProjectStage {
  name: string;
  work_type: string;
  venture: string;
  tasks: StageTask[];
  completed: boolean;
  focus?: string;
  completion_condition?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  venture: string;
  status: string;
  current_stage: number;
  stages: ProjectStage[];
  project_template_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ProjectTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  default_venture: string;
  stages: ProjectStage[];
  created_at: string;
  updated_at: string;
}

export default function Workflows() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const demo = useDemo();

  const isDemo = location.search.includes('demo=1');
  const demoSuffix = isDemo ? '?demo=1' : '';
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer(isDemo ? 'demo' : user?.id);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      setTemplates(data);
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['active', 'paused'])
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setProjects(
        data.map((project) => ({
          ...project,
          stages: Array.isArray(project.stages) ? (project.stages as unknown as ProjectStage[]) : [],
        }))
      );
    }
  };

  const loadProjectTemplates = async () => {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('name');

    if (!error && data) {
      setProjectTemplates(
        data.map((template) => ({
          ...template,
          stages: Array.isArray(template.stages) ? (template.stages as unknown as ProjectStage[]) : [],
        }))
      );
    }
  };

  useEffect(() => {
    if (isDemo && demo) {
      setTemplates(demo.templates as Template[]);
      setProjects(demo.projects as Project[]);
      setProjectTemplates([]);
      setLoading(false);
      return;
    }

    if (!user?.id) return;

    let mounted = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadTemplates(), loadProjects(), loadProjectTemplates()]);
      if (mounted) setLoading(false);
    };

    init();

    const channel = supabase
      .channel('workflows-v2-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => loadTemplates())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isDemo, demo]);

  const handleContinueProject = (project: Project) => {
    const currentStage = project.stages[project.current_stage];
    if (!currentStage) return;

    navigate('/session' + demoSuffix, {
      state: {
        venture: currentStage.venture || project.venture,
        workType: currentStage.work_type,
        focus: currentStage.focus || `${project.name} - ${currentStage.name}`,
        completionCondition: currentStage.completion_condition || 'Stage complete',
        initialTasks: currentStage.tasks?.filter((task) => !task.completed) || [],
        projectId: project.id,
        stageIndex: project.current_stage,
      },
    });
  };

  const templateSystems = useMemo(
    () =>
      templates.map((template) => ({
        template,
        draft: buildWorkflowDraftFromTemplate(template),
      })),
    [templates]
  );

  const groupedTemplateSystems = useMemo(() => {
    const grouped: Record<string, typeof templateSystems> = {};

    templateSystems.forEach((system) => {
      const key = system.template.venture || 'general';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(system);
    });

    return Object.entries(grouped).sort(([a], [b]) => {
      const labelA = getCategoryById(a)?.name || a;
      const labelB = getCategoryById(b)?.name || b;
      return labelA.localeCompare(labelB);
    });
  }, [templateSystems]);

  const workflowStats = useMemo(() => {
    const activeCount = projects.length;
    const stageCount = projects.reduce((sum, project) => sum + project.stages.length, 0);
    const convertedCount = templateSystems.length;
    const convertedTasks = templateSystems.reduce((sum, system) => sum + countDraftTasks(system.draft), 0);

    return { activeCount, stageCount, convertedCount, convertedTasks };
  }, [projects, templateSystems]);

  const handleApproveTemplateWorkflow = async (templateId: string) => {
    const system = templateSystems.find((entry) => entry.template.id === templateId);
    if (!system) return;

    if (!isDemo) {
      await supabase
        .from('templates')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', templateId);
    }

    navigate('/workflow-review' + demoSuffix, {
      state: {
        draft: system.draft,
        source: 'template',
        templateId,
      },
    });
  };

  const reveal = (delay = 0) =>
    prefersReducedMotion
      ? { initial: false, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  if (authLoading && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !isDemo) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-dvh page-shell p-6 animate-fade-in overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground mb-6">Loading multi-step systems...</p>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen page-shell p-6" {...reveal()}>
      <motion.div className="max-w-7xl mx-auto space-y-6" {...reveal(0.04)}>
        <motion.div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between" {...reveal(0.08)}>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Workflows
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Every workflow runs in stages, not isolated one-offs.</p>
          </div>
          <button onClick={() => setShowProjectModal(true)} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Multi-Workflow
          </button>
        </motion.div>

        <WorkflowHierarchyExplainer isOpen={showHierarchyExplainer} onDismiss={dismissHierarchyExplainer} />

        <motion.div className="grid grid-cols-2 xl:grid-cols-4 gap-3" {...reveal(0.12)}>
          <div className="card-elevated p-3 border border-border/70">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active Workflows</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{workflowStats.activeCount}</p>
          </div>
          <div className="card-elevated p-3 border border-border/70">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tracked Stages</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{workflowStats.stageCount}</p>
          </div>
          <div className="card-elevated p-3 border border-border/70">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Converted Systems</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{workflowStats.convertedCount}</p>
          </div>
          <div className="card-elevated p-3 border border-border/70">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Converted Tasks</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{workflowStats.convertedTasks}</p>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-1 xl:grid-cols-12 gap-6" {...reveal(0.16)}>
          <div className="xl:col-span-7 space-y-6">
            <div className="card-elevated p-4 border border-border/70">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Auto-grouped into multi-stage systems</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Legacy workflows are transformed into planning, execution, and delivery stages.
                  </p>
                </div>
              </div>
            </div>

            {projects.length > 0 ? (
              <section className="card-elevated p-4 border border-border/70">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-foreground">Active Multi-Workflows</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{projects.length}</span>
                </div>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onContinue={() => handleContinueProject(project)}
                      onRefresh={loadProjects}
                      isDemo={isDemo}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="card-elevated p-6 text-center border border-border/70">
                <p className="font-medium text-foreground mb-1">No active multi-workflows</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start one from converted systems or create one from scratch.
                </p>
                <button onClick={() => setShowProjectModal(true)} className="btn-primary">
                  Create Multi-Workflow
                </button>
              </section>
            )}
          </div>

          <div className="xl:col-span-5 space-y-4">
            <div className="card-elevated p-4 border border-border/70">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">Converted Workflow Systems</h2>
                <span className="text-xs text-muted-foreground">{templateSystems.length} total</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Approve any system below to review it and start at stage one.
              </p>
            </div>

            {groupedTemplateSystems.length === 0 ? (
              <div className="card-elevated p-6 text-center border border-border/70">
                <p className="font-medium text-foreground mb-1">No reusable workflows yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new multi-workflow to start building stage-based systems.
                </p>
                <button onClick={() => setShowProjectModal(true)} className="btn-primary">
                  Create Multi-Workflow
                </button>
              </div>
            ) : (
              <div className="card-elevated p-3 border border-border/70">
                {groupedTemplateSystems.map(([ventureId, systems]) => {
                  const catColor = getCategoryColor(ventureId);
                  const ventureLabel = getCategoryById(ventureId)?.name || ventureId;

                  return (
                    <div key={ventureId} className="space-y-2 mb-4 last:mb-0">
                      <div className={`px-3 py-2 rounded-lg ${catColor.light} flex items-center justify-between border border-border/50`}>
                        <span className={`text-xs uppercase tracking-wide font-semibold ${catColor.text}`}>{ventureLabel}</span>
                        <span className="text-xs text-muted-foreground">{systems.length} systems</span>
                      </div>

                      <div className="space-y-2">
                        {systems.map(({ template, draft }) => (
                          <div key={template.id} className="rounded-xl bg-card border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{draft.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {template.work_type} • {draft.stages.length} stages • {countDraftTasks(draft)} tasks
                                </p>
                              </div>
                              <button
                                onClick={() => handleApproveTemplateWorkflow(template.id)}
                                className="btn-primary py-2 px-3 text-sm flex items-center gap-1.5 shrink-0"
                              >
                                Approve
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {draft.stages.map((stage, idx) => (
                                <div key={`${template.id}-${stage.name}-${idx}`} className="rounded-md bg-secondary/50 px-2 py-2">
                                  <p className="text-[11px] font-medium text-foreground truncate">{stage.name}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{stage.tasks.length} tasks</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <ProjectCreateModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onCreated={async () => {
            setShowProjectModal(false);
            await loadProjects();
          }}
          templates={projectTemplates}
        />
      </motion.div>
    </motion.div>
  );
}
