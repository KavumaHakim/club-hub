import type { DuelQuizQuestion, DuelQuizSet, DuelSkillLevel } from './geminiService';
import { DEFAULT_RULES, questionSplit, type DuelRules } from './duelRules';

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
  {
    kind: 'coding',
    question:
      'Read the space-separated integers in `input_text` and return the largest one as a string.\n\nExample: `"3 7 2"` → `"7"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    nums = [int(x) for x in input_text.split()]\n    # return the largest\n    return ""\n',
    testCases: [
      { id: 'c4-1', input: '3 7 2', expectedOutput: '7', hidden: false },
      { id: 'c4-2', input: '-1 -5 -3', expectedOutput: '-1', hidden: true },
      { id: 'c4-3', input: '10', expectedOutput: '10', hidden: true },
      { id: 'c4-4', input: '4 4 4', expectedOutput: '4', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question:
      'Return the number of space-separated words in `input_text` as a string.\n\nExample: `"hello there world"` → `"3"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    # count the words\n    return "0"\n',
    testCases: [
      { id: 'c5-1', input: 'hello there world', expectedOutput: '3', hidden: false },
      { id: 'c5-2', input: 'single', expectedOutput: '1', hidden: true },
      { id: 'c5-3', input: 'a b c d', expectedOutput: '4', hidden: true },
      { id: 'c5-4', input: 'duel time now', expectedOutput: '3', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question: 'Return `input_text` converted to uppercase.\n\nExample: `"duel"` → `"DUEL"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    return ""\n',
    testCases: [
      { id: 'c6-1', input: 'duel', expectedOutput: 'DUEL', hidden: false },
      { id: 'c6-2', input: 'abc', expectedOutput: 'ABC', hidden: true },
      { id: 'c6-3', input: 'MixEd', expectedOutput: 'MIXED', hidden: true },
      { id: 'c6-4', input: 'go', expectedOutput: 'GO', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question:
      'Return `"YES"` if `input_text` reads the same forwards and backwards, otherwise `"NO"`.\n\nExample: `"racecar"` → `"YES"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    # is it a palindrome?\n    return "NO"\n',
    testCases: [
      { id: 'c7-1', input: 'racecar', expectedOutput: 'YES', hidden: false },
      { id: 'c7-2', input: 'hello', expectedOutput: 'NO', hidden: true },
      { id: 'c7-3', input: 'abba', expectedOutput: 'YES', hidden: true },
      { id: 'c7-4', input: 'abc', expectedOutput: 'NO', hidden: true },
    ],
  },
  {
    kind: 'coding',
    question:
      'Read two integers separated by a space from `input_text` and return their product as a string.\n\nExample: `"3 4"` → `"12"`.',
    starterCode: 'def solve(input_text: str) -> str:\n    a, b = input_text.split()\n    # return the product\n    return ""\n',
    testCases: [
      { id: 'c8-1', input: '3 4', expectedOutput: '12', hidden: false },
      { id: 'c8-2', input: '0 5', expectedOutput: '0', hidden: true },
      { id: 'c8-3', input: '-2 6', expectedOutput: '-12', hidden: true },
      { id: 'c8-4', input: '7 7', expectedOutput: '49', hidden: true },
    ],
  },
];

export const buildBankQuizSet = (level: DuelSkillLevel, rules: DuelRules = DEFAULT_RULES): DuelQuizSet => {
  // The bank is Python only. A JavaScript duel only lands here when every AI attempt
  // failed; it then gets the bank's Python questions rather than no duel at all.
  // Count, mix and timings follow the rules as far as the bank's size allows.
  const split = questionSplit(rules);
  const shuffled = <T,>(list: T[]) => list.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const coding: DuelQuizQuestion[] = shuffled(CODING_CARDS).slice(0, split.coding)
    .map((c, i) => ({ ...c, language: 'python' as const, id: `qc-${i + 1}`, seconds: rules.codingSeconds || CODING_SECONDS }));
  const quiz: DuelQuizQuestion[] = shuffled(QUIZ_CARDS).slice(0, split.quiz)
    .map((c, i) => ({ ...c, id: `q-${i + 1}`, seconds: rules.quizSeconds || QUIZ_SECONDS }));

  const questions: DuelQuizQuestion[] = [];
  let qi = 0;
  let ci = 0;
  for (let i = 0; i < quiz.length + coding.length; i += 1) {
    // Weave a quiz question in roughly every 3rd slot; coding fills the rest.
    if ((i + 1) % 3 === 0 && qi < quiz.length) {
      questions.push(quiz[qi++]);
    } else if (ci < coding.length) {
      questions.push(coding[ci++]);
    } else if (qi < quiz.length) {
      questions.push(quiz[qi++]);
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
