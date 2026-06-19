import type { DuelQuizQuestion, DuelQuizSet, DuelSkillLevel } from './geminiService';

/**
 * Built-in 15-question mixed quiz used when AI generation fails (provider down, bad
 * JSON). Coding questions ship with hand-verified expected outputs so a correct
 * solution always scores. Mirrors the role of duelProblemBank for the legacy format.
 */

const QUIZ_SECONDS = 20;
const CODING_SECONDS = 60;

const QUIZ_CARDS: Array<Omit<DuelQuizQuestion & { kind: 'quiz' }, 'id' | 'seconds'>> = [
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'What is the time complexity of looking up a key in a Python `dict` (average case)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: 'O(1)',
  },
  {
    kind: 'quiz',
    type: 'TRUE_FALSE',
    question: 'In Python, a `set` can contain duplicate elements.',
    correctAnswer: 'False',
  },
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'Which data structure follows Last-In-First-Out (LIFO) order?',
    options: ['Stack', 'Queue', 'Heap', 'Linked list'],
    correctAnswer: 'Stack',
  },
  {
    kind: 'quiz',
    type: 'SHORT_ANSWER',
    question: 'What Python built-in returns the number of items in a list?',
    correctAnswer: 'len',
    acceptedAnswers: ['len()', 'len(list)', 'the len function'],
  },
  {
    kind: 'quiz',
    type: 'TRUE_FALSE',
    question: 'Strings in Python are immutable.',
    correctAnswer: 'True',
  },
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'What does `"abc"[::-1]` evaluate to in Python?',
    options: ['"cba"', '"abc"', '"a"', 'Error'],
    correctAnswer: '"cba"',
  },
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'Which `collections` helper counts how many times each element appears?',
    options: ['Counter', 'deque', 'defaultdict', 'OrderedDict'],
    correctAnswer: 'Counter',
  },
  {
    kind: 'quiz',
    type: 'SHORT_ANSWER',
    question: 'What keyword defines a function in Python?',
    correctAnswer: 'def',
  },
  {
    kind: 'quiz',
    type: 'TRUE_FALSE',
    question: 'A breadth-first search (BFS) on an unweighted graph finds the shortest path in edges.',
    correctAnswer: 'True',
  },
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'What is `7 // 2` in Python 3?',
    options: ['3', '3.5', '4', '2'],
    correctAnswer: '3',
  },
  {
    kind: 'quiz',
    type: 'MULTIPLE_CHOICE',
    question: 'Which method adds a single element to the end of a Python list?',
    options: ['append', 'extend', 'insert', 'add'],
    correctAnswer: 'append',
  },
  {
    kind: 'quiz',
    type: 'SHORT_ANSWER',
    question: 'What value does an empty list evaluate to in a boolean context (True or False)?',
    correctAnswer: 'False',
    acceptedAnswers: ['falsy', 'false'],
  },
];

const CODING_CARDS: Array<Omit<DuelQuizQuestion & { kind: 'coding' }, 'id' | 'seconds'>> = [
  {
    kind: 'coding',
    question:
      'Read two integers separated by a space from `input_text` and return their sum as a string.\n\nExample: `"2 3"` → `"5"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    a, b = input_text.split()\n    # return their sum\n    return ""\n',
    testCases: [
      { id: 'c1-1', input: '2 3', expectedOutput: '5', hidden: false },
      { id: 'c1-2', input: '10 -4', expectedOutput: '6', hidden: true },
      { id: 'c1-3', input: '0 0', expectedOutput: '0', hidden: true },
      { id: 'c1-4', input: '-7 -8', expectedOutput: '-15', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question: 'Return the reverse of the string in `input_text`.\n\nExample: `"hello"` → `"olleh"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    return ""\n',
    testCases: [
      { id: 'c2-1', input: 'hello', expectedOutput: 'olleh', hidden: false },
      { id: 'c2-2', input: 'a', expectedOutput: 'a', hidden: true },
      { id: 'c2-3', input: 'racecar', expectedOutput: 'racecar', hidden: true },
      { id: 'c2-4', input: 'duel', expectedOutput: 'leud', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question:
      'Count the vowels (a, e, i, o, u) in the lowercase string `input_text` and return the count as a string.\n\nExample: `"banana"` → `"3"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    # count vowels\n    return "0"\n',
    testCases: [
      { id: 'c3-1', input: 'banana', expectedOutput: '3', hidden: false },
      { id: 'c3-2', input: 'xyz', expectedOutput: '0', hidden: true },
      { id: 'c3-3', input: 'aeiou', expectedOutput: '5', hidden: true },
      { id: 'c3-4', input: 'programming', expectedOutput: '3', hidden: true },
    ],
  },
];

export const buildBankQuizSet = (level: DuelSkillLevel): DuelQuizSet => {
  // Interleave so coding questions are spread through the set, not clustered at the end.
  const quiz: DuelQuizQuestion[] = QUIZ_CARDS.map((c, i) => ({ ...c, id: `q-${i + 1}`, seconds: QUIZ_SECONDS }));
  const coding: DuelQuizQuestion[] = CODING_CARDS.map((c, i) => ({ ...c, id: `qc-${i + 1}`, seconds: CODING_SECONDS }));

  const questions: DuelQuizQuestion[] = [];
  let qi = 0;
  let ci = 0;
  for (let i = 0; i < quiz.length + coding.length; i += 1) {
    // Drop a coding question roughly every 5th slot.
    if ((i + 1) % 5 === 0 && ci < coding.length) {
      questions.push(coding[ci++]);
    } else if (qi < quiz.length) {
      questions.push(quiz[qi++]);
    } else if (ci < coding.length) {
      questions.push(coding[ci++]);
    }
  }

  return {
    title: 'Code Duel: Rapid Round',
    difficulty: level === 'ADVANCED' ? 'Hard' : level === 'INTERMEDIATE' ? 'Medium' : 'Easy',
    tags: ['Python', 'DSA', 'Quiz'],
    targetLevel: level,
    questions,
  };
};
