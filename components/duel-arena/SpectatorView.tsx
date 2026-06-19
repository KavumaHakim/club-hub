import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, CircleDot, Eye, Trophy, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { ArenaParticipant, ArenaSession } from './types';
import { formatTimer, getTimerTone } from './utils';
import { useDuelArenaStore } from './useDuelArenaStore';
import { cn } from '../../lib/utils';

interface ScreenProps {
  player: ArenaParticipant;
  code: string;
  isWinner: boolean;
  accent: 'cyan' | 'fuchsia';
}

const PlayerScreen: React.FC<ScreenProps> = ({ player, code, isWinner, accent }) => {
  const accentRing = accent === 'cyan' ? 'border-cyan-400/25' : 'border-fuchsia-400/25';
  const accentText = accent === 'cyan' ? 'text-cyan-300/70' : 'text-fuchsia-300/70';

  return (
    <Card className={cn('arena-panel flex h-full min-h-0 flex-col overflow-hidden', isWinner && 'border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.18)]')}>
      {/* Player header */}
      <div className={cn('flex items-center justify-between gap-3 border-b bg-slate-950/80 px-3 py-2.5 sm:px-4', accentRing)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0 rounded-xl">
            <AvatarImage src={player.avatarUrl || `https://i.pravatar.cc/72?u=${player.handle}`} alt={player.name} />
            <AvatarFallback>{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-white">{player.name}</p>
              {isWinner ? <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-300" /> : null}
            </div>
            <p className={cn('truncate text-xs', accentText)}>
              {player.rank} {player.division} · {player.rating}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {player.liveTyping ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-300">
              <CircleDot className="h-3 w-3 animate-pulse" />
              typing
            </span>
          ) : null}
          <Badge variant="secondary" className="font-mono">{player.testCasesPassed} passed</Badge>
        </div>
      </div>

      {/* Progress + status */}
      <div className="border-b border-white/10 bg-slate-950/60 px-3 py-2 sm:px-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">{player.estimatedStatus}</span>
          <span className="shrink-0 font-mono">{Math.round(player.progress)}%</span>
        </div>
        <Progress value={player.progress} className="h-1.5" />
      </div>

      {/* Live code */}
      <div className="relative min-h-0 flex-1">
        {code.trim() ? (
          <Editor
            height="100%"
            theme="vs-dark"
            language="python"
            value={code}
            options={{
              readOnly: true,
              domReadOnly: true,
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
            Waiting for {player.name.split(' ')[0]} to start typing...
          </div>
        )}
      </div>
    </Card>
  );
};

const QuizScoreCard: React.FC<{ player: ArenaParticipant; total: number; isWinner: boolean; accent: 'cyan' | 'fuchsia' }> = ({
  player,
  total,
  isWinner,
  accent,
}) => {
  const accentText = accent === 'cyan' ? 'text-cyan-300' : 'text-fuchsia-300';
  return (
    <Card
      className={cn(
        'arena-panel flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center',
        isWinner && 'border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.18)]',
      )}
    >
      <Avatar className="h-16 w-16 rounded-2xl">
        <AvatarImage src={player.avatarUrl || `https://i.pravatar.cc/96?u=${player.handle}`} alt={player.name} />
        <AvatarFallback>{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-lg font-semibold text-white">{player.name}</p>
          {isWinner ? <Trophy className="h-4 w-4 text-emerald-300" /> : null}
        </div>
        <p className={cn('text-xs', accentText)}>
          {player.rank} {player.division} · {player.rating}
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-5xl font-bold text-white">{player.testCasesPassed}</span>
        <span className="text-lg text-slate-500">/ {total}</span>
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">correct</p>
      <div className="w-full max-w-xs">
        <Progress value={player.progress} className="h-1.5" />
        <p className="mt-2 text-sm text-slate-400">{player.estimatedStatus}</p>
      </div>
    </Card>
  );
};

export const SpectatorView: React.FC = () => {
  const session = useDuelArenaStore((state) => state.session);
  const liveCode = useDuelArenaStore((state) => state.liveCode);
  const isQuiz = useDuelArenaStore((state) => state.isQuiz);
  const totalQuestions = useDuelArenaStore((state) => state.questions.length);
  const leaveMatch = useDuelArenaStore((state) => state.leaveMatch);
  const [mobileSide, setMobileSide] = useState<'left' | 'right'>('left');

  if (!session) return null;

  const left = session.player;
  const right = session.opponent;
  const winnerId = session.result ? (session.result.outcome === 'victory' ? left.id : right.id) : null;
  const finished = session.status === 'finished';
  const timerTone = getTimerTone(session.status, session.timeRemaining);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
      {/* Compact top bar */}
      <Card className="arena-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button variant="ghost" size="sm" onClick={() => void leaveMatch()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Lobby</span>
          </Button>
          <Badge variant="secondary">
            <Eye className="mr-1 h-3 w-3" />
            Spectating
          </Badge>
          <span className="hidden min-w-0 truncate text-sm font-semibold text-white sm:inline">{session.problem.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {session.spectators}
          </span>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{finished ? 'Final' : 'Time left'}</p>
            <p className={cn('font-mono text-xl font-semibold leading-none', timerTone, session.timeRemaining <= 60 && !finished && 'animate-pulse')}>
              {session.status === 'countdown' ? `${session.countdown}s` : formatTimer(session.timeRemaining)}
            </p>
          </div>
        </div>
      </Card>

      {/* Mobile screen switcher */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
          {([['left', left], ['right', right]] as const).map(([side, p]) => (
            <button
              key={side}
              onClick={() => setMobileSide(side)}
              className={cn(
                'truncate rounded-xl px-3 py-1.5 text-sm font-medium transition',
                mobileSide === side ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400',
              )}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Screens: side-by-side on desktop, one-at-a-time on mobile */}
      <div className="grid min-h-0 flex-1 gap-2.5 sm:gap-3 lg:grid-cols-2">
        <div className={cn('min-h-0', mobileSide === 'left' ? 'block' : 'hidden', 'lg:block')}>
          {isQuiz ? (
            <QuizScoreCard player={left} total={totalQuestions} isWinner={winnerId === left.id} accent="cyan" />
          ) : (
            <PlayerScreen player={left} code={liveCode[left.id] || ''} isWinner={winnerId === left.id} accent="cyan" />
          )}
        </div>
        <div className={cn('min-h-0', mobileSide === 'right' ? 'block' : 'hidden', 'lg:block')}>
          {isQuiz ? (
            <QuizScoreCard player={right} total={totalQuestions} isWinner={winnerId === right.id} accent="fuchsia" />
          ) : (
            <PlayerScreen player={right} code={liveCode[right.id] || ''} isWinner={winnerId === right.id} accent="fuchsia" />
          )}
        </div>
      </div>
    </div>
  );
};
