import React, { useMemo, useRef, useState } from 'react';
import { BigButton, Feedback, GameProps, Hud, OverScreen, StartScreen, pickOne, randInt, useCountdown } from './gameKit';

// An algorithm and a key: the Caesar cipher shifts every letter the same number of
// places. Decoding is running the algorithm backwards. Later levels hide the key,
// so players crack it from one known letter, which is also why it isn't secure.

const ROUND_SECONDS = 75;
const LEVEL_EVERY = 3;
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const SHORT = ['BODA', 'ROLEX', 'MANGO', 'LOOP', 'CODE', 'BUG', 'JINJA', 'POSHO', 'MATOOKE', 'TAXI', 'CHALK', 'MOUSE'];
const LONG = ['CHAPATI', 'KAMPALA', 'LAPTOP', 'LIBRARY', 'FOOTBALL', 'NETBALL', 'PYTHON', 'VARIABLE', 'FUNCTION', 'KEYBOARD', 'MARKET', 'ENTEBBE'];
const PHRASES = ['MEET AT BREAK', 'BRING THE BALL', 'CODE CLUB TODAY', 'BUY TWO ROLEX', 'THE KEY IS SEVEN', 'SAVE YOUR WORK', 'RUN THE TESTS', 'LUNCH IS POSHO'];

const shiftText = (text: string, by: number) =>
  text.replace(/[A-Z]/g, (c) => A[(A.indexOf(c) + by + 26 * 4) % 26]);

interface Puzzle { plain: string; secret: string; shift: number; showKey: boolean }

const makePuzzle = (level: number): Puzzle => {
  const plain = level === 0 ? pickOne(SHORT) : level === 1 ? pickOne(LONG) : level === 2 ? pickOne([...SHORT, ...LONG]) : pickOne(PHRASES);
  const shift = level === 0 ? randInt(1, 3) : randInt(3, 12);
  return { plain, secret: shiftText(plain, shift), shift, showKey: level < 2 };
};

const SecretMessages: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [level, setLevel] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => makePuzzle(0));
  const [value, setValue] = useState('');
  const [note, setNote] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const next = (lvl: number) => {
    setPuzzle(makePuzzle(lvl));
    setValue('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const start = () => {
    setScore(0);
    setSolved(0);
    setLevel(0);
    setNote(null);
    next(0);
    setPhase('play');
  };
  const end = () => {
    setPhase('over');
    onFinish(scoreRef.current);
  };
  const left = useCountdown(ROUND_SECONDS, phase === 'play', end);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tidy = (t: string) => t.toUpperCase().replace(/[^A-Z]/g, '');
    if (tidy(value) === tidy(puzzle.plain)) {
      const points = 5 * (level + 1);
      const nextSolved = solved + 1;
      const nextLevel = Math.min(3, Math.floor(nextSolved / LEVEL_EVERY));
      setScore((s) => s + points);
      setSolved(nextSolved);
      setNote({
        tone: 'good',
        text: `"${puzzle.plain}". The key was ${puzzle.shift}. +${points}${nextLevel > level ? `. Level ${nextLevel + 1}${nextLevel === 2 ? ': the key is now hidden.' : nextLevel === 3 ? ': whole messages.' : '.'}` : ''}`,
      });
      setLevel(nextLevel);
      next(nextLevel);
    } else {
      setNote({ tone: 'bad', text: 'Not quite. Check each letter, or skip.' });
      inputRef.current?.focus();
    }
  };

  const skip = () => {
    setNote({ tone: 'info', text: `It was "${puzzle.plain}" (key ${puzzle.shift}).` });
    next(level);
  };

  const wheel = useMemo(() => (puzzle.showKey ? shiftText(A, puzzle.shift) : null), [puzzle]);

  if (phase === 'start') {
    return (
      <StartScreen
        concept="algorithms and keys: how a simple cipher works, and why it's easy to crack"
        howTo={[
          'Each secret word was made by moving every letter forward the same number of places, the key. With key 2, A becomes C.',
          'To decode, move each letter back by the key and type the real word.',
          'From level 3 the key is hidden, but you\'re told the first letter. Work the key out from it.',
          `Decode as many as you can in ${ROUND_SECONDS} seconds.`,
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
        lines={[`${solved} messages decoded`, `Reached level ${level + 1} of 4`]}
        lesson="Encrypting is running an algorithm with a key; decrypting runs it backwards. With only 25 possible keys, one known letter cracks it. Real encryption uses keys so huge that trying them all would take millions of years."
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <Hud items={[
        { label: 'Time', value: `${left}s`, tone: left <= 10 ? 'warn' : undefined },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Level', value: `${level + 1}/4` },
        { label: 'Key', value: puzzle.showKey ? puzzle.shift : '?' },
      ]} />

      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">Secret message</p>
      <p className="mb-2 break-words font-mono text-[34px] font-extrabold tracking-[0.12em]">{puzzle.secret}</p>
      {!puzzle.showKey && (
        <p className="mb-3 text-[13px] text-ch-muted">
          Clue: it starts with <span className="font-mono font-extrabold text-ch-text">{puzzle.plain[0]}</span>. How far is {puzzle.secret[0]} from {puzzle.plain[0]}?
        </p>
      )}

      {wheel && (
        <div className="mb-4 overflow-x-auto border border-ch-divider font-mono text-[12px]">
          <div className="flex min-w-max">
            <span className="w-16 flex-none border-r border-ch-divider px-2 py-1 text-ch-muted">real</span>
            {A.split('').map((c) => <span key={c} className="w-6 py-1 text-center">{c}</span>)}
          </div>
          <div className="flex min-w-max border-t border-ch-divider bg-ch-surface">
            <span className="w-16 flex-none border-r border-ch-divider px-2 py-1 text-ch-muted">secret</span>
            {wheel.split('').map((c, i) => <span key={i} className="w-6 py-1 text-center font-extrabold text-ch-accent">{c}</span>)}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="The real word"
          className="min-w-0 flex-1 border-2 border-ch-rule bg-ch-bg px-4 py-3 font-mono text-[18px] font-extrabold tracking-[0.08em] outline-none focus:border-ch-accent"
        />
        <BigButton tone="primary" type="submit">Decode</BigButton>
        <BigButton type="button" onClick={skip}>Skip</BigButton>
      </form>
      {note && <Feedback tone={note.tone}>{note.text}</Feedback>}
    </div>
  );
};

export default SecretMessages;
