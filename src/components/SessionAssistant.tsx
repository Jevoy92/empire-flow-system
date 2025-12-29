import { useState, useRef, useEffect } from 'react';
import { Send, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
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

  const recentMessages = messages.slice(-4);

  return (
    <div className="card-elevated overflow-hidden mt-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>AI Assistant</span>
          {messages.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {messages.length} messages
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
              className={`py-1.5 text-sm ${
                msg.role === 'user'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="font-medium">
                {msg.role === 'user' ? 'You: ' : 'AI: '}
              </span>
              {msg.content || (isLoading && idx === recentMessages.length - 1 ? '...' : '')}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell AI what to add or complete..."
          className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
