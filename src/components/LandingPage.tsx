import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Target, 
  TrendingUp, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">FocusFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Mic className="w-4 h-4" />
            Voice-first productivity
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Master Your Focus,
            <br />
            <span className="text-primary">Build Your Empire</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The voice-first productivity system that helps you plan, execute, and track 
            focused work sessions. Stop procrastinating, start building.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="gap-2 text-base px-8"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button 
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need to stay focused
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Simple yet powerful tools designed to help you do your best work.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Mic className="w-6 h-6" />}
              title="Voice-First Planning"
              description="Speak your intentions and let AI help structure your work session. No more blank page paralysis."
              color="bg-blue-500/10 text-blue-500"
            />
            <FeatureCard 
              icon={<Target className="w-6 h-6" />}
              title="Smart Templates"
              description="Save your best workflows and routines. One tap to start your proven processes."
              color="bg-emerald-500/10 text-emerald-500"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Your Growth"
              description="Watch your streaks build, achievements unlock, and productivity soar over time."
              color="bg-violet-500/10 text-violet-500"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to focused, productive work.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number={1}
              icon={<Target className="w-5 h-5" />}
              title="Set Your Focus"
              description="Choose your venture, define your goal, and set a clear completion condition."
            />
            <StepCard 
              number={2}
              icon={<Clock className="w-5 h-5" />}
              title="Work With Guidance"
              description="Stay on track with your session timer, task list, and AI assistance when needed."
            />
            <StepCard 
              number={3}
              icon={<Flame className="w-5 h-5" />}
              title="Build Momentum"
              description="Complete sessions, build streaks, and watch your productivity compound."
            />
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section className="py-16 px-6 bg-primary/5 border-y border-primary/10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground">∞</div>
              <div className="text-sm text-muted-foreground mt-1">Focus sessions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">12+</div>
              <div className="text-sm text-muted-foreground mt-1">Achievements to unlock</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Free to start</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to transform your work?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join and start building better work habits today. It's free.
          </p>
          <Button 
            size="lg" 
            className="gap-2 text-base px-8"
            onClick={() => navigate('/auth')}
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            <span>FocusFlow</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StepCard({ number, icon, title, description }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {icon}
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
