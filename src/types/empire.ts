export type VentureId = 'palmer-house' | 'besettld' | 'yourboy' | 'strinzees';

export interface Venture {
  id: VentureId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  glowColor: string;
  status: 'active' | 'developing' | 'dormant';
  activeProjects: number;
  pendingTasks: number;
}

export type EnergyLevel = 'high' | 'medium' | 'low' | 'depleted';

export interface WorkSession {
  id: string;
  venture: VentureId;
  workType: string;
  focus: string;
  completionCondition: string;
  currentStage: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface DailyState {
  date: string;
  energyLevel: EnergyLevel;
  preFlightComplete: boolean;
  activeSession?: WorkSession;
  sessionsCompleted: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  venture?: VentureId;
  stage: 'spark' | 'developing' | 'project';
  createdAt: Date;
}
