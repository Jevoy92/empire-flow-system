import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TemplatePreviewCard } from './TemplatePreviewCard';
import { ProjectPreviewCard } from './ProjectPreviewCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { z } from 'zod';

// Schema validation for AI-generated ventures
const VentureSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['personal', 'project']),
  tagline: z.string().max(200).optional().default(''),
  work_types: z.array(z.string()).optional().default([]),
});

// Schema validation for AI-generated templates
const TemplateSchema = z.object({
  name: z.string().min(1).max(100),
  venture: z.string().min(1).max(100),
  work_type: z.string().min(1).max(50),
  default_focus: z.string().min(1).max(500),
  default_tasks: z.array(z.string().min(1).max(200)).min(1).max(10),
});

// Schema validation for AI-generated projects
const ProjectStageSchema = z.object({
  name: z.string().min(1).max(100),
  workType: z.string().min(1).max(50),
  defaultFocus: z.string().min(1).max(500),
  defaultTasks: z.array(z.string().min(1).max(200)).min(1).max(10),
});

const ProjectSchema = z.object({
  name: z.string().min(1).max(100),
  venture: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  stages: z.array(ProjectStageSchema).min(1).max(10),
});

interface VentureData {
  name: string;
  type: 'personal' | 'project';
  tagline: string;
  work_types: string[];
}

interface TemplateData {
  name: string;
  venture: string;
  work_type: string;
  default_focus: string;
  default_tasks: string[];
}

interface ProjectStage {
  name: string;
  workType: string;
  defaultFocus: string;
  defaultTasks: string[];
}

interface ProjectData {
  name: string;
  venture: string;
  description: string;
  stages: ProjectStage[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ventures?: VentureData[];
  templates?: TemplateData[];
  projects?: ProjectData[];
}

interface OnboardingChatProps {
  userId: string;
  userName?: string;
  onComplete: (templates: TemplateData[], lastApprovedTemplate?: TemplateData) => void;
}

export function OnboardingChat({ userId, userName, onComplete }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedVentures, setSavedVentures] = useState<Set<string>>(new Set());
  const [savedTemplates, setSavedTemplates] = useState<Set<string>>(new Set());
  const [savedProjects, setSavedProjects] = useState<Set<string>>(new Set());
  const [allTemplates, setAllTemplates] = useState<TemplateData[]>([]);
  const [lastApprovedTemplate, setLastApprovedTemplate] = useState<TemplateData | undefined>();
  const [hasGenerated, setHasGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error: voiceError } = useVoiceRecorder();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, partialText]);

  // Show voice errors as toast
  useEffect(() => {
    if (voiceError) {
      toast({
        variant: 'destructive',
        title: 'Microphone Error',
        description: voiceError,
      });
    }
  }, [voiceError, toast]);

  // Update input with partial transcription
  useEffect(() => {
    if (partialText && isRecording) {
      setInput(partialText);
    }
  }, [partialText, isRecording]);

  const parseContentBlocks = (content: string): { 
    text: string; 
    ventures: VentureData[];
    templates: TemplateData[]; 
    projects: ProjectData[] 
  } => {
    const ventures: VentureData[] = [];
    const templates: TemplateData[] = [];
    const projects: ProjectData[] = [];
    
    let text = content;
    
    // Parse ventures
    const ventureRegex = /\[VENTURE\](.*?)\[\/VENTURE\]/gs;
    let match;
    while ((match = ventureRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const validated = VentureSchema.parse(parsed);
        ventures.push(validated as VentureData);
        text = text.replace(match[0], '');
      } catch (e) {
        console.error('Failed to parse/validate venture:', match[1], e);
      }
    }
    
    // Parse templates with schema validation
    const templateRegex = /\[TEMPLATE\](.*?)\[\/TEMPLATE\]/gs;
    while ((match = templateRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const validated = TemplateSchema.parse(parsed);
        templates.push(validated as TemplateData);
        text = text.replace(match[0], '');
      } catch (e) {
        console.error('Failed to parse/validate template:', match[1], e);
      }
    }
    
    // Parse projects with schema validation
    const projectRegex = /\[PROJECT\](.*?)\[\/PROJECT\]/gs;
    while ((match = projectRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const validated = ProjectSchema.parse(parsed);
        projects.push(validated as ProjectData);
        text = text.replace(match[0], '');
      } catch (e) {
        console.error('Failed to parse/validate project:', match[1], e);
      }
    }
    
    return { text: text.trim(), ventures, templates, projects };
  };

  const streamMessage = async (conversationHistory: { role: 'user' | 'assistant'; content: string }[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        messages: conversationHistory,
        userName 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    const messageId = Date.now().toString();

    setMessages(prev => [...prev, { id: messageId, role: 'assistant', content: '', ventures: [], templates: [], projects: [] }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            const { text, ventures, templates, projects } = parseContentBlocks(fullContent);
            
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: text, ventures, templates, projects }
                : msg
            ));
          }
        } catch (e) {
          // Incomplete JSON, wait for more data
        }
      }
    }

    // Final parse
    const { text, ventures, templates, projects } = parseContentBlocks(fullContent);
    
    console.log('Final parsed content:', { ventures: ventures.length, templates: templates.length, projects: projects.length });
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: text, ventures, templates, projects }
        : msg
    ));

    // Auto-save ventures immediately (they don't need approval)
    if (ventures.length > 0) {
      await saveVentures(ventures);
    }

    if (templates.length > 0) {
      setAllTemplates(prev => [...prev, ...templates]);
    }

    setHasGenerated(true);
    setIsLoading(false);
    textareaRef.current?.focus();
  };

  const saveVentures = async (ventures: VentureData[]) => {
    for (const venture of ventures) {
      try {
        const { error } = await supabase.from('user_ventures').upsert({
          user_id: userId,
          name: venture.name,
          type: venture.type,
          tagline: venture.tagline,
          work_types: venture.work_types,
        }, {
          onConflict: 'user_id,name'
        });

        if (error) {
          console.error('Failed to save venture:', venture.name, error);
        } else {
          setSavedVentures(prev => new Set([...prev, venture.name]));
        }
      } catch (e) {
        console.error('Error saving venture:', e);
      }
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const finalText = await stopRecording();
      if (finalText) {
        setInput(finalText);
        toast({
          title: 'Recording complete',
          description: 'Review your transcription and tap Send when ready.',
        });
      }
    } else {
      await startRecording();
      toast({
        title: 'Recording started',
        description: 'Speak naturally about your work and projects...',
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content + 
          (m.ventures?.map(v => `[VENTURE]${JSON.stringify(v)}[/VENTURE]`).join('') || '') +
          (m.templates?.map(t => `[TEMPLATE]${JSON.stringify(t)}[/TEMPLATE]`).join('') || '') +
          (m.projects?.map(p => `[PROJECT]${JSON.stringify(p)}[/PROJECT]`).join('') || ''),
      }));

      await streamMessage(history);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  };

  const handleApproveTemplate = async (template: TemplateData, messageId: string, templateIndex: number) => {
    const templateKey = `${messageId}-template-${templateIndex}`;
    if (savedTemplates.has(templateKey)) return;

    try {
      const { error } = await supabase.from('templates').insert({
        user_id: userId,
        name: template.name,
        venture: template.venture,
        work_type: template.work_type,
        default_focus: template.default_focus,
        default_tasks: template.default_tasks,
        use_ai_tasks: false,
      });

      if (error) throw error;

      setSavedTemplates(prev => new Set([...prev, templateKey]));
      setLastApprovedTemplate(template);
      
      toast({
        title: 'Template saved!',
        description: `"${template.name}" has been added to your templates.`,
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save template. Please try again.',
      });
    }
  };

  const handleApproveProject = async (project: ProjectData, messageId: string, projectIndex: number) => {
    const projectKey = `${messageId}-project-${projectIndex}`;
    if (savedProjects.has(projectKey)) return;

    try {
      const stages = project.stages.map(stage => ({
        name: stage.name,
        workType: stage.workType,
        defaultFocus: stage.defaultFocus,
        defaultTasks: stage.defaultTasks,
      }));

      const { error } = await supabase.from('project_templates').insert({
        user_id: userId,
        name: project.name,
        default_venture: project.venture,
        description: project.description,
        stages: stages,
      });

      if (error) throw error;

      setSavedProjects(prev => new Set([...prev, projectKey]));
      
      toast({
        title: 'Project template saved!',
        description: `"${project.name}" has been added to your workflows.`,
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save project template. Please try again.',
      });
    }
  };

  // Save all pending templates at once
  const handleSaveAllTemplates = async () => {
    const pendingTemplates: { template: TemplateData; messageId: string; index: number }[] = [];
    
    messages.forEach(msg => {
      msg.templates?.forEach((template, i) => {
        const templateKey = `${msg.id}-template-${i}`;
        if (!savedTemplates.has(templateKey)) {
          pendingTemplates.push({ template, messageId: msg.id, index: i });
        }
      });
    });

    if (pendingTemplates.length === 0) return;

    let savedCount = 0;
    for (const { template, messageId, index } of pendingTemplates) {
      try {
        const { error } = await supabase.from('templates').insert({
          user_id: userId,
          name: template.name,
          venture: template.venture,
          work_type: template.work_type,
          default_focus: template.default_focus,
          default_tasks: template.default_tasks,
          use_ai_tasks: false,
        });

        if (!error) {
          const templateKey = `${messageId}-template-${index}`;
          setSavedTemplates(prev => new Set([...prev, templateKey]));
          setLastApprovedTemplate(template);
          savedCount++;
        }
      } catch (e) {
        console.error('Failed to save template:', e);
      }
    }

    if (savedCount > 0) {
      toast({
        title: `${savedCount} templates saved!`,
        description: 'All templates have been added to your workspace.',
      });
    }
  };

  // Request more templates from AI
  const handleGenerateMore = async () => {
    const prompt = "Generate more templates based on what I've told you. Give me additional focus templates for other activities or variations of the ones you already created.";
    
    // Send directly with prompt to avoid race condition
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content + 
          (m.ventures?.map(v => `[VENTURE]${JSON.stringify(v)}[/VENTURE]`).join('') || '') +
          (m.templates?.map(t => `[TEMPLATE]${JSON.stringify(t)}[/TEMPLATE]`).join('') || '') +
          (m.projects?.map(p => `[PROJECT]${JSON.stringify(p)}[/PROJECT]`).join('') || ''),
      }));

      await streamMessage(history);
    } catch (error) {
      console.error('Failed to generate more:', error);
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate more templates',
      });
    }
  };

  // Count pending items
  const getPendingCounts = () => {
    let pendingTemplates = 0;
    let pendingProjects = 0;
    
    messages.forEach(msg => {
      msg.templates?.forEach((_, i) => {
        if (!savedTemplates.has(`${msg.id}-template-${i}`)) pendingTemplates++;
      });
      msg.projects?.forEach((_, i) => {
        if (!savedProjects.has(`${msg.id}-project-${i}`)) pendingProjects++;
      });
    });
    
    return { pendingTemplates, pendingProjects };
  };

  const handleFinish = () => {
    onComplete(allTemplates, lastApprovedTemplate);
  };

  const { pendingTemplates, pendingProjects } = getPendingCounts();

  const hasApprovedItems = savedTemplates.size > 0 || savedProjects.size > 0;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header prompt */}
      {messages.length === 0 && (
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Tell me about your work</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Speak or type about your projects, businesses, routines, and anything you want to focus on. 
            I'll create personalized templates for you.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Focus AI</span>
                </div>
              )}
              
              <div className={`rounded-2xl px-4 py-3 animate-message-in ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-md' 
                  : 'bg-muted text-foreground rounded-bl-md border-l-2 border-primary/20'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Ventures - show as badges */}
              {message.ventures && message.ventures.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.ventures.map((venture, i) => (
                    <div 
                      key={`venture-${i}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        venture.type === 'personal' ? 'bg-green-500' :
                        'bg-orange-500'
                      }`} />
                      {venture.name}
                      {savedVentures.has(venture.name) && (
                        <span className="text-[10px] text-muted-foreground ml-1">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Templates */}
              {message.templates && message.templates.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.templates.map((template, i) => (
                    <TemplatePreviewCard
                      key={`template-${i}`}
                      template={template}
                      isApproved={savedTemplates.has(`${message.id}-template-${i}`)}
                      onApprove={() => handleApproveTemplate(template, message.id, i)}
                    />
                  ))}
                </div>
              )}

              {/* Projects */}
              {message.projects && message.projects.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.projects.map((project, i) => (
                    <ProjectPreviewCard
                      key={`project-${i}`}
                      project={project}
                      isApproved={savedProjects.has(`${message.id}-project-${i}`)}
                      onApprove={() => handleApproveProject(project, message.id, i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live transcription preview */}
        {isRecording && partialText && (
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-primary/10 text-foreground rounded-2xl rounded-br-md px-4 py-3 animate-pulse-subtle">
              <p className="text-sm italic">{partialText}</p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start animate-message-in">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-subtle">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Focus AI</span>
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 border-l-2 border-primary/20">
                <span className="text-sm text-muted-foreground animate-pulse-subtle">Creating your templates...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        {/* Status bar and action buttons */}
        {hasGenerated && (
          <div className="mb-3 space-y-2">
            {/* Status counts */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>{savedTemplates.size} saved</span>
              {pendingTemplates > 0 && <span>{pendingTemplates} pending</span>}
              {savedProjects.size > 0 && <span>{savedProjects.size} workflows</span>}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {pendingTemplates > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveAllTemplates}
                  disabled={isLoading}
                >
                  Save All ({pendingTemplates})
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateMore}
                disabled={isLoading}
              >
                Generate More
              </Button>
              
              {hasApprovedItems && (
                <Button size="sm" onClick={handleFinish} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Start Session
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Voice button */}
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={handleVoiceToggle}
            disabled={isLoading || isProcessing}
            className="shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Tell me about your work, projects, and routines..."}
            disabled={isLoading || isRecording}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <Button 
            type="button" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isRecording} 
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
