import { ArrowRight } from 'lucide-react';

interface HomeScreenProps {
  onStartSession: () => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="card-elevated p-12">
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            What are you working on?
          </h1>
          <p className="text-muted-foreground mb-10">
            Start a session to focus on a single task.
          </p>
          
          <button
            onClick={onStartSession}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
          >
            Start a Work Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
