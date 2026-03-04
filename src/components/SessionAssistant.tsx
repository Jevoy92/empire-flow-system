import { useState, useRef, useEffect } from 'react';
import { Send, ChevronUp, ChevronDown, Mic, Square, MessageCircle, ListPlus } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Schema validation for AI-generated task actions
const TaskActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_tasks'), tasks: z.array(z.string().min(1).max(200)) }),
  z.object({
    type: z.literal('add_task_tree'),
    tasks: z.array(
      z.object({
        text: z.string().min(1).max(200),
        subtasks: z.array(z.string().min(1).max(200)).optional(),
      })
    ).min(1).max(12),
  }),
  z.object({ type: z.literal('complete_tasks'), matches: z.array(z.string().min(1).max(200)) }),
  z.object({ type: z.literal('remove_tasks'), matches: z.array(z.string().min(1).max(200)) }),
  z.object({ type: z.literal('update_task'), match: z.string().min(1).max(200), newText: z.string().min(1).max(200) }),
  z.object({ type: z.literal('set_task_timer'), match: z.string().min(1).max(200), minutes: z.number().min(1).max(300), autoStart: z.boolean().optional() }),
  z.object({ type: z.literal('start_task_timers'), matches: z.array(z.string().min(1).max(200)).optional() }),
  z.object({ type: z.literal('pause_task_timers'), matches: z.array(z.string().min(1).max(200)).optional() }),
]);

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionContext {
  venture: string;
  workType: string;
  focus: string;
  completionCondition: string;
  tasks: Task[];
  elapsedMinutes: number;
  // Project context
  projectName?: string;
  currentStageName?: string;
  stageProgress?: string;
  nextStageName?: string;
  isProjectSession?: boolean;
}

interface TaskAction {
  type: 'add_tasks' | 'add_task_tree' | 'complete_tasks' | 'remove_tasks' | 'update_task' | 'set_task_timer' | 'start_task_timers' | 'pause_task_timers';
  tasks?: string[] | { text: string; subtasks?: string[] }[];
  matches?: string[];
  match?: string;
  newText?: string;
  minutes?: number;
  autoStart?: boolean;
}

interface SessionAssistantProps {
  sessionContext: SessionContext;
  onAddTasks: (tasks: string[]) => void;
  onAddTaskTree: (tasks: { text: string; subtasks?: string[] }[]) => void;
  onCompleteTasks: (matches: string[]) => void;
  onRemoveTasks: (matches: string[]) => void;
  onUpdateTask: (match: string, newText: string) => void;
  onSetTaskTimer: (match: string, minutes: number, autoStart?: boolean) => void;
  onStartTaskTimers: (matches?: string[]) => void;
  onPauseTaskTimers: (matches?: string[]) => void;
}

const quickActions = [
  { label: "What's next?", icon: MessageCircle },
  { label: "Add a task", icon: ListPlus },
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, isProcessing, partialText, startRecording, stopRecording } = useVoiceRecorder();

  // Update input with partial text as user speaks
  useEffect(() => {
    if (isRecording && partialText) {
      setInput(partialText);
    }
  }, [partialText, isRecording]);

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const cleanMessageContent = (content: string) => {
    return content
      .replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/gi, '')
      .replace(/```action[\s\S]*?```/gi, '')
      .replace(/```json[\s\S]*?```/gi, '')
      .trim();
  };

  const extractActionPayloads = (content: string): string[] => {
    const payloads: string[] = [];
    const actionBlockRegex = /\[ACTION\]([\s\S]*?)\[\/ACTION\]/gi;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = actionBlockRegex.exec(content)) !== null) {
      const rawPayload = blockMatch[1]?.trim();
      if (rawPayload) payloads.push(rawPayload);
    }

    const codeBlockRegex = /```action\s*([\s\S]*?)```/gi;
    let codeMatch: RegExpExecArray | null;

    while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
      const rawPayload = codeMatch[1]?.trim();
      if (rawPayload) payloads.push(rawPayload);
    }

    const jsonBlockRegex = /```json\s*([\s\S]*?)```/gi;
    let jsonMatch: RegExpExecArray | null;

    while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
      const rawPayload = jsonMatch[1]?.trim();
      if (rawPayload && rawPayload.includes('"type"')) payloads.push(rawPayload);
    }

    return payloads;
  };

  const parseLocalTaskList = (message: string): string[] => {
    const normalized = message
      .replace(/\r/g, '\n')
      .replace(/\b(can you|please|could you)\b/gi, '')
      .replace(/\b(add|create|make|build)\b/gi, '')
      .replace(/\b(task|tasks|todo|to-do|list|checklist)\b/gi, '')
      .replace(/^[\s:,-]+/, '')
      .trim();

    if (!normalized) return [];

    const lines = normalized
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);

    const source = lines.length > 1 ? lines : [normalized];
    const pieces = source
      .flatMap((line) => line.split(/\s*(?:,|;|\band\b|\bthen\b)\s+/i))
      .map((item) => item.replace(/^to\s+/i, '').trim())
      .filter((item) => item.length > 2);

    const unique = Array.from(new Set(pieces));
    return unique.slice(0, 12);
  };

  const generateFallbackSubtasks = (task: string): string[] => {
    const clean = task.trim();
    return [
      `Define success criteria for ${clean}`,
      `Execute ${clean}`,
      `Review and finalize ${clean}`,
    ];
  };

  const parseAndExecuteActions = (content: string): number => {
    const payloads = extractActionPayloads(content);
    let actionsExecuted = 0;

    payloads.forEach((payload) => {
      try {
        const parsed = JSON.parse(payload) as TaskAction;
        const action = TaskActionSchema.parse(parsed);

        switch (action.type) {
          case 'add_tasks':
            if (action.tasks && action.tasks.length > 0) {
              onAddTasks(action.tasks);
              actionsExecuted += 1;
            }
            break;
          case 'add_task_tree':
            if (action.tasks && action.tasks.length > 0) {
              onAddTaskTree(action.tasks as { text: string; subtasks?: string[] }[]);
              actionsExecuted += 1;
            }
            break;
          case 'complete_tasks':
            if (action.matches && action.matches.length > 0) {
              onCompleteTasks(action.matches);
              actionsExecuted += 1;
            }
            break;
          case 'remove_tasks':
            if (action.matches && action.matches.length > 0) {
              onRemoveTasks(action.matches);
              actionsExecuted += 1;
            }
            break;
          case 'update_task':
            if (action.match && action.newText) {
              onUpdateTask(action.match, action.newText);
              actionsExecuted += 1;
            }
            break;
          case 'set_task_timer':
            onSetTaskTimer(action.match, action.minutes, action.autoStart);
            actionsExecuted += 1;
            break;
          case 'start_task_timers':
            onStartTaskTimers(action.matches);
            actionsExecuted += 1;
            break;
          case 'pause_task_timers':
            onPauseTaskTimers(action.matches);
            actionsExecuted += 1;
            break;
        }
      } catch (e) {
        console.error('Failed to parse/validate action:', e);
      }
    });

    return actionsExecuted;
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsExpanded(true);

    try {
      // Get user's actual session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            sessionContext,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: cleanMessageContent(assistantContent),
                };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, will get more data
          }
        }
      }

      // Parse and execute any actions in the full response.
      const actionCount = parseAndExecuteActions(assistantContent);

      // Local fallback: if the model response didn't include valid actions but user clearly gave a list intent,
      // parse natural language into tasks so the workflow still works reliably.
      if (actionCount === 0) {
        const userRequestedTaskList =
          /\b(add|create|make|build|generate|plan|break)\b/i.test(textToSend) &&
          (
            /\b(task|tasks|todo|to-do|list|checklist)\b/i.test(textToSend) ||
            /[,;\n]/.test(textToSend) ||
            /\band\b/i.test(textToSend)
          );

        if (userRequestedTaskList) {
          const inferredTasks = parseLocalTaskList(textToSend);
          if (inferredTasks.length > 0) {
            const userRequestedBreakdown = /\b(subtask|subtasks|breakdown|plan|steps?)\b/i.test(textToSend);
            if (userRequestedBreakdown) {
              onAddTaskTree(
                inferredTasks.map((task) => ({
                  text: task,
                  subtasks: generateFallbackSubtasks(task),
                }))
              );
            } else {
              onAddTasks(inferredTasks);
            }
            setMessages((prev) => {
              const updated = [...prev];
              const finalAssistant = updated[updated.length - 1];
              if (finalAssistant && finalAssistant.role === 'assistant') {
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: `${finalAssistant.content || 'Done.'} Added ${inferredTasks.length} task${inferredTasks.length === 1 ? '' : 's'}${userRequestedBreakdown ? ' with subtasks' : ''}.`,
                };
              }
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error('Session assistant error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Try again!' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setInput(text);
        // Auto-send after transcription
        setTimeout(() => sendMessage(text), 100);
      }
    } else {
      await startRecording();
    }
  };

  const recentMessages = messages.slice(-4);

  const handleQuickAction = (label: string) => {
    sendMessage(label);
  };

  // Build status text based on project context
  const getStatusText = () => {
    if (isLoading) return 'AI is thinking...';
    if (sessionContext.isProjectSession && sessionContext.currentStageName) {
      return `AI ready • ${sessionContext.currentStageName} (${sessionContext.stageProgress})`;
    }
    return 'AI is ready';
  };

  return (
    <div className="card-elevated overflow-hidden mt-4 border border-border/70">
      {/* Header with AI presence indicator - Always breathing */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-sm">
          {/* AI presence indicator with always-on breathing animation */}
          <div className="relative flex items-center justify-center">
            {/* Outer ripple (subtle, always on) */}
            <div className="absolute w-8 h-8 rounded-full bg-primary/10 animate-ripple" />
            {/* Breathing ring */}
            <div className={`absolute w-6 h-6 rounded-full bg-primary/20 ${isLoading ? 'animate-pulse-subtle' : 'animate-breathe'}`} />
            {/* Glow effect */}
            <div className={`absolute w-5 h-5 rounded-full ${isLoading ? 'bg-primary/40 animate-glow' : 'bg-primary/30'}`} />
            {/* Core dot */}
            <div className="relative w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <span className="text-foreground/70">
            {getStatusText()}
          </span>
          {messages.length > 0 && !isLoading && (
            <span className="text-xs text-foreground/50">
              • {messages.length} messages
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Messages (shown when expanded) */}
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

      {/* Recording Status */}
      {(isRecording || isProcessing) && (
        <div className="px-4 py-2 border-t border-border text-center text-sm text-muted-foreground">
          {isRecording && (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              {partialText ? 'Listening... tap mic to finish' : 'Listening... speak now'}
            </span>
          )}
          {isProcessing && 'Finalizing...'}
        </div>
      )}

      {/* Quick action chips (shown when no messages or collapsed) */}
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

      {/* Input with voice */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell AI what to add or complete..."
          className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary transition-colors"
          disabled={isLoading || isRecording || isProcessing}
        />
        
        {/* Mic button */}
        <button
          onClick={handleMicPress}
          disabled={isLoading || isProcessing}
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

        {/* Send button */}
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
