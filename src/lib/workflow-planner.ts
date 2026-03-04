interface RawTaskLike {
  text?: unknown;
}

interface TemplateLike {
  name: string;
  venture: string;
  work_type: string;
  default_focus?: string | null;
  default_completion_condition?: string | null;
  default_tasks?: unknown;
}

export interface WorkflowSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface WorkflowTask {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: WorkflowSubtask[];
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

export interface WorkflowStage {
  name: string;
  work_type: string;
  venture: string;
  tasks: WorkflowTask[];
  completed: boolean;
  focus?: string;
  completion_condition?: string;
}

export interface WorkflowDraft {
  name: string;
  venture: string;
  workType: string;
  focus: string;
  completionCondition: string;
  stages: WorkflowStage[];
}

interface PlannedTask {
  text: string;
  subtasks: string[];
}

interface StageBlueprint {
  prepName: string;
  executeName: string;
  closeName: string;
  prepWorkType: string;
  executeWorkType: string;
  closeWorkType: string;
  prepCompletion: string;
  executeCompletion: string;
}

const prepKeywords = [
  'plan',
  'outline',
  'research',
  'scope',
  'brief',
  'gather',
  'define',
  'prep',
  'prepare',
  'setup',
  'brainstorm',
];

const closeKeywords = [
  'review',
  'refine',
  'polish',
  'final',
  'ship',
  'deliver',
  'export',
  'publish',
  'qa',
  'test',
  'wrap',
];

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

const getTaskText = (task: unknown): string => {
  if (typeof task === 'string') return cleanText(task);
  if (task && typeof task === 'object') {
    const maybeTask = task as RawTaskLike;
    if (typeof maybeTask.text === 'string') return cleanText(maybeTask.text);
  }
  return '';
};

const titleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const summarizeFocusToName = (input: string): string => {
  const cleaned = cleanText(
    input
      .replace(/^(i need to|i want to|please|help me|can you)\s+/i, '')
      .replace(/[.!?]+$/, '')
  );

  if (!cleaned) return 'AI Planned Workflow';

  const words = cleaned.split(/\s+/);
  const compact = words.slice(0, 8).join(' ');
  const name = titleCase(compact);
  return words.length > 8 ? `${name}...` : name;
};

const parseTasksFromInput = (rawInput: string): string[] => {
  const normalized = rawInput.replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const listMatch = normalized.match(/\b(?:tasks?|todo|to-do|list|checklist)\b\s*:?\s*([\s\S]+)/i);
  const listSource = listMatch ? listMatch[1].trim() : normalized;

  const lines = listSource
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);

  const source = lines.length > 1 ? lines : [listSource];

  return Array.from(
    new Set(
      source
        .flatMap((line) => line.split(/\s*(?:,|;|\band\b|\bthen\b)\s+/i))
        .map((item) => item.replace(/^to\s+/i, '').trim())
        .filter((item) => item.length > 2)
    )
  ).slice(0, 12);
};

const suggestSubtasks = (taskText: string, goalContext?: string): string[] => {
  const clean = cleanText(taskText);
  const lower = clean.toLowerCase();
  const context = goalContext?.trim();

  if (lower.includes('email') || lower.includes('message') || lower.includes('reach out')) {
    return [
      `Gather context for ${clean}`,
      `Draft and send ${clean}`,
      `Log any follow-up from ${clean}`,
    ];
  }

  if (lower.includes('design') || lower.includes('wireframe') || lower.includes('mockup')) {
    return [
      `Review requirements for ${clean}`,
      `Create first draft of ${clean}`,
      `Revise ${clean} based on feedback`,
    ];
  }

  if (lower.includes('write') || lower.includes('draft') || lower.includes('copy')) {
    return [
      `Outline key points for ${clean}`,
      `Draft ${clean}`,
      `Edit and finalize ${clean}`,
    ];
  }

  return [
    `Define done criteria for ${clean}`,
    `Execute ${clean}`,
    context ? `Verify ${clean} supports "${context}"` : `Review and finalize ${clean}`,
  ];
};

const planTasksFromInput = (input: string): PlannedTask[] => {
  const explicit = parseTasksFromInput(input);
  if (explicit.length >= 2) {
    return explicit.slice(0, 10).map((task) => ({
      text: task,
      subtasks: suggestSubtasks(task, input),
    }));
  }

  const goal = cleanText(input);
  const generated = [
    `Define scope for ${goal}`,
    `Build first pass of ${goal}`,
    `Review and refine ${goal}`,
    `Finalize and ship ${goal}`,
  ];

  return generated.map((task) => ({
    text: task,
    subtasks: suggestSubtasks(task, goal),
  }));
};

const toWorkflowTasks = (items: PlannedTask[], stageKey: string): WorkflowTask[] =>
  items.map((item, idx) => ({
    id: `${stageKey}-task-${Date.now()}-${idx}`,
    text: cleanText(item.text),
    completed: false,
    subtasks: item.subtasks.map((subtask, subtaskIdx) => ({
      id: `${stageKey}-subtask-${Date.now()}-${idx}-${subtaskIdx}`,
      text: cleanText(subtask),
      completed: false,
    })),
  }));

const isPrepTask = (task: string) => prepKeywords.some((keyword) => task.toLowerCase().includes(keyword));
const isCloseTask = (task: string) => closeKeywords.some((keyword) => task.toLowerCase().includes(keyword));

const deriveStageBlueprint = (
  context: { workType: string; focus: string; completionCondition: string },
  plannedTasks: PlannedTask[]
): StageBlueprint => {
  const joined = `${context.workType} ${context.focus} ${plannedTasks.map((task) => task.text).join(' ')}`.toLowerCase();

  if (/(video|edit|shoot|filming|footage|thumbnail|cut)/.test(joined)) {
    return {
      prepName: 'Pre-Production',
      executeName: 'Production',
      closeName: 'Post-Production',
      prepWorkType: 'Planning',
      executeWorkType: 'Execution',
      closeWorkType: 'Editing',
      prepCompletion: 'Shoot plan and assets are ready',
      executeCompletion: 'Primary footage/work output is complete',
    };
  }

  if (/(write|script|copy|article|blog|outline|draft)/.test(joined)) {
    return {
      prepName: 'Research & Outline',
      executeName: 'Drafting',
      closeName: 'Edit & Publish',
      prepWorkType: 'Research',
      executeWorkType: 'Writing',
      closeWorkType: 'Editing',
      prepCompletion: 'Outline and key points are locked',
      executeCompletion: 'Draft is fully written',
    };
  }

  if (/(email|message|reach out|client|follow-up|outreach|call)/.test(joined)) {
    return {
      prepName: 'Context & Targeting',
      executeName: 'Outreach',
      closeName: 'Follow-up & Tracking',
      prepWorkType: 'Preparation',
      executeWorkType: 'Communication',
      closeWorkType: 'Review',
      prepCompletion: 'Targets and context are defined',
      executeCompletion: 'Messages are sent',
    };
  }

  if (/(meeting|planning|strategy|roadmap|review)/.test(joined)) {
    return {
      prepName: 'Context Gathering',
      executeName: 'Decision & Execution',
      closeName: 'Debrief & Next Actions',
      prepWorkType: 'Planning',
      executeWorkType: context.workType,
      closeWorkType: 'Review',
      prepCompletion: 'Inputs are assembled and priorities are clear',
      executeCompletion: 'Core decisions/work are completed',
    };
  }

  return {
    prepName: 'Plan & Prep',
    executeName: 'Build & Execute',
    closeName: 'Review & Deliver',
    prepWorkType: 'Planning',
    executeWorkType: context.workType,
    closeWorkType: 'Review',
    prepCompletion: 'Plan is clear and ready to execute',
    executeCompletion: 'Core work is completed',
  };
};

const buildStages = (
  plannedTasks: PlannedTask[],
  context: { venture: string; workType: string; focus: string; completionCondition: string }
): WorkflowStage[] => {
  const prep: PlannedTask[] = [];
  const execute: PlannedTask[] = [];
  const close: PlannedTask[] = [];

  plannedTasks.forEach((task) => {
    if (isPrepTask(task.text)) {
      prep.push(task);
      return;
    }
    if (isCloseTask(task.text)) {
      close.push(task);
      return;
    }
    execute.push(task);
  });

  if (execute.length === 0 && prep.length > 1) {
    execute.push(prep.pop() as PlannedTask);
  }

  if (close.length === 0 && execute.length > 1) {
    close.push(execute.pop() as PlannedTask);
  }

  if (prep.length === 0) {
    prep.push({
      text: `Clarify scope for ${context.focus}`,
      subtasks: suggestSubtasks(`Clarify scope for ${context.focus}`, context.focus),
    });
  }

  if (execute.length === 0) {
    execute.push({
      text: `Execute core work for ${context.focus}`,
      subtasks: suggestSubtasks(`Execute core work for ${context.focus}`, context.focus),
    });
  }

  if (close.length === 0) {
    close.push({
      text: `Review and finalize ${context.focus}`,
      subtasks: suggestSubtasks(`Review and finalize ${context.focus}`, context.focus),
    });
  }

  const blueprint = deriveStageBlueprint(context, plannedTasks);

  return [
    {
      name: blueprint.prepName,
      work_type: blueprint.prepWorkType,
      venture: context.venture,
      tasks: toWorkflowTasks(prep, 'prep'),
      completed: false,
      focus: `Set direction for ${context.focus}`,
      completion_condition: blueprint.prepCompletion,
    },
    {
      name: blueprint.executeName,
      work_type: blueprint.executeWorkType,
      venture: context.venture,
      tasks: toWorkflowTasks(execute, 'execute'),
      completed: false,
      focus: context.focus,
      completion_condition: blueprint.executeCompletion,
    },
    {
      name: blueprint.closeName,
      work_type: blueprint.closeWorkType,
      venture: context.venture,
      tasks: toWorkflowTasks(close, 'close'),
      completed: false,
      focus: `Wrap and deliver ${context.focus}`,
      completion_condition: context.completionCondition || 'Workflow complete',
    },
  ];
};

export function buildWorkflowDraftFromInput(
  input: string,
  options?: { venture?: string; workType?: string }
): WorkflowDraft {
  const focus = cleanText(input);
  const context = {
    venture: options?.venture || 'daily-maintenance',
    workType: options?.workType || 'AI Planned Sprint',
    focus,
    completionCondition: 'task-based',
  };

  return {
    name: summarizeFocusToName(input),
    venture: context.venture,
    workType: context.workType,
    focus: context.focus,
    completionCondition: context.completionCondition,
    stages: buildStages(planTasksFromInput(input), context),
  };
}

export function buildWorkflowDraftFromTemplate(template: TemplateLike): WorkflowDraft {
  const templateTasks = Array.isArray(template.default_tasks)
    ? template.default_tasks
        .map((task) => getTaskText(task))
        .filter(Boolean)
    : [];

  const focus = cleanText(template.default_focus || template.name);
  const baseTasks = templateTasks.length > 0 ? templateTasks : planTasksFromInput(focus).map((task) => task.text);
  const plannedTasks = baseTasks.map((task) => ({
    text: task,
    subtasks: suggestSubtasks(task, focus),
  }));

  const completionCondition = template.default_completion_condition || 'Workflow complete';

  return {
    name: `${template.name} System`,
    venture: template.venture,
    workType: template.work_type,
    focus,
    completionCondition,
    stages: buildStages(plannedTasks, {
      venture: template.venture,
      workType: template.work_type,
      focus,
      completionCondition,
    }),
  };
}

export function normalizeDraftForProject(draft: WorkflowDraft): WorkflowDraft {
  return {
    ...draft,
    name: cleanText(draft.name),
    focus: cleanText(draft.focus),
    stages: draft.stages.map((stage, stageIdx) => ({
      ...stage,
      name: cleanText(stage.name) || `Stage ${stageIdx + 1}`,
      work_type: cleanText(stage.work_type) || draft.workType,
      venture: cleanText(stage.venture) || draft.venture,
      completed: false,
      tasks: stage.tasks.map((task, taskIdx) => ({
        ...task,
        id: task.id || `stage-${stageIdx}-task-${taskIdx}`,
        text: cleanText(task.text),
        completed: false,
        subtasks: (task.subtasks || []).map((subtask, subtaskIdx) => ({
          ...subtask,
          id: subtask.id || `stage-${stageIdx}-task-${taskIdx}-subtask-${subtaskIdx}`,
          text: cleanText(subtask.text),
          completed: false,
        })),
      })),
    })),
  };
}

export const countDraftTasks = (draft: WorkflowDraft): number =>
  draft.stages.reduce((sum, stage) => sum + stage.tasks.length, 0);
