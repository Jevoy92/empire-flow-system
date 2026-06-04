import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Mic, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncState {
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
  lifelog_count: number;
}

export function LimitlessPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('limitless_sync_state')
      .select('last_synced_at, last_status, last_error, lifelog_count')
      .eq('user_id', user.id)
      .maybeSingle();
    setState(data ?? { last_synced_at: null, last_status: null, last_error: null, lifelog_count: 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('limitless-sync', { body: {} });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || 'Sync failed');
      toast({ title: 'Limitless synced', description: 'Fetched latest lifelogs.' });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return null;

  const ok = state?.last_status === 'ok';
  const errored = state?.last_status === 'error';

  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">Limitless</h3>
            <p className="text-xs text-muted-foreground">Lifelogs feed your AI context</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-muted-foreground mb-1">Lifelogs stored</div>
          <div className="text-foreground font-semibold text-base">{state?.lifelog_count ?? 0}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-muted-foreground mb-1">Last sync</div>
          <div className="text-foreground font-medium flex items-center gap-1.5">
            {ok && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            {errored && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
            <span>
              {state?.last_synced_at
                ? formatDistanceToNow(new Date(state.last_synced_at), { addSuffix: true })
                : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {errored && state?.last_error && (
        <p className="text-xs text-destructive mt-3 line-clamp-2">{state.last_error}</p>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        Auto-syncs every hour. Recent transcripts are included in AI suggestions.
      </p>
    </div>
  );
}
