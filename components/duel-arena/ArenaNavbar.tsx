import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Eye, Flame, Sparkles, Swords, Trophy, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { RANK_STYLES } from './mockData';
import { ArenaSession } from './types';
import { cn } from '../../lib/utils';

interface ArenaNavbarProps {
  session: ArenaSession;
  onJoinRanked: () => void;
  onChallengeFriend: () => void;
  onSpectate: () => void;
}

const quickActions = [
  { label: 'Ranked Queue', icon: Trophy, action: 'ranked' },
  { label: 'Challenge Friend', icon: UserPlus, action: 'friend' },
  { label: 'Spectate Live', icon: Eye, action: 'spectate' },
] as const;

const ClubHubArenaMark = () => (
  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
    <div className="absolute inset-1 rounded-[14px] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/10 blur-sm" />
    <Swords className="relative h-6 w-6 text-cyan-200" />
  </div>
);

export const ArenaNavbar: React.FC<ArenaNavbarProps> = ({ session, onJoinRanked, onChallengeFriend, onSpectate }) => {
  const rankStyle = RANK_STYLES[session.player.rank];

  return (
    <Card className="arena-panel relative overflow-hidden border-white/12 bg-slate-950/70 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <ClubHubArenaMark />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">ClubHub</p>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
            </div>
            <h2
              className="mt-1 text-2xl font-semibold text-white sm:text-3xl"
              style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
            >
              Code Duel Arena
            </h2>
            <p className="mt-1 text-sm text-slate-400">A coding battle command center built for high-pressure match play.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ y: -2 }} className={cn('rounded-2xl border bg-white/5 px-3 py-2', rankStyle.ring, rankStyle.glow)}>
              <div className="flex items-center gap-3">
                <Badge className={cn('border-0 bg-gradient-to-r text-slate-950', rankStyle.badge)}>{session.player.rank}</Badge>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Rank</p>
                  <p className={cn('text-sm font-semibold', rankStyle.text)}>
                    {session.player.rank} {session.player.division} · {session.player.rating} rating
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
              <div className="flex items-center gap-3">
                <Flame className="h-4 w-4 text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Active Streak</p>
                  <p className="text-sm font-semibold text-amber-100">{session.activeStreak} wins heating up</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const onClick =
                action.action === 'ranked' ? onJoinRanked : action.action === 'friend' ? onChallengeFriend : onSpectate;

              return (
                <Button key={action.label} variant="secondary" size="sm" className="hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]" onClick={onClick}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              );
            })}
            <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-2xl border border-white/10 bg-white/5 text-slate-200">
              <Bell className="h-4 w-4" />
            </Button>
            <Avatar className="h-11 w-11 rounded-2xl border-cyan-400/30">
              <AvatarImage src={session.player.avatarUrl || `https://i.pravatar.cc/80?u=${session.player.handle}`} alt={session.player.name} />
              <AvatarFallback>{session.player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
        <span>Quick access:</span>
        <span className="rounded-full border border-white/10 px-2 py-1">Ranked</span>
        <span className="rounded-full border border-white/10 px-2 py-1">Friend Duel</span>
        <span className="rounded-full border border-white/10 px-2 py-1">Spectator Delay</span>
      </div>
    </Card>
  );
};
