import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}
