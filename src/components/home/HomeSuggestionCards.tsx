import { CheckCircle2, FolderOpen, ListChecks, Play, Shuffle, Sparkles } from 'lucide-react';
import { SmartSuggestion } from './types';

interface HomeSuggestionCardsProps {
  suggestions: SmartSuggestion[];
  allSuggestionCount: number;
  title: string;
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
  onShuffle: () => void;
}

export function HomeSuggestionCards({
  suggestions,
  allSuggestionCount,
  title,
  onSuggestionClick,
  onShuffle,
}: HomeSuggestionCardsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {title}
        </h3>
        {allSuggestionCount > 4 && (
          <button
            onClick={onShuffle}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Shuffle suggestions"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={`${suggestion.type}-${suggestion.label}-${idx}`}
            onClick={() => onSuggestionClick(suggestion)}
            className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              {suggestion.type === 'project' && <FolderOpen className="w-3.5 h-3.5 text-primary" />}
              {suggestion.type === 'template' && <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />}
              {suggestion.type === 'routine' && <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
              {suggestion.type === 'session' && <Play className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-sm font-medium text-foreground truncate">{suggestion.label}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
