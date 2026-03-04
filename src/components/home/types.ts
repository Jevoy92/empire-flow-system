export interface Template {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: unknown;
  use_ai_tasks: boolean;
}

export interface FutureNote {
  id: string;
  category_id: string;
  work_type: string | null;
  note: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

export interface SmartSuggestion {
  label: string;
  description: string;
  type: 'project' | 'template' | 'session' | 'routine';
  data: {
    projectId?: string;
    stageIndex?: number;
    templateId?: string;
    venture?: string;
    workType?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  venture: string;
  current_stage: number;
  stages: unknown;
}

export interface ProjectStageData {
  name?: string;
  work_type?: string;
  workType?: string;
  completion_condition?: string;
  completionCondition?: string;
}
