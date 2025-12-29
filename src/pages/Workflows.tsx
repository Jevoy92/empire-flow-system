import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Play, Trash2, Plus, Pencil, X, Eye, ChevronDown, ChevronRight, FolderOpen, ListChecks, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TemplateEditModal } from '@/components/TemplateEditModal';
import { ProjectCreateModal } from '@/components/ProjectCreateModal';
import { ProjectCard } from '@/components/ProjectCard';
import { WorkflowHierarchyExplainer, useShowHierarchyExplainer } from '@/components/WorkflowHierarchyExplainer';
import { categories, getCategoryById, CategoryType, getCategoryColor } from '@/data/ventures';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: { id: string; text: string; completed: boolean }[];
  use_ai_tasks: boolean;
  created_at: string;
  last_used_at: string | null;
  user_id: string | null;
}

export interface ProjectStage {
  name: string;
  work_type: string;
  venture: string;
  tasks: { id: string; text: string; completed: boolean }[];
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

type TabType = 'personal' | 'projects' | 'business';

const ALL_TABS: TabType[] = ['personal', 'projects', 'business'];
const TAB_LABELS: Record<TabType, string> = {
  personal: 'Personal',
  projects: 'Projects',
  business: 'Business',
};

export default function Workflows() {
  // All hooks must be called unconditionally at the top
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { shouldShow: showHierarchyExplainer, dismiss: dismissHierarchyExplainer } = useShowHierarchyExplainer();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState<TabType[]>(['personal', 'projects', 'business']);
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;

      // Load user settings for visible tabs
      const { data: settings } = await supabase
        .from('user_settings')
        .select('visible_template_tabs')
        .eq('id', user.id)
        .maybeSingle();
      
      if (settings?.visible_template_tabs) {
        const tabs = settings.visible_template_tabs as TabType[];
        setVisibleTabs(tabs);
        if (tabs.length > 0 && !tabs.includes(activeTab)) {
          setActiveTab(tabs[0]);
        }
      }

      await Promise.all([loadTemplates(), loadProjects(), loadProjectTemplates()]);
      setLoading(false);
    };

    init();

    // Set up realtime subscription for templates
    const channel = supabase
      .channel('workflows-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => loadTemplates())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      setTemplates(data.map(template => ({
        ...template,
        default_tasks: (template.default_tasks as { id: string; text: string; completed: boolean }[]) || []
      })));
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['active', 'paused'])
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setProjects(data.map(p => ({
        ...p,
        stages: Array.isArray(p.stages) ? p.stages as unknown as ProjectStage[] : [],
      })));
    }
  };

  const loadProjectTemplates = async () => {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('name');

    if (!error && data) {
      setProjectTemplates(data.map(t => ({
        ...t,
        stages: Array.isArray(t.stages) ? t.stages as unknown as ProjectStage[] : [],
      })));
    }
  };

  const saveVisibleTabs = async (tabs: TabType[]) => {
    if (!user?.id) return;
    await supabase
      .from('user_settings')
      .update({ visible_template_tabs: tabs })
      .eq('id', user.id);
  };

  const hideTab = async (tab: TabType) => {
    const newVisibleTabs = visibleTabs.filter(t => t !== tab);
    if (newVisibleTabs.length === 0) return;
    setVisibleTabs(newVisibleTabs);
    await saveVisibleTabs(newVisibleTabs);
    if (activeTab === tab) {
      setActiveTab(newVisibleTabs[0]);
    }
  };

  const showTab = async (tab: TabType) => {
    const newVisibleTabs = [...visibleTabs, tab].sort((a, b) => 
      ALL_TABS.indexOf(a) - ALL_TABS.indexOf(b)
    );
    setVisibleTabs(newVisibleTabs);
    await saveVisibleTabs(newVisibleTabs);
  };

  const hiddenTabs = ALL_TABS.filter(t => !visibleTabs.includes(t));

  const useTemplate = async (template: Template) => {
    await supabase
      .from('templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id);

    const initialTasks = (template.default_tasks || []).map((task, idx) => ({
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

  const deleteTemplate = async (id: string) => {
    await supabase.from('templates').delete().eq('id', id);
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleEditClick = (template: Template) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setIsEditModalOpen(true);
  };

  const handleCreateSingleStage = () => {
    setEditingTemplate(null);
    setIsCreating(true);
    setIsEditModalOpen(true);
  };

  const handleCreateMultiStage = () => {
    setShowProjectModal(true);
  };

  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    if (isCreating) {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: templateData.name,
          venture: templateData.venture,
          work_type: templateData.work_type,
          default_focus: templateData.default_focus,
          default_completion_condition: templateData.default_completion_condition,
          use_ai_tasks: templateData.use_ai_tasks,
          default_tasks: templateData.default_tasks || [],
          user_id: user.id,
        })
        .select()
        .single();

      if (!error && data) {
        setTemplates([{
          ...data,
          default_tasks: (data.default_tasks as { id: string; text: string; completed: boolean }[]) || []
        }, ...templates]);
      }
    } else if (templateData.id) {
      await supabase
        .from('templates')
        .update({
          name: templateData.name,
          venture: templateData.venture,
          work_type: templateData.work_type,
          default_focus: templateData.default_focus,
          default_completion_condition: templateData.default_completion_condition,
          use_ai_tasks: templateData.use_ai_tasks,
          default_tasks: templateData.default_tasks || [],
        })
        .eq('id', templateData.id);

      setTemplates(templates.map(t => 
        t.id === templateData.id 
          ? { ...t, ...templateData, default_tasks: templateData.default_tasks || [] } as Template
          : t
      ));
    }
    setIsEditModalOpen(false);
  };

  const handleContinueProject = (project: Project) => {
    const currentStage = project.stages[project.current_stage];
    if (!currentStage) return;

    navigate('/session', {
      state: {
        venture: currentStage.venture || project.venture,
        workType: currentStage.work_type,
        focus: currentStage.focus || `${project.name} - ${currentStage.name}`,
        completionCondition: currentStage.completion_condition || 'Stage complete',
        initialTasks: currentStage.tasks?.filter(t => !t.completed) || [],
        projectId: project.id,
        stageIndex: project.current_stage,
      }
    });
  };

  // Split templates by type
  const { personalTemplates, projectTemplatesFiltered, businessTemplates } = useMemo(() => {
    const personal: Template[] = [];
    const project: Template[] = [];
    const business: Template[] = [];
    
    templates.forEach(template => {
      const category = getCategoryById(template.venture);
      if (category?.type === 'personal') {
        personal.push(template);
      } else if (category?.type === 'project') {
        project.push(template);
      } else {
        business.push(template);
      }
    });
    
    return { personalTemplates: personal, projectTemplatesFiltered: project, businessTemplates: business };
  }, [templates]);

  const getTemplatesForTab = (tab: TabType) => {
    switch (tab) {
      case 'personal': return personalTemplates;
      case 'projects': return projectTemplatesFiltered;
      case 'business': return businessTemplates;
    }
  };

  // Group templates by category
  const groupByCategory = (templateList: Template[]) => {
    return templateList.reduce((acc, template) => {
      const categoryId = template.venture;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(template);
      return acc;
    }, {} as Record<string, Template[]>);
  };

  const renderTemplateList = (templateList: Template[]) => {
    if (templateList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No workflows in this category yet.
        </div>
      );
    }

    const grouped = groupByCategory(templateList);
    const sortedCategoryIds = Object.keys(grouped).sort((a, b) => {
      const catA = getCategoryById(a);
      const catB = getCategoryById(b);
      return (catA?.name || a).localeCompare(catB?.name || b);
    });

    return (
      <div className="space-y-6">
        {sortedCategoryIds.map(categoryId => {
          const category = getCategoryById(categoryId);
          const categoryTemplates = grouped[categoryId];
          const catColor = getCategoryColor(categoryId);
          
          return (
            <div key={categoryId}>
              <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md ${catColor.light}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${catColor.bg}`} />
                <h3 className={`text-xs font-medium uppercase tracking-wide ${catColor.text}`}>
                  {category?.name || categoryId}
                </h3>
              </div>
              <div className="space-y-2">
                {categoryTemplates.map(template => {
                  const templateColor = getCategoryColor(template.venture);
                  
                  return (
                    <div
                      key={template.id}
                      className={`flex items-center gap-2 px-3 py-3 rounded-lg bg-card border border-border border-l-4 ${templateColor.border} hover:bg-secondary/50 transition-all group hover:shadow-sm`}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {template.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 px-1.5 py-0.5 rounded bg-secondary">
                          {template.work_type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => useTemplate(template)}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Start workflow"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(template)}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit workflow"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Workflows
          </h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 p-6 animate-fade-in">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Workflows
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Single and multi-stage work sessions
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCreateSingleStage}>
                <div className="flex flex-col">
                  <span className="font-medium">Single-stage workflow</span>
                  <span className="text-xs text-muted-foreground">Quick task or routine</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateMultiStage}>
                <div className="flex flex-col">
                  <span className="font-medium">Multi-stage workflow</span>
                  <span className="text-xs text-muted-foreground">Complex project with phases</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hierarchy Explainer - for new users or empty state */}
        {templates.length === 0 && projects.length === 0 && (
          <WorkflowHierarchyExplainer 
            isOpen={showHierarchyExplainer} 
            onDismiss={dismissHierarchyExplainer} 
          />
        )}

        {/* Active Multi-Stage Projects Section */}
        {projects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  Active Projects
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </h2>
                <p className="text-xs text-muted-foreground">Multi-stage workflows with multiple phases</p>
              </div>
            </div>
            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onContinue={() => handleContinueProject(project)}
                  onRefresh={loadProjects}
                />
              ))}
            </div>
          </div>
        )}

        {/* Saved Single-Stage Workflows Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <ListChecks className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Single-Stage Workflows
              </h2>
              <p className="text-xs text-muted-foreground">Quick tasks and routines</p>
            </div>
          </div>

          {templates.length === 0 && projectTemplates.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No saved workflows yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a workflow to get started.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
              <div className="flex items-center gap-2 mb-4">
                <TabsList className={`grid w-full ${
                  visibleTabs.length === 1 ? 'grid-cols-1' : 
                  visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {visibleTabs.map(tab => (
                    <TabsTrigger key={tab} value={tab} className="gap-1.5 group relative">
                      {TAB_LABELS[tab]}
                      <span className="text-xs text-muted-foreground">({getTemplatesForTab(tab).length})</span>
                      {visibleTabs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            hideTab(tab);
                          }}
                          className="absolute -top-1 -right-1 p-0.5 rounded-full bg-muted hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`Hide ${TAB_LABELS[tab]} tab`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {hiddenTabs.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <Eye className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hiddenTabs.map(tab => (
                        <DropdownMenuItem key={tab} onClick={() => showTab(tab)}>
                          Show {TAB_LABELS[tab]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {visibleTabs.map(tab => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {renderTemplateList(getTemplatesForTab(tab))}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>

      {/* Modals */}
      <TemplateEditModal
        template={editingTemplate}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveTemplate}
        isNew={isCreating}
      />

      <ProjectCreateModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onCreated={() => {
          setShowProjectModal(false);
          loadProjects();
          loadProjectTemplates();
        }}
        templates={projectTemplates}
      />
    </div>
  );
}
