import { useState, useEffect } from 'react';
import { Plus, FolderOpen, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectCreateModal } from '@/components/ProjectCreateModal';
import { useAuth } from '@/hooks/useAuth';

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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProjects();
      loadTemplates();
    }
  }, [user, filter]);

  const loadProjects = async () => {
    setIsLoading(true);
    let query = supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filter === 'active') {
      query = query.in('status', ['active', 'paused']);
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading projects:', error);
    } else {
      // Parse stages from JSONB
      const parsed = (data || []).map(p => ({
        ...p,
        stages: Array.isArray(p.stages) ? p.stages as unknown as ProjectStage[] : [],
      })) as Project[];
      setProjects(parsed);
    }
    setIsLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading templates:', error);
    } else {
      const parsed = (data || []).map(t => ({
        ...t,
        stages: Array.isArray(t.stages) ? t.stages as unknown as ProjectStage[] : [],
      })) as ProjectTemplate[];
      setTemplates(parsed);
    }
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

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    loadProjects();
  };

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'paused');
  const completedProjects = projects.filter(p => p.status === 'completed');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="w-6 h-6" />
              Projects
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Multi-stage workflows for complex tasks
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['active', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        )}

        {/* Projects List */}
        {!isLoading && (
          <>
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No projects yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create a project to track multi-stage workflows like video production, course creation, or any complex task.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
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
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      <ProjectCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProjectCreated}
        templates={templates}
      />
    </div>
  );
}
