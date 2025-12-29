import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { OnboardingChat } from '@/components/OnboardingChat';

interface TemplateData {
  name: string;
  venture: string;
  work_type: string;
  default_focus: string;
  default_tasks: string[];
}

export default function Onboarding() {
  const { user, profile, loading, isAuthenticated, completeOnboarding } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (profile?.onboarding_completed) {
        navigate('/');
      }
    }
  }, [isAuthenticated, profile, loading, navigate]);

  const handleComplete = async (templates: TemplateData[]) => {
    await completeOnboarding();
    toast({
      title: 'Welcome aboard! 🎉',
      description: `Your workspace is ready with ${templates.length} custom templates.`,
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-lg font-semibold text-foreground">Set Up Your Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Chat with our AI to create personalized focus templates
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        <OnboardingChat 
          userId={user.id}
          userName={profile?.display_name || undefined}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
