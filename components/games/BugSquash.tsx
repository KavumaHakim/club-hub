import React, { useEffect, useRef, useState } from 'react';
import { BigButton, CodeBlock, Feedback, GameLanguage, GameProps, Hud, Lives, OverScreen, StartScreen, shuffle } from './gameKit';

// Debugging: each program has exactly one wrong line, given what it should do.
// Tap it. Hand-written, checked in both languages; the bug line differs by language
// because of braces.

interface Bug {
  task: string;
  code: Record<GameLanguage, { lines: string[]; bug: number }>;
  why: string;
}

const BUGS: Bug[] = [
  {
    task: 'Add up the boda boda fares and print the total (6500).',
    code: {
      python: { lines: ['fares = [2000, 1500, 3000]', 'total = 0', 'for fare in fares:', '    total = total - fare', 'print(total)'], bug: 3 },
      javascript: { lines: ['const fares = [2000, 1500, 3000];', 'let total = 0;', 'for (const fare of fares) {', '  total = total - fare;', '}', 'console.log(total);'], bug: 3 },
    },
    why: 'It subtracts each fare instead of adding it: it should be total + fare.',
  },
  {
    task: 'Print the numbers 1 to 5.',
    code: {
      python: { lines: ['for n in range(1, 5):', '    print(n)'], bug: 0 },
      javascript: { lines: ['for (let n = 1; n < 5; n++) {', '  console.log(n);', '}'], bug: 0 },
    },
    why: 'The loop stops before 5. range(1, 5) gives 1 to 4, and so does n < 5. Use range(1, 6) or n <= 5.',
  },
  {
    task: 'A mark of 50 or more is a pass. This student got exactly 50.',
    code: {
      python: { lines: ['marks = 50', 'if marks > 50:', '    print("Pass")', 'else:', '    print("Fail")'], bug: 1 },
      javascript: { lines: ['let marks = 50;', 'if (marks > 50) {', '  console.log("Pass");', '} else {', '  console.log("Fail");', '}'], bug: 1 },
    },
    why: '> leaves out 50 itself. "50 or more" is >=.',
  },
  {
    task: 'Print the average of the three scores (70).',
    code: {
      python: { lines: ['scores = [60, 70, 80]', 'average = sum(scores) / 2', 'print(average)'], bug: 1 },
      javascript: { lines: ['const scores = [60, 70, 80];', 'const total = scores[0] + scores[1] + scores[2];', 'const average = total / 2;', 'console.log(average);'], bug: 2 },
    },
    why: 'There are three scores, so divide by 3 (or by the list\'s length), not 2.',
  },
  {
    task: 'Find the most expensive item (1200).',
    code: {
      python: { lines: ['prices = [300, 1200, 800]', 'biggest = prices[0]', 'for p in prices:', '    if p < biggest:', '        biggest = p', 'print(biggest)'], bug: 3 },
      javascript: { lines: ['const prices = [300, 1200, 800];', 'let biggest = prices[0];', 'for (const p of prices) {', '  if (p < biggest) {', '    biggest = p;', '  }', '}', 'console.log(biggest);'], bug: 3 },
    },
    why: 'p < biggest keeps the smallest. To keep the biggest, replace it when p > biggest.',
  },
  {
    task: 'Count down 3, 2, 1, then print "Go!".',
    code: {
      python: { lines: ['count = 3', 'while count > 0:', '    print(count)', '    count = count + 1', 'print("Go!")'], bug: 3 },
      javascript: { lines: ['let count = 3;', 'while (count > 0) {', '  console.log(count);', '  count = count + 1;', '}', 'console.log("Go!");'], bug: 3 },
    },
    why: 'count goes up, so it never reaches 0 and the loop never ends. It should be count - 1.',
  },
  {
    task: 'Read a name and greet them: "Hello, Amina".',
    code: {
      python: { lines: ['name = input()', 'greeting = "Hello, " + Name', 'print(greeting)'], bug: 1 },
      javascript: { lines: ['const name = readline();', 'const greeting = "Hello, " + Name;', 'console.log(greeting);'], bug: 1 },
    },
    why: 'Names are case-sensitive: the variable is name, not Name.',
  },
  {
    task: 'Add 18% VAT to a price and print it (1180).',
    code: {
      python: { lines: ['def add_vat(price):', '    price * 1.18', '', 'print(add_vat(1000))'], bug: 1 },
      javascript: { lines: ['function addVat(price) {', '  price * 1.18;', '}', 'console.log(addVat(1000));'], bug: 1 },
    },
    why: 'The function works out the answer but never returns it, so you get None / undefined. It needs return.',
  },
  {
    task: 'Print the last stall in the list ("chapati").',
    code: {
      python: { lines: ['stalls = ["fruit", "tomatoes", "chapati"]', 'last = stalls[3]', 'print(last)'], bug: 1 },
      javascript: { lines: ['const stalls = ["fruit", "tomatoes", "chapati"];', 'const last = stalls[3];', 'console.log(last);'], bug: 1 },
    },
    why: 'Positions start at 0, so three items are at 0, 1 and 2. The last is [2] (or [-1] in Python).',
  },
  {
    task: 'Print only the even numbers (8 and 12).',
    code: {
      python: { lines: ['nums = [3, 8, 5, 12]', 'for n in nums:', '    if n % 2 == 1:', '        print(n)'], bug: 2 },
      javascript: { lines: ['const nums = [3, 8, 5, 12];', 'for (const n of nums) {', '  if (n % 2 === 1) {', '    console.log(n);', '  }', '}'], bug: 2 },
    },
    why: 'A remainder of 1 after dividing by 2 means odd. Even numbers have remainder 0.',
  },
  {
    task: 'Add up the shopping and print the total (4000).',
    code: {
      python: { lines: ['items = [500, 1000, 2500]', 'for price in items:', '    total = 0', '    total = total + price', 'print(total)'], bug: 2 },
      javascript: { lines: ['const items = [500, 1000, 2500];', 'let total;', 'for (const price of items) {', '  total = 0;', '  total = total + price;', '}', 'console.log(total);'], bug: 3 },
    },
    why: 'total is reset to 0 every time round the loop, so only the last price is kept. Set it to 0 once, before the loop.',
  },
];

const LIVES = 3;

const BugSquash: React.FC<GameProps> = ({ language, best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [deck, setDeck] = useState<Bug[]>(() => shuffle(BUGS));
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const shownAt = useRef(Date.now());

  const bug = deck[index];
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, phase]);

  const start = () => {
    setDeck(shuffle(BUGS));
    setIndex(0);
    setLives(LIVES);
    setScore(0);
    setFound(0);
    setTapped(null);
    setPhase('play');
  };

  const tap = (line: number) => {
    if (tapped !== null) return;
    setTapped(line);
    if (line === bug.code[language].bug) {
      const seconds = (Date.now() - shownAt.current) / 1000;
      setScore((s) => s + 10 + Math.max(0, Math.round(10 - seconds / 2)));
      setFound((f) => f + 1);
    } else {
      setLives((l) => l - 1);
    }
  };

  const next = () => {
    if (lives <= 0 || index + 1 >= deck.length) {
      setPhase('over');
      onFinish(score);
      return;
    }
    setIndex((i) => i + 1);
    setTapped(null);
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="debugging: comparing what code does with what it should do"
        howTo={[
          'Read what the program is supposed to do.',
          'Each program has exactly one wrong line. Tap it.',
          'Faster finds score more (up to 20). A wrong tap costs a life; three lives.',
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
        lines={[`${found} of ${index + 1} bugs squashed`]}
        lesson="Most bugs are tiny: one wrong sign, a < instead of <=, a variable reset in the wrong place. Debugging means asking what each line actually does, and comparing it with what it should do."
        onAgain={start}
      />
    );
  }

  const { lines, bug: bugLine } = bug.code[language];
  const right = tapped === bugLine;

  return (
    <div className="max-w-2xl">
      <Hud items={[
        { label: 'Bug', value: `${index + 1}/${deck.length}` },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Lives', value: <Lives left={lives} /> },
      ]} />
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">It should</p>
      <p className="mb-3 text-[15px] font-bold">{bug.task}</p>
      <CodeBlock
        lines={lines}
        onLineClick={tapped === null ? tap : undefined}
        marked={tapped === null ? null : right ? { line: bugLine, tone: 'good' } : { line: tapped, tone: 'bad' }}
        highlight={tapped !== null && !right ? bugLine : null}
      />
      {tapped === null ? (
        <p className="mt-3 text-[12px] text-ch-muted">Tap the line with the bug.</p>
      ) : (
        <>
          <Feedback tone={right ? 'good' : 'bad'}>
            {right ? 'Squashed! ' : `The bug is on line ${bugLine + 1}. `}{bug.why}
          </Feedback>
          <BigButton tone="primary" className="mt-4" onClick={next}>{lives <= 0 || index + 1 >= deck.length ? 'See score' : 'Next bug'}</BigButton>
        </>
      )}
    </div>
  );
};

export default BugSquash;
