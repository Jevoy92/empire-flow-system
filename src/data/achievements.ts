export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'sessions' | 'tasks' | 'exploration' | 'time' | 'templates' | 'notes' | 'streaks' | 'projects';
  threshold: number;
  stat: keyof UserStats;
}

export interface UserStats {
  total_sessions_completed: number;
  total_tasks_completed: number;
  total_minutes_worked: number;
  unique_categories_used: string[];
  templates_created: number;
  notes_sent: number;
  notes_read: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  achievements_unlocked: string[];
  projects_completed: number;
}

export const achievements: Achievement[] = [
  // Sessions
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first session',
    icon: '🌱',
    category: 'sessions',
    threshold: 1,
    stat: 'total_sessions_completed',
  },
  {
    id: 'warming_up',
    name: 'Warming Up',
    description: 'Complete 5 sessions',
    icon: '🔥',
    category: 'sessions',
    threshold: 5,
    stat: 'total_sessions_completed',
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Complete 10 sessions',
    icon: '⚡',
    category: 'sessions',
    threshold: 10,
    stat: 'total_sessions_completed',
  },
  {
    id: 'powerhouse',
    name: 'Powerhouse',
    description: 'Complete 25 sessions',
    icon: '💪',
    category: 'sessions',
    threshold: 25,
    stat: 'total_sessions_completed',
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Complete 100 sessions',
    icon: '🏆',
    category: 'sessions',
    threshold: 100,
    stat: 'total_sessions_completed',
  },

  // Tasks
  {
    id: 'task_slayer',
    name: 'Task Slayer',
    description: 'Complete 50 tasks',
    icon: '⚔️',
    category: 'tasks',
    threshold: 50,
    stat: 'total_tasks_completed',
  },
  {
    id: 'productivity_machine',
    name: 'Productivity Machine',
    description: 'Complete 200 tasks',
    icon: '🤖',
    category: 'tasks',
    threshold: 200,
    stat: 'total_tasks_completed',
  },
  {
    id: 'task_legend',
    name: 'Task Legend',
    description: 'Complete 500 tasks',
    icon: '👑',
    category: 'tasks',
    threshold: 500,
    stat: 'total_tasks_completed',
  },

  // Exploration
  {
    id: 'versatile',
    name: 'Versatile',
    description: 'Work in 5 different categories',
    icon: '🎨',
    category: 'exploration',
    threshold: 5,
    stat: 'unique_categories_used',
  },
  {
    id: 'renaissance_soul',
    name: 'Renaissance Soul',
    description: 'Work in all 13 categories',
    icon: '🌈',
    category: 'exploration',
    threshold: 13,
    stat: 'unique_categories_used',
  },

  // Time
  {
    id: 'hour_of_power',
    name: 'Hour of Power',
    description: 'Work for 60 total minutes',
    icon: '⏰',
    category: 'time',
    threshold: 60,
    stat: 'total_minutes_worked',
  },
  {
    id: 'half_day',
    name: 'Half Day Hero',
    description: 'Work for 4 total hours',
    icon: '🌤️',
    category: 'time',
    threshold: 240,
    stat: 'total_minutes_worked',
  },
  {
    id: 'time_lord',
    name: 'Time Lord',
    description: 'Work for 24 total hours',
    icon: '🕰️',
    category: 'time',
    threshold: 1440,
    stat: 'total_minutes_worked',
  },

  // Templates
  {
    id: 'template_maker',
    name: 'Template Maker',
    description: 'Create your first template',
    icon: '📋',
    category: 'templates',
    threshold: 1,
    stat: 'templates_created',
  },
  {
    id: 'system_builder',
    name: 'System Builder',
    description: 'Create 5 templates',
    icon: '🏗️',
    category: 'templates',
    threshold: 5,
    stat: 'templates_created',
  },

  // Notes
  {
    id: 'time_traveler',
    name: 'Time Traveler',
    description: 'Send a note to your future self',
    icon: '✉️',
    category: 'notes',
    threshold: 1,
    stat: 'notes_sent',
  },
  {
    id: 'self_accountable',
    name: 'Self Accountable',
    description: 'Send 10 notes to your future self',
    icon: '📬',
    category: 'notes',
    threshold: 10,
    stat: 'notes_sent',
  },
  {
    id: 'message_received',
    name: 'Message Received',
    description: 'Read 5 notes from your past self',
    icon: '📖',
    category: 'notes',
    threshold: 5,
    stat: 'notes_read',
  },

  // Streaks
  {
    id: 'three_day_streak',
    name: 'Three Day Streak',
    description: 'Work 3 days in a row',
    icon: '🔥',
    category: 'streaks',
    threshold: 3,
    stat: 'longest_streak',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Work 7 days in a row',
    icon: '🗡️',
    category: 'streaks',
    threshold: 7,
    stat: 'longest_streak',
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Work 30 days in a row',
    icon: '🏅',
    category: 'streaks',
    threshold: 30,
    stat: 'longest_streak',
  },

  // Projects
  {
    id: 'project_pioneer',
    name: 'Project Pioneer',
    description: 'Complete your first multi-stage project',
    icon: '🚀',
    category: 'projects',
    threshold: 1,
    stat: 'projects_completed',
  },
  {
    id: 'multi_tasker',
    name: 'Multi-tasker',
    description: 'Complete 5 projects',
    icon: '📊',
    category: 'projects',
    threshold: 5,
    stat: 'projects_completed',
  },
  {
    id: 'project_master',
    name: 'Project Master',
    description: 'Complete 25 projects',
    icon: '🏗️',
    category: 'projects',
    threshold: 25,
    stat: 'projects_completed',
  },
];

export const categoryLabels: Record<Achievement['category'], string> = {
  sessions: 'Sessions',
  tasks: 'Tasks',
  exploration: 'Exploration',
  time: 'Time Invested',
  templates: 'Templates',
  notes: 'Notes to Future Me',
  streaks: 'Streaks',
  projects: 'Projects',
};

export function getStatValue(stats: UserStats, stat: keyof UserStats): number {
  const value = stats[stat];
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

export function isAchievementUnlocked(stats: UserStats, achievement: Achievement): boolean {
  return getStatValue(stats, achievement.stat) >= achievement.threshold;
}

export function getProgress(stats: UserStats, achievement: Achievement): number {
  const current = getStatValue(stats, achievement.stat);
  return Math.min(100, (current / achievement.threshold) * 100);
}
