import { Check, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateData {
  name: string;
  venture: string;
  work_type: string;
  default_focus: string;
  default_tasks: string[];
}

interface TemplatePreviewCardProps {
  template: TemplateData;
  onApprove?: () => void;
  onEdit?: () => void;
  isApproved?: boolean;
}

export function TemplatePreviewCard({ 
  template, 
  onApprove, 
  onEdit,
  isApproved = false 
}: TemplatePreviewCardProps) {
  return (
    <div className={`rounded-xl border p-4 my-3 transition-all ${
      isApproved 
        ? 'border-primary/40 bg-primary/5' 
        : 'border-border bg-card'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            {template.name}
            {isApproved && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Saved
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground">
            {template.venture} • {template.work_type}
          </p>
        </div>
      </div>

      {/* Focus */}
      <div className="mb-3">
        <p className="text-sm text-muted-foreground italic">
          "{template.default_focus}"
        </p>
      </div>

      {/* Tasks */}
      <div className="space-y-1.5 mb-3">
        {template.default_tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
            <span className="text-foreground">{task}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isApproved && onApprove && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button 
            size="sm" 
            onClick={onApprove}
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Looks good
          </Button>
          {onEdit && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onEdit}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Adjust
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
