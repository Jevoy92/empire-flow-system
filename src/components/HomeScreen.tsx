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
  const { isRecording, isProcessing, startRecording, stopRecording, error } = useVoiceRecorder();

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
        
        {/* AI Presence Indicator - Always Pulsing */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 flex items-center justify-center mb-6">
            {/* Outer ripple ring */}
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" />
            {/* Middle breathing ring */}
            <div className="absolute inset-2 rounded-full bg-primary/20 animate-breathe" />
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-primary/30 animate-glow" />
            {/* Core circle */}
            <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse-subtle" />
            </div>
          </div>
          
          {/* Greeting from AI perspective */}
          <h1 className="text-2xl font-semibold text-foreground text-center mb-1">
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-muted-foreground text-center">
            {contextLine}
          </p>
        </div>

        {/* Voice/Text Input Area */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or tap mic to speak..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            {input.trim() ? (
              <button
                onClick={handleSend}
                className="p-3 rounded-xl bg-primary text-primary-foreground hover:brightness-105 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleMicPress}
                disabled={isProcessing}
                className={`p-3 rounded-xl transition-all ${
                  isRecording 
                    ? 'bg-destructive text-destructive-foreground animate-recording' 
                    : 'bg-primary text-primary-foreground hover:brightness-105'
                } ${isProcessing ? 'opacity-50' : ''}`}
              >
                {isRecording ? (
                  <Square className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          {/* Recording/Processing Status */}
          {(isRecording || isProcessing) && (
            <div className="text-center text-sm text-muted-foreground mb-3">
              {isRecording && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Recording... tap to stop
                </span>
              )}
              {isProcessing && 'Processing audio...'}
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-destructive mb-3">
              {error}
            </div>
          )}

          {/* Large Mic Button for Voice-First */}
          {!input.trim() && !isRecording && (
            <button
              onClick={handleMicPress}
              disabled={isProcessing}
              className="w-full py-4 rounded-xl bg-secondary/30 text-muted-foreground hover:bg-secondary/50 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Tap to talk
            </button>
          )}

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
