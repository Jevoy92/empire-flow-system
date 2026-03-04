import { Check, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryById, getCategoryColor } from '@/data/ventures';
import { FutureNote } from './types';

interface HomeMobileIntelligenceFeedProps {
  notes: FutureNote[];
  onDismissNote: (noteId: string) => void;
}

export function HomeMobileIntelligenceFeed({ notes, onDismissNote }: HomeMobileIntelligenceFeedProps) {
  if (notes.length === 0) return null;

  return (
    <div className="mb-6 space-y-3 animate-fade-in">
      <h2 className="text-sm font-medium text-muted-foreground px-1 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Notes from Past You
      </h2>
      {notes.map((note) => {
        const catColor = getCategoryColor(note.category_id);
        const category = getCategoryById(note.category_id);

        return (
          <div
            key={note.id}
            className={`p-4 rounded-xl bg-card border border-border border-l-4 ${catColor.border} relative group`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${catColor.bg} flex items-center justify-center shrink-0`}>
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${catColor.text}`}>
                    {note.sender_role}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-foreground">"{note.note}"</p>
                {note.work_type && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {category?.name} • {note.work_type}
                  </span>
                )}
              </div>
              <button
                onClick={() => onDismissNote(note.id)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                title="Dismiss"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
