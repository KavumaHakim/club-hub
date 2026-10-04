import React, { useState } from 'react';
import { BigButton, CodeBlock, Feedback, GameLanguage, GameProps, Hud, Lives, OverScreen, StartScreen, pickOne, randInt, shuffle } from './gameKit';

// Reading code in your head: each question is generated from a template with
// random values, its answer computed here (never typed by hand), in Python and
// JavaScript with identical logic. Wrong answers come with a step-by-step trace.

interface Question {
  code: Record<GameLanguage, string[]>;
  answer: string;
  options: string[];
  trace: string;
}

/** Four distinct options including the answer. */
const optionsFor = (answer: string, wrong: (string | number)[]) => {
  const set = new Set<string>([answer]);
  for (const w of wrong) {
    if (set.size >= 4) break;
    set.add(String(w));
  }
  let k = 1;
  while (set.size < 4 && /^-?\d+$/.test(answer)) set.add(String(Number(answer) + 10 * k++));
  // Letters (e.g. a repeated letter in a town name): fill from the alphabet.
  for (const c of 'aeiourstnlm') {
    if (set.size >= 4) break;
    set.add(c);
  }
  return shuffle([...set]);
};

const TOWNS = ['Kampala', 'Jinja', 'Mbarara', 'Gulu', 'Masaka', 'Entebbe', 'Mukono', 'Lira'];

const TEMPLATES: (() => Question)[] = [
  // Repeated addition in a loop
  () => {
    const fare = pickOne([500, 1000, 1500, 2000]);
    const trips = randInt(2, 5);
    const total = fare * trips;
    return {
      code: {
        python: [`fare = ${fare}`, 'total = 0', `for trip in range(${trips}):`, '    total = total + fare', 'print(total)'],
        javascript: [`let fare = ${fare};`, 'let total = 0;', `for (let trip = 0; trip < ${trips}; trip++) {`, '  total = total + fare;', '}', 'console.log(total);'],
      },
      answer: String(total),
      options: optionsFor(String(total), [fare * (trips - 1), fare * (trips + 1), fare + trips]),
      trace: `The loop runs ${trips} times, adding ${fare} each time: total goes ${Array.from({ length: trips + 1 }, (_, i) => fare * i).join(' → ')}.`,
    };
  },
  // Halving in a while loop
  () => {
    const bags = pickOne([10, 12, 20, 30, 40, 64, 100]);
    let b = bags;
    let days = 0;
    const steps = [String(b)];
    while (b > 1) { b = Math.floor(b / 2); days += 1; steps.push(String(b)); }
    return {
      code: {
        python: [`bags = ${bags}`, 'days = 0', 'while bags > 1:', '    bags = bags // 2', '    days = days + 1', 'print(days)'],
        javascript: [`let bags = ${bags};`, 'let days = 0;', 'while (bags > 1) {', '  bags = Math.floor(bags / 2);', '  days = days + 1;', '}', 'console.log(days);'],
      },
      answer: String(days),
      options: optionsFor(String(days), [days - 1, days + 1, Math.floor(bags / 2)]),
      trace: `bags halves (rounding down) until it's 1: ${steps.join(' → ')}. That's ${days} times round the loop.`,
    };
  },
  // if / elif chain (UNEB-style grades)
  () => {
    const marks = pickOne([35, 45, 59, 60, 72, 80, 91]);
    const grade = marks >= 80 ? 'D1' : marks >= 60 ? 'C3' : marks >= 40 ? 'P7' : 'F9';
    return {
      code: {
        python: [`marks = ${marks}`, 'if marks >= 80:', '    grade = "D1"', 'elif marks >= 60:', '    grade = "C3"', 'elif marks >= 40:', '    grade = "P7"', 'else:', '    grade = "F9"', 'print(grade)'],
        javascript: [`let marks = ${marks};`, 'let grade;', 'if (marks >= 80) {', '  grade = "D1";', '} else if (marks >= 60) {', '  grade = "C3";', '} else if (marks >= 40) {', '  grade = "P7";', '} else {', '  grade = "F9";', '}', 'console.log(grade);'],
      },
      answer: grade,
      options: shuffle(['D1', 'C3', 'P7', 'F9']),
      trace: `Checked from the top, the first true condition wins: ${marks} >= 80 is ${marks >= 80}${marks >= 80 ? '' : `, ${marks} >= 60 is ${marks >= 60}`}${marks >= 80 || marks >= 60 ? '' : `, ${marks} >= 40 is ${marks >= 40}`}. So grade is ${grade}.`,
    };
  },
  // The classic broken swap
  () => {
    const x = randInt(2, 9);
    let y = randInt(2, 9);
    if (y === x) y = x + 1;
    return {
      code: {
        python: [`a = ${x}`, `b = ${y}`, 'a = b', 'b = a', 'print(a, b)'],
        javascript: [`let a = ${x};`, `let b = ${y};`, 'a = b;', 'b = a;', 'console.log(a, b);'],
      },
      answer: `${y} ${y}`,
      options: shuffle([`${y} ${y}`, `${y} ${x}`, `${x} ${y}`, `${x} ${x}`]),
      trace: `a = b makes a ${y}, and the old ${x} is gone. Then b = a copies that ${y} back. To really swap you need a third variable (or a, b = b, a in Python).`,
    };
  },
  // A list growing and shrinking
  () => {
    const extra = pickOne(['tea', 'samosa', 'mandazi', 'juice']);
    const removes = randInt(0, 2);
    const length = 4 - removes;
    const pyRemoves = Array.from({ length: removes }, () => 'orders.pop(0)');
    const jsRemoves = Array.from({ length: removes }, () => 'orders.shift();');
    return {
      code: {
        python: ['orders = ["rolex", "chapati"]', 'orders.append("tea")', `orders.append("${extra}")`, ...pyRemoves, 'print(len(orders))'],
        javascript: ['let orders = ["rolex", "chapati"];', 'orders.push("tea");', `orders.push("${extra}");`, ...jsRemoves, 'console.log(orders.length);'],
      },
      answer: String(length),
      options: optionsFor(String(length), [length + 1, length - 1, 4, 2, 5]),
      trace: `Start with 2 orders, add 2 → 4${removes ? `, take ${removes} off the front → ${length}` : ''}.`,
    };
  },
  // Indexing a string (from 0)
  () => {
    const town = pickOne(TOWNS);
    const i = randInt(1, town.length - 2);
    const ch = town[i];
    return {
      code: {
        python: [`town = "${town}"`, `print(town[${i}])`],
        javascript: [`let town = "${town}";`, `console.log(town[${i}]);`],
      },
      answer: ch,
      options: optionsFor(ch, [town[i - 1], town[i + 1], town[0], town[town.length - 1]]),
      trace: `Positions start at 0: ${town.split('').map((c, k) => `${k}=${c}`).join(' ')}. Position ${i} is "${ch}".`,
    };
  },
  // Counting with a condition inside a loop
  () => {
    const scores = Array.from({ length: 5 }, () => pickOne([20, 35, 48, 50, 55, 67, 80, 92]));
    const count = scores.filter((s) => s >= 50).length;
    return {
      code: {
        python: [`scores = [${scores.join(', ')}]`, 'passed = 0', 'for s in scores:', '    if s >= 50:', '        passed += 1', 'print(passed)'],
        javascript: [`let scores = [${scores.join(', ')}];`, 'let passed = 0;', 'for (const s of scores) {', '  if (s >= 50) {', '    passed += 1;', '  }', '}', 'console.log(passed);'],
      },
      answer: String(count),
      options: optionsFor(String(count), [count + 1, count - 1, 5 - count, 5]),
      trace: `Only scores of 50 or more count: ${scores.map((s) => (s >= 50 ? `${s} ✓` : `${s} ✗`)).join(', ')}. That's ${count}.`,
    };
  },
  // A function returning a value
  () => {
    const a = randInt(2, 9);
    const b = randInt(1, 9);
    const x = a * 2 + b;
    return {
      code: {
        python: ['def double(n):', '    return n * 2', '', `x = double(${a}) + ${b}`, 'print(x)'],
        javascript: ['function double(n) {', '  return n * 2;', '}', '', `let x = double(${a}) + ${b};`, 'console.log(x);'],
      },
      answer: String(x),
      options: optionsFor(String(x), [(a + b) * 2, a + b, a * 2]),
      trace: `double(${a}) gives back ${a * 2}; then + ${b} makes ${x}.`,
    };
  },
];

const LIVES = 3;

const TraceVariable: React.FC<GameProps> = ({ language, best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [question, setQuestion] = useState<Question>(() => pickOne(TEMPLATES)());
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const start = () => {
    setLives(LIVES);
    setScore(0);
    setStreak(0);
    setAnswered(0);
    setPicked(null);
    setQuestion(pickOne(TEMPLATES)());
    setPhase('play');
  };

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    setAnswered((n) => n + 1);
    if (opt === question.answer) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setScore((s) => s + 10 + (nextStreak >= 3 ? 5 : 0));
    } else {
      setStreak(0);
      setLives((l) => l - 1);
    }
  };

  const next = () => {
    if (lives <= 0) {
      setPhase('over');
      onFinish(score);
      return;
    }
    setPicked(null);
    setQuestion(pickOne(TEMPLATES)());
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="reading code in your head: variables, loops, conditions and functions"
        howTo={[
          'Read the short program. Work out what it prints, without running it.',
          'Pick the answer. 10 points each, +5 when you\'re on a streak of 3 or more.',
          'A wrong answer costs a life and shows the program step by step. Three lives.',
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
        lines={[`${answered} programs traced`]}
        lesson="Tracing, following a program one line at a time and tracking each variable's value, is how programmers predict what code does and find bugs before running anything."
        onAgain={start}
      />
    );
  }

  const right = picked === question.answer;

  return (
    <div className="max-w-2xl">
      <Hud items={[
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Streak', value: streak },
        { label: 'Lives', value: <Lives left={lives} /> },
      ]} />
      <p className="mb-2 text-[14px] font-bold">What does this print?</p>
      <CodeBlock lines={question.code[language]} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => choose(opt)}
            disabled={!!picked}
            className={`border-2 px-4 py-3 text-left font-mono text-[15px] font-bold transition-colors ${
              picked && opt === question.answer ? 'border-green-600 bg-green-500/10 dark:border-green-400'
                : picked === opt ? 'border-ch-accent bg-ch-accent-soft'
                : 'border-ch-rule hover:bg-ch-surface disabled:opacity-60'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <Feedback tone={right ? 'good' : 'bad'}>
            {right ? 'Right! ' : `It prints ${question.answer}. `}{question.trace}
          </Feedback>
          <BigButton tone="primary" className="mt-4" onClick={next}>{lives <= 0 ? 'See score' : 'Next'}</BigButton>
        </>
      )}
    </div>
  );
};

export default TraceVariable;
