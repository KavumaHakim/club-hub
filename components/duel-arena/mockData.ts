import {
  ArenaEditorFile,
  ArenaEditorSettings,
  DuelLanguage,
  DuelRank,
} from './types';

export const RANK_STYLES: Record<
  DuelRank,
  {
    glow: string;
    ring: string;
    text: string;
    badge: string;
  }
> = {
  Bronze: {
    glow: 'shadow-[0_0_30px_rgba(180,83,9,0.25)]',
    ring: 'border-amber-700/50',
    text: 'text-amber-200',
    badge: 'from-amber-700 to-orange-500',
  },
  Silver: {
    glow: 'shadow-[0_0_30px_rgba(148,163,184,0.2)]',
    ring: 'border-slate-400/40',
    text: 'text-slate-100',
    badge: 'from-slate-300 to-slate-500',
  },
  Gold: {
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.2)]',
    ring: 'border-yellow-400/40',
    text: 'text-yellow-100',
    badge: 'from-yellow-300 to-amber-500',
  },
  Platinum: {
    glow: 'shadow-[0_0_30px_rgba(45,212,191,0.2)]',
    ring: 'border-teal-400/40',
    text: 'text-teal-100',
    badge: 'from-teal-300 to-cyan-500',
  },
  Diamond: {
    glow: 'shadow-[0_0_30px_rgba(96,165,250,0.22)]',
    ring: 'border-sky-400/40',
    text: 'text-sky-100',
    badge: 'from-sky-300 to-blue-500',
  },
  Master: {
    glow: 'shadow-[0_0_30px_rgba(192,132,252,0.22)]',
    ring: 'border-violet-400/40',
    text: 'text-violet-100',
    badge: 'from-violet-300 to-fuchsia-500',
  },
  Grandmaster: {
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.25)]',
    ring: 'border-rose-400/40',
    text: 'text-rose-100',
    badge: 'from-rose-300 to-red-500',
  },
  Legendary: {
    glow: 'shadow-[0_0_40px_rgba(34,211,238,0.3)]',
    ring: 'border-cyan-300/50',
    text: 'text-cyan-50',
    badge: 'from-cyan-300 via-violet-400 to-fuchsia-500',
  },
};

export const DIFFICULTY_META = {
  Easy: { label: 'Easy', badgeVariant: 'success' as const },
  Medium: { label: 'Medium', badgeVariant: 'warning' as const },
  Hard: { label: 'Hard', badgeVariant: 'danger' as const },
  Elite: { label: 'Elite', badgeVariant: 'elite' as const },
};

export const LANGUAGE_LABELS: Record<DuelLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
};

export const DEFAULT_EDITOR_SETTINGS: ArenaEditorSettings = {
  themePreset: 'arena-pulse',
  fontSize: 15,
  vimMode: false,
  minimap: true,
};

export const QUICK_TAUNTS = [
  'My solve() is already passing samples.',
  'Hidden tests are coming for you.',
  'Hope you remembered the edge cases.',
  'collections.Counter says hi.',
];

/** Editor workspace for a real duel: the problem's starter file plus a scratch notes file. */
export function createDuelFiles(starterCode: string): ArenaEditorFile[] {
  return [
    {
      id: 'solver',
      name: 'solution.py',
      language: 'python',
      content: starterCode,
    },
    {
      id: 'notes',
      name: 'notes.md',
      language: 'markdown',
      content: `# Scratchpad

- Parse input_text first, then solve.
- Only 5 sample tests are revealed; hidden tests run on submit.
- Watch for empty input, duplicates, and ties.`,
    },
  ];
}
