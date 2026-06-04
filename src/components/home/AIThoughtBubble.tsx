import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sparkle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function AIThoughtBubble() {
  const { user } = useAuth();
  const [thought, setThought] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    if (!user) return;
    if (manual) setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-reflection', { body: {} });
      if (error) throw error;
      if (data?.thought) setThought(data.thought);
    } catch {
      // stay silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!thought && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-6"
    >
      <div className="group relative rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 pr-12">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkle className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              On my mind
            </div>
            <p className="text-sm text-foreground leading-relaxed">{thought}</p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Refresh thought"
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </motion.div>
  );
}
