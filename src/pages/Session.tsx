import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkSession } from '@/components/WorkSession';
import { SystemShutdown } from '@/components/SystemShutdown';
import { supabase } from '@/integrations/supabase/client';
import { useSession, SessionConfig, Task as SessionTask } from '@/contexts/SessionContext';
import { Json, TablesInsert } from '@/integrations/supabase/types';
import { AnimatePresence, motion } from 'framer-motion';

type Task = SessionTask;

interface LocationState extends SessionConfig {
  projectId?: string;
  stageIndex?: number;
}

export default function Session() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'session' | 'shutdown'>('session');
  const [sessionTasks, setSessionTasks] = useState<Task[]>([]);
  
  const {
    isActive,
    isMinimized,
    config: sessionConfig,
    sessionId,
    userId,
    startTime,
    tasks,
    startSession,
    setTasks,
    setSessionId,
    endSession,
    abortSession,
    restoreSession,
  } = useSession();

  // Initialize session from location state or restore from context
  useEffect(() => {
    const initSession = async () => {
      const state = location.state as LocationState | null;

      // If we have an active minimized session, only restore when opening /session
      // without navigation state (e.g. returning from the floating mini pill)
      if (isActive && isMinimized) {
        if (!state) {
          restoreSession();
        }
        return;
      }

      // If we already have an active session, don't reinitialize
      if (isActive && sessionConfig) {
        return;
      }

      // Get config from navigation state
      if (!state) {
        navigate('/');
        return;
      }

      const config: SessionConfig = {
        venture: state.venture,
        workType: state.workType,
        focus: state.focus,
        completionCondition: state.completionCondition,
        initialTasks: state.initialTasks,
      };

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create session in database with project link if provided
      const sessionData: TablesInsert<'sessions'> = {
        user_id: user?.id,
        venture: config.venture,
        work_type: config.workType,
        focus: config.focus,
        completion_condition: config.completionCondition,
        status: 'active',
      };

      if (state.projectId) {
        sessionData.project_id = state.projectId;
        sessionData.stage_index = state.stageIndex;
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      // Start the session in context
      startSession(config, data.id, user?.id || null);
    };

    initSession();
  }, [location.state, navigate, isActive, isMinimized, sessionConfig, startSession, restoreSession]);

  const handleSessionComplete = async (completedTasks: Task[]) => {
    // Set view to shutdown FIRST, before any async operations
    setView('shutdown');
    setSessionTasks(completedTasks);
    const state = location.state as LocationState | null;
    
    if (sessionId && startTime) {
      const durationMinutes = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
      try {
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            tasks: JSON.parse(JSON.stringify(completedTasks)) as Json,
            duration_minutes: durationMinutes,
          })
          .eq('id', sessionId);

        // Advance project stage if this session is part of a project
        if (state?.projectId !== undefined && state?.stageIndex !== undefined) {
          const { data: project } = await supabase
            .from('projects')
            .select('stages, current_stage')
            .eq('id', state.projectId)
            .single();

              if (project && Array.isArray(project.stages)) {
                const stages = project.stages as Json[];
                const updatedStages = stages.map((stage, index) => {
                  if (index !== state.stageIndex) return stage;
                  if (!stage || typeof stage !== 'object' || Array.isArray(stage)) return stage;
                  return { ...stage, completed: true } as Json;
                });
                
                const nextStage = state.stageIndex + 1;
                const isProjectComplete = nextStage >= stages.length;

                await supabase
                  .from('projects')
                  .update({
                    stages: updatedStages,
                    current_stage: isProjectComplete ? state.stageIndex : nextStage,
                    status: isProjectComplete ? 'completed' : 'active',
                    completed_at: isProjectComplete ? new Date().toISOString() : null,
              })
              .eq('id', state.projectId);
          }
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    }
  };

  // Handle real-time task updates for persistence
  const handleTasksChange = async (updatedTasks: Task[]) => {
    setSessionTasks(updatedTasks);
    setTasks(updatedTasks);
    
    if (sessionId) {
      await supabase
        .from('sessions')
        .update({ tasks: JSON.parse(JSON.stringify(updatedTasks)) as Json })
        .eq('id', sessionId);
    }
  };

  const handleAbort = async () => {
    if (sessionId) {
      await supabase
        .from('sessions')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
    abortSession();
    navigate('/');
  };

  const handleShutdownComplete = () => {
    endSession();
    navigate('/');
  };

  const handlePlanNext = () => {
    endSession();
    navigate('/');
  };

  const handleSaveAsTemplate = async (name: string) => {
    if (!sessionConfig || !userId) return;
    
    await supabase
      .from('templates')
      .insert([{
        user_id: userId,
        name,
        venture: sessionConfig.venture,
        work_type: sessionConfig.workType,
        default_focus: sessionConfig.focus,
        default_completion_condition: sessionConfig.completionCondition,
        default_tasks: JSON.parse(JSON.stringify(sessionTasks)) as Json,
        use_ai_tasks: false,
      }]);
  };

  // Auth check handled by ProtectedRoute

  // Only return null if we're not in shutdown view and session isn't configured
  if (view !== 'shutdown' && (!sessionConfig || !startTime)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === 'session' && (
          <motion.div
            key="work-session"
            className="min-h-screen flex items-center justify-center p-8"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
              <WorkSession
                venture={sessionConfig.venture}
                workType={sessionConfig.workType}
                focus={sessionConfig.focus}
                completionCondition={sessionConfig.completionCondition}
                initialTasks={tasks.length > 0 ? tasks : sessionConfig.initialTasks}
                startTime={startTime}
                onComplete={handleSessionComplete}
                onAbort={handleAbort}
                onTasksChange={handleTasksChange}
              />
          </motion.div>
        )}

        {view === 'shutdown' && (
          <motion.div
            key="session-shutdown"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <SystemShutdown
              onComplete={handleShutdownComplete}
              onPlanNext={handlePlanNext}
              onSaveAsTemplate={handleSaveAsTemplate}
              sessionStats={{
                durationMinutes: Math.round((new Date().getTime() - startTime.getTime()) / 60000),
                tasksCompleted: sessionTasks.filter(t => t.completed).length,
                totalTasks: sessionTasks.length,
              }}
              sessionContext={{
                categoryId: sessionConfig.venture,
                workType: sessionConfig.workType,
                sessionId: sessionId || undefined,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
