import React, { createContext, useContext, useMemo, useState } from "react";

interface DemoSession {
  id: string;
  startedAt?: string;
  endedAt?: string;
  intent: string;
  durationMinutes: number;
  notes?: string;
  venture?: string;
  workType?: string;
}

interface DemoProfile {
  display_name: string;
  avatar_url: string;
  onboarding_completed: boolean;
}

interface DemoStats {
  total_sessions: number;
  total_focus_time: number;
  current_streak: number;
  projects_completed: number;
}

interface DemoContextValue {
  isDemo: boolean;
  sessions: DemoSession[];
  profile: DemoProfile;
  stats: DemoStats;
  addSession: (s: Omit<DemoSession, "id">) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const initialDemoSessions: DemoSession[] = [
  {
    id: "demo-1",
    intent: "Write the next 5 minutes of the plan, not the whole plan.",
    durationMinutes: 25,
    startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    notes: "Kept it small. Actually shipped something.",
    venture: "besettld",
    workType: "Deep Work",
  },
  {
    id: "demo-2",
    intent: "Review and refactor the authentication flow.",
    durationMinutes: 45,
    startedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 135).toISOString(),
    notes: "Fixed edge case with session refresh.",
    venture: "focusflow",
    workType: "Code Review",
  },
];

const demoProfile: DemoProfile = {
  display_name: "Demo Explorer",
  avatar_url: "character:commander",
  onboarding_completed: true,
};

const demoStats: DemoStats = {
  total_sessions: 12,
  total_focus_time: 340,
  current_streak: 3,
  projects_completed: 2,
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<DemoSession[]>(initialDemoSessions);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo: true,
      sessions,
      profile: demoProfile,
      stats: demoStats,
      addSession: (s) =>
        setSessions((prev) => [{ ...s, id: `demo-${prev.length + 1}` }, ...prev]),
      reset: () => setSessions(initialDemoSessions),
    }),
    [sessions]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  return useContext(DemoContext);
}
