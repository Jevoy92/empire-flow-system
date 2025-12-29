import { useEffect, useState } from 'react';
import { ArrowRight, Play, Mic, Send, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: unknown;
  use_ai_tasks: boolean;
}

interface HomeScreenProps {
  onStartSession: () => void;
}

const ventureColors: Record<string, string> = {
  'Palmer House': 'bg-venture-palmer',
  'beSettld': 'bg-venture-besettld',
  'YourBoyJevoy': 'bg-venture-jevoy',
  'Strinzees': 'bg-venture-strinzees',
  'Personal': 'bg-venture-personal',
  'Health': 'bg-venture-health',
  'Finance': 'bg-venture-finance',
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getContextLine = (): string => {
  const lines = [
    "What's on your mind?",
    "What needs your focus today?",
    "How can I help?",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
};

const getVentureColor = (venture: string): string => {
  return ventureColors[venture] || 'bg-primary';
};

const quickActions = [
  { label: 'Start a work session', action: 'session' },
  { label: "What did I do yesterday?", action: 'history' },
];

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const [recentTemplates, setRecentTemplates] = useState<Template[]>([]);
  const [greeting] = useState(getGreeting());
  const [contextLine] = useState(getContextLine());
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error } = useVoiceRecorder();

  // Update input with partial text as user speaks
  useEffect(() => {
    if (isRecording && partialText) {
      setInput(partialText);
    }
  }, [partialText, isRecording]);

  useEffect(() => {
    loadRecentTemplates();
  }, []);

  const loadRecentTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(3);

    if (data) {
      setRecentTemplates(data);
    }
  };

  const useTemplate = async (template: Template) => {
    await supabase
      .from('templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id);

    const defaultTasks = Array.isArray(template.default_tasks) 
      ? template.default_tasks 
      : [];
    
    const initialTasks = defaultTasks.map((task: any, idx: number) => ({
      id: `task-${idx}`,
      text: typeof task === 'string' ? task : task.text || '',
      completed: false,
    }));

    navigate('/session', {
      state: {
        venture: template.venture,
        workType: template.work_type,
        focus: template.default_focus || template.name,
        completionCondition: template.default_completion_condition || 'Session complete',
        initialTasks,
      }
    });
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setInput(text);
      }
    } else {
      await startRecording();
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'session') {
      onStartSession();
    } else if (action === 'history') {
      navigate('/history');
    }
  };

  const handleSend = () => {
    if (input.toLowerCase().includes('session') || input.toLowerCase().includes('work')) {
      onStartSession();
    } else if (input.toLowerCase().includes('yesterday') || input.toLowerCase().includes('history')) {
      navigate('/history');
    }
    setInput('');
  };

  const firstName = profile?.display_name?.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-24 bg-warm-gradient">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-muted-foreground">
            {contextLine}
          </p>
        </div>

        {/* Primary Voice Input - Large Pulsing Mic Button */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={handleMicPress}
            disabled={isProcessing}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {/* Breathing pulse rings - only show when not recording */}
            {!isRecording && !isProcessing && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
                <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
                <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
              </>
            )}
            
            {/* Recording animation rings */}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-destructive/30 animate-pulse" />
              </>
            )}
            
            {/* Core button */}
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isRecording 
                ? 'bg-destructive' 
                : 'bg-primary hover:brightness-110'
            }`}>
              {isRecording ? (
                <Square className="w-6 h-6 text-destructive-foreground" />
              ) : (
                <Mic className="w-7 h-7 text-primary-foreground" />
              )}
            </div>
          </button>
          
          {/* Status text below mic */}
          <p className="mt-4 text-sm text-muted-foreground">
          {isRecording && (
              <span className="flex items-center gap-2 text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {partialText ? 'Listening... tap to finish' : 'Listening... speak now'}
              </span>
            )}
            {isProcessing && 'Finalizing...'}
            {!isRecording && !isProcessing && 'Tap to talk'}
          </p>
          
          {/* Error message */}
          {error && (
            <p className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Secondary Text Input */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type here..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            {input.trim() && (
              <button
                onClick={handleSend}
                className="p-3 rounded-xl bg-primary text-primary-foreground hover:brightness-105 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.action)}
                className="px-4 py-2 rounded-lg bg-secondary/50 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Session CTA */}
        <button
          onClick={onStartSession}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 group mb-6"
        >
          Start a Work Session
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Quick Start Templates */}
        {recentTemplates.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              Quick Start
            </h2>
            <div className="space-y-2">
              {recentTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => useTemplate(template)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl ${getVentureColor(template.venture)} flex items-center justify-center`}>
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {template.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {template.venture} • {template.work_type}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
