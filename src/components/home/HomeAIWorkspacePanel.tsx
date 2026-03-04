import { ArrowRight, Mic, Play, Send, Square } from 'lucide-react';
import { SmartSuggestion } from './types';
import { HomeSuggestionCards } from './HomeSuggestionCards';

interface HomeAIWorkspacePanelProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStartSession: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  isModelLoading: boolean;
  engine: 'web-speech' | 'server' | 'none';
  partialText: string;
  error: string | null;
  onMicPress: () => void;
  suggestions: SmartSuggestion[];
  allSuggestionCount: number;
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
  onShuffle: () => void;
}

export function HomeAIWorkspacePanel({
  input,
  onInputChange,
  onSend,
  onStartSession,
  isRecording,
  isProcessing,
  isModelLoading,
  engine,
  partialText,
  error,
  onMicPress,
  suggestions,
  allSuggestionCount,
  onSuggestionClick,
  onShuffle,
}: HomeAIWorkspacePanelProps) {
  return (
    <section className="col-span-6 rounded-2xl border border-border/70 bg-card p-6">
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground">AI Workspace</p>
        <h2 className="text-4xl font-semibold text-foreground tracking-tight mt-1">What&apos;s on your mind?</h2>
      </div>

      <div className="flex flex-col items-center mb-8">
        <button
          onClick={onMicPress}
          disabled={isProcessing || isModelLoading}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${(isProcessing || isModelLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {!isRecording && !isProcessing && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
              <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
              <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
            </>
          )}

          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
            </>
          )}

          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${isRecording ? 'bg-destructive' : 'bg-primary hover:brightness-110'}`}>
            {isRecording ? (
              <Square className="w-6 h-6 text-destructive-foreground" />
            ) : (
              <Mic className="w-7 h-7 text-primary-foreground" />
            )}
          </div>
        </button>

        <p className="mt-4 text-sm text-muted-foreground">
          {isModelLoading && `Loading ${engine === 'server' ? 'transcription engine' : 'voice engine'}...`}
          {isRecording && (
            <span className="flex items-center gap-2 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              {partialText ? 'Listening... tap to finish' : 'Listening... speak now'}
            </span>
          )}
          {isProcessing && 'Finalizing...'}
          {!isRecording && !isProcessing && !isModelLoading && 'Tap to talk'}
        </p>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3 mb-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Tell AI what to plan..."
            className="flex-1 px-4 py-3 rounded-xl bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          {input.trim() && (
            <button
              onClick={onSend}
              className="p-3 rounded-xl bg-primary text-primary-foreground hover:brightness-105 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <HomeSuggestionCards
        suggestions={suggestions}
        allSuggestionCount={allSuggestionCount}
        title="Suggested starts"
        onSuggestionClick={onSuggestionClick}
        onShuffle={onShuffle}
      />

      <button
        onClick={onStartSession}
        className="w-full btn-primary py-4 text-lg font-medium flex items-center justify-center gap-3 group"
      >
        <Play className="w-5 h-5" />
        Start a Work Session
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </button>
    </section>
  );
}
