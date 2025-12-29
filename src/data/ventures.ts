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
  // Personal (5 distinct colors)
  'daily-maintenance': { 
    bg: 'bg-amber-500', 
    border: 'border-l-amber-500', 
    text: 'text-amber-500', 
    light: 'bg-amber-500/10' 
  },
  'body-energy': { 
    bg: 'bg-emerald-500', 
    border: 'border-l-emerald-500', 
    text: 'text-emerald-500', 
    light: 'bg-emerald-500/10' 
  },
  'admin-life': { 
    bg: 'bg-blue-500', 
    border: 'border-l-blue-500', 
    text: 'text-blue-500', 
    light: 'bg-blue-500/10' 
  },
  'transition': { 
    bg: 'bg-violet-500', 
    border: 'border-l-violet-500', 
    text: 'text-violet-500', 
    light: 'bg-violet-500/10' 
  },
  'care-relationships': { 
    bg: 'bg-pink-500', 
    border: 'border-l-pink-500', 
    text: 'text-pink-500', 
    light: 'bg-pink-500/10' 
  },
  
  // Projects (4 distinct colors)
  'side-project': { 
    bg: 'bg-orange-500', 
    border: 'border-l-orange-500', 
    text: 'text-orange-500', 
    light: 'bg-orange-500/10' 
  },
  'learning': { 
    bg: 'bg-teal-500', 
    border: 'border-l-teal-500', 
    text: 'text-teal-500', 
    light: 'bg-teal-500/10' 
  },
  'creative': { 
    bg: 'bg-rose-500', 
    border: 'border-l-rose-500', 
    text: 'text-rose-500', 
    light: 'bg-rose-500/10' 
  },
  'collaboration': { 
    bg: 'bg-indigo-500', 
    border: 'border-l-indigo-500', 
    text: 'text-indigo-500', 
    light: 'bg-indigo-500/10' 
  },
  
  // Business (4 distinct colors)
  'palmer-house': { 
    bg: 'bg-sky-600', 
    border: 'border-l-sky-600', 
    text: 'text-sky-600', 
    light: 'bg-sky-600/10' 
  },
  'besettld': { 
    bg: 'bg-green-600', 
    border: 'border-l-green-600', 
    text: 'text-green-600', 
    light: 'bg-green-600/10' 
  },
  'yourboy': { 
    bg: 'bg-purple-600', 
    border: 'border-l-purple-600', 
    text: 'text-purple-600', 
    light: 'bg-purple-600/10' 
  },
  'strinzees': { 
    bg: 'bg-orange-600', 
    border: 'border-l-orange-600', 
    text: 'text-orange-600', 
    light: 'bg-orange-600/10' 
  },
};

// Dynamic color palette for user ventures (consistent assignment based on name)
const dynamicColorPalette = [
  { bg: 'bg-amber-500', border: 'border-l-amber-500', text: 'text-amber-500', light: 'bg-amber-500/10' },
  { bg: 'bg-emerald-500', border: 'border-l-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-500/10' },
  { bg: 'bg-blue-500', border: 'border-l-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' },
  { bg: 'bg-violet-500', border: 'border-l-violet-500', text: 'text-violet-500', light: 'bg-violet-500/10' },
  { bg: 'bg-pink-500', border: 'border-l-pink-500', text: 'text-pink-500', light: 'bg-pink-500/10' },
  { bg: 'bg-orange-500', border: 'border-l-orange-500', text: 'text-orange-500', light: 'bg-orange-500/10' },
  { bg: 'bg-teal-500', border: 'border-l-teal-500', text: 'text-teal-500', light: 'bg-teal-500/10' },
  { bg: 'bg-rose-500', border: 'border-l-rose-500', text: 'text-rose-500', light: 'bg-rose-500/10' },
  { bg: 'bg-indigo-500', border: 'border-l-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-500/10' },
  { bg: 'bg-cyan-500', border: 'border-l-cyan-500', text: 'text-cyan-500', light: 'bg-cyan-500/10' },
  { bg: 'bg-lime-500', border: 'border-l-lime-500', text: 'text-lime-500', light: 'bg-lime-500/10' },
  { bg: 'bg-fuchsia-500', border: 'border-l-fuchsia-500', text: 'text-fuchsia-500', light: 'bg-fuchsia-500/10' },
];

// Default fallback color
const defaultCategoryColor = { 
  bg: 'bg-gray-500', 
  border: 'border-l-gray-500', 
  text: 'text-gray-500', 
  light: 'bg-gray-500/10' 
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

// Helper to get work types for a category
export function getWorkTypesForCategory(categoryId: string): string[] {
  return workTypesByCategory[categoryId] || [];
}
