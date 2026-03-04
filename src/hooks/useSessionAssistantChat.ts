import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, SessionContext } from '@/components/session-assistant/types';

interface UseSessionAssistantChatOptions {
  sessionContext: SessionContext;
  cleanMessageContent: (content: string) => string;
  parseAndExecuteActions: (content: string) => number;
  applyLocalTaskFallback: (message: string) => { addedCount: number; withSubtasks: boolean };
}

export function useSessionAssistantChat({
  sessionContext,
  cleanMessageContent,
  parseAndExecuteActions,
  applyLocalTaskFallback,
}: UseSessionAssistantChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsExpanded(true);

    try {
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

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: cleanMessageContent(assistantContent),
                };
                return updated;
              });
            }
          } catch {
            // Partial JSON payloads can arrive between SSE chunks.
          }
        }
      }

      const actionCount = parseAndExecuteActions(assistantContent);

      if (actionCount === 0) {
        const fallback = applyLocalTaskFallback(textToSend);
        if (fallback.addedCount > 0) {
          setMessages((prev) => {
            const updated = [...prev];
            const finalAssistant = updated[updated.length - 1];
            if (finalAssistant && finalAssistant.role === 'assistant') {
              updated[updated.length - 1] = {
                role: 'assistant',
                content: `${finalAssistant.content || 'Done.'} Added ${fallback.addedCount} task${fallback.addedCount === 1 ? '' : 's'}${fallback.withSubtasks ? ' with subtasks' : ''}.`,
              };
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Session assistant error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Try again!' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [applyLocalTaskFallback, cleanMessageContent, input, isLoading, messages, parseAndExecuteActions, sessionContext]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    isExpanded,
    setIsExpanded,
    sendMessage,
  };
}
