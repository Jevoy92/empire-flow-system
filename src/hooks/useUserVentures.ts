import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserVenture {
  id: string;
  name: string;
  type: 'personal' | 'project';
  tagline: string | null;
  work_types: string[];
}

// Default categories when user has none (only Personal and Projects, no Business)
const DEFAULT_CATEGORIES: Omit<UserVenture, 'id'>[] = [
  { name: 'Personal', type: 'personal', tagline: 'Daily routines and self-care', work_types: ['Morning Routine', 'Evening Shutdown', 'Admin', 'Health'] },
  { name: 'Projects', type: 'project', tagline: 'Independent work and learning', work_types: ['Building', 'Planning', 'Research', 'Learning', 'Deep Work', 'Communication'] },
];

export function useUserVentures() {
  const { user } = useAuth();
  const [ventures, setVentures] = useState<UserVenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setVentures([]);
      setLoading(false);
      return;
    }

    const fetchVentures = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('user_ventures')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at');

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          // Filter out any legacy 'business' type ventures, convert to 'project'
          setVentures(data.map(v => ({
            id: v.id,
            name: v.name,
            type: (v.type === 'business' ? 'project' : v.type) as 'personal' | 'project',
            tagline: v.tagline,
            work_types: v.work_types || [],
          })));
        } else {
          // Return defaults with fake IDs
          setVentures(DEFAULT_CATEGORIES.map((c, i) => ({
            ...c,
            id: `default-${i}`,
          })));
        }
      } catch (e) {
        console.error('Failed to fetch user ventures:', e);
        setError('Failed to load categories');
        // Fall back to defaults
        setVentures(DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          id: `default-${i}`,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchVentures();
  }, [user?.id]);

  // Group ventures by type (no business anymore)
  const personalVentures = ventures.filter(v => v.type === 'personal');
  const projectVentures = ventures.filter(v => v.type === 'project');

  // Get work types for a specific venture
  const getWorkTypesForVenture = (ventureName: string): string[] => {
    const venture = ventures.find(v => v.name === ventureName);
    return venture?.work_types || ['General'];
  };

  return {
    ventures,
    personalVentures,
    projectVentures,
    loading,
    error,
    getWorkTypesForVenture,
  };
}
