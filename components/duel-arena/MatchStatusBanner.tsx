import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Gauge, RadioTower, ShieldCheck, TimerReset, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { ArenaSession } from './types';
import { formatTimer, getConnectionTone, getTimerTone } from './utils';

interface MatchStatusBannerProps {
  session: ArenaSession;
  liveBanner: string;
}

export const MatchStatusBanner: React.FC<MatchStatusBannerProps> = ({ session, liveBanner }) => {
  const ratingDiff = session.opponent.rating - session.player.rating;
  const timerTone = getTimerTone(session.status, session.timeRemaining);

  return (
    <Card className="arena-panel overflow-hidden border-white/12 bg-slate-950/70">
      <div className="grid gap-4 p-5 lg:grid-cols-[1.15fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={session.matchType === 'Tournament' ? 'elite' : session.matchType === 'Ranked' ? 'default' : 'secondary'}>
              {session.matchType}
            </Badge>
            <Badge variant="secondary">{session.mode === 'spectator' ? 'Spectator Feed' : 'Live Duel'}</Badge>
            <Badge variant="secondary">+{session.ratingDeltaProjection} rating at stake</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)] md:items-center">
            <div className="flex items-center gap-3 rounded-3xl border border-cyan-400/20 bg-cyan-500/5 p-4">
              <Avatar className="h-14 w-14 rounded-2xl border-cyan-400/30">
                <AvatarImage src={session.player.avatarUrl || `https://i.pravatar.cc/96?u=${session.player.handle}`} alt={session.player.name} />
                <AvatarFallback>{session.player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">You</p>
                <h3 className="text-lg font-semibold text-white">{session.player.name}</h3>
                <p className="text-sm text-slate-400">
                  {session.player.rank} {session.player.division} · {session.player.rating}
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 shadow-[0_0_45px_rgba(168,85,247,0.2)]"
            >
              <div className="absolute inset-3 rounded-full border border-cyan-400/20 animate-pulse" />
              <span className="font-mono text-3xl font-semibold tracking-[0.25em] text-white">VS</span>
            </motion.div>

            <div className="flex items-center gap-3 rounded-3xl border border-rose-400/20 bg-rose-500/5 p-4">
              <Avatar className="h-14 w-14 rounded-2xl border-rose-400/30">
                <AvatarImage src={session.opponent.avatarUrl || `https://i.pravatar.cc/96?u=${session.opponent.handle}`} alt={session.opponent.name} />
                <AvatarFallback>{session.opponent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-rose-300/70">Opponent</p>
                <h3 className="text-lg font-semibold text-white">{session.opponent.name}</h3>
                <p className="text-sm text-slate-400">
                  {session.opponent.rank} {session.opponent.division} · {session.opponent.rating}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Rating diff: {ratingDiff >= 0 ? '+' : ''}
              {ratingDiff}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{session.problem.title}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{session.problem.tags.slice(0, 2).join(' · ')}</span>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Match Status</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{liveBanner}</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Visible Timer</p>
              <p className={`font-mono text-3xl font-semibold ${timerTone} ${session.timeRemaining <= 60 ? 'animate-pulse' : ''}`}>
                {formatTimer(session.timeRemaining)}
              </p>
            </div>
          </div>

          <Progress value={session.status === 'countdown' ? ((18 - session.countdown) / 18) * 100 : (session.player.progress + session.opponent.progress) / 2} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <TimerReset className="h-3.5 w-3.5" />
                Countdown
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${session.status}-${session.countdown}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-2 text-2xl font-semibold text-white"
                >
                  {session.status === 'countdown' ? `${session.countdown}s` : session.status.replace('-', ' ')}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Integrity Pulse
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{session.antiCheat.trustScore}%</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <RadioTower className="h-3.5 w-3.5" />
                Connection
              </div>
              <p className={`mt-2 text-sm font-semibold ${getConnectionTone(session.connection)}`}>{session.connection}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Gauge className="h-3.5 w-3.5" />
                Ping
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{session.ping}ms</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Spectators
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{session.spectators}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Activity className="h-3.5 w-3.5" />
                Pressure
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{Math.max(session.player.momentum, session.opponent.momentum)}%</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
