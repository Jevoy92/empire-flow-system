import { Venture } from '@/types/empire';

export type CategoryType = 'personal' | 'project';

export interface Category {
  id: string;
  name: string;
  tagline: string;
  type: CategoryType;
  color: string;
}

// Individual category colors for visual coding - each category gets a unique color
export const categoryColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
  // Personal
  'daily-maintenance': {
    bg: 'bg-venture-maintenance',
    border: 'border-l-[hsl(var(--venture-maintenance))]',
    text: 'text-[hsl(var(--venture-maintenance))]',
    light: 'bg-[hsl(var(--venture-maintenance)/0.12)]',
  },
  'body-energy': {
    bg: 'bg-venture-energy',
    border: 'border-l-[hsl(var(--venture-energy))]',
    text: 'text-[hsl(var(--venture-energy))]',
    light: 'bg-[hsl(var(--venture-energy)/0.12)]',
  },
  'admin-life': {
    bg: 'bg-venture-admin',
    border: 'border-l-[hsl(var(--venture-admin))]',
    text: 'text-[hsl(var(--venture-admin))]',
    light: 'bg-[hsl(var(--venture-admin)/0.12)]',
  },
  'transition': {
    bg: 'bg-venture-transition',
    border: 'border-l-[hsl(var(--venture-transition))]',
    text: 'text-[hsl(var(--venture-transition))]',
    light: 'bg-[hsl(var(--venture-transition)/0.12)]',
  },
  'care-relationships': {
    bg: 'bg-venture-care',
    border: 'border-l-[hsl(var(--venture-care))]',
    text: 'text-[hsl(var(--venture-care))]',
    light: 'bg-[hsl(var(--venture-care)/0.12)]',
  },

  // Projects
  'side-project': {
    bg: 'bg-venture-side-project',
    border: 'border-l-[hsl(var(--venture-side-project))]',
    text: 'text-[hsl(var(--venture-side-project))]',
    light: 'bg-[hsl(var(--venture-side-project)/0.12)]',
  },
  'learning': {
    bg: 'bg-venture-learning',
    border: 'border-l-[hsl(var(--venture-learning))]',
    text: 'text-[hsl(var(--venture-learning))]',
    light: 'bg-[hsl(var(--venture-learning)/0.12)]',
  },
  'creative': {
    bg: 'bg-venture-creative',
    border: 'border-l-[hsl(var(--venture-creative))]',
    text: 'text-[hsl(var(--venture-creative))]',
    light: 'bg-[hsl(var(--venture-creative)/0.12)]',
  },
  'collaboration': {
    bg: 'bg-venture-collaboration',
    border: 'border-l-[hsl(var(--venture-collaboration))]',
    text: 'text-[hsl(var(--venture-collaboration))]',
    light: 'bg-[hsl(var(--venture-collaboration)/0.12)]',
  },

  // Business
  'palmer-house': {
    bg: 'bg-venture-palmer',
    border: 'border-l-[hsl(var(--venture-palmer))]',
    text: 'text-[hsl(var(--venture-palmer))]',
    light: 'bg-[hsl(var(--venture-palmer)/0.12)]',
  },
  'besettld': {
    bg: 'bg-venture-besettld',
    border: 'border-l-[hsl(var(--venture-besettld))]',
    text: 'text-[hsl(var(--venture-besettld))]',
    light: 'bg-[hsl(var(--venture-besettld)/0.12)]',
  },
  'yourboy': {
    bg: 'bg-venture-yourboy',
    border: 'border-l-[hsl(var(--venture-yourboy))]',
    text: 'text-[hsl(var(--venture-yourboy))]',
    light: 'bg-[hsl(var(--venture-yourboy)/0.12)]',
  },
  'strinzees': {
    bg: 'bg-venture-strinzees',
    border: 'border-l-[hsl(var(--venture-strinzees))]',
    text: 'text-[hsl(var(--venture-strinzees))]',
    light: 'bg-[hsl(var(--venture-strinzees)/0.12)]',
  },
};

// Dynamic color palette for user ventures (consistent assignment based on name)
const dynamicColorPalette = [
  categoryColors['daily-maintenance'],
  categoryColors['body-energy'],
  categoryColors['admin-life'],
  categoryColors['transition'],
  categoryColors['care-relationships'],
  categoryColors['side-project'],
  categoryColors['learning'],
  categoryColors['creative'],
  categoryColors['collaboration'],
  categoryColors['palmer-house'],
  categoryColors['besettld'],
  categoryColors['yourboy'],
  categoryColors['strinzees'],
];

// Default fallback color
const defaultCategoryColor = { 
  bg: 'bg-primary',
  border: 'border-l-primary',
  text: 'text-primary',
  light: 'bg-primary/10'
};

// Simple hash function to get consistent index from string
function hashStringToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % max;
}

// Helper to get category color with fallback - now supports dynamic user ventures
export function getCategoryColor(categoryId: string) {
  // First check hardcoded categories
  if (categoryColors[categoryId]) {
    return categoryColors[categoryId];
  }
  
  // For user-created ventures, assign consistent color based on name hash
  if (categoryId && categoryId.length > 0) {
    const colorIndex = hashStringToIndex(categoryId.toLowerCase(), dynamicColorPalette.length);
    return dynamicColorPalette[colorIndex];
  }
  
  return defaultCategoryColor;
}

// Business Ventures
export const ventures: Venture[] = [
  {
    id: 'palmer-house',
    name: 'Palmer House',
    tagline: 'Video Systems',
    description: 'Professional cinematic production. High-end video work, documentary, and commercial storytelling.',
    color: 'venture-palmer',
    glowColor: 'venture-palmer-glow',
    status: 'active',
    activeProjects: 3,
    pendingTasks: 7,
  },
  {
    id: 'besettld',
    name: 'beSettld',
    tagline: 'Luxury Support',
    description: 'Calm, orderly premium services. Helping clients find peace through organized systems.',
    color: 'venture-besettld',
    glowColor: 'venture-besettld-glow',
    status: 'active',
    activeProjects: 2,
    pendingTasks: 4,
  },
  {
    id: 'yourboy',
    name: 'YourBoyJevoy',
    tagline: 'Artistic Expression',
    description: 'Vibrant, community-focused creative brand. Personal expression and audience connection.',
    color: 'venture-yourboy',
    glowColor: 'venture-yourboy-glow',
    status: 'active',
    activeProjects: 5,
    pendingTasks: 12,
  },
  {
    id: 'strinzees',
    name: 'Strinzees',
    tagline: 'Modular Design',
    description: 'Playful prototyping and modular apparel. Experimental fashion and product development.',
    color: 'venture-strinzees',
    glowColor: 'venture-strinzees-glow',
    status: 'developing',
    activeProjects: 1,
    pendingTasks: 3,
  },
];

// All categories (projects + personal life operations)
// Legacy business ventures converted to projects for backwards compatibility
export const categories: Category[] = [
  // Legacy Business Ventures (now treated as Projects)
  { id: 'palmer-house', name: 'Palmer House', tagline: 'Video Systems', type: 'project', color: 'primary' },
  { id: 'besettld', name: 'beSettld', tagline: 'Luxury Support', type: 'project', color: 'primary' },
  { id: 'yourboy', name: 'YourBoyJevoy', tagline: 'Artistic Expression', type: 'project', color: 'primary' },
  { id: 'strinzees', name: 'Strinzees', tagline: 'Modular Design', type: 'project', color: 'primary' },
  // Projects
  { id: 'side-project', name: 'Side Project', tagline: 'Independent creative or technical work', type: 'project', color: 'secondary' },
  { id: 'learning', name: 'Learning', tagline: 'Skill development and courses', type: 'project', color: 'secondary' },
  { id: 'creative', name: 'Creative', tagline: 'Art, writing, music, hobbies', type: 'project', color: 'secondary' },
  { id: 'collaboration', name: 'Collaboration', tagline: 'Projects with others', type: 'project', color: 'secondary' },
  // Personal Life Operations
  { id: 'daily-maintenance', name: 'Daily Maintenance', tagline: 'Low effort, high anxiety if skipped', type: 'personal', color: 'accent' },
  { id: 'body-energy', name: 'Body & Energy', tagline: 'Reduce decision fatigue', type: 'personal', color: 'accent' },
  { id: 'admin-life', name: 'Admin Life', tagline: 'Important but mentally avoided', type: 'personal', color: 'accent' },
  { id: 'transition', name: 'Transition', tagline: 'Prevent context bleed', type: 'personal', color: 'accent' },
  { id: 'care-relationships', name: 'Care & Relationships', tagline: 'Optional but stabilizing', type: 'personal', color: 'accent' },
];

// Work types organized by category
export const workTypesByCategory: Record<string, string[]> = {
  // Business work types (shared across ventures)
  'palmer-house': ['Content Editing', 'Content Creation', 'Client Communication', 'Strategic Planning', 'Admin & Files'],
  'besettld': ['Client Communication', 'Strategic Planning', 'Admin & Files', 'Sales & Outreach'],
  'yourboy': ['Content Editing', 'Content Creation', 'Social Media', 'Learning & Research'],
  'strinzees': ['Content Creation', 'Strategic Planning', 'Learning & Research'],
  // Projects
  'side-project': ['Building', 'Planning', 'Research', 'Testing', 'Documentation'],
  'learning': ['Course Work', 'Practice', 'Note Taking', 'Review', 'Application'],
  'creative': ['Creating', 'Brainstorming', 'Editing', 'Refining', 'Sharing'],
  'collaboration': ['Meeting', 'Coordination', 'Review', 'Feedback', 'Integration'],
  // Personal life operations
  'daily-maintenance': ['Bank Check', 'Morning Routine', 'Evening Shutdown', 'Daily Review'],
  'body-energy': ['Eating Session', 'Movement', 'Hydration Check'],
  'admin-life': ['Personal Admin', 'Email Cleanup', 'Appointments', 'Documents'],
  'transition': ['Morning Start', 'Midday Reset', 'End-of-Day Shutdown'],
  'care-relationships': ['Family Check-in', 'Partner Time', 'Personal Reflection'],
};

// Legacy flat list for backwards compatibility
export const workTypes = [
  'Content Editing',
  'Content Creation',
  'Client Communication',
  'Strategic Planning',
  'Admin & Files',
  'Social Media',
  'Sales & Outreach',
  'Learning & Research',
  'Bank Check',
  'Morning Routine',
  'Evening Shutdown',
  'Daily Review',
  'Eating Session',
  'Movement',
  'Hydration Check',
  'Personal Admin',
  'Email Cleanup',
  'Appointments',
  'Documents',
  'Morning Start',
  'Midday Reset',
  'End-of-Day Shutdown',
  'Family Check-in',
  'Partner Time',
  'Personal Reflection',
  // Project work types
  'Building',
  'Planning',
  'Research',
  'Testing',
  'Documentation',
  'Course Work',
  'Practice',
  'Note Taking',
  'Review',
  'Application',
  'Creating',
  'Brainstorming',
  'Editing',
  'Refining',
  'Sharing',
  'Meeting',
  'Coordination',
  'Feedback',
  'Integration',
];

export const defaultTasks: Record<string, string[]> = {
  // Business work types
  'Content Editing': [
    'Review feedback or notes',
    'Audio fixes',
    'Video fixes',
    'Graphics or thumbnails',
    'Export or save progress',
  ],
  'Content Creation': [
    'Outline or script',
    'Record raw content',
    'Capture B-roll or assets',
    'Review rough cut',
    'Make notes for editing',
  ],
  'Client Communication': [
    'Review incoming messages',
    'Draft responses',
    'Send updates or deliverables',
    'Schedule follow-ups',
    'Update client notes',
  ],
  'Strategic Planning': [
    'Review current priorities',
    'Identify blockers',
    'Set weekly goals',
    'Allocate time blocks',
    'Document decisions',
  ],
  'Admin & Files': [
    'Create missing folders',
    'Move loose files',
    'Rename inconsistent files',
    'Archive old versions',
    'Update file index',
  ],
  'Social Media': [
    'Write captions',
    'Select media',
    'Schedule posts',
    'Add hashtags or links',
    'Engage with comments',
  ],
  'Sales & Outreach': [
    'Review leads list',
    'Draft outreach messages',
    'Follow up on pending',
    'Update CRM notes',
    'Track responses',
  ],
  'Learning & Research': [
    'Identify learning topic',
    'Watch or read material',
    'Take notes',
    'Try practical application',
    'Document learnings',
  ],
  // Personal life operations
  'Bank Check': [
    'Open bank app',
    'Check checking balance',
    'Check savings balance',
    'Scan recent transactions',
    'Note anything unusual or close',
  ],
  'Morning Routine': [
    'Wake up at set time',
    'Hydrate',
    'Light movement or stretch',
    'Review today\'s first session',
    'Begin work',
  ],
  'Evening Shutdown': [
    'Review tomorrow\'s first session',
    'Write next Work Session Focus',
    'Close open tabs',
    'Tidy workspace',
    'Leave work area',
  ],
  'Daily Review': [
    'What got done today?',
    'What didn\'t get done?',
    'What needs attention tomorrow?',
    'Any wins to acknowledge?',
    'Close the day mentally',
  ],
  'Eating Session': [
    'Decide meal from options',
    'Prepare food',
    'Eat without screens',
    'Clean up dishes',
    'Reset kitchen',
  ],
  'Movement': [
    'Choose movement type',
    'Set timer',
    'Complete movement',
    'Cool down',
    'Note how you feel',
  ],
  'Hydration Check': [
    'Check water bottle level',
    'Refill if needed',
    'Drink a full glass',
    'Set reminder for next',
  ],
  'Personal Admin': [
    'Open admin list',
    'Handle first item fully',
    'Move to next item',
    'Update list status',
    'Stop when timer ends',
  ],
  'Email Cleanup': [
    'Process inbox top-down',
    'Archive or delete obvious items',
    'Respond to quick items',
    'Flag items needing more time',
    'Reach inbox zero or scheduled',
  ],
  'Appointments': [
    'Review upcoming appointments',
    'Confirm any needed',
    'Reschedule if necessary',
    'Add prep time blocks',
    'Update calendar',
  ],
  'Documents': [
    'Identify document to process',
    'Read or review',
    'Take action if needed',
    'File appropriately',
    'Update tracking',
  ],
  'Morning Start': [
    'Review today\'s schedule',
    'Set primary focus for today',
    'Clear notifications',
    'Open first work session',
    'Begin',
  ],
  'Midday Reset': [
    'Step away from workspace',
    'Check energy level',
    'Eat if needed',
    'Review afternoon priorities',
    'Return to work',
  ],
  'End-of-Day Shutdown': [
    'Review what got done',
    'Write tomorrow\'s first focus',
    'Close all work apps',
    'Tidy workspace',
    'Mentally close work',
  ],
  'Family Check-in': [
    'Put away devices',
    'Ask how they\'re doing',
    'Listen actively',
    'Share something from your day',
    'End naturally',
  ],
  'Partner Time': [
    'Set aside devices',
    'Give full attention',
    'Talk without agenda',
    'Listen more than speak',
    'End after agreed time',
  ],
  'Personal Reflection': [
    'Find quiet space',
    'Set timer',
    'Free write or think',
    'Note any insights',
    'Close gently',
  ],
  // Project work types
  'Building': [
    'Review current state',
    'Identify next step',
    'Work on implementation',
    'Test progress',
    'Document changes',
  ],
  'Planning': [
    'Define objective',
    'Break into steps',
    'Estimate time needed',
    'Identify dependencies',
    'Create action list',
  ],
  'Research': [
    'Define question',
    'Find sources',
    'Take notes',
    'Synthesize findings',
    'Document conclusions',
  ],
  'Testing': [
    'Identify test cases',
    'Run tests',
    'Document results',
    'Fix issues found',
    'Verify fixes',
  ],
  'Documentation': [
    'Outline structure',
    'Write content',
    'Add examples',
    'Review clarity',
    'Publish or save',
  ],
  'Course Work': [
    'Review lesson objectives',
    'Watch or read material',
    'Take notes',
    'Complete exercises',
    'Review key points',
  ],
  'Practice': [
    'Set practice goal',
    'Warm up',
    'Focus on skill',
    'Push limits',
    'Cool down and reflect',
  ],
  'Note Taking': [
    'Prepare materials',
    'Capture key points',
    'Organize notes',
    'Highlight important items',
    'Save and tag',
  ],
  'Application': [
    'Choose concept to apply',
    'Create small project',
    'Work through challenges',
    'Review results',
    'Note learnings',
  ],
  'Creating': [
    'Set intention',
    'Gather materials',
    'Begin work',
    'Enter flow state',
    'Wrap up session',
  ],
  'Brainstorming': [
    'Define problem or topic',
    'Generate ideas freely',
    'Don\'t judge yet',
    'Cluster related ideas',
    'Select top candidates',
  ],
  'Refining': [
    'Review current version',
    'Identify improvements',
    'Make refinements',
    'Compare versions',
    'Decide next steps',
  ],
  'Sharing': [
    'Prepare content',
    'Choose platform',
    'Write description',
    'Post or send',
    'Engage with feedback',
  ],
  'Coordination': [
    'Review shared tasks',
    'Update status',
    'Communicate blockers',
    'Align on next steps',
    'Confirm deadlines',
  ],
  'Feedback': [
    'Review work thoroughly',
    'Note strengths',
    'Identify improvements',
    'Provide constructive notes',
    'Discuss if needed',
  ],
  'Integration': [
    'Review contributions',
    'Test compatibility',
    'Merge or combine',
    'Resolve conflicts',
    'Verify final result',
  ],
};

// Helper to get category by id
export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}

export function getVentureLabel(id: string): string {
  const category = getCategoryById(id);
  if (category?.name) return category.name;

  const venture = ventures.find((item) => item.id === id);
  if (venture?.name) return venture.name;

  return id;
}

export function getVentureCardTone(id: string): { bg: string; border: string; accent: string } {
  const color = getCategoryColor(id);
  return {
    bg: color.light,
    border: 'border-border/70',
    accent: color.bg,
  };
}

// Helper to get work types for a category
export function getWorkTypesForCategory(categoryId: string): string[] {
  return workTypesByCategory[categoryId] || [];
}
