import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplatePreviewCard } from './TemplatePreviewCard';
import { ProjectPreviewCard } from './ProjectPreviewCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

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
  const [savedTemplates, setSavedTemplates] = useState<Set<string>>(new Set());
  const [savedProjects, setSavedProjects] = useState<Set<string>>(new Set());
  const [allTemplates, setAllTemplates] = useState<TemplateData[]>([]);
  const [lastApprovedTemplate, setLastApprovedTemplate] = useState<TemplateData | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, []);

  const parseContentBlocks = (content: string): { text: string; templates: TemplateData[]; projects: ProjectData[] } => {
    const templates: TemplateData[] = [];
    const projects: ProjectData[] = [];
    
    let text = content;
    
    // Parse templates with schema validation
    const templateRegex = /\[TEMPLATE\](.*?)\[\/TEMPLATE\]/gs;
    let match;
    while ((match = templateRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const validated = TemplateSchema.parse(parsed);
        templates.push(validated as TemplateData);
        text = text.replace(match[0], '');
      } catch (e) {
        console.error('Failed to parse/validate template:', e);
        // Don't add invalid templates
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
        console.error('Failed to parse/validate project:', e);
        // Don't add invalid projects
      }
    }
    
    return { text: text.trim(), templates, projects };
  };

  const startConversation = async () => {
    setIsLoading(true);
    
    try {
      const initialMessage = userName 
        ? `My name is ${userName}. I'm ready to set up my workspace!`
        : 'Hi! I just signed up and want to set up my workspace.';
      
      await streamMessage([{ role: 'user' as const, content: initialMessage }]);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start the conversation. Please refresh and try again.',
      });
    }
  };

  const streamMessage = async (conversationHistory: { role: 'user' | 'assistant'; content: string }[]) => {
    // Get the user's actual session token for authentication
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

    // Add empty assistant message that we'll update
    setMessages(prev => [...prev, { id: messageId, role: 'assistant', content: '', templates: [], projects: [] }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE lines
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
            const { text, templates, projects } = parseContentBlocks(fullContent);
            
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: text, templates, projects }
                : msg
            ));
          }
        } catch (e) {
          // Incomplete JSON, wait for more data
        }
      }
    }

    // Final parse
    const { text, templates, projects } = parseContentBlocks(fullContent);
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: text, templates, projects }
        : msg
    ));

    // Add new templates to our collection
    if (templates.length > 0) {
      setAllTemplates(prev => [...prev, ...templates]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
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
      // Build conversation history for context
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content + 
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
      // Save to database
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
      // Convert project stages to the format expected by project_templates
      const stages = project.stages.map(stage => ({
        name: stage.name,
        workType: stage.workType,
        defaultFocus: stage.defaultFocus,
        defaultTasks: stage.defaultTasks,
      }));

      // Save to project_templates table
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

  const handleFinish = () => {
    onComplete(allTemplates, lastApprovedTemplate);
  };

  const hasApprovedItems = savedTemplates.size > 0 || savedProjects.size > 0;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Avatar */}
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Focus AI</span>
                </div>
              )}
              
              {/* Message bubble with subtle animation */}
              <div className={`rounded-2xl px-4 py-3 animate-message-in ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-md' 
                  : 'bg-muted text-foreground rounded-bl-md border-l-2 border-primary/20'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

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

        {/* Typing indicator - calmer pulsing style */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start animate-message-in">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-subtle">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Focus AI</span>
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 border-l-2 border-primary/20">
                <span className="text-sm text-muted-foreground animate-pulse-subtle">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        {hasApprovedItems && (
          <div className="mb-3 text-center">
            <Button onClick={handleFinish} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Start a Session →
            </Button>
          </div>
        )}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
