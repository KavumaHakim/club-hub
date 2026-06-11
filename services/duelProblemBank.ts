import type { DuelGeneratedProblem, DuelGeneratedTestCase, DuelSkillLevel } from './geminiService';

/**
 * Built-in duel problems used when AI generation fails (provider down, bad
 * JSON, empty reasoning-model output). Test inputs are randomized per duel and
 * every expected output is computed by a reference implementation here, so the
 * cases are always correct. Judging still happens through the AI judge.
 */

// Small deterministic RNG so a single duel gets a coherent random suite.
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Rng = () => number;
const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const choice = <T,>(rng: Rng, items: T[]): T => items[randInt(rng, 0, items.length - 1)];

interface RawCase {
  input: string;
  explanation?: string;
}

const finalizeCases = (
  rawPublic: RawCase[],
  rawHidden: string[],
  solveRef: (input: string) => string,
  publicTestCount: number
): DuelGeneratedTestCase[] => {
  const publicCases = rawPublic.slice(0, publicTestCount).map((c, i) => ({
    id: `tc-${i + 1}`,
    input: c.input,
    expectedOutput: solveRef(c.input),
    explanation: c.explanation,
    hidden: false,
  }));
  const hiddenCases = rawHidden.map((input, i) => ({
    id: `tc-${publicCases.length + i + 1}`,
    input,
    expectedOutput: solveRef(input),
    hidden: true,
  }));
  return [...publicCases, ...hiddenCases];
};

// --- Problem 1 (BEGINNER): most frequent crate label, ties alphabetical ---

const crateTally = (rng: Rng, publicTestCount: number): DuelGeneratedProblem => {
  const labels = ['apple', 'bolt', 'cable', 'disk', 'fan', 'gear', 'lamp', 'wire'];

  const solveRef = (input: string): string => {
    const lines = input.split('\n');
    const n = parseInt(lines[0], 10);
    const counts = new Map<string, number>();
    for (let i = 1; i <= n; i += 1) {
      const word = (lines[i] || '').trim();
      counts.set(word, (counts.get(word) || 0) + 1);
    }
    let best = '';
    let bestCount = -1;
    for (const [word, count] of counts) {
      if (count > bestCount || (count === bestCount && word < best)) {
        best = word;
        bestCount = count;
      }
    }
    return best;
  };

  const makeInput = (words: string[]) => `${words.length}\n${words.join('\n')}`;

  const rawPublic: RawCase[] = [
    { input: makeInput(['bolt', 'gear', 'bolt']), explanation: '"bolt" appears twice, "gear" once.' },
    { input: makeInput(['lamp']), explanation: 'Only one crate, so "lamp" wins.' },
    { input: makeInput(['fan', 'disk']), explanation: 'Both appear once; "disk" is alphabetically first.' },
    { input: makeInput(['wire', 'wire', 'cable', 'cable']), explanation: 'Tie at 2 each; "cable" comes before "wire".' },
    { input: makeInput(['gear', 'gear', 'gear', 'bolt']), explanation: '"gear" clearly dominates with 3.' },
  ];

  const rawHidden: string[] = [];
  for (let i = 0; i < 17; i += 1) {
    const n = i < 3 ? randInt(rng, 1, 4) : randInt(rng, 5, 60);
    const pool = labels.slice(0, randInt(rng, 2, labels.length));
    const words = Array.from({ length: n }, () => choice(rng, pool));
    rawHidden.push(makeInput(words));
  }

  return {
    title: 'Supply Crate Tally',
    difficulty: 'Easy',
    statementMarkdown: `The club storeroom received a pile of supply crates and every crate has a label.

**Task:** find the label that appears the most. If several labels tie for the highest count, return the one that comes first alphabetically.

**Input format** (\`input_text\`): the first line is an integer \`n\` (number of crates). Each of the next \`n\` lines is one lowercase label.

**Output:** return the winning label as a string.

Use a dictionary (or \`collections.Counter\`) to count the labels.`,
    constraints: ['1 <= n <= 60', 'Labels are lowercase words without spaces', 'Ties break alphabetically'],
    tags: ['Hash Map', 'Counting', 'Strings'],
    starterCode: `def solve(input_text: str) -> str:
    lines = input_text.split("\\n")
    n = int(lines[0])
    labels = lines[1:n + 1]
    # Count the labels and return the winner
    return ""
`,
    estimatedMinutes: 12,
    targetLevel: 'BEGINNER',
    testCases: finalizeCases(rawPublic, rawHidden, solveRef, publicTestCount),
  };
};

// --- Problem 2 (INTERMEDIATE): balanced brackets (stack) ---

const bracketAudit = (rng: Rng, publicTestCount: number): DuelGeneratedProblem => {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  const solveRef = (input: string): string => {
    const s = input.trim();
    const stack: string[] = [];
    for (const ch of s) {
      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push(ch);
      } else if (ch === ')' || ch === ']' || ch === '}') {
        if (stack.pop() !== pairs[ch]) return 'NO';
      }
    }
    return stack.length === 0 ? 'YES' : 'NO';
  };

  const buildBalanced = (depth: number): string => {
    if (depth <= 0) return '';
    const open = choice(rng, ['(', '[', '{']);
    const close = open === '(' ? ')' : open === '[' ? ']' : '}';
    const inner = rng() > 0.5 ? buildBalanced(depth - 1) : '';
    const tail = rng() > 0.6 ? buildBalanced(depth - 1) : '';
    return `${open}${inner}${close}${tail}`;
  };

  const corrupt = (s: string): string => {
    if (!s) return '(';
    const i = randInt(rng, 0, s.length - 1);
    const replacement = choice(rng, ['(', ')', '[', ']', '{', '}']);
    return s.slice(0, i) + replacement + s.slice(i + 1);
  };

  const rawPublic: RawCase[] = [
    { input: '()', explanation: 'One pair, properly closed.' },
    { input: '([{}])', explanation: 'Every bracket closes in the right order.' },
    { input: '(]', explanation: 'A round bracket cannot be closed by a square one.' },
    { input: '((', explanation: 'Two brackets are never closed.' },
    { input: '{}[]()', explanation: 'Three independent balanced pairs.' },
  ];

  const rawHidden: string[] = [];
  for (let i = 0; i < 17; i += 1) {
    const balanced = buildBalanced(randInt(rng, 2, 7)) || '()';
    rawHidden.push(rng() > 0.45 ? balanced : corrupt(balanced));
  }

  return {
    title: 'Robot Bracket Audit',
    difficulty: 'Medium',
    statementMarkdown: `The club's build robot logs every action as brackets: \`()\`, \`[]\` and \`{}\`. A log is safe only if every bracket is closed by the matching type in the correct order.

**Task:** decide whether the log is balanced.

**Input format** (\`input_text\`): a single line containing only bracket characters.

**Output:** return \`"YES"\` if the log is balanced, otherwise \`"NO"\`.

A list used as a stack (\`append\` / \`pop\`) is the classic tool here.`,
    constraints: ['1 <= length <= 200', 'Only the characters ()[]{}', 'Return exactly "YES" or "NO"'],
    tags: ['Stacks', 'Strings'],
    starterCode: `def solve(input_text: str) -> str:
    log = input_text.strip()
    stack = []
    # Push opening brackets, match closing ones
    return "NO"
`,
    estimatedMinutes: 15,
    targetLevel: 'INTERMEDIATE',
    testCases: finalizeCases(rawPublic, rawHidden, solveRef, publicTestCount),
  };
};

// --- Problem 3 (INTERMEDIATE): top-k scores (sorting/heap) ---

const topScores = (rng: Rng, publicTestCount: number): DuelGeneratedProblem => {
  const solveRef = (input: string): string => {
    const lines = input.split('\n');
    const [nStr, kStr] = lines[0].split(' ');
    const k = parseInt(kStr, 10);
    const nums = lines[1].split(' ').slice(0, parseInt(nStr, 10)).map((x) => parseInt(x, 10));
    return nums
      .slice()
      .sort((a, b) => b - a)
      .slice(0, k)
      .join(' ');
  };

  const makeInput = (nums: number[], k: number) => `${nums.length} ${k}\n${nums.join(' ')}`;

  const rawPublic: RawCase[] = [
    { input: makeInput([40, 10, 30], 2), explanation: 'Sorted descending: 40 30 10 — keep the top 2.' },
    { input: makeInput([7], 1), explanation: 'Single score, k = 1.' },
    { input: makeInput([5, 5, 5], 2), explanation: 'Duplicates are allowed: top two are both 5.' },
    { input: makeInput([1, 2, 3, 4], 4), explanation: 'k equals n, so output everything descending.' },
    { input: makeInput([90, 15, 90, 60], 3), explanation: 'Both 90s count separately: 90 90 60.' },
  ];

  const rawHidden: string[] = [];
  for (let i = 0; i < 17; i += 1) {
    const n = i < 3 ? randInt(rng, 1, 5) : randInt(rng, 6, 80);
    const nums = Array.from({ length: n }, () => randInt(rng, 0, 999));
    rawHidden.push(makeInput(nums, randInt(rng, 1, n)));
  }

  return {
    title: 'Leaderboard Lockdown',
    difficulty: 'Medium',
    statementMarkdown: `The games tab leaderboard crashed and only the raw scores survived.

**Task:** rebuild the podium — output the \`k\` highest scores in descending order.

**Input format** (\`input_text\`): line 1 is \`n k\`; line 2 has \`n\` integers separated by spaces.

**Output:** the top \`k\` scores, descending, joined by single spaces (duplicates kept).

\`sorted(..., reverse=True)\` or \`heapq.nlargest\` both work — pick your weapon.`,
    constraints: ['1 <= k <= n <= 80', '0 <= score <= 999', 'Duplicates are kept'],
    tags: ['Sorting', 'Heaps'],
    starterCode: `def solve(input_text: str) -> str:
    lines = input_text.split("\\n")
    n, k = map(int, lines[0].split())
    scores = list(map(int, lines[1].split()))
    # Return the k largest scores, descending, space-separated
    return ""
`,
    estimatedMinutes: 14,
    targetLevel: 'INTERMEDIATE',
    testCases: finalizeCases(rawPublic, rawHidden, solveRef, publicTestCount),
  };
};

// --- Problem 4 (ADVANCED): grid BFS shortest path ---

const gridEscape = (rng: Rng, publicTestCount: number): DuelGeneratedProblem => {
  const solveRef = (input: string): string => {
    const lines = input.split('\n');
    const [r, c] = lines[0].split(' ').map((x) => parseInt(x, 10));
    const grid = lines.slice(1, 1 + r);
    if (grid[0][0] === '#' || grid[r - 1][c - 1] === '#') return '-1';
    const dist = Array.from({ length: r }, () => Array(c).fill(-1));
    dist[0][0] = 0;
    const queue: Array<[number, number]> = [[0, 0]];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (queue.length) {
      const [y, x] = queue.shift()!;
      if (y === r - 1 && x === c - 1) return String(dist[y][x]);
      for (const [dy, dx] of dirs) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < r && nx >= 0 && nx < c && grid[ny][nx] === '.' && dist[ny][nx] === -1) {
          dist[ny][nx] = dist[y][x] + 1;
          queue.push([ny, nx]);
        }
      }
    }
    return '-1';
  };

  const makeGrid = (r: number, c: number, wallChance: number): string => {
    const rows: string[] = [];
    for (let y = 0; y < r; y += 1) {
      let row = '';
      for (let x = 0; x < c; x += 1) {
        row += rng() < wallChance ? '#' : '.';
      }
      rows.push(row);
    }
    // Usually keep the corners open so paths exist more often than not.
    if (rng() > 0.2) {
      rows[0] = '.' + rows[0].slice(1);
      rows[r - 1] = rows[r - 1].slice(0, c - 1) + '.';
    }
    return `${r} ${c}\n${rows.join('\n')}`;
  };

  const rawPublic: RawCase[] = [
    { input: '2 2\n..\n..', explanation: 'Open 2x2 room: right then down = 2 steps.' },
    { input: '1 1\n.', explanation: 'Already standing on the exit: 0 steps.' },
    { input: '2 2\n.#\n#.', explanation: 'Both routes are walled off: -1.' },
    { input: '3 3\n...\n.#.\n...', explanation: 'Walk around the center server rack in 4 steps.' },
    { input: '3 4\n....\n###.\n....', explanation: 'Forced along the top, down the right side: 5 steps.' },
  ];

  const rawHidden: string[] = [];
  for (let i = 0; i < 17; i += 1) {
    const r = i < 3 ? randInt(rng, 1, 3) : randInt(rng, 4, 12);
    const c = i < 3 ? randInt(rng, 1, 3) : randInt(rng, 4, 12);
    rawHidden.push(makeGrid(r, c, i % 4 === 3 ? 0.45 : 0.22));
  }

  return {
    title: 'Server Room Escape',
    difficulty: 'Hard',
    statementMarkdown: `You are locked in the server room at \`(0, 0)\` and the exit is at the bottom-right corner. \`.\` cells are walkable, \`#\` cells are server racks.

**Task:** return the minimum number of moves (up/down/left/right) to reach the exit, or \`-1\` if it is unreachable.

**Input format** (\`input_text\`): line 1 is \`rows cols\`; the next \`rows\` lines are the grid.

**Output:** the minimum step count as a string, or \`"-1"\`.

Breadth-first search with \`collections.deque\` gives the shortest path in an unweighted grid. DFS will give wrong (non-minimal) answers.`,
    constraints: ['1 <= rows, cols <= 12', 'Grid contains only . and #', 'Start or exit may be blocked (answer -1)'],
    tags: ['BFS', 'Graphs', 'Grids'],
    starterCode: `from collections import deque

def solve(input_text: str) -> str:
    lines = input_text.split("\\n")
    rows, cols = map(int, lines[0].split())
    grid = lines[1:1 + rows]
    # BFS from (0, 0) to (rows - 1, cols - 1)
    return "-1"
`,
    estimatedMinutes: 20,
    targetLevel: 'ADVANCED',
    testCases: finalizeCases(rawPublic, rawHidden, solveRef, publicTestCount),
  };
};

export const buildBankProblem = (level: DuelSkillLevel, publicTestCount: number = 5): DuelGeneratedProblem => {
  const rng = mulberry32(Date.now() % 2147483647);
  if (level === 'BEGINNER') return crateTally(rng, publicTestCount);
  if (level === 'ADVANCED') return gridEscape(rng, publicTestCount);
  return rng() > 0.5 ? bracketAudit(rng, publicTestCount) : topScores(rng, publicTestCount);
};
