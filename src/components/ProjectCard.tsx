import { useState } from 'react';
import { ChevronRight, ChevronDown, Pause, Play, Check, MoreVertical, Trash2, RotateCcw, FolderOpen, ListChecks, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { Project, ProjectStage } from '@/pages/Workflows';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
  onContinue: () => void;
  onRefresh: () => void;
  defaultExpanded?: boolean;
  isDemo?: boolean;
}

export function ProjectCard({ project, onContinue, onRefresh, defaultExpanded, isDemo = false }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? project.status === 'active');
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([project.current_stage]));
  const { toast } = useToast();
  
  const category = getCategoryById(project.venture);
  const catColor = getCategoryColor(project.venture);
  
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalStages = project.stages.length;
  const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const toggleStageExpand = (idx: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const getTasksForStage = (stage: ProjectStage) => {
    return stage.tasks || [];
  };

  const getTaskStats = (stage: ProjectStage) => {
    const tasks = getTasksForStage(stage);
    const completed = tasks.filter(t => t.completed).length;
    return { completed, total: tasks.length };
  };

  const togglePause = async () => {
    if (isDemo) {
      toast({
        title: 'Demo mode',
        description: 'Project status changes are disabled in demo mode.',
      });
      return;
    }
    setIsUpdating(true);
    const newStatus = project.status === 'paused' ? 'active' : 'paused';
    await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', project.id);
    onRefresh();
    setIsUpdating(false);
  };

  const deleteProject = async () => {
    if (isDemo) {
      toast({
        title: 'Demo mode',
        description: 'Deleting projects is disabled in demo mode.',
      });
      return;
    }
    if (!confirm('Are you sure you want to delete this project?')) return;
    setIsUpdating(true);
    await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    onRefresh();
  };

  const resetProject = async () => {
    if (isDemo) {
      toast({
        title: 'Demo mode',
        description: 'Project reset is disabled in demo mode.',
      });
      return;
    }
    if (!confirm('Reset project to the beginning?')) return;
    setIsUpdating(true);
    const resetStages = project.stages.map(s => ({ 
      ...s, 
      completed: false,
      tasks: s.tasks?.map(t => ({ ...t, completed: false })) || []
    }));
    await supabase
      .from('projects')
      .update({ 
        current_stage: 0, 
        stages: resetStages,
        status: 'active',
        completed_at: null 
      })
      .eq('id', project.id);
    onRefresh();
    setIsUpdating(false);
  };

  const isCompleted = project.status === 'completed';
  const isPaused = project.status === 'paused';

  return (
    <div className={`card-elevated transition-all ${isPaused ? 'opacity-60' : ''}`}>
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${catColor.bg} flex items-center justify-center shrink-0`}>
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
              {isPaused && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">Paused</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{category?.name || project.venture}</span>
              <span>•</span>
              <span>{completedStages}/{totalStages} stages</span>
              <span>•</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Progress ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-secondary"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                className={catColor.text}
              />
            </svg>
          </div>
          
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          {/* Visual Hierarchy Legend */}
          <div className="py-3 flex items-center gap-4 text-xs text-muted-foreground border-b border-border/30 mb-3">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Project
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" />
              Stages
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tasks
            </span>
          </div>

          {/* Stages List */}
          <div className="space-y-2">
            {project.stages.map((stage, idx) => {
              const isComplete = stage.completed;
              const isCurrent = idx === project.current_stage && !isCompleted;
              const stageColor = getCategoryColor(stage.venture || project.venture);
              const isStageExpanded = expandedStages.has(idx);
              const taskStats = getTaskStats(stage);
              const tasks = getTasksForStage(stage);
              
              return (
                <div key={idx} className="relative">
                  {/* Connecting line for visual hierarchy */}
                  {idx < project.stages.length - 1 && (
                    <div className="absolute left-[1.1rem] top-[2.5rem] bottom-0 w-0.5 bg-border/50" style={{ height: isStageExpanded && tasks.length > 0 ? 'calc(100% - 1rem)' : '0.5rem' }} />
                  )}
                  
                  <div
                    className={`rounded-lg transition-all ${
                      isCurrent 
                        ? `${stageColor.light} border-2 border-current ${stageColor.text}` 
                        : isComplete 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-secondary/30 border border-border/50'
                    }`}
                  >
                    {/* Stage Header */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStageExpand(idx);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/5 transition-colors rounded-lg"
                    >
                      {/* Status indicator */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isComplete 
                          ? 'bg-green-500 text-white' 
                          : isCurrent 
                            ? `${stageColor.bg} text-white` 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {isComplete ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        ) : (
                          <span className="text-xs font-medium">{idx + 1}</span>
                        )}
                      </div>
                      
                      {/* Stage info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ListChecks className={`w-4 h-4 ${
                            isComplete ? 'text-green-600' : isCurrent ? stageColor.text : 'text-muted-foreground'
                          }`} />
                          <p className={`font-medium truncate ${
                            isComplete ? 'text-green-600' : isCurrent ? stageColor.text : 'text-muted-foreground'
                          }`}>
                            {stage.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{stage.work_type}</span>
                          {taskStats.total > 0 && (
                            <>
                              <span>•</span>
                              <span>{taskStats.completed}/{taskStats.total} tasks</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Expand/collapse & continue */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent && !isPaused && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinue();
                            }}
                            className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                          >
                            Continue
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {tasks.length > 0 && (
                          isStageExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </button>
                    
                    {/* Task List (expandable) */}
                    {isStageExpanded && tasks.length > 0 && (
                      <div className="px-3 pb-3 pl-12 space-y-1.5 animate-fade-in">
                        <div className="border-l-2 border-border/50 pl-3 space-y-1">
                          {tasks.map((task, taskIdx) => (
                            <div
                              key={task.id || taskIdx}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                                task.completed 
                                  ? 'bg-green-500/10 text-green-600' 
                                  : 'bg-secondary/20 text-foreground'
                              }`}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className={task.completed ? 'line-through opacity-70' : ''}>
                                {task.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
            {isPaused && (
              <button
                onClick={togglePause}
                disabled={isUpdating}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Resume Project
              </button>
            )}
            
            {!isPaused && !isCompleted && (
              <div /> // Spacer
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={togglePause} disabled={isUpdating || isCompleted}>
                  {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetProject} disabled={isUpdating}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deleteProject} disabled={isUpdating} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isCompleted && (
            <div className="flex items-center justify-center gap-2 py-3 text-green-600 bg-green-500/10 rounded-lg mt-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Project Complete</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
