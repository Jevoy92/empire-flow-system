export interface CharacterAvatar {
  id: string;
  name: string;
  emoji: string;
  motivation: string;
  color: string;
}

export const characterAvatars: CharacterAvatar[] = [
  {
    id: 'commander',
    name: 'The Commander',
    emoji: '👑',
    motivation: 'Every empire starts with a single decision.',
    color: 'bg-amber-500',
  },
  {
    id: 'architect',
    name: 'The Architect',
    emoji: '🏛️',
    motivation: 'I build systems that build success.',
    color: 'bg-slate-500',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    emoji: '🧭',
    motivation: 'New territories await discovery.',
    color: 'bg-emerald-500',
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    emoji: '♟️',
    motivation: 'Victory favors the prepared mind.',
    color: 'bg-indigo-500',
  },
  {
    id: 'innovator',
    name: 'The Innovator',
    emoji: '💡',
    motivation: "Today's experiment is tomorrow's standard.",
    color: 'bg-yellow-500',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    emoji: '🛡️',
    motivation: 'Protecting what matters, building what lasts.',
    color: 'bg-blue-500',
  },
  {
    id: 'pioneer',
    name: 'The Pioneer',
    emoji: '🚀',
    motivation: 'Where others see limits, I see starting points.',
    color: 'bg-rose-500',
  },
  {
    id: 'catalyst',
    name: 'The Catalyst',
    emoji: '⚡',
    motivation: 'Small actions, massive transformations.',
    color: 'bg-violet-500',
  },
];
