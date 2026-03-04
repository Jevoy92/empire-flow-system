import { useCallback } from 'react';
import { z } from 'zod';
import { SessionAssistantActionHandlers } from '@/components/session-assistant/types';

const TaskActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_tasks'), tasks: z.array(z.string().min(1).max(200)) }),
  z.object({
    type: z.literal('add_task_tree'),
    tasks: z
      .array(
        z.object({
          text: z.string().min(1).max(200),
          subtasks: z.array(z.string().min(1).max(200)).optional(),
        })
      )
      .min(1)
      .max(12),
  }),
  z.object({ type: z.literal('complete_tasks'), matches: z.array(z.string().min(1).max(200)) }),
  z.object({ type: z.literal('remove_tasks'), matches: z.array(z.string().min(1).max(200)) }),
  z.object({ type: z.literal('update_task'), match: z.string().min(1).max(200), newText: z.string().min(1).max(200) }),
  z.object({
    type: z.literal('set_task_timer'),
    match: z.string().min(1).max(200),
    minutes: z.number().min(1).max(300),
    autoStart: z.boolean().optional(),
  }),
  z.object({ type: z.literal('start_task_timers'), matches: z.array(z.string().min(1).max(200)).optional() }),
  z.object({ type: z.literal('pause_task_timers'), matches: z.array(z.string().min(1).max(200)).optional() }),
]);

type ParsedTaskAction = z.infer<typeof TaskActionSchema>;

interface LocalFallbackResult {
  addedCount: number;
  withSubtasks: boolean;
}

const extractActionPayloads = (content: string): string[] => {
  const payloads: string[] = [];
  const actionBlockRegex = /\[ACTION\]([\s\S]*?)\[\/ACTION\]/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = actionBlockRegex.exec(content)) !== null) {
    const rawPayload = blockMatch[1]?.trim();
    if (rawPayload) payloads.push(rawPayload);
  }

  const codeBlockRegex = /```action\s*([\s\S]*?)```/gi;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const rawPayload = codeMatch[1]?.trim();
    if (rawPayload) payloads.push(rawPayload);
  }

  const jsonBlockRegex = /```json\s*([\s\S]*?)```/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
    const rawPayload = jsonMatch[1]?.trim();
    if (rawPayload && rawPayload.includes('"type"')) payloads.push(rawPayload);
  }

  return payloads;
};

const parseLocalTaskList = (message: string): string[] => {
  const normalized = message
    .replace(/\r/g, '\n')
    .replace(/\b(can you|please|could you)\b/gi, '')
    .replace(/\b(add|create|make|build)\b/gi, '')
    .replace(/\b(task|tasks|todo|to-do|list|checklist)\b/gi, '')
    .replace(/^[\s:,-]+/, '')
    .trim();

  if (!normalized) return [];

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);

  const source = lines.length > 1 ? lines : [normalized];
  const pieces = source
    .flatMap((line) => line.split(/\s*(?:,|;|\band\b|\bthen\b)\s+/i))
    .map((item) => item.replace(/^to\s+/i, '').trim())
    .filter((item) => item.length > 2);

  const unique = Array.from(new Set(pieces));
  return unique.slice(0, 12);
};

const generateFallbackSubtasks = (task: string): string[] => {
  const clean = task.trim();
  return [
    `Define success criteria for ${clean}`,
    `Execute ${clean}`,
    `Review and finalize ${clean}`,
  ];
};

export function useActionParser(handlers: SessionAssistantActionHandlers) {
  const cleanMessageContent = useCallback((content: string) => {
    return content
      .replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/gi, '')
      .replace(/```action[\s\S]*?```/gi, '')
      .replace(/```json[\s\S]*?```/gi, '')
      .trim();
  }, []);

  const parseAndExecuteActions = useCallback((content: string): number => {
    const payloads = extractActionPayloads(content);
    let actionsExecuted = 0;

    payloads.forEach((payload) => {
      try {
        const parsed = JSON.parse(payload) as ParsedTaskAction;
        const action = TaskActionSchema.parse(parsed);

        switch (action.type) {
          case 'add_tasks':
            if (action.tasks.length > 0) {
              handlers.onAddTasks(action.tasks);
              actionsExecuted += 1;
            }
            break;
          case 'add_task_tree':
            if (action.tasks.length > 0) {
              handlers.onAddTaskTree(action.tasks);
              actionsExecuted += 1;
            }
            break;
          case 'complete_tasks':
            if (action.matches.length > 0) {
              handlers.onCompleteTasks(action.matches);
              actionsExecuted += 1;
            }
            break;
          case 'remove_tasks':
            if (action.matches.length > 0) {
              handlers.onRemoveTasks(action.matches);
              actionsExecuted += 1;
            }
            break;
          case 'update_task':
            handlers.onUpdateTask(action.match, action.newText);
            actionsExecuted += 1;
            break;
          case 'set_task_timer':
            handlers.onSetTaskTimer(action.match, action.minutes, action.autoStart);
            actionsExecuted += 1;
            break;
          case 'start_task_timers':
            handlers.onStartTaskTimers(action.matches);
            actionsExecuted += 1;
            break;
          case 'pause_task_timers':
            handlers.onPauseTaskTimers(action.matches);
            actionsExecuted += 1;
            break;
        }
      } catch (error) {
        console.error('Failed to parse/validate action:', error);
      }
    });

    return actionsExecuted;
  }, [handlers]);

  const applyLocalTaskFallback = useCallback((message: string): LocalFallbackResult => {
    const userRequestedTaskList =
      /\b(add|create|make|build|generate|plan|break)\b/i.test(message) &&
      (
        /\b(task|tasks|todo|to-do|list|checklist)\b/i.test(message) ||
        /[,;\n]/.test(message) ||
        /\band\b/i.test(message)
      );

    if (!userRequestedTaskList) {
      return { addedCount: 0, withSubtasks: false };
    }

    const inferredTasks = parseLocalTaskList(message);
    if (inferredTasks.length === 0) {
      return { addedCount: 0, withSubtasks: false };
    }

    const userRequestedBreakdown = /\b(subtask|subtasks|breakdown|plan|steps?)\b/i.test(message);
    if (userRequestedBreakdown) {
      handlers.onAddTaskTree(
        inferredTasks.map((task) => ({
          text: task,
          subtasks: generateFallbackSubtasks(task),
        }))
      );
    } else {
      handlers.onAddTasks(inferredTasks);
    }

    return { addedCount: inferredTasks.length, withSubtasks: userRequestedBreakdown };
  }, [handlers]);

  return {
    cleanMessageContent,
    parseAndExecuteActions,
    applyLocalTaskFallback,
  };
}
