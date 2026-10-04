import React, { useEffect, useRef, useState } from 'react';
import { BigButton, Feedback, GameProps, Hud, OverScreen, StartScreen, shuffle, useCountdown } from './gameKit';

// Data representation, unplugged: a picture is just numbers. Paint it from rows of
// 1s and 0s (how images are stored), then from run-length codes like "2W 4B 2W"
// (how they're compressed: store the runs, not every pixel).

const ROUND_SECONDS = 90;
const PER_LEVEL = 3;

const SMALL: Record<string, string[]> = {
  plus: ['00100', '00100', '11111', '00100', '00100'],
  cross: ['10001', '01010', '00100', '01010', '10001'],
  'letter H': ['10001', '10001', '11111', '10001', '10001'],
  'letter T': ['11111', '00100', '00100', '00100', '00100'],
  frame: ['11111', '10001', '10001', '10001', '11111'],
  diamond: ['00100', '01010', '10001', '01010', '00100'],
  'letter L': ['10000', '10000', '10000', '10000', '11111'],
};

const LARGE: Record<string, string[]> = {
  heart: ['00000000', '01100110', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'],
  'smiley face': ['00111100', '01000010', '10100101', '10000001', '10100101', '10011001', '01000010', '00111100'],
  house: ['00011000', '00111100', '01111110', '11111111', '01000010', '01011010', '01011010', '01111110'],
  arrow: ['00001000', '00001100', '11111110', '11111111', '11111110', '00001100', '00001000', '00000000'],
  tree: ['00011000', '00111100', '01111110', '11111111', '00011000', '00011000', '00011000', '00111100'],
  cup: ['00000000', '11111100', '10000110', '10000101', '10000110', '10000100', '01111000', '11111110'],
  'letter A': ['00011000', '00100100', '01000010', '01000010', '01111110', '01000010', '01000010', '00000000'],
  football: ['00111100', '01011010', '10111101', '11011011', '11011011', '10111101', '01011010', '00111100'],
};

/** "01100110" -> "1W 2B 2W 2B 1W": the length of each run of white (0) and black (1). */
const runLength = (row: string) => {
  const runs: string[] = [];
  let i = 0;
  while (i < row.length) {
    let j = i;
    while (j < row.length && row[j] === row[i]) j += 1;
    runs.push(`${j - i}${row[i] === '1' ? 'B' : 'W'}`);
    i = j;
  }
  return runs.join(' ');
};

interface Picture { name: string; rows: string[]; mode: 'binary' | 'runs' }

const deck = (): Picture[] => [
  ...shuffle(Object.entries(SMALL)).slice(0, PER_LEVEL).map(([name, rows]) => ({ name, rows, mode: 'binary' as const })),
  ...shuffle(Object.entries(LARGE)).slice(0, PER_LEVEL).map(([name, rows]) => ({ name, rows, mode: 'binary' as const })),
  ...shuffle(Object.entries(LARGE)).map(([name, rows]) => ({ name, rows, mode: 'runs' as const })),
];

const blank = (p: Picture) => p.rows.map((r) => '0'.repeat(r.length));

const PixelPainter: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [pictures, setPictures] = useState<Picture[]>(deck);
  const [index, setIndex] = useState(0);
  const [grid, setGrid] = useState<string[]>(() => blank(pictures[0]));
  const [score, setScore] = useState(0);
  const [note, setNote] = useState<{ tone: 'good' | 'info'; text: string } | null>(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const start = () => {
    const d = deck();
    setPictures(d);
    setIndex(0);
    setGrid(blank(d[0]));
    setScore(0);
    setNote(null);
    setPhase('play');
  };
  const end = () => {
    setPhase('over');
    onFinish(scoreRef.current);
  };
  const left = useCountdown(ROUND_SECONDS, phase === 'play', end);

  const picture = pictures[index];
  const pointsFor = (p: Picture) => (p.mode === 'runs' ? 15 : p.rows.length === 5 ? 5 : 10);

  const advance = (solvedIt: boolean) => {
    if (solvedIt) setScore((s) => s + pointsFor(picture));
    const nextIndex = index + 1;
    if (nextIndex >= pictures.length) {
      setPhase('over');
      onFinish(scoreRef.current + (solvedIt ? pointsFor(picture) : 0));
      return;
    }
    const nextPic = pictures[nextIndex];
    if (nextPic.mode !== picture.mode) setNote({ tone: 'info', text: 'Level 3: each row is now a run-length code. 3W 2B means 3 white, then 2 black.' });
    setIndex(nextIndex);
    setGrid(blank(nextPic));
  };

  // A finished picture moves on once, shortly after the last square.
  const completedRef = useRef(false);

  // From the latest grid, so quick taps never undo each other.
  const toggle = (r: number, c: number) => {
    if (completedRef.current) return;
    setGrid((prev) => prev.map((row, i) => (i === r ? row.slice(0, c) + (row[c] === '1' ? '0' : '1') + row.slice(c + 1) : row)));
  };

  useEffect(() => {
    completedRef.current = false;
  }, [index]);
  useEffect(() => {
    if (phase !== 'play' || completedRef.current || !grid.every((g, i) => g === picture.rows[i])) return;
    completedRef.current = true;
    setNote({ tone: 'good', text: `It's a ${picture.name}! +${pointsFor(picture)}` });
    const id = window.setTimeout(() => advance(true), 350);
    return () => window.clearTimeout(id);
  }, [grid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'start') {
    return (
      <StartScreen
        concept="how pictures are stored as numbers, and compressed"
        howTo={[
          'Each row of numbers describes one row of the picture: 1 is a black square, 0 is white.',
          'Tap squares to paint them. A row gets a tick when it matches.',
          'From level 3 the rows are compressed: 2W 3B means 2 white then 3 black.',
          `Paint as many pictures as you can in ${ROUND_SECONDS} seconds.`,
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
        lines={[`Reached picture ${Math.min(index + 1, pictures.length)}`]}
        lesson="Every image on a screen is stored as numbers like these, just with millions of pixels and colours. Run-length codes store '4 black' instead of '1111', which is how simple compression makes files smaller."
        onAgain={start}
      />
    );
  }

  const size = picture.rows[0].length;
  const cell = size === 5 ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-8 w-8 sm:h-9 sm:w-9';

  return (
    <div>
      <Hud items={[
        { label: 'Time', value: `${left}s`, tone: left <= 10 ? 'warn' : undefined },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Level', value: picture.mode === 'runs' ? 3 : size === 5 ? 1 : 2 },
      ]} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="inline-grid border-2 border-ch-rule" style={{ gridTemplateColumns: `repeat(${size}, auto)` }}>
          {grid.map((row, r) => row.split('').map((v, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              aria-label={`Row ${r + 1}, square ${c + 1}, ${v === '1' ? 'black' : 'white'}`}
              onClick={() => toggle(r, c)}
              className={`${cell} border border-ch-divider transition-colors ${v === '1' ? 'bg-ch-text' : 'bg-ch-bg hover:bg-ch-surface'}`}
            />
          )))}
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">{picture.mode === 'runs' ? 'Run-length code' : 'Binary rows'}</p>
          <ol className="font-mono text-[14px]">
            {picture.rows.map((row, r) => {
              const ok = grid[r] === row;
              return (
                <li key={r} className="flex items-center gap-3 border-t border-ch-divider py-[3px] first:border-t-0">
                  <span className="w-5 text-right text-[11px] text-ch-muted">{r + 1}</span>
                  <span className="tracking-[0.18em]">{picture.mode === 'runs' ? runLength(row) : row}</span>
                  <span className={`text-[12px] font-extrabold ${ok ? 'text-green-600 dark:text-green-400' : 'text-transparent'}`}>✓</span>
                </li>
              );
            })}
          </ol>
          <BigButton type="button" className="mt-4" onClick={() => { setNote({ tone: 'info', text: `That was a ${picture.name}.` }); advance(false); }}>Skip</BigButton>
        </div>
      </div>
      {note && <Feedback tone={note.tone}>{note.text}</Feedback>}
    </div>
  );
};

export default PixelPainter;
