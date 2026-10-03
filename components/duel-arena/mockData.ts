import {
  ArenaEditorFile,
  ArenaEditorSettings,
  DuelLanguage,
} from './types';

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
