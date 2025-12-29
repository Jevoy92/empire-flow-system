import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Send, Sparkles, Clock, Layout, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AICommandCenter({ isOpen, onClose }: AICommandCenterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isRecording, startRecording, stopRecording, partialText, isProcessing } = useVoiceRecorder();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When partialText updates from voice, add it to input
  useEffect(() => {
    if (partialText) {
      setInputText(partialText);
    }
  }, [partialText]);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context about current location
      const contextInfo = {
        currentPage: location.pathname,
        timestamp: new Date().toISOString(),
      };

      const response = await supabase.functions.invoke('ai-command-center', {
        body: { 
          message: userMessage,
          context: contextInfo,
          history: messages.slice(-6), // Last 6 messages for context
        }
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data?.response || "I'm here to help! What would you like to do?";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

      // Handle navigation commands from AI response
      if (response.data?.action) {
        handleAIAction(response.data.action);
      }
    } catch (error) {
      console.error('AI Command error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I had trouble processing that. Try again or use the quick actions below." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAction = (action: { type: string; payload?: any }) => {
    switch (action.type) {
      case 'navigate':
        onClose();
        navigate(action.payload?.path || '/');
        break;
      case 'start_session':
        onClose();
        navigate('/', { state: { autoStart: true, ...action.payload } });
        break;
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'home':
        onClose();
        navigate('/');
        break;
      case 'history':
        onClose();
        navigate('/history');
        break;
      case 'templates':
        onClose();
        navigate('/templates');
        break;
      case 'start':
        setInputText("Start a new work session");
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">AI Assistant</SheetTitle>
                  <p className="text-xs text-muted-foreground">How can I help?</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse-subtle" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">What would you like to do?</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Ask me to start a session, navigate somewhere, or get help with your workflow.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-75" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-3 border-t border-border">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => handleQuickAction('home')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm whitespace-nowrap hover:bg-muted transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              <button
                onClick={() => handleQuickAction('history')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm whitespace-nowrap hover:bg-muted transition-colors"
              >
                <Clock className="w-4 h-4" />
                History
              </button>
              <button
                onClick={() => handleQuickAction('templates')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm whitespace-nowrap hover:bg-muted transition-colors"
              >
                <Layout className="w-4 h-4" />
                Templates
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div className="px-6 pb-6 pt-2">
            <div className="flex items-center gap-3">
              {/* Voice Button */}
              <button
                onClick={handleVoiceToggle}
                disabled={isProcessing}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-destructive text-destructive-foreground animate-recording' 
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Listening..." : "Ask anything..."}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-secondary border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none text-foreground placeholder:text-muted-foreground"
                  disabled={isRecording || isProcessing}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {isProcessing && (
              <p className="text-xs text-muted-foreground text-center mt-2">Processing voice...</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
