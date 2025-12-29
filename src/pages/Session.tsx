import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkSession } from '@/components/WorkSession';
import { SystemShutdown } from '@/components/SystemShutdown';
import { supabase } from '@/integrations/supabase/client';
import { useSession, SessionConfig } from '@/contexts/SessionContext';
import { Json } from '@/integrations/supabase/types';

interface Task {
  id: string;
  text: string;
  completed: boolean;
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
      // If we have an active minimized session, restore it
      if (isActive && isMinimized) {
        restoreSession();
        return;
      }

      // If we already have an active session, don't reinitialize
      if (isActive && sessionConfig) {
        return;
      }

      // Get config from navigation state
      const config = location.state as SessionConfig | null;
      if (!config) {
        navigate('/');
        return;
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create session in database
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user?.id,
          venture: config.venture,
          work_type: config.workType,
          focus: config.focus,
          completion_condition: config.completionCondition,
          status: 'active',
        })
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
    setSessionTasks(completedTasks);
    
    if (sessionId && startTime) {
      const durationMinutes = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          tasks: JSON.parse(JSON.stringify(completedTasks)) as Json,
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);
    }
    
    setView('shutdown');
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

  if (!sessionConfig || !startTime) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {view === 'session' && (
        <div className="min-h-screen flex items-center justify-center p-8">
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
        </div>
      )}

      {view === 'shutdown' && (
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
      )}
    </div>
  );
}
