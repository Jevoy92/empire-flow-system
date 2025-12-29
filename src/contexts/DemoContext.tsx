import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

// Demo Session type matching the History page interface
export interface DemoSession {
  id: string;
  venture: string;
  work_type: string;
  focus: string;
  completion_condition: string;
  tasks: { id: string; text: string; completed: boolean }[];
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
}

export interface DemoTemplate {
  id: string;
  name: string;
  venture: string;
  work_type: string;
  default_focus: string | null;
  default_completion_condition: string | null;
  default_tasks: { id: string; text: string; completed: boolean }[];
  use_ai_tasks: boolean;
  created_at: string;
  last_used_at: string | null;
  user_id: string | null;
}

export interface DemoProjectStage {
  name: string;
  work_type: string;
  venture: string;
  tasks: { id: string; text: string; completed: boolean }[];
  completed: boolean;
  focus?: string;
  completion_condition?: string;
}

export interface DemoProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  venture: string;
  status: string;
  current_stage: number;
  stages: DemoProjectStage[];
  project_template_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DemoFutureNote {
  id: string;
  category_id: string;
  work_type: string | null;
  note: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface DemoProfile {
  display_name: string;
  avatar_url: string;
  onboarding_completed: boolean;
}

interface DemoStats {
  total_sessions_completed: number;
  total_minutes_worked: number;
  current_streak: number;
  longest_streak: number;
  projects_completed: number;
  total_tasks_completed: number;
  templates_created: number;
  notes_sent: number;
  notes_read: number;
  achievements_unlocked: string[];
  unique_categories_used: string[];
}

interface DemoContextValue {
  isDemo: boolean;
  sessions: DemoSession[];
  templates: DemoTemplate[];
  projects: DemoProject[];
  futureNotes: DemoFutureNote[];
  profile: DemoProfile;
  stats: DemoStats;
  addSession: (s: Omit<DemoSession, "id">) => void;
  markNoteAsRead: (id: string) => void;
  completeTask: (sessionId: string, taskId: string) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

// Helper to generate dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

// Rich demo sessions for History page
const initialDemoSessions: DemoSession[] = [
  {
    id: "demo-1",
    venture: "side-project",
    work_type: "Building",
    focus: "Finish the landing page hero section",
    completion_condition: "Hero section is deployed",
    tasks: [
      { id: "t1", text: "Write compelling headline", completed: true },
      { id: "t2", text: "Add hero illustration", completed: true },
      { id: "t3", text: "Create CTA button", completed: true },
    ],
    status: "completed",
    started_at: hoursAgo(2),
    completed_at: hoursAgo(1.25),
    duration_minutes: 45,
  },
  {
    id: "demo-2",
    venture: "daily-maintenance",
    work_type: "Morning Routine",
    focus: "Morning startup routine",
    completion_condition: "Inbox zero, calendar reviewed",
    tasks: [
      { id: "t1", text: "Check email", completed: true },
      { id: "t2", text: "Review today's calendar", completed: true },
      { id: "t3", text: "Set top 3 priorities", completed: true },
    ],
    status: "completed",
    started_at: hoursAgo(6),
    completed_at: hoursAgo(5.75),
    duration_minutes: 15,
  },
  {
    id: "demo-3",
    venture: "learning",
    work_type: "Course Work",
    focus: "Study React hooks patterns",
    completion_condition: "Complete module 4",
    tasks: [
      { id: "t1", text: "Watch useEffect video", completed: true },
      { id: "t2", text: "Practice custom hooks", completed: true },
      { id: "t3", text: "Take quiz", completed: false },
    ],
    status: "completed",
    started_at: daysAgo(1),
    completed_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 30,
  },
  {
    id: "demo-4",
    venture: "creative",
    work_type: "Writing",
    focus: "Write blog post outline",
    completion_condition: "Outline complete with 5 sections",
    tasks: [
      { id: "t1", text: "Brainstorm topics", completed: true },
      { id: "t2", text: "Create outline structure", completed: false },
    ],
    status: "abandoned",
    started_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 29.5 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 25,
  },
  {
    id: "demo-5",
    venture: "admin-life",
    work_type: "Planning",
    focus: "Review and plan the week",
    completion_condition: "Week planned, goals set",
    tasks: [
      { id: "t1", text: "Review last week's wins", completed: true },
      { id: "t2", text: "Set weekly goals", completed: true },
      { id: "t3", text: "Block time for deep work", completed: true },
    ],
    status: "completed",
    started_at: daysAgo(2),
    completed_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 20,
  },
  {
    id: "demo-6",
    venture: "side-project",
    work_type: "Building",
    focus: "Build authentication flow",
    completion_condition: "Login/signup working",
    tasks: [
      { id: "t1", text: "Set up auth provider", completed: true },
      { id: "t2", text: "Create login form", completed: true },
      { id: "t3", text: "Add password reset", completed: true },
      { id: "t4", text: "Test all flows", completed: true },
    ],
    status: "completed",
    started_at: daysAgo(2),
    completed_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
  },
];

// Demo templates for Workflows page
const initialDemoTemplates: DemoTemplate[] = [
  {
    id: "tpl-1",
    name: "Morning Startup",
    venture: "daily-maintenance",
    work_type: "Morning Routine",
    default_focus: "Start the day with intention",
    default_completion_condition: "Ready to work",
    default_tasks: [
      { id: "t1", text: "Review calendar", completed: false },
      { id: "t2", text: "Process inbox", completed: false },
      { id: "t3", text: "Set today's priorities", completed: false },
    ],
    use_ai_tasks: false,
    created_at: daysAgo(14),
    last_used_at: hoursAgo(6),
    user_id: "demo-user",
  },
  {
    id: "tpl-2",
    name: "Deep Focus Block",
    venture: "side-project",
    work_type: "Building",
    default_focus: "Uninterrupted deep work",
    default_completion_condition: "Meaningful progress made",
    default_tasks: [],
    use_ai_tasks: true,
    created_at: daysAgo(10),
    last_used_at: hoursAgo(2),
    user_id: "demo-user",
  },
  {
    id: "tpl-3",
    name: "Learning Sprint",
    venture: "learning",
    work_type: "Course Work",
    default_focus: "Study and practice",
    default_completion_condition: "Module completed",
    default_tasks: [
      { id: "t1", text: "Watch lesson", completed: false },
      { id: "t2", text: "Take notes", completed: false },
      { id: "t3", text: "Practice exercises", completed: false },
    ],
    use_ai_tasks: false,
    created_at: daysAgo(7),
    last_used_at: daysAgo(1),
    user_id: "demo-user",
  },
  {
    id: "tpl-4",
    name: "Content Creation",
    venture: "creative",
    work_type: "Writing",
    default_focus: "Create and publish content",
    default_completion_condition: "Draft complete",
    default_tasks: [
      { id: "t1", text: "Outline key points", completed: false },
      { id: "t2", text: "Write first draft", completed: false },
      { id: "t3", text: "Edit and polish", completed: false },
    ],
    use_ai_tasks: false,
    created_at: daysAgo(5),
    last_used_at: daysAgo(1),
    user_id: "demo-user",
  },
  {
    id: "tpl-5",
    name: "Weekly Review",
    venture: "admin-life",
    work_type: "Planning",
    default_focus: "Review progress and plan ahead",
    default_completion_condition: "Next week planned",
    default_tasks: [
      { id: "t1", text: "Review accomplishments", completed: false },
      { id: "t2", text: "Identify blockers", completed: false },
      { id: "t3", text: "Set next week goals", completed: false },
    ],
    use_ai_tasks: false,
    created_at: daysAgo(12),
    last_used_at: daysAgo(2),
    user_id: "demo-user",
  },
  {
    id: "tpl-6",
    name: "Client Check-in",
    venture: "side-project",
    work_type: "Meetings",
    default_focus: "Sync with collaborators on project status",
    default_completion_condition: "Action items captured",
    default_tasks: [
      { id: "t1", text: "Prepare agenda", completed: false },
      { id: "t2", text: "Review deliverables", completed: false },
    ],
    use_ai_tasks: false,
    created_at: daysAgo(8),
    last_used_at: daysAgo(3),
    user_id: "demo-user",
  },
];

// Demo projects for Workflows page
const initialDemoProjects: DemoProject[] = [
  {
    id: "proj-1",
    user_id: "demo-user",
    name: "Build Focus App",
    description: "A productivity app to help people focus on what matters",
    venture: "side-project",
    status: "active",
    current_stage: 2,
    stages: [
      {
        name: "Research",
        work_type: "Research",
        venture: "side-project",
        tasks: [
          { id: "t1", text: "Competitor analysis", completed: true },
          { id: "t2", text: "User interviews", completed: true },
        ],
        completed: true,
        focus: "Understand the market",
      },
      {
        name: "Design",
        work_type: "Design",
        venture: "side-project",
        tasks: [
          { id: "t1", text: "Create wireframes", completed: true },
          { id: "t2", text: "Design UI mockups", completed: true },
          { id: "t3", text: "User testing", completed: true },
        ],
        completed: true,
        focus: "Design the experience",
      },
      {
        name: "Build MVP",
        work_type: "Building",
        venture: "side-project",
        tasks: [
          { id: "t1", text: "Set up project", completed: true },
          { id: "t2", text: "Build core features", completed: false },
          { id: "t3", text: "Add auth", completed: false },
          { id: "t4", text: "Testing", completed: false },
        ],
        completed: false,
        focus: "Build the first version",
      },
      {
        name: "Launch",
        work_type: "Marketing",
        venture: "side-project",
        tasks: [
          { id: "t1", text: "Write launch post", completed: false },
          { id: "t2", text: "Set up analytics", completed: false },
        ],
        completed: false,
        focus: "Ship it!",
      },
    ],
    project_template_id: null,
    created_at: daysAgo(21),
    updated_at: hoursAgo(2),
    completed_at: null,
  },
  {
    id: "proj-2",
    user_id: "demo-user",
    name: "Learn TypeScript",
    description: "Master TypeScript for better code quality",
    venture: "learning",
    status: "active",
    current_stage: 1,
    stages: [
      {
        name: "Basics",
        work_type: "Course Work",
        venture: "learning",
        tasks: [
          { id: "t1", text: "Types and interfaces", completed: true },
          { id: "t2", text: "Functions and generics", completed: true },
        ],
        completed: true,
        focus: "Learn fundamentals",
      },
      {
        name: "Intermediate",
        work_type: "Course Work",
        venture: "learning",
        tasks: [
          { id: "t1", text: "Advanced types", completed: true },
          { id: "t2", text: "Utility types", completed: false },
          { id: "t3", text: "Type guards", completed: false },
        ],
        completed: false,
        focus: "Deepen understanding",
      },
      {
        name: "Advanced",
        work_type: "Practice",
        venture: "learning",
        tasks: [
          { id: "t1", text: "Build a project", completed: false },
          { id: "t2", text: "Contribute to OSS", completed: false },
        ],
        completed: false,
        focus: "Apply in real projects",
      },
    ],
    project_template_id: null,
    created_at: daysAgo(14),
    updated_at: daysAgo(1),
    completed_at: null,
  },
];

// Demo future notes for HomeScreen
const initialDemoFutureNotes: DemoFutureNote[] = [
  {
    id: "note-1",
    category_id: "side-project",
    work_type: "Building",
    note: "Remember to review the auth flow tomorrow - the session refresh felt a bit slow.",
    sender_role: "Builder You",
    created_at: hoursAgo(4),
    is_read: false,
  },
  {
    id: "note-2",
    category_id: "creative",
    work_type: "Writing",
    note: "The animation timing on the hero felt off - try 300ms instead of 500ms.",
    sender_role: "Designer You",
    created_at: daysAgo(1),
    is_read: false,
  },
];

const demoProfile: DemoProfile = {
  display_name: "Demo Explorer",
  avatar_url: "character:commander",
  onboarding_completed: true,
};

const demoStats: DemoStats = {
  total_sessions_completed: 12,
  total_minutes_worked: 340,
  current_streak: 3,
  longest_streak: 7,
  projects_completed: 2,
  total_tasks_completed: 28,
  templates_created: 6,
  notes_sent: 5,
  notes_read: 3,
  achievements_unlocked: ["first_session", "streak_3", "tasks_10"],
  unique_categories_used: ["side-project", "learning", "daily-maintenance", "creative", "admin-life"],
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<DemoSession[]>(initialDemoSessions);
  const [futureNotes, setFutureNotes] = useState<DemoFutureNote[]>(initialDemoFutureNotes);

  const addSession = useCallback((s: Omit<DemoSession, "id">) => {
    setSessions((prev) => [{ ...s, id: `demo-${Date.now()}` }, ...prev]);
  }, []);

  const markNoteAsRead = useCallback((id: string) => {
    setFutureNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const completeTask = useCallback((sessionId: string, taskId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
              ),
            }
          : s
      )
    );
  }, []);

  const reset = useCallback(() => {
    setSessions(initialDemoSessions);
    setFutureNotes(initialDemoFutureNotes);
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo: true,
      sessions,
      templates: initialDemoTemplates,
      projects: initialDemoProjects,
      futureNotes,
      profile: demoProfile,
      stats: demoStats,
      addSession,
      markNoteAsRead,
      completeTask,
      reset,
    }),
    [sessions, futureNotes, addSession, markNoteAsRead, completeTask, reset]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  return useContext(DemoContext);
}
