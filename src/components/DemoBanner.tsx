import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const navigate = useNavigate();

  const exitDemo = () => {
    navigate("/", { replace: true });
  };

  const signUp = () => {
    navigate("/auth");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">Demo Mode</span>
          <span className="hidden sm:inline text-primary-foreground/80">
            — Sample data only. Changes are read-only and won’t be saved.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={signUp}
            className="text-xs h-7"
          >
            Sign up to save
          </Button>
          <button
            onClick={exitDemo}
            className="p-1 rounded hover:bg-primary-foreground/10 transition-colors"
            aria-label="Exit demo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
