import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkSession } from '@/components/WorkSession';
import { SystemShutdown } from '@/components/SystemShutdown';
import { supabase } from '@/integrations/supabase/client';
import { VentureId } from '@/types/empire';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface SessionConfig {
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  initialTasks?: Task[];
}

export default function Session() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<'session' | 'shutdown'>('session');
  const [sessionTasks, setSessionTasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [startTime] = useState<Date>(new Date());

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      
      const config = location.state as SessionConfig | null;
      if (!config) {
        navigate('/');
        return;
      }
      setSessionConfig(config);
      createSession(config, user?.id);
    };
    initSession();
  }, [location.state, navigate]);

  const createSession = async (config: SessionConfig, currentUserId?: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: currentUserId,
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
    } else if (data) {
      setSessionId(data.id);
    }
  };

  const handleSessionComplete = async (tasks: { id: string; text: string; completed: boolean }[]) => {
    setSessionTasks(tasks);
    
    if (sessionId) {
      const durationMinutes = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          tasks: tasks,
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);
    }
    
    setView('shutdown');
  };

  // Handle real-time task updates for persistence
  const handleTasksChange = async (tasks: { id: string; text: string; completed: boolean }[]) => {
    setSessionTasks(tasks);
    
    if (sessionId) {
      await supabase
        .from('sessions')
        .update({ tasks })
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
    navigate('/');
  };

  const handleShutdownComplete = () => {
    navigate('/');
  };

  const handlePlanNext = () => {
    navigate('/');
  };

  const handleSaveAsTemplate = async (name: string) => {
    if (!sessionConfig || !userId) return;
    
    await supabase
      .from('templates')
      .insert({
        user_id: userId,
        name,
        venture: sessionConfig.venture,
        work_type: sessionConfig.workType,
        default_focus: sessionConfig.focus,
        default_completion_condition: sessionConfig.completionCondition,
        default_tasks: sessionTasks,
        use_ai_tasks: false,
      });
  };

  if (!sessionConfig) {
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
              initialTasks={sessionConfig.initialTasks}
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
