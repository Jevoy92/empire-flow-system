import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { useLocation } from 'react-router-dom';
import { FutureNote, Project, SmartSuggestion, Template } from '@/components/home/types';

const generateSmartSuggestions = (
  projects: Project[],
  templates: Template[],
  hour: number
): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = [];

  projects.forEach(project => {
    const stages = Array.isArray(project.stages) ? project.stages : [];
    const currentStage = stages[project.current_stage] as { name?: string } | undefined;
    suggestions.push({
      label: `Continue: ${project.name}`,
      description: currentStage?.name ? `Resume ${currentStage.name}` : 'Continue where you left off',
      type: 'project',
      data: { projectId: project.id, stageIndex: project.current_stage }
    });
  });

  if (hour < 10) {
    suggestions.push({
      label: 'Morning startup',
      description: 'Start your day with intention',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Morning Routine' }
    });
  } else if (hour >= 17) {
    suggestions.push({
      label: 'Evening shutdown',
      description: 'Wrap up and plan tomorrow',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Evening Routine' }
    });
  }

  templates.slice(0, 3).forEach(template => {
    suggestions.push({
      label: `Quick: ${template.name}`,
      description: `${template.venture} • ${template.work_type}`,
      type: 'template',
      data: { templateId: template.id }
    });
  });

  suggestions.push({
    label: 'Start a focused session',
    description: 'Begin deep work',
    type: 'session',
    data: {}
  });

  suggestions.push({
    label: "What did I do yesterday?",
    description: 'Review your history',
    type: 'session',
    data: {}
  });

  return suggestions;
};

export function useHomeData() {
  const [recentTemplates, setRecentTemplates] = useState<Template[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [futureNotes, setFutureNotes] = useState<FutureNote[]>([]);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const { user } = useAuth();
  const demo = useDemo();
  const location = useLocation();

  const isDemo = location.search.includes('demo=1');

  const allSuggestions = useMemo(() => {
    const hour = new Date().getHours();
    return generateSmartSuggestions(activeProjects, recentTemplates, hour);
  }, [activeProjects, recentTemplates]);

  const suggestions = useMemo(() => {
    if (allSuggestions.length <= 4) return allSuggestions;
    const startIdx = (shuffleIndex * 4) % allSuggestions.length;
    const result: SmartSuggestion[] = [];
    for (let i = 0; i < 4; i++) {
      result.push(allSuggestions[(startIdx + i) % allSuggestions.length]);
    }
    return result;
  }, [allSuggestions, shuffleIndex]);

  const handleShuffle = useCallback(() => {
    setShuffleIndex(prev => prev + 1);
  }, []);

  const loadActiveProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, venture, current_stage, stages')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(3);
    if (data) setActiveProjects(data);
  };

  const loadRecentTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(3);
    if (data) setRecentTemplates(data);
  };

  const loadFutureNotes = async () => {
    const { data } = await supabase
      .from('future_notes')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3);
    if (data) setFutureNotes(data as FutureNote[]);
  };

  // Clear state on user change
  useEffect(() => {
    if (!isDemo) {
      setRecentTemplates([]);
      setActiveProjects([]);
      setFutureNotes([]);
    }
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (isDemo && demo) {
      setRecentTemplates(demo.templates as Template[]);
      setActiveProjects(demo.projects.map(p => ({
        id: p.id,
        name: p.name,
        venture: p.venture,
        current_stage: p.current_stage,
        stages: p.stages,
      })));
      setFutureNotes(demo.futureNotes as FutureNote[]);
    } else if (user?.id) {
      loadRecentTemplates();
      loadFutureNotes();
      loadActiveProjects();
    }
  }, [isDemo, demo, user?.id]);

  const markNoteAsRead = useCallback(async (noteId: string) => {
    if (isDemo && demo) {
      demo.markNoteAsRead(noteId);
      setFutureNotes(prev => prev.filter(n => n.id !== noteId));
      return;
    }
    await supabase
      .from('future_notes')
      .update({ is_read: true })
      .eq('id', noteId);
    setFutureNotes(prev => prev.filter(n => n.id !== noteId));
  }, [isDemo, demo]);

  const isNewUserEmpty = activeProjects.length === 0 && recentTemplates.length === 0 && futureNotes.length === 0;

  return {
    recentTemplates,
    activeProjects,
    futureNotes,
    suggestions,
    allSuggestions,
    isNewUserEmpty,
    isDemo,
    handleShuffle,
    markNoteAsRead,
  };
}
