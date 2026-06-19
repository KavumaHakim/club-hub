import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BrainCircuit, Copy, Crown, Menu, MessageSquareText, Radar, ShieldAlert, Sparkles, Timer, Trophy, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { RANK_STYLES } from './mockData';
import { ArenaSession } from './types';
import { getIntegrityTone } from './utils';
import { cn } from '../../lib/utils';

interface OpponentPanelProps {
  session: ArenaSession;
  onSendQuickTaunt: () => void;
  onSendChatMessage: (message: string) => void;
}

const reactionAccent = {
  cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  violet: 'border-violet-400/30 bg-violet-500/10 text-violet-100',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
};

export const OpponentPanel: React.FC<OpponentPanelProps> = ({ session, onSendQuickTaunt, onSendChatMessage }) => {
  const [message, setMessage] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const opponentRankStyle = RANK_STYLES[session.opponent.rank];

  const duelMetrics = useMemo(
    () => [
      { label: 'Accuracy', player: `${session.player.accuracy}%`, opponent: `${session.opponent.accuracy}%` },
      { label: 'Runtime', player: `${session.player.runtimeMs || '--'}ms`, opponent: `${session.opponent.runtimeMs}ms` },
      { label: 'Typing', player: `${session.player.typingSpeed} wpm`, opponent: `${session.opponent.typingSpeed} wpm` },
      { label: 'Momentum', player: `${session.player.momentum}%`, opponent: `${session.opponent.momentum}%` },
    ],
    [session],
  );

  return (
    <Card className="arena-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">Opponent</h3>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[11px]">{session.mode === 'spectator' ? 'Delayed' : 'Live'}</Badge>
            <Button
              variant={showExtras ? 'outline' : 'secondary'}
              size="icon"
              onClick={() => setShowExtras((value) => !value)}
              aria-label={showExtras ? 'Hide match details' : 'Show match details'}
              aria-expanded={showExtras}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-5 py-5">
          <div className={cn('rounded-[1.5rem] border bg-white/5 p-4', opponentRankStyle.ring, opponentRankStyle.glow)}>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 rounded-2xl border-rose-400/20">
                <AvatarImage src={session.opponent.avatarUrl || `https://i.pravatar.cc/90?u=${session.opponent.handle}`} alt={session.opponent.name} />
                <AvatarFallback>{session.opponent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-lg font-semibold text-white">{session.opponent.name}</h4>
                  <Badge className={cn('border-0 bg-gradient-to-r text-slate-950', opponentRankStyle.badge)}>{session.opponent.rank}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  {session.opponent.handle} · {session.opponent.rating} rating
                </p>
                <p className="mt-1 text-sm text-slate-300">{session.opponent.estimatedStatus}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>Progress</span>
                  <span>{session.opponent.progress}%</span>
                </div>
                <Progress value={session.opponent.progress} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>Momentum</span>
                  <span>{session.opponent.momentum}%</span>
                </div>
                <Progress value={session.opponent.momentum} className="bg-rose-950/40" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Typing</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <span className={cn('h-2.5 w-2.5 rounded-full', session.opponent.liveTyping ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
                  {session.opponent.liveTyping ? 'Active now' : 'Idle'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tests passed</p>
                <p className="mt-2 text-sm font-semibold text-white">{session.opponent.testCasesPassed}/8</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Compiles</p>
                <p className="mt-2 text-sm font-semibold text-white">{session.opponent.compileAttempts}</p>
              </div>
            </div>
          </div>

          {showExtras && (
          <>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <Activity className="h-3.5 w-3.5" />
              Live Match Stats
            </div>
            <div className="space-y-3">
              {duelMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-400">{metric.label}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-cyan-100">{metric.player}</span>
                      <span className="text-slate-600">vs</span>
                      <span className="font-semibold text-rose-200">{metric.opponent}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              Anti-Cheat Monitor
            </div>
            <div className={cn('rounded-2xl border px-4 py-3', getIntegrityTone(session.antiCheat.integrity))}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{session.antiCheat.integrity}</span>
                <span className="text-xs uppercase tracking-[0.2em]">{session.antiCheat.trustScore}% trust</span>
              </div>
              <Progress className="mt-3 h-2 bg-slate-950/70" value={session.antiCheat.trustScore} />
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">Focus warnings: {session.antiCheat.focusWarnings}</div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">Clipboard warnings: {session.antiCheat.clipboardWarnings}</div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">Inactivity alerts: {session.antiCheat.inactivityWarnings}</div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">Assist risk: {session.antiCheat.aiAssistRisk}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <Trophy className="h-3.5 w-3.5" />
              Ranked Ladder
            </div>
            <div className="space-y-3">
              {session.ladder.map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-500">#{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.name}</p>
                      <p className="text-xs text-slate-500">
                        {entry.handle} · {entry.rank}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-cyan-100">{entry.rating}</p>
                    <p className="text-xs text-slate-500">{entry.winRate}% win rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <Crown className="h-3.5 w-3.5" />
              Tournament Widget
            </div>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{session.tournament.name}</p>
                  <p className="text-xs text-fuchsia-100/80">{session.tournament.currentRound}</p>
                </div>
                <Badge variant="elite">{session.tournament.prizePool}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-300">{session.tournament.eliminationStatus}</p>
              <p className="mt-1 text-sm text-fuchsia-100">Next opponent: {session.tournament.nextOpponent}</p>
              <div className="mt-4 space-y-2">
                {session.tournament.rounds.map((round) => (
                  <div key={round.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                    <span>{round.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{round.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <Users className="h-3.5 w-3.5" />
              Spectator Mode
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Viewers</p>
                <p className="mt-2 text-lg font-semibold text-white">{session.spectators}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Replay Delay</p>
                <p className="mt-2 text-lg font-semibold text-white">{session.mode === 'spectator' ? '90s' : 'Locked'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {session.replay.map((moment) => (
                <div key={moment.id} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-cyan-100">{moment.timeLabel}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{moment.intensity}% hype</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{moment.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Live Reactions
            </div>
            <div className="flex flex-wrap gap-2">
              {session.reactions.map((reaction) => (
                <motion.div key={reaction.id} initial={{ scale: 0.9, opacity: 0.8 }} animate={{ scale: 1, opacity: 1 }}>
                  <Badge className={cn('border', reactionAccent[reaction.accent])}>
                    {reaction.label} · {reaction.intensity}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          </>
          )}

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <MessageSquareText className="h-3.5 w-3.5" />
              Chat / Taunts
            </div>
            <div className="space-y-3">
              {session.chat.map((chat) => (
                <div key={chat.id} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{chat.author}</p>
                      <p className="text-xs text-slate-500">{chat.handle}</p>
                    </div>
                    <Badge variant={chat.kind === 'taunt' ? 'danger' : chat.kind === 'system' ? 'warning' : 'secondary'}>{chat.kind}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{chat.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{chat.createdAtLabel}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[96px] resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 outline-none focus:border-cyan-400/30"
                placeholder="Type a calm taunt or hype your squad..."
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    onSendQuickTaunt();
                  }}
                >
                  <BrainCircuit className="h-4 w-4" />
                  Quick Taunt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    onSendChatMessage(message);
                    setMessage('');
                  }}
                >
                  <Radar className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>

          {showExtras && (
          <>
          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Timer className="h-3.5 w-3.5" />
                Season Countdown
              </div>
              <p className="mt-2 text-lg font-semibold text-white">{session.seasonEndsIn}</p>
              <p className="mt-1 text-sm text-slate-400">{session.promotionStatus}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Copy className="h-3.5 w-3.5" />
                Duel Link
              </div>
              <p className="mt-2 text-sm font-semibold text-white">clubhub.gg/arena/{session.id}</p>
              <p className="mt-1 text-sm text-slate-400">Shareable, spectator-safe invite route.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.25em] text-slate-500">Streak / XP Progress</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Streak</p>
                <p className="mt-2 text-lg font-semibold text-white">{session.activeStreak} match chain</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">XP</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {session.xpCurrent}/{session.xpTarget}
                </p>
              </div>
            </div>
            <Progress className="mt-4" value={(session.xpCurrent / session.xpTarget) * 100} />
          </div>
          </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
