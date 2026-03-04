import { Check, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { FutureNote } from './types';

interface HomeIntelligenceFeedProps {
  notes: FutureNote[];
  onDismissNote: (noteId: string) => void;
}

export function HomeIntelligenceFeed({ notes, onDismissNote }: HomeIntelligenceFeedProps) {
  return (
    <aside className="col-span-3 rounded-2xl border border-border/70 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        Intelligence Feed
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No unread notes from past sessions.</p>
      ) : (
        notes.map((note) => {
          const catColor = getCategoryColor(note.category_id);
          const category = getCategoryById(note.category_id);
          return (
            <div key={note.id} className={`rounded-xl border border-border ${catColor.light} p-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-medium ${catColor.text}`}>{note.sender_role}</p>
                <button
                  onClick={() => onDismissNote(note.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Dismiss"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-foreground mt-1 line-clamp-3">"{note.note}"</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {category?.name || note.category_id}
                {note.work_type ? ` • ${note.work_type}` : ''} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </p>
            </div>
          );
        })
      )}
    </aside>
  );
}
