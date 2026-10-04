import React, { useState } from 'react';
import { BigButton, Feedback, GameLanguage, GameProps, Hud, Lives, OverScreen, StartScreen, shuffle } from './gameKit';

// Parsons puzzles: a working program's lines are shuffled; put them back in order.
// A line is [text] or [text, band]: lines sharing a band may swap places (two
// independent set-up lines). Identical lines (closing braces) are interchangeable too.

type Line = string | [string, string];
interface Puzzle { title: string; code: Record<GameLanguage, Line[]> }

const PUZZLES: Puzzle[] = [
  {
    title: 'Greet someone by name',
    code: {
      python: ['name = input()', 'greeting = "Hello, " + name', 'print(greeting)'],
      javascript: ['const name = readline();', 'const greeting = "Hello, " + name;', 'console.log(greeting);'],
    },
  },
  {
    title: 'Pass or fail',
    code: {
      python: ['marks = int(input())', 'if marks >= 50:', '    print("Pass")', 'else:', '    print("Fail")'],
      javascript: ['const marks = Number(readline());', 'if (marks >= 50) {', '  console.log("Pass");', '} else {', '  console.log("Fail");', '}'],
    },
  },
  {
    title: 'Count down to lift-off',
    code: {
      python: ['count = 3', 'while count > 0:', '    print(count)', '    count = count - 1', 'print("Go!")'],
      javascript: ['let count = 3;', 'while (count > 0) {', '  console.log(count);', '  count = count - 1;', '}', 'console.log("Go!");'],
    },
  },
  {
    title: 'Total of the boda boda fares',
    code: {
      python: [['fares = [2000, 1500, 3000]', 'setup'], ['total = 0', 'setup'], 'for fare in fares:', '    total = total + fare', 'print(total)'],
      javascript: [['const fares = [2000, 1500, 3000];', 'setup'], ['let total = 0;', 'setup'], 'for (const fare of fares) {', '  total = total + fare;', '}', 'console.log(total);'],
    },
  },
  {
    title: 'Add VAT with a function',
    code: {
      python: ['def add_vat(price):', '    return price * 1.18', '', 'cost = add_vat(1000)', 'print(cost)'],
      javascript: ['function addVat(price) {', '  return price * 1.18;', '}', 'const cost = addVat(1000);', 'console.log(cost);'],
    },
  },
  {
    title: 'Find the most expensive item',
    code: {
      python: ['prices = [300, 1200, 800]', 'biggest = prices[0]', 'for p in prices:', '    if p > biggest:', '        biggest = p', 'print(biggest)'],
      javascript: ['const prices = [300, 1200, 800];', 'let biggest = prices[0];', 'for (const p of prices) {', '  if (p > biggest) {', '    biggest = p;', '  }', '}', 'console.log(biggest);'],
    },
  },
  {
    title: 'Keep only the even numbers',
    code: {
      python: [['nums = [3, 8, 5, 12]', 'setup'], ['evens = []', 'setup'], 'for n in nums:', '    if n % 2 == 0:', '        evens.append(n)', 'print(evens)'],
      javascript: [['const nums = [3, 8, 5, 12];', 'setup'], ['const evens = [];', 'setup'], 'for (const n of nums) {', '  if (n % 2 === 0) {', '    evens.push(n);', '  }', '}', 'console.log(evens);'],
    },
  },
  {
    title: 'Grade from marks',
    code: {
      python: ['marks = int(input())', 'if marks >= 80:', '    grade = "D1"', 'elif marks >= 60:', '    grade = "C3"', 'else:', '    grade = "F9"', 'print(grade)'],
      javascript: [['const marks = Number(readline());', 'setup'], ['let grade;', 'setup'], 'if (marks >= 80) {', '  grade = "D1";', '} else if (marks >= 60) {', '  grade = "C3";', '} else {', '  grade = "F9";', '}', 'console.log(grade);'],
    },
  },
];

interface Piece { id: number; text: string; band: string }

const piecesOf = (lines: Line[]): Piece[] =>
  lines
    .map((l, id) => (typeof l === 'string' ? { id, text: l, band: l } : { id, text: l[0], band: `#${l[1]}` }))
    .filter((p) => p.text.trim() !== ''); // blank lines aren't pieces

const LIVES = 3;

const CodeJigsaw: React.FC<GameProps> = ({ language, best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<Piece[]>([]);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const [solved, setSolved] = useState(false);

  const solution = (i: number) => piecesOf(PUZZLES[i].code[language]);

  const setUp = (i: number) => {
    const sol = solution(i);
    let mixed = shuffle(sol);
    while (sol.length > 1 && mixed.every((p, k) => p.band === sol[k].band)) mixed = shuffle(sol);
    setOrder(mixed);
    setMisses(0);
    setChecked(null);
    setSolved(false);
  };

  const start = () => {
    setIndex(0);
    setLives(LIVES);
    setScore(0);
    setUp(0);
    setPhase('play');
  };

  const move = (from: number, to: number) => {
    if (solved || to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    setChecked(null);
  };

  const check = () => {
    const sol = solution(index);
    const marks = order.map((p, k) => p.band === sol[k].band);
    setChecked(marks);
    if (marks.every(Boolean)) {
      setSolved(true);
      setScore((s) => s + Math.max(5, 15 - misses * 3));
    } else {
      setMisses((m) => m + 1);
      setLives((l) => l - 1);
    }
  };

  const next = () => {
    if (lives <= 0 || index + 1 >= PUZZLES.length) {
      setPhase('over');
      onFinish(score);
      return;
    }
    setIndex(index + 1);
    setUp(index + 1);
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="how a program is put together: order, blocks and indentation"
        howTo={[
          'A working program has been cut into lines and shuffled.',
          'Move the lines up and down to put them back in order, then press Check.',
          'Solve it first time for 15 points. A wrong check costs a life and shows which lines are already in place. Three lives.',
        ]}
        onStart={start}
      />
    );
  }

  if (phase === 'over') {
    return (
      <OverScreen
        score={score}
        best={best}
        lines={[`${index + (solved ? 1 : 0)} of ${PUZZLES.length} programs rebuilt`]}
        lesson="A program runs top to bottom, so order matters: a variable must exist before it's used, and a loop's body sits inside it (indented in Python, between { } in JavaScript)."
        onAgain={start}
      />
    );
  }

  const failed = checked && !checked.every(Boolean);

  return (
    <div className="max-w-2xl">
      <Hud items={[
        { label: 'Program', value: `${index + 1}/${PUZZLES.length}` },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Lives', value: <Lives left={lives} /> },
      ]} />
      <p className="mb-3 text-[15px] font-bold">{PUZZLES[index].title}</p>

      <ol className="border border-ch-divider bg-ch-surface font-mono text-[13px]">
        {order.map((p, k) => (
          <li
            key={p.id}
            className={`flex items-stretch border-t border-ch-divider first:border-t-0 ${
              solved ? 'bg-green-500/10' : checked ? (checked[k] ? 'bg-green-500/10' : 'bg-ch-accent-soft') : ''
            }`}
          >
            <span className="w-8 flex-none select-none border-r border-ch-divider py-2 pr-2 text-right text-ch-muted">{k + 1}</span>
            <span className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-3 py-2">{p.text}</span>
            {!solved && (
              <span className="flex flex-none border-l border-ch-divider">
                <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} aria-label="Move up" className="w-9 hover:bg-ch-accent-soft disabled:opacity-25">↑</button>
                <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1} aria-label="Move down" className="w-9 border-l border-ch-divider hover:bg-ch-accent-soft disabled:opacity-25">↓</button>
              </span>
            )}
          </li>
        ))}
      </ol>

      {solved ? (
        <>
          <Feedback tone="good">That's the program. +{Math.max(5, 15 - misses * 3)}</Feedback>
          <BigButton tone="primary" className="mt-4" onClick={next}>{index + 1 >= PUZZLES.length ? 'See score' : 'Next program'}</BigButton>
        </>
      ) : failed ? (
        <>
          <Feedback tone="bad">Not yet. Green lines are in the right place; move the pink ones.</Feedback>
          {lives <= 0 ? <BigButton tone="primary" className="mt-4" onClick={next}>See score</BigButton> : <BigButton tone="primary" className="mt-4" onClick={check}>Check again</BigButton>}
        </>
      ) : (
        <BigButton tone="primary" className="mt-4" onClick={check}>Check</BigButton>
      )}
    </div>
  );
};

export default CodeJigsaw;
