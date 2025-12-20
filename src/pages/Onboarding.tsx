import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingData {
  name: string;
  projects: string;
  workTypes: string;
  challenges: string;
}

interface GeneratedTemplate {
  name: string;
  venture: string;
  work_type: string;
  default_focus: string;
  default_tasks: string[];
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    projects: '',
    workTypes: '',
    challenges: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState<GeneratedTemplate[]>([]);
  
  const { user, profile, loading, isAuthenticated, updateProfile, completeOnboarding } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (profile?.onboarding_completed) {
        navigate('/');
      } else if (profile?.display_name) {
        setData(prev => ({ ...prev, name: profile.display_name || '' }));
      }
    }
  }, [isAuthenticated, profile, loading, navigate]);

  const totalSteps = 5;

  const handleNext = () => {
    if (step === 4) {
      generateTemplates();
    } else if (step === 5) {
      finishOnboarding();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const generateTemplates = async () => {
    setIsGenerating(true);
    setStep(5);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('generate-templates', {
        body: {
          name: data.name,
          projects: data.projects,
          workTypes: data.workTypes,
          challenges: data.challenges,
        },
      });

      if (error) throw error;

      const templates = responseData.templates || [];
      setGeneratedTemplates(templates);

      // Save templates to database
      if (templates.length > 0 && user) {
        const templateRecords = templates.map((t: GeneratedTemplate) => ({
          user_id: user.id,
          name: t.name,
          venture: t.venture,
          work_type: t.work_type,
          default_focus: t.default_focus,
          default_tasks: t.default_tasks,
          use_ai_tasks: false,
        }));

        const { error: insertError } = await supabase
          .from('templates')
          .insert(templateRecords);

        if (insertError) {
          console.error('Error saving templates:', insertError);
        }
      }

      // Update display name if changed
      if (data.name && data.name !== profile?.display_name) {
        await updateProfile({ display_name: data.name });
      }
    } catch (error) {
      console.error('Error generating templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate templates. Please try again.',
      });
      setStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  const finishOnboarding = async () => {
    await completeOnboarding();
    toast({
      title: 'Welcome aboard!',
      description: 'Your workspace is ready. Start your first focus session!',
    });
    navigate('/');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.name.trim().length > 0;
      case 2: return data.projects.trim().length > 0;
      case 3: return data.workTypes.trim().length > 0;
      case 4: return true;
      case 5: return !isGenerating;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8 justify-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="card-elevated p-8">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome! What's your name?
                </h1>
                <p className="text-muted-foreground text-sm">
                  We'll personalize your experience based on how you work.
                </p>
              </div>
              <Input
                placeholder="Enter your name"
                value={data.name}
                onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg py-6"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Projects */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  What do you work on, {data.name.split(' ')[0]}?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Tell us about your projects, businesses, or areas of focus.
                </p>
              </div>
              <Textarea
                placeholder="e.g., I run a video production company, manage a side project for e-commerce, and do freelance consulting..."
                value={data.projects}
                onChange={(e) => setData(prev => ({ ...prev, projects: e.target.value }))}
                className="min-h-32 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Work Types */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  What types of tasks fill your day?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Describe the different kinds of work you do regularly.
                </p>
              </div>
              <Textarea
                placeholder="e.g., Video editing, client calls, email management, content writing, strategic planning, admin tasks..."
                value={data.workTypes}
                onChange={(e) => setData(prev => ({ ...prev, workTypes: e.target.value }))}
                className="min-h-32 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Step 4: Challenges */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  What's your biggest focus challenge?
                </h1>
                <p className="text-muted-foreground text-sm">
                  This helps us create better session structures for you.
                </p>
              </div>
              <Textarea
                placeholder="e.g., I struggle with context switching between projects, I often get distracted, I have trouble knowing when to stop..."
                value={data.challenges}
                onChange={(e) => setData(prev => ({ ...prev, challenges: e.target.value }))}
                className="min-h-32 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Step 5: Generating / Complete */}
          {step === 5 && (
            <div className="space-y-6">
              {isGenerating ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    Creating your templates...
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Our AI is building personalized work sessions just for you.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                      You're all set, {data.name.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      We created {generatedTemplates.length} personalized templates for you.
                    </p>
                  </div>

                  {generatedTemplates.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {generatedTemplates.map((template, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="font-medium text-foreground text-sm">
                            {template.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {template.venture} • {template.work_type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 && step < 5 ? (
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              {step === 5 ? (
                isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Start Working
                    <ArrowRight className="w-4 h-4" />
                  </>
                )
              ) : step === 4 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Templates
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
