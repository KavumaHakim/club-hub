import React, { useEffect, useRef, useState } from 'react';

// Shared pieces for the Games lounge: every game gets the same start and
// game-over screens, timer and score bar, so they feel like one set.

export type GameLanguage = 'python' | 'javascript';

export interface GameProps {
  /** For the code games; the others ignore it. */
  language: GameLanguage;
  /** This player's best score so far (0 if none). */
  best: number;
  /** Called once when a run ends, with its score. */
  onFinish: (score: number) => void;
}

export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pickOne = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Counts down from `seconds` while `running`; calls onEnd once at zero. */
export const useCountdown = (seconds: number, running: boolean, onEnd: () => void) => {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!running) return;
    setLeft(seconds);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(id);
        endRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running, seconds]);
  return left;
};

export const Hud: React.FC<{ items: { label: string; value: React.ReactNode; tone?: 'accent' | 'warn' }[] }> = ({ items }) => (
  <div className="mb-5 flex items-stretch border-2 border-ch-rule">
    {items.map((item, i) => (
      <div key={item.label} className={`min-w-0 flex-1 px-3 py-2 sm:px-4 ${i > 0 ? 'border-l border-ch-divider' : ''} ${item.tone === 'warn' ? 'bg-ch-accent text-ch-on-accent' : ''}`}>
        <p className={`text-[9.5px] font-extrabold uppercase tracking-[0.14em] ${item.tone === 'warn' ? '' : 'text-ch-muted'}`}>{item.label}</p>
        <p className={`text-[20px] font-extrabold leading-tight tabular-nums ${item.tone === 'accent' ? 'text-ch-accent' : ''}`}>{item.value}</p>
      </div>
    ))}
  </div>
);

export const Lives: React.FC<{ left: number; total?: number }> = ({ left, total = 3 }) => (
  <span aria-label={`${left} of ${total} lives left`}>
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className={i < left ? 'text-ch-accent' : 'text-ch-divider'}>■</span>
    ))}
  </span>
);

export const StartScreen: React.FC<{ concept: string; howTo: string[]; onStart: () => void; extra?: React.ReactNode }> = ({ concept, howTo, onStart, extra }) => (
  <div className="max-w-xl">
    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-violet">You'll practise: {concept}</p>
    <ol className="mb-6 space-y-2 text-[14px] leading-relaxed">
      {howTo.map((step, i) => (
        <li key={i} className="flex gap-3 border-t border-ch-divider pt-2">
          <span className="w-5 flex-none font-extrabold text-ch-accent">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
    {extra}
    <button
      onClick={onStart}
      className="bg-ch-accent px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ch-on-accent hover:bg-ch-accent-deep"
    >
      Start
    </button>
  </div>
);

export const OverScreen: React.FC<{ score: number; best: number; lines?: string[]; lesson?: string; onAgain: () => void }> = ({ score, best, lines = [], lesson, onAgain }) => {
  const newBest = score > best;
  return (
    <div className="max-w-xl">
      <p className={`mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${newBest ? 'text-green-600 dark:text-green-400' : 'text-ch-muted'}`}>
        {newBest ? 'New best!' : best > 0 ? `Your best is ${best}` : 'Game over'}
      </p>
      <p className="text-[56px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{score}</p>
      <p className="mb-5 text-[12px] text-ch-muted">points</p>
      {lines.length > 0 && (
        <ul className="mb-5 text-[13px]">
          {lines.map((line) => <li key={line} className="border-t border-ch-divider py-1.5">{line}</li>)}
        </ul>
      )}
      {lesson && (
        <p className="mb-6 border-l-2 border-ch-violet bg-ch-surface px-3 py-2 text-[13px] leading-relaxed">
          <span className="font-extrabold text-ch-violet">The idea: </span>{lesson}
        </p>
      )}
      <button
        onClick={onAgain}
        className="bg-ch-accent px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ch-on-accent hover:bg-ch-accent-deep"
      >
        Play again
      </button>
    </div>
  );
};

/** A short message after each answer (right / wrong and why). */
export const Feedback: React.FC<{ tone: 'good' | 'bad' | 'info'; children: React.ReactNode }> = ({ tone, children }) => (
  <p className={`mt-4 border-l-2 px-3 py-2 text-[13px] leading-relaxed ${
    tone === 'good' ? 'border-green-600 bg-green-500/10 dark:border-green-400' : tone === 'bad' ? 'border-ch-accent bg-ch-accent-soft' : 'border-ch-divider bg-ch-surface'
  }`}>
    {children}
  </p>
);

export const BigButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'plain' }> = ({ tone = 'plain', className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      tone === 'primary' ? 'bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep' : 'border-2 border-ch-rule hover:bg-ch-surface'
    } ${className}`}
  />
);

/** A code listing with line numbers; `onLineClick` makes lines tappable. */
export const CodeBlock: React.FC<{
  lines: string[];
  highlight?: number | null;
  marked?: { line: number; tone: 'good' | 'bad' } | null;
  onLineClick?: (index: number) => void;
}> = ({ lines, highlight, marked, onLineClick }) => (
  <div className="overflow-x-auto border border-ch-divider bg-ch-surface font-mono text-[13px] leading-[1.7]">
    {lines.map((line, i) => {
      const mark = marked && marked.line === i ? marked.tone : null;
      const Tag = onLineClick ? 'button' : 'div';
      return (
        <Tag
          key={i}
          {...(onLineClick ? { type: 'button' as const, onClick: () => onLineClick(i) } : {})}
          className={`flex w-full min-w-max text-left ${onLineClick ? 'hover:bg-ch-accent-soft' : ''} ${
            mark === 'good' ? 'bg-green-500/15' : mark === 'bad' ? 'bg-ch-accent-soft' : highlight === i ? 'bg-ch-accent-soft' : ''
          }`}
        >
          <span className="w-9 flex-none select-none border-r border-ch-divider pr-2 text-right text-ch-muted">{i + 1}</span>
          <span className="whitespace-pre px-3">{line || ' '}</span>
        </Tag>
      );
    })}
  </div>
);
