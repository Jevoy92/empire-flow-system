import { useState } from 'react';
import { ChevronRight, Pause, Play, Check, MoreVertical, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { Project, ProjectStage } from '@/pages/Projects';
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
}

export function ProjectCard({ project, onContinue, onRefresh }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const category = getCategoryById(project.venture);
  const catColor = getCategoryColor(project.venture);
  
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalStages = project.stages.length;
  const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
  const currentStage = project.stages[project.current_stage];

  const togglePause = async () => {
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
    if (!confirm('Are you sure you want to delete this project?')) return;
    setIsUpdating(true);
    await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    onRefresh();
  };

  const resetProject = async () => {
    if (!confirm('Reset project to the beginning?')) return;
    setIsUpdating(true);
    const resetStages = project.stages.map(s => ({ ...s, completed: false }));
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
    <div className={`card-elevated p-5 transition-all ${isPaused ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${catColor.bg} flex items-center justify-center`}>
            <span className="text-white text-lg font-semibold">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{project.name}</h3>
            <p className="text-sm text-muted-foreground">
              {category?.name || project.venture} • Stage {project.current_stage + 1} of {totalStages}
            </p>
          </div>
        </div>
        
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

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${catColor.bg}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{completedStages} of {totalStages} stages complete</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Stage Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.stages.map((stage, idx) => {
          const isComplete = stage.completed;
          const isCurrent = idx === project.current_stage && !isCompleted;
          
          return (
            <div
              key={idx}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                isComplete
                  ? 'bg-green-500/20 text-green-600'
                  : isCurrent
                    ? `${catColor.light} ${catColor.text} ring-2 ring-offset-1 ring-current`
                    : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isComplete && <Check className="w-3 h-3" />}
              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {stage.name}
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      {!isCompleted && currentStage && (
        <button
          onClick={onContinue}
          disabled={isPaused || isUpdating}
          className="btn-primary w-full flex items-center justify-center gap-2 group"
        >
          {isPaused ? (
            <>Resume project</>
          ) : (
            <>
              Continue: {currentStage.name}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      )}

      {isCompleted && (
        <div className="flex items-center justify-center gap-2 py-3 text-green-600 bg-green-500/10 rounded-lg">
          <Check className="w-5 h-5" />
          <span className="font-medium">Project Complete</span>
        </div>
      )}
    </div>
  );
}
