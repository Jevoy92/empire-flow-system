import { useState, useRef, useEffect } from 'react';
import { Send, ChevronUp, ChevronDown, Mic, Square, MessageCircle, ListPlus } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface Task {
  id: string;
  text: string;
  completed: boolean;
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
}

interface TaskAction {
  type: 'add_tasks' | 'complete_tasks' | 'remove_tasks' | 'update_task';
  tasks?: string[];
  matches?: string[];
  match?: string;
  newText?: string;
}

interface SessionAssistantProps {
  sessionContext: SessionContext;
  onAddTasks: (tasks: string[]) => void;
  onCompleteTasks: (matches: string[]) => void;
  onRemoveTasks: (matches: string[]) => void;
  onUpdateTask: (match: string, newText: string) => void;
}

const quickActions = [
  { label: "What's next?", icon: MessageCircle },
  { label: "Add a task", icon: ListPlus },
];

export function SessionAssistant({
  sessionContext,
  onAddTasks,
  onCompleteTasks,
  onRemoveTasks,
  onUpdateTask,
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

  const parseAndExecuteActions = (content: string) => {
    const actionRegex = /\[ACTION\](.*?)\[\/ACTION\]/g;
    let match;
    
    while ((match = actionRegex.exec(content)) !== null) {
      try {
        const action = JSON.parse(match[1]) as TaskAction;
        
        switch (action.type) {
          case 'add_tasks':
            if (action.tasks && action.tasks.length > 0) {
              onAddTasks(action.tasks);
            }
            break;
          case 'complete_tasks':
            if (action.matches && action.matches.length > 0) {
              onCompleteTasks(action.matches);
            }
            break;
          case 'remove_tasks':
            if (action.matches && action.matches.length > 0) {
              onRemoveTasks(action.matches);
            }
            break;
          case 'update_task':
            if (action.match && action.newText) {
              onUpdateTask(action.match, action.newText);
            }
            break;
        }
      } catch (e) {
        console.error('Failed to parse action:', e);
      }
    }
  };

  const cleanMessageContent = (content: string) => {
    return content.replace(/\[ACTION\].*?\[\/ACTION\]/g, '').trim();
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

      // Parse and execute any actions in the full response
      parseAndExecuteActions(assistantContent);
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

  return (
    <div className="card-elevated overflow-hidden mt-4 border border-primary/10">
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
          <span className="text-muted-foreground">
            {isLoading ? 'AI is thinking...' : 'AI is ready'}
          </span>
          {messages.length > 0 && !isLoading && (
            <span className="text-xs text-muted-foreground/60">
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
                  : 'text-muted-foreground border-l-2 border-primary/30 pl-3 ml-1'
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
              className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1.5"
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
