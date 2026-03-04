import { KeyboardEvent, useEffect, useRef } from 'react';
import { Send, ChevronUp, ChevronDown, Mic, Square, MessageCircle, ListPlus } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useActionParser } from '@/hooks/useActionParser';
import { useSessionAssistantChat } from '@/hooks/useSessionAssistantChat';
import { SessionAssistantActionHandlers, SessionContext } from '@/components/session-assistant/types';

interface SessionAssistantProps extends SessionAssistantActionHandlers {
  sessionContext: SessionContext;
}

const quickActions = [
  { label: "What's next?", icon: MessageCircle },
  { label: 'Add a task', icon: ListPlus },
];

export function SessionAssistant({
  sessionContext,
  onAddTasks,
  onAddTaskTree,
  onCompleteTasks,
  onRemoveTasks,
  onUpdateTask,
  onSetTaskTimer,
  onStartTaskTimers,
  onPauseTaskTimers,
}: SessionAssistantProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, isModelLoading, engine } = useVoiceRecorder();

  const actionParser = useActionParser({
    onAddTasks,
    onAddTaskTree,
    onCompleteTasks,
    onRemoveTasks,
    onUpdateTask,
    onSetTaskTimer,
    onStartTaskTimers,
    onPauseTaskTimers,
  });

  const {
    messages,
    input,
    setInput,
    isLoading,
    isExpanded,
    setIsExpanded,
    sendMessage,
  } = useSessionAssistantChat({
    sessionContext,
    cleanMessageContent: actionParser.cleanMessageContent,
    parseAndExecuteActions: actionParser.parseAndExecuteActions,
    applyLocalTaskFallback: actionParser.applyLocalTaskFallback,
  });

  useEffect(() => {
    if (isRecording && partialText) {
      setInput(partialText);
    }
  }, [isRecording, partialText, setInput]);

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMicPress = async () => {
    if (isModelLoading) return;
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setInput(text);
        setTimeout(() => sendMessage(text), 100);
      }
    } else {
      await startRecording();
    }
  };

  const handleQuickAction = (label: string) => {
    sendMessage(label);
  };

  const getStatusText = () => {
    if (isLoading) return 'AI is thinking...';
    if (sessionContext.isProjectSession && sessionContext.currentStageName) {
      return `AI ready • ${sessionContext.currentStageName} (${sessionContext.stageProgress})`;
    }
    return 'AI is ready';
  };

  const recentMessages = messages.slice(-4);

  return (
    <div className="card-elevated overflow-hidden mt-4 border border-border/70">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-sm">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 rounded-full bg-primary/10 animate-ripple" />
            <div className={`absolute w-6 h-6 rounded-full bg-primary/20 ${isLoading ? 'animate-pulse-subtle' : 'animate-breathe'}`} />
            <div className={`absolute w-5 h-5 rounded-full ${isLoading ? 'bg-primary/40 animate-glow' : 'bg-primary/30'}`} />
            <div className="relative w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <span className="text-foreground/70">{getStatusText()}</span>
          {messages.length > 0 && !isLoading && (
            <span className="text-xs text-foreground/50">• {messages.length} messages</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && recentMessages.length > 0 && (
        <div className="px-4 py-2 border-t border-border max-h-40 overflow-y-auto">
          {recentMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`py-2 text-sm animate-message-in ${
                msg.role === 'user'
                  ? 'text-foreground'
                  : 'text-foreground/75 border-l-2 border-primary/30 pl-3 ml-1'
              }`}
            >
              <span className="font-medium text-xs uppercase tracking-wide opacity-60 block mb-0.5">
                {msg.role === 'user' ? 'You' : 'AI'}
              </span>
              {msg.content || (isLoading && idx === recentMessages.length - 1 ? (
                <span className="animate-pulse-subtle">Thinking...</span>
              ) : '')}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {(isRecording || isProcessing || isModelLoading) && (
        <div className="px-4 py-2 border-t border-border text-center text-sm text-muted-foreground">
          {isModelLoading && (
            <span className="animate-pulse-subtle">Loading {engine === 'server' ? 'transcription engine' : 'voice engine'}...</span>
          )}
          {isRecording && (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              {partialText ? 'Listening... tap mic to finish' : 'Listening... speak now'}
            </span>
          )}
          {isProcessing && 'Finalizing...'}
        </div>
      )}

      {messages.length === 0 && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.label)}
              className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-t border-border flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell AI what to add or complete..."
          className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary transition-colors"
          disabled={isLoading || isRecording || isProcessing || isModelLoading}
        />

        <button
          onClick={handleMicPress}
          disabled={isLoading || isProcessing || isModelLoading}
          className={`p-2 rounded-lg transition-all ${
            isRecording
              ? 'bg-destructive text-destructive-foreground animate-recording'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          }`}
        >
          {isRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim() || isRecording}
          className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
