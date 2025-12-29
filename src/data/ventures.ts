import { Venture } from '@/types/empire';

export type CategoryType = 'business' | 'personal' | 'project';

export interface Category {
  id: string;
  name: string;
  tagline: string;
  type: CategoryType;
  color: string;
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

// All categories (business ventures + personal life operations + projects)
export const categories: Category[] = [
  // Business Ventures
  { id: 'palmer-house', name: 'Palmer House', tagline: 'Video Systems', type: 'business', color: 'primary' },
  { id: 'besettld', name: 'beSettld', tagline: 'Luxury Support', type: 'business', color: 'primary' },
  { id: 'yourboy', name: 'YourBoyJevoy', tagline: 'Artistic Expression', type: 'business', color: 'primary' },
  { id: 'strinzees', name: 'Strinzees', tagline: 'Modular Design', type: 'business', color: 'primary' },
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
