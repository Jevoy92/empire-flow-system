import { Venture } from '@/types/empire';

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

export const workTypes = [
  'Content Editing',
  'Content Creation',
  'Client Communication',
  'Strategic Planning',
  'Admin & Files',
  'Social Media',
  'Sales & Outreach',
  'Learning & Research',
];
