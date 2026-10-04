import React, { useCallback, useEffect, useState } from 'react';
import { GameLeaderboardEntry, User } from '../types';
import * as api from '../services/apiService';
import { PageIntro } from './SplitKit';
import InitialsTile from './InitialsTile';
import { colorFor } from './duel-arena/utils';
import type { GameLanguage, GameProps } from './games/gameKit';
import NumberHunt from './games/NumberHunt';
import TrafficRules from './games/TrafficRules';
import SecretMessages from './games/SecretMessages';
import PixelPainter from './games/PixelPainter';
import CodeJigsaw from './games/CodeJigsaw';
import TraceVariable from './games/TraceVariable';
import BugSquash from './games/BugSquash';
import SortShowdown from './games/SortShowdown';

// The Games lounge: quick, unplugged games that bring out a computing idea, and
// code puzzles in Python or JavaScript. Every game scores so higher is better, and
// each player's best goes on that game's leaderboard (table game_leaderboard).

interface GameInfo {
  key: string;
  title: string;
  teaches: string;
  blurb: string;
  section: 'quick' | 'puzzle';
  usesLanguage?: boolean;
  Component: React.FC<GameProps>;
}

const GAMES: GameInfo[] = [
  { key: 'number-hunt', title: 'Number Hunt', teaches: 'Binary search', blurb: 'Find the hidden number from "higher" or "lower" clues, in as few guesses as you can.', section: 'quick', Component: NumberHunt },
  { key: 'traffic-rules', title: 'Traffic Rules', teaches: 'If / else and logic', blurb: 'Ride a boda boda through the junction by following the rules, top to bottom.', section: 'quick', Component: TrafficRules },
  { key: 'secret-messages', title: 'Secret Messages', teaches: 'Algorithms and encryption', blurb: 'Crack shifted-letter codes. Later, work out the key yourself.', section: 'quick', Component: SecretMessages },
  { key: 'pixel-painter', title: 'Pixel Painter', teaches: 'How data is stored', blurb: 'Paint pictures from 1s and 0s, then from compressed codes.', section: 'quick', Component: PixelPainter },
  { key: 'code-jigsaw', title: 'Code Jigsaw', teaches: 'Program structure', blurb: 'A working program has been shuffled. Put its lines back in order.', section: 'puzzle', usesLanguage: true, Component: CodeJigsaw },
  { key: 'trace-variable', title: 'Trace the Variable', teaches: 'Reading code', blurb: 'Work out what a short program prints, without running it.', section: 'puzzle', usesLanguage: true, Component: TraceVariable },
  { key: 'bug-squash', title: 'Bug Squash', teaches: 'Debugging', blurb: 'Each program has one wrong line. Find it fast.', section: 'puzzle', usesLanguage: true, Component: BugSquash },
  { key: 'sort-showdown', title: 'Sort Showdown', teaches: 'Sorting and efficiency', blurb: 'Sort the market prices by swapping neighbours, in the fewest swaps.', section: 'puzzle', Component: SortShowdown },
];

const bestKey = (uid: string, game: string) => `game_best_${uid}_${game}`;
const readBest = (uid: string, game: string) => {
  try {
    return Number(localStorage.getItem(bestKey(uid, game))) || 0;
  } catch {
    return 0;
  }
};
const LANG_KEY = 'games_language';

const Leaderboard: React.FC<{ entries: GameLeaderboardEntry[] | null; currentUserId: string }> = ({ entries, currentUserId }) => (
  <div>
    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Leaderboard</p>
    {entries === null ? (
      <p className="py-2 text-[13px] text-ch-muted">Loading…</p>
    ) : entries.length === 0 ? (
      <p className="py-2 text-[13px] text-ch-muted">No scores yet. Be the first.</p>
    ) : (
      entries.slice(0, 10).map((e, i) => (
        <div key={e.userId} className={`flex items-center gap-3 border-t border-ch-divider py-2 ${e.userId === currentUserId ? 'bg-ch-accent-soft' : ''}`}>
          <span className={`w-5 text-[12px] font-extrabold ${i === 0 ? 'text-ch-accent' : 'text-ch-muted'}`}>{i + 1}</span>
          <InitialsTile name={e.userName} size={24} color={colorFor(e.userId)} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{e.userName}</span>
          <span className="text-[13px] font-extrabold tabular-nums">{e.bestValue}</span>
        </div>
      ))
    )}
  </div>
);

const Games: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [language, setLanguage] = useState<GameLanguage>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'javascript' ? 'javascript' : 'python';
    } catch {
      return 'python';
    }
  });
  const [bests, setBests] = useState<Record<string, number>>(() =>
    Object.fromEntries(GAMES.map((g) => [g.key, readBest(currentUser.uid, g.key)])),
  );
  const [board, setBoard] = useState<GameLeaderboardEntry[] | null>(null);

  const game = GAMES.find((g) => g.key === openKey) || null;

  const loadBoard = useCallback(async (key: string) => {
    setBoard(null);
    try {
      const entries = await api.getGameLeaderboard(key, false);
      setBoard(entries);
      // The server best wins if this device hasn't seen it (another phone, cleared storage).
      const mine = entries.find((e) => e.userId === currentUser.uid);
      if (mine) setBests((b) => (mine.bestValue > (b[key] || 0) ? { ...b, [key]: mine.bestValue } : b));
    } catch {
      setBoard([]);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    if (openKey) void loadBoard(openKey);
  }, [openKey, loadBoard]);

  const chooseLanguage = (lang: GameLanguage) => {
    setLanguage(lang);
    setRun((r) => r + 1); // a new language starts a fresh run
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch { /* not remembered */ }
  };

  const finish = async (key: string, score: number) => {
    if (score <= (bests[key] || 0)) return;
    setBests((b) => ({ ...b, [key]: score }));
    try {
      localStorage.setItem(bestKey(currentUser.uid, key), String(score));
    } catch { /* not remembered */ }
    try {
      await api.upsertGameScore({ userId: currentUser.uid, gameKey: key, bestValue: score });
      await loadBoard(key);
    } catch {
      // Offline: the best is kept on this device and sent next time it's beaten.
    }
  };

  if (game) {
    const { Component } = game;
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ch-rule pb-4">
          <div>
            <button
              onClick={() => setOpenKey(null)}
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted hover:text-ch-text"
            >
              ← All games
            </button>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">{game.teaches}</p>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em]">{game.title}</h2>
          </div>
          {game.usesLanguage && (
            <div className="flex border border-ch-rule">
              {(['python', 'javascript'] as GameLanguage[]).map((l, i) => (
                <button
                  key={l}
                  onClick={() => chooseLanguage(l)}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] ${i > 0 ? 'border-l border-ch-divider' : ''} ${
                    language === l ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                  }`}
                >
                  {l === 'python' ? 'Python' : 'JavaScript'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Component
            key={`${game.key}-${game.usesLanguage ? language : ''}-${run}`}
            language={language}
            best={bests[game.key] || 0}
            onFinish={(score) => void finish(game.key, score)}
          />
          <aside className="lg:border-l-2 lg:border-ch-rule lg:pl-6">
            <p className="mb-4 text-[12.5px] text-ch-muted">
              Your best: <span className="text-[15px] font-extrabold text-ch-text">{bests[game.key] || 0}</span>
            </p>
            <Leaderboard entries={board} currentUserId={currentUser.uid} />
          </aside>
        </div>
      </div>
    );
  }

  const section = (which: GameInfo['section'], title: string, note: string) => (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-[18px] font-extrabold tracking-[-0.01em]">{title}</h3>
        <span className="text-[12px] text-ch-muted">{note}</span>
      </div>
      <div className="grid grid-cols-1 border-l border-t border-ch-divider sm:grid-cols-2">
        {GAMES.filter((g) => g.section === which).map((g) => (
          <button
            key={g.key}
            onClick={() => { setOpenKey(g.key); setRun((r) => r + 1); }}
            className="group flex flex-col border-b border-r border-ch-divider p-5 text-left transition-colors hover:bg-ch-surface"
          >
            <span className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-violet">{g.teaches}</span>
            <span className="text-[17px] font-extrabold tracking-[-0.01em] group-hover:text-ch-accent">{g.title}</span>
            <span className="mt-1 flex-1 text-[13px] leading-relaxed text-ch-muted">{g.blurb}</span>
            <span className="mt-4 flex items-center justify-between text-[11px]">
              <span className="text-ch-muted">{bests[g.key] ? <>Your best <span className="font-extrabold text-ch-text">{bests[g.key]}</span></> : 'Not played yet'}</span>
              <span className="font-extrabold uppercase tracking-[0.08em] text-ch-accent">Play →</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div>
      <PageIntro
        eyebrow="Games lounge"
        title="Learn by playing"
        description="Short games that each bring out one big idea in computing. Beat your best score and climb each game's leaderboard."
      />
      {section('quick', 'Quick games', 'No coding needed')}
      {section('puzzle', 'Code puzzles', 'Python or JavaScript')}
    </div>
  );
};

export default Games;
