import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Loader2, Mic, Sparkles, Square, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface OnboardingChatProps {
  userId: string;
  userName?: string;
  onComplete: (templates: TemplateData[], lastApprovedTemplate?: TemplateData) => void;
}

type OnboardingMode = 'guided' | 'voice';
type OnboardingStep = 'capture' | 'review';

interface GuidedAnswers {
  responsibilities: string;
  recurringWork: string;
  projects: string;
  constraints: string;
  preferredStructure: string;
}

interface GenerationResult {
  summary: string;
  ventures: VentureData[];
  templates: TemplateData[];
  projects: ProjectData[];
}

const GUIDED_QUESTIONS: Array<{ key: keyof GuidedAnswers; label: string; placeholder: string }> = [
  {
    key: 'responsibilities',
    label: '1. What are the main areas you are responsible for right now?',
    placeholder: 'Ex: Client work, fitness, household admin, content creation',
  },
  {
    key: 'recurringWork',
    label: '2. What recurring work sessions do you run each week?',
    placeholder: 'Ex: Weekly planning, script writing, invoice review, workout prep',
  },
  {
    key: 'projects',
    label: '3. What larger multi-step projects are active?',
    placeholder: 'Ex: Product launch, hiring pipeline, YouTube production cycle',
  },
  {
    key: 'constraints',
    label: '4. What time/energy constraints should this system respect?',
    placeholder: 'Ex: 45-minute blocks, low energy afternoons, meetings Tue/Thu mornings',
  },
  {
    key: 'preferredStructure',
    label: '5. How do you want work grouped and named?',
    placeholder: 'Ex: Personal vs Project categories, short action names, stage-based workflows',
  },
];

const emptyAnswers: GuidedAnswers = {
  responsibilities: '',
  recurringWork: '',
  projects: '',
  constraints: '',
  preferredStructure: '',
};

const buildGuidedPrompt = (answers: GuidedAnswers): string => {
  return `Build my first workspace from these onboarding answers.\n\n1) Core responsibilities:\n${answers.responsibilities}\n\n2) Recurring work sessions:\n${answers.recurringWork}\n\n3) Active multi-step projects:\n${answers.projects}\n\n4) Constraints:\n${answers.constraints}\n\n5) Preferred structure and naming:\n${answers.preferredStructure}\n\nGenerate ventures, templates, and project workflows from this. If details are missing, infer practical defaults.`;
};

const buildVoicePrompt = (voiceDump: string): string => {
  return `Build my first workspace from this voice dump:\n\n${voiceDump}\n\nGenerate ventures, templates, and project workflows. Infer practical defaults where needed.`;
};

const parseContentBlocks = (content: string): GenerationResult => {
  const ventures: VentureData[] = [];
  const templates: TemplateData[] = [];
  const projects: ProjectData[] = [];

  let text = content;

  const ventureRegex = /\[VENTURE\](.*?)\[\/VENTURE\]/gs;
  let match: RegExpExecArray | null;
  while ((match = ventureRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const validated = VentureSchema.parse(parsed);
      ventures.push(validated as VentureData);
      text = text.replace(match[0], '');
    } catch (error) {
      console.error('Failed to parse/validate venture:', match[1], error);
    }
  }

  const templateRegex = /\[TEMPLATE\](.*?)\[\/TEMPLATE\]/gs;
  while ((match = templateRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const validated = TemplateSchema.parse(parsed);
      templates.push(validated as TemplateData);
      text = text.replace(match[0], '');
    } catch (error) {
      console.error('Failed to parse/validate template:', match[1], error);
    }
  }

  const projectRegex = /\[PROJECT\](.*?)\[\/PROJECT\]/gs;
  while ((match = projectRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const validated = ProjectSchema.parse(parsed);
      projects.push(validated as ProjectData);
      text = text.replace(match[0], '');
    } catch (error) {
      console.error('Failed to parse/validate project:', match[1], error);
    }
  }

  return { summary: text.trim(), ventures, templates, projects };
};

const normalizeName = (value: string) => value.trim().toLowerCase();

export function OnboardingChat({ userId, userName, onComplete }: OnboardingChatProps) {
  const [mode, setMode] = useState<OnboardingMode>('guided');
  const [step, setStep] = useState<OnboardingStep>('capture');
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswers>(emptyAnswers);
  const [voiceInput, setVoiceInput] = useState('');
  const [generated, setGenerated] = useState<GenerationResult | null>(null);
  const [selectedVentures, setSelectedVentures] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const { isRecording, isProcessing, partialText, startRecording, stopRecording, error: voiceError } = useVoiceRecorder();

  const ventureKey = (index: number) => `venture-${index}`;
  const templateKey = (index: number) => `template-${index}`;
  const projectKey = (index: number) => `project-${index}`;

  useEffect(() => {
    if (!voiceError) return;
    toast({
      variant: 'destructive',
      title: 'Microphone Error',
      description: voiceError,
    });
  }, [voiceError, toast]);

  useEffect(() => {
    if (mode === 'voice' && isRecording && partialText) {
      setVoiceInput(partialText);
    }
  }, [mode, isRecording, partialText]);

  const canGenerate = useMemo(() => {
    if (isGenerating || isApplying) return false;
    if (mode === 'guided') {
      return GUIDED_QUESTIONS.every((question) => guidedAnswers[question.key].trim().length > 0);
    }
    return voiceInput.trim().length > 0;
  }, [mode, guidedAnswers, voiceInput, isGenerating, isApplying]);

  const selectedCounts = useMemo(() => ({
    ventures: selectedVentures.size,
    templates: selectedTemplates.size,
    projects: selectedProjects.size,
  }), [selectedVentures, selectedTemplates, selectedProjects]);

  const toggleSelected = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const initializeSelections = (result: GenerationResult) => {
    setSelectedVentures(new Set(result.ventures.map((_, index) => ventureKey(index))));
    setSelectedTemplates(new Set(result.templates.map((_, index) => templateKey(index))));
    setSelectedProjects(new Set(result.projects.map((_, index) => projectKey(index))));
  };

  const fetchOnboardingResponse = async (prompt: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userName,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate onboarding plan');
    }

    if (!response.body) {
      throw new Error('No response body returned from onboarding service');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;

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
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            fullContent += delta;
          }
        } catch {
          // Ignore partial/incomplete lines while streaming.
        }
      }
    }

    return fullContent;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    const prompt = mode === 'guided'
      ? buildGuidedPrompt(guidedAnswers)
      : buildVoicePrompt(voiceInput.trim());

    setIsGenerating(true);

    try {
      const rawContent = await fetchOnboardingResponse(prompt);
      const parsed = parseContentBlocks(rawContent);

      if (parsed.ventures.length === 0 && parsed.templates.length === 0 && parsed.projects.length === 0) {
        throw new Error('No ventures, templates, or projects were generated. Please add more detail and try again.');
      }

      setGenerated(parsed);
      initializeSelections(parsed);
      setStep('review');

      toast({
        title: 'Plan generated',
        description: `Generated ${parsed.ventures.length} categories, ${parsed.templates.length} templates, and ${parsed.projects.length} workflows.`,
      });
    } catch (error) {
      console.error('Failed to generate onboarding plan:', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Could not generate onboarding plan.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const finalText = await stopRecording();
      if (finalText) {
        setVoiceInput(finalText);
      }
      return;
    }

    await startRecording();
  };

  const saveVentures = async (ventures: VentureData[]) => {
    for (const venture of ventures) {
      const { error } = await supabase.from('user_ventures').upsert({
        user_id: userId,
        name: venture.name,
        type: venture.type,
        tagline: venture.tagline,
        work_types: venture.work_types,
      }, {
        onConflict: 'user_id,name',
      });

      if (error) {
        throw error;
      }
    }
  };

  const handleApplyAndStart = async () => {
    if (!generated) return;

    const approvedTemplates = generated.templates.filter((_, index) => selectedTemplates.has(templateKey(index)));
    const approvedProjects = generated.projects.filter((_, index) => selectedProjects.has(projectKey(index)));

    if (approvedTemplates.length === 0 && approvedProjects.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to start',
        description: 'Select at least one template or workflow to start immediately.',
      });
      return;
    }

    setIsApplying(true);

    try {
      const selectedVentureList = generated.ventures.filter((_, index) => selectedVentures.has(ventureKey(index)));
      const ventureMap = new Map(generated.ventures.map((venture) => [normalizeName(venture.name), venture]));

      const requiredVentureNames = new Set<string>();
      approvedTemplates.forEach((template) => requiredVentureNames.add(template.venture));
      approvedProjects.forEach((project) => requiredVentureNames.add(project.venture));

      const venturesToSaveMap = new Map<string, VentureData>();

      selectedVentureList.forEach((venture) => {
        venturesToSaveMap.set(normalizeName(venture.name), venture);
      });

      requiredVentureNames.forEach((ventureName) => {
        const key = normalizeName(ventureName);
        if (venturesToSaveMap.has(key)) return;

        const existing = ventureMap.get(key);
        if (existing) {
          venturesToSaveMap.set(key, existing);
          return;
        }

        venturesToSaveMap.set(key, {
          name: ventureName,
          type: 'project',
          tagline: '',
          work_types: [],
        });
      });

      await saveVentures(Array.from(venturesToSaveMap.values()));

      for (const template of approvedTemplates) {
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
      }

      for (const project of approvedProjects) {
        const stages = project.stages.map((stage) => ({
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
          stages,
        });

        if (error) throw error;
      }

      let startTemplate: TemplateData | undefined = approvedTemplates[0];

      if (!startTemplate && approvedProjects[0]) {
        const firstProject = approvedProjects[0];
        const firstStage = firstProject.stages[0];

        if (firstStage) {
          startTemplate = {
            name: `${firstProject.name} - ${firstStage.name}`,
            venture: firstProject.venture,
            work_type: firstStage.workType,
            default_focus: firstStage.defaultFocus,
            default_tasks: firstStage.defaultTasks,
          };
        }
      }

      toast({
        title: 'Workspace applied',
        description: `Saved ${venturesToSaveMap.size} categories, ${approvedTemplates.length} templates, and ${approvedProjects.length} workflows.`,
      });

      onComplete(approvedTemplates, startTemplate);
    } catch (error) {
      console.error('Failed to apply onboarding selection:', error);
      toast({
        variant: 'destructive',
        title: 'Apply failed',
        description: error instanceof Error ? error.message : 'Could not save your setup.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const clearSelections = () => {
    setSelectedVentures(new Set());
    setSelectedTemplates(new Set());
    setSelectedProjects(new Set());
  };

  const selectAll = () => {
    if (!generated) return;
    initializeSelections(generated);
  };

  if (step === 'capture') {
    return (
      <div className="h-full p-4 md:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Let&apos;s build your workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Answer 5 guided questions or drop one voice dump. Then review and approve everything before we apply it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => setMode('guided')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'guided' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              5 Guided Questions
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'voice' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              One Voice Dump
            </button>
          </div>

          {mode === 'guided' ? (
            <div className="space-y-4">
              {GUIDED_QUESTIONS.map((question) => (
                <div key={question.key} className="card-elevated border border-border/70 p-4">
                  <label className="text-sm font-medium text-foreground block mb-2">{question.label}</label>
                  <Textarea
                    value={guidedAnswers[question.key]}
                    onChange={(event) => setGuidedAnswers((prev) => ({ ...prev, [question.key]: event.target.value }))}
                    placeholder={question.placeholder}
                    className="min-h-[84px]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="card-elevated border border-border/70 p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Describe your full setup in one pass</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Talk through your responsibilities, routines, projects, and how you want things grouped.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={handleVoiceToggle}
                  disabled={isGenerating || isApplying || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>

              <Textarea
                value={voiceInput}
                onChange={(event) => setVoiceInput(event.target.value)}
                placeholder={isRecording ? 'Listening...' : 'Type or dictate your full setup here...'}
                className="min-h-[160px]"
                disabled={isGenerating || isApplying || isRecording}
              />

              {isRecording && (
                <p className="text-xs text-destructive">Recording in progress. Tap the square button to stop.</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isGenerating ? 'Generating Plan...' : 'Generate Plan'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!generated) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b border-border bg-background">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Those are great tasks. Approve your setup.</h2>
            <p className="text-sm text-muted-foreground">Choose what to apply, then we&apos;ll start your first session immediately.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedCounts.ventures} categories</span>
            <span>•</span>
            <span>{selectedCounts.templates} templates</span>
            <span>•</span>
            <span>{selectedCounts.projects} workflows</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {generated.summary && (
            <div className="card-elevated border border-border/70 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{generated.summary}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelections}>Clear All</Button>
          </div>

          {generated.ventures.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Categories</h3>
              {generated.ventures.map((venture, index) => {
                const key = ventureKey(index);
                const selected = selectedVentures.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelected(setSelectedVentures, key)}
                    className="w-full card-elevated border border-border/70 p-4 text-left hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {selected ? <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" /> : <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{venture.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{venture.type}</p>
                        {venture.tagline && <p className="text-sm text-muted-foreground mt-1">{venture.tagline}</p>}
                        {venture.work_types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {venture.work_types.slice(0, 6).map((workType) => (
                              <span key={`${key}-${workType}`} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {workType}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {generated.templates.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Templates</h3>
              {generated.templates.map((template, index) => {
                const key = templateKey(index);
                const selected = selectedTemplates.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelected(setSelectedTemplates, key)}
                    className="w-full card-elevated border border-border/70 p-4 text-left hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {selected ? <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" /> : <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />}
                      <div className="min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{template.name}</p>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{template.venture}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{template.work_type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.default_focus}</p>
                        <ul className="mt-2 space-y-1">
                          {template.default_tasks.slice(0, 5).map((task, taskIndex) => (
                            <li key={`${key}-task-${taskIndex}`} className="text-xs text-muted-foreground">• {task}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {generated.projects.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Workflow Systems</h3>
              {generated.projects.map((project, index) => {
                const key = projectKey(index);
                const selected = selectedProjects.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelected(setSelectedProjects, key)}
                    className="w-full card-elevated border border-border/70 p-4 text-left hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {selected ? <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" /> : <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />}
                      <div className="min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{project.name}</p>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{project.venture}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{project.stages.length} stages</span>
                        </div>
                        {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {project.stages.slice(0, 4).map((stage, stageIndex) => (
                            <div key={`${key}-stage-${stageIndex}`} className="rounded-lg bg-secondary/40 border border-border/60 p-2.5">
                              <p className="text-xs font-medium text-foreground">{stage.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{stage.workType} • {stage.defaultTasks.length} tasks</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('capture')}
            disabled={isApplying}
          >
            Back to Inputs
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || isApplying}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Regenerate
          </Button>
          <Button
            type="button"
            onClick={handleApplyAndStart}
            disabled={isApplying || isGenerating || (selectedCounts.templates === 0 && selectedCounts.projects === 0)}
            className="gap-2"
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isApplying ? 'Applying...' : 'Apply and Start Session'}
            {!isApplying && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
