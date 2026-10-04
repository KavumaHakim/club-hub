import React, { useRef, useState } from 'react';
import { BigButton, Feedback, GameProps, Hud, OverScreen, StartScreen, randInt, useCountdown } from './gameKit';

// Binary search, unplugged: find the hidden number from higher/lower clues.
// The fewest guesses that always works is about log2 of the range; finding it
// within that earns a bonus, so players discover "guess the middle".

const ROUND_SECONDS = 60;
const RANGES = [20, 50, 100, 500, 1000];
const bestPossible = (max: number) => Math.ceil(Math.log2(max + 1));

const NumberHunt: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [found, setFound] = useState(0);
  const [score, setScore] = useState(0);
  const [efficient, setEfficient] = useState(0);
  const [max, setMax] = useState(RANGES[0]);
  const [target, setTarget] = useState(0);
  const [low, setLow] = useState(1);
  const [high, setHigh] = useState(RANGES[0]);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [value, setValue] = useState('');
  const [note, setNote] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const newNumber = (foundSoFar: number) => {
    const m = RANGES[Math.min(RANGES.length - 1, Math.floor(foundSoFar / 2))];
    setMax(m);
    setTarget(randInt(1, m));
    setLow(1);
    setHigh(m);
    setGuesses([]);
    setValue('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const start = () => {
    setFound(0);
    setScore(0);
    setEfficient(0);
    setNote(null);
    newNumber(0);
    setPhase('play');
  };

  const end = () => {
    setPhase('over');
    onFinish(scoreRef.current);
  };
  const left = useCountdown(ROUND_SECONDS, phase === 'play', end);

  const guess = (e?: React.FormEvent) => {
    e?.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) {
      setNote({ tone: 'info', text: `Type a whole number from 1 to ${max}.` });
      return;
    }
    const tried = [...guesses, n];
    setGuesses(tried);
    setValue('');
    if (n === target) {
      const limit = bestPossible(max);
      const gotBonus = tried.length <= limit;
      const points = 10 + (gotBonus ? 10 : 0);
      setScore((s) => s + points);
      setEfficient((c) => c + (gotBonus ? 1 : 0));
      setFound(found + 1);
      newNumber(found + 1);
      setNote({
        tone: 'good',
        text: gotBonus
          ? `Found ${n} in ${tried.length} guesses: within the ${limit} that always works. +${points}`
          : `Found ${n} in ${tried.length} guesses. Guessing the middle each time always takes ${limit} or fewer. +${points}`,
      });
    } else if (n < target) {
      setLow(Math.max(low, n + 1));
      setNote({ tone: 'info', text: `${n} is too low. It's higher.` });
    } else {
      setHigh(Math.min(high, n - 1));
      setNote({ tone: 'info', text: `${n} is too high. It's lower.` });
    }
    inputRef.current?.focus();
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="binary search: halving the possibilities each time"
        howTo={[
          'A number is hidden somewhere in the range. Guess it.',
          'After each guess you\'re told if the number is higher or lower.',
          'Each number found is 10 points, plus 10 more if you used no more guesses than the smart way needs.',
          `Find as many as you can in ${ROUND_SECONDS} seconds. The ranges get bigger.`,
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
        lines={[`${found} numbers found`, `${efficient} found within the smart number of guesses`]}
        lesson="Guess the middle of what's left. Each guess cuts the range in half, so even 1 to 1000 takes at most 10 guesses. That's binary search, how computers look things up in sorted lists."
        onAgain={start}
      />
    );
  }

  const span = high - low + 1;
  const pct = (n: number) => ((n - 1) / Math.max(1, max - 1)) * 100;

  return (
    <div className="max-w-2xl">
      <Hud items={[
        { label: 'Time', value: `${left}s`, tone: left <= 10 ? 'warn' : undefined },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Guesses', value: `${guesses.length} / ${bestPossible(max)}` },
      ]} />

      <p className="mb-1 text-[13px] text-ch-muted">The number is between</p>
      <p className="mb-3 text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">
        {low} <span className="text-ch-muted">and</span> {high}
      </p>

      {/* What's still possible, shrinking with every guess. */}
      <div className="relative mb-6 h-8 border border-ch-divider bg-ch-surface">
        <div className="absolute inset-y-0 bg-ch-accent-soft" style={{ left: `${pct(low)}%`, width: `${Math.max(0.6, ((span) / max) * 100)}%` }} />
        {guesses.map((g, i) => (
          <span key={i} className="absolute inset-y-0 w-[2px] bg-ch-rule" style={{ left: `${pct(g)}%` }} title={String(g)} />
        ))}
        <span className="absolute left-1 top-1 text-[10px] text-ch-muted">1</span>
        <span className="absolute right-1 top-1 text-[10px] text-ch-muted">{max}</span>
      </div>

      <form onSubmit={guess} className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          autoFocus
          placeholder="Your guess"
          className="min-w-0 flex-1 border-2 border-ch-rule bg-ch-bg px-4 py-3 text-[18px] font-extrabold tabular-nums outline-none focus:border-ch-accent"
        />
        <BigButton tone="primary" type="submit">Guess</BigButton>
      </form>
      {note && <Feedback tone={note.tone}>{note.text}</Feedback>}
    </div>
  );
};

export default NumberHunt;
