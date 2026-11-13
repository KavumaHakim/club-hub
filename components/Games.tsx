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
import BinaryBlaster from './games/BinaryBlaster';
import PacketRunner from './games/PacketRunner';
import FirewallFrenzy from './games/FirewallFrenzy';
import SortSerpent from './games/SortSerpent';
import GateRunner from './games/GateRunner';

// The Games lounge: real-time arcade games, quick unplugged games that bring out a computing idea, and
// code puzzles in Python or JavaScript. Every game scores so higher is better, and
// each player's best goes on that game's leaderboard (table game_leaderboard).

interface GameInfo {
  key: string;
  title: string;
  teaches: string;
  blurb: string;
  section: 'arcade' | 'quick' | 'puzzle';
  /** Arcade cards get a small piece of cover art. */
  art?: React.ReactNode;
  usesLanguage?: boolean;
  Component: React.FC<GameProps>;
}

const ArtFrame: React.FC<{ children: React.ReactNode; from: string; to: string }> = ({ children, from, to }) => (
  <svg viewBox="0 0 320 120" className="mb-4 block h-auto w-full" style={{ background: `linear-gradient(160deg, ${from}, ${to})` }} aria-hidden>
    {children}
  </svg>
);

const BlasterArt = (
  <ArtFrame from="#0b0820" to="#2a1040">
    {[[30, 20], [90, 50], [200, 14], [270, 40], [150, 80], [300, 90], [60, 95]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="2" height="2" fill="#fff" opacity="0.6" />)}
    {[[80, 36, '13', '#f472b6'], [220, 28, '6', '#f472b6'], [160, 58, '9', '#facc15']].map(([x, y, n, c]) => (
      <g key={String(n)} transform={`translate(${x} ${y})`}>
        <polygon points="16,0 8,14 -8,14 -16,0 -8,-14 8,-14" fill="#140a28" stroke={String(c)} strokeWidth="2" />
        <text textAnchor="middle" y="5" fontSize="13" fontWeight="800" fill="#fff">{n}</text>
      </g>
    ))}
    <line x1="160" y1="104" x2="160" y2="72" stroke="#f0abfc" strokeWidth="3" />
    <circle cx="160" cy="58" r="22" fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="8 8" />
    {['1', '0', '0', '1'].map((b, i) => (
      <g key={i}><rect x={112 + i * 26} y="104" width="22" height="14" fill={b === '1' ? '#db2777' : '#1a1428'} /><text x={123 + i * 26} y="115" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{b}</text></g>
    ))}
  </ArtFrame>
);

const RunnerArt = (
  <ArtFrame from="#0a0618" to="#1d0b33">
    <circle cx="160" cy="44" r="30" fill="#f472b6" opacity="0.85" />
    <rect x="0" y="54" width="320" height="66" fill="#0d0820" />
    {[-3, -2, -1, 0, 1, 2, 3].map((k) => <line key={k} x1={160 + k * 8} y1="54" x2={160 + k * 70} y2="120" stroke="#a78bfa" strokeOpacity="0.5" />)}
    {[62, 72, 88, 110].map((y) => <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#a78bfa" strokeOpacity="0.35" />)}
    {[-1, 0, 1].map((k) => (
      <g key={k}><rect x={146 + k * 40} y="56" width="28" height="22" fill="none" stroke="#22d3ee" strokeWidth="2" /><rect x={144 + k * 40} y="48" width="32" height="7" fill="#0a0618" stroke="#22d3ee" /></g>
    ))}
    <rect x="150" y="92" width="20" height="20" fill="#f472b6" stroke="#67e8f9" strokeWidth="2" transform="rotate(12 160 102)" />
  </ArtFrame>
);

const FirewallArt = (
  <ArtFrame from="#1a1036" to="#06050d">
    {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <line key={k} x1="160" y1="60" x2={160 + Math.cos(k * 0.785) * 200} y2={60 + Math.sin(k * 0.785) * 200} stroke="#a78bfa" strokeOpacity="0.15" />)}
    <circle cx="160" cy="60" r="34" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeDasharray="6 6" />
    <polygon points="160,38 179,49 179,71 160,82 141,71 141,49" fill="#1b1240" stroke="#c4b5fd" strokeWidth="2" />
    {[[60, 22, 'notes.pdf'], [250, 30, 'game.exe'], [70, 98, 'g00gle.com'], [252, 96, 'song.mp3']].map(([x, y, t]) => (
      <g key={String(t)}><rect x={Number(x) - 40} y={Number(y) - 9} width="80" height="18" rx="5" fill="#181030" stroke="#c4b5fd" /><text x={x} y={Number(y) + 4} textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="monospace" fill="#fff">{t}</text></g>
    ))}
    <polyline points="160,60 190,48 210,40 230,34" fill="none" stroke="#a5f3fc" strokeWidth="2" />
  </ArtFrame>
);

const SerpentArt = (
  <ArtFrame from="#0c0a1d" to="#130d26">
    {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="120" stroke="#a78bfa" strokeOpacity="0.1" />)}
    {[[60, 30], [86, 30], [112, 30], [112, 56], [138, 56], [164, 56], [190, 56]].map(([x, y], i) => (
      <rect key={i} x={x - 11} y={y - 11} width="22" height="22" rx="6" fill={`hsl(${80 + i * 11}, 85%, ${42 + i * 3}%)`} />
    ))}
    {[[244, 56, '3'], [252, 98, '8'], [60, 92, '12'], [168, 98, '21']].map(([x, y, n]) => (
      <g key={String(n)}><circle cx={x} cy={y} r="13" fill="#0e2a3a" stroke="#67e8f9" strokeWidth="2" /><text x={x} y={Number(y) + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{n}</text></g>
    ))}
  </ArtFrame>
);

const GateArt = (
  <ArtFrame from="#0a0624" to="#5b1a5e">
    <circle cx="260" cy="26" r="12" fill="#fef3c7" />
    {[[0, 50], [40, 30], [74, 60], [190, 40], [230, 55], [280, 35]].map(([x, h]) => <rect key={x} x={x} y={92 - h} width="32" height={h} fill="#140a2c" />)}
    <rect x="0" y="92" width="320" height="28" fill="#0d0820" />
    <line x1="0" y1="92" x2="320" y2="92" stroke="#f472b6" strokeWidth="2" />
    <rect x="186" y="32" width="8" height="60" fill="#1e1b3a" stroke="#4ade80" />
    <rect x="152" y="12" width="76" height="16" fill="#0a0624" stroke="#4ade80" />
    <text x="190" y="24" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="monospace" fill="#fff">A AND B</text>
    <polygon points="120,92 126,80 132,92" fill="#ef4444" />
    <rect x="70" y="66" width="16" height="16" rx="3" fill="#1e3a5f" stroke="#67e8f9" />
    <rect x="72" y="56" width="12" height="9" rx="2" fill="#1e3a5f" stroke="#67e8f9" />
    <line x1="74" y1="82" x2="70" y2="92" stroke="#67e8f9" strokeWidth="3" />
    <line x1="82" y1="82" x2="86" y2="92" stroke="#67e8f9" strokeWidth="3" />
  </ArtFrame>
);

const GAMES: GameInfo[] = [
  { key: 'binary-blaster', title: 'Binary Blaster', teaches: 'Binary numbers', blurb: 'Drones dive at your base. Flip the bit switches to lock on to their numbers and blast them.', section: 'arcade', art: BlasterArt, Component: BinaryBlaster },
  { key: 'packet-runner', title: 'Packet Runner', teaches: 'Networks and routing', blurb: 'Race a data packet through a 3D network. Pick the right route at every router, dodge the firewalls.', section: 'arcade', art: RunnerArt, Component: PacketRunner },
  { key: 'gate-runner', title: 'Gate Runner', teaches: 'Logic gates', blurb: 'Sprint across Kampala at night. Flip switches A and B to open AND, OR and XOR laser doors.', section: 'arcade', art: GateArt, Component: GateRunner },
  { key: 'sort-serpent', title: 'Sort Serpent', teaches: 'Sorting', blurb: 'A neon snake that must eat the numbers in order, smallest first. Wrong bite? Ouch.', section: 'arcade', art: SerpentArt, Component: SortSerpent },
  { key: 'firewall-frenzy', title: 'Firewall Frenzy', teaches: 'Cyber safety', blurb: 'Be the school firewall. Zap malware and phishing links before they hit the server.', section: 'arcade', art: FirewallArt, Component: FirewallFrenzy },
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
      <div className={`grid grid-cols-1 border-l border-t border-ch-divider sm:grid-cols-2 ${which === 'arcade' ? 'lg:grid-cols-3' : ''}`}>
        {GAMES.filter((g) => g.section === which).map((g) => (
          <button
            key={g.key}
            onClick={() => { setOpenKey(g.key); setRun((r) => r + 1); }}
            className="group flex flex-col border-b border-r border-ch-divider p-5 text-left transition-colors hover:bg-ch-surface"
          >
            {g.art}
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
      {section('arcade', 'Arcade', 'Action games · sound on · fullscreen')}
      {section('quick', 'Quick games', 'No coding needed')}
      {section('puzzle', 'Code puzzles', 'Python or JavaScript')}
    </div>
  );
};

export default Games;
