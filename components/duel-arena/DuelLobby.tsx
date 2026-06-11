import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Eye, Flame, Loader2, Search, Swords, Trophy, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { User } from '../../types';
import { getUsers } from '../../services/apiService';
import { RANK_STYLES } from './mockData';
import { useDuelArenaStore } from './useDuelArenaStore';
import { cn } from '../../lib/utils';

interface DuelLobbyProps {
  currentUser: User;
}

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export const DuelLobby: React.FC<DuelLobbyProps> = ({ currentUser }) => {
  const profile = useDuelArenaStore((state) => state.profile);
  const invitesIncoming = useDuelArenaStore((state) => state.invitesIncoming);
  const invitesOutgoing = useDuelArenaStore((state) => state.invitesOutgoing);
  const liveMatches = useDuelArenaStore((state) => state.liveMatches);
  const ladder = useDuelArenaStore((state) => state.ladder);
  const lobbyLoading = useDuelArenaStore((state) => state.lobbyLoading);
  const lobbyError = useDuelArenaStore((state) => state.lobbyError);
  const lobbyNotice = useDuelArenaStore((state) => state.lobbyNotice);
  const busyInviteId = useDuelArenaStore((state) => state.busyInviteId);
  const challengeBusyUid = useDuelArenaStore((state) => state.challengeBusyUid);
  const refreshLobby = useDuelArenaStore((state) => state.refreshLobby);
  const challengeMember = useDuelArenaStore((state) => state.challengeMember);
  const acceptInvite = useDuelArenaStore((state) => state.acceptInvite);
  const declineInvite = useDuelArenaStore((state) => state.declineInvite);
  const cancelInvite = useDuelArenaStore((state) => state.cancelInvite);
  const spectateMatch = useDuelArenaStore((state) => state.spectateMatch);
  const dismissLobbyNotice = useDuelArenaStore((state) => state.dismissLobbyNotice);

  const [members, setMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    getUsers()
      .then((users) => {
        if (!cancelled) {
          setMembers(users.filter((u) => u.uid !== currentUser.uid && u.status === 'APPROVED'));
        }
      })
      .catch((error) => console.warn('Failed to load members for duel lobby', error))
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const pendingWith = new Set([
      ...invitesOutgoing.filter((i) => i.status === 'PENDING').map((i) => i.recipientUid),
    ]);
    return members
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
      .map((m) => ({ member: m, hasPending: pendingWith.has(m.uid) }))
      .slice(0, 12);
  }, [members, memberSearch, invitesOutgoing]);

  const rankStyle = profile ? RANK_STYLES[profile.rankTier] : RANK_STYLES.Bronze;
  const winRate =
    profile && profile.seasonWins + profile.seasonLosses > 0
      ? Math.round((profile.seasonWins / (profile.seasonWins + profile.seasonLosses)) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-5">
      {/* Header / own profile */}
      <Card className="arena-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10">
              <Swords className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl" style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
                Code Duel Arena
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                1v1 Python battles. A fresh DSA problem every match, instant verdicts, live spectating.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={cn('rounded-2xl border bg-white/5 px-3 py-2 text-center', rankStyle.ring)}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rank</p>
              <p className={cn('text-sm font-semibold', rankStyle.text)}>
                {profile ? `${profile.rankTier} ${profile.division}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rating</p>
              <p className="text-sm font-semibold text-white">{profile?.rating ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">W / L</p>
              <p className="text-sm font-semibold text-white">
                {profile ? `${profile.seasonWins} / ${profile.seasonLosses}` : '—'}
                <span className="ml-1 text-xs text-slate-400">({winRate}%)</span>
              </p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/80">Streak</p>
              <p className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-100">
                <Flame className="h-3.5 w-3.5" />
                {profile?.currentStreak ?? 0}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {lobbyNotice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0" />
            {lobbyNotice}
          </span>
          <button onClick={dismissLobbyNotice} className="rounded-full p-1 text-cyan-200 hover:bg-white/10" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {lobbyError ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <span>{lobbyError}</span>
          <Button variant="secondary" size="sm" onClick={() => void refreshLobby()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending challenges */}
        <Card className="arena-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Bell className="h-4 w-4 text-cyan-300" />
              Pending Challenges
              {invitesIncoming.length > 0 ? <Badge>{invitesIncoming.length}</Badge> : null}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => void refreshLobby()} disabled={lobbyLoading}>
              {lobbyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          <div className="space-y-3">
            {invitesIncoming.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
                No incoming challenges. Pick a member below and start one!
              </p>
            ) : (
              invitesIncoming.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarImage src={invite.senderAvatarUrl} alt={invite.senderName} />
                      <AvatarFallback>{initials(invite.senderName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-white">{invite.senderName}</p>
                      <p className="text-xs text-slate-400">{invite.matchType === 'CASUAL' ? 'Casual duel' : 'Ranked duel'} · Python</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void acceptInvite(invite)} disabled={busyInviteId !== null}>
                      {busyInviteId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                      Accept
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void declineInvite(invite.id)} disabled={busyInviteId !== null}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}

            {invitesOutgoing.filter((i) => i.status === 'PENDING').length > 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sent by you</p>
                {invitesOutgoing
                  .filter((i) => i.status === 'PENDING')
                  .map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage src={invite.recipientAvatarUrl} alt={invite.recipientName} />
                          <AvatarFallback>{initials(invite.recipientName)}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm text-slate-300">
                          Waiting for <span className="font-semibold text-white">{invite.recipientName}</span>
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => void cancelInvite(invite.id)} disabled={busyInviteId !== null}>
                        Cancel
                      </Button>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </Card>

        {/* Live matches to spectate */}
        <Card className="arena-panel p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Eye className="h-4 w-4 text-fuchsia-300" />
            Live Duels
            {liveMatches.length > 0 ? <Badge variant="secondary">{liveMatches.length}</Badge> : null}
          </h3>

          <div className="space-y-3">
            {liveMatches.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
                No live duels right now. Start one and others can watch!
              </p>
            ) : (
              liveMatches.map((match) => (
                <div key={match.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                      <p className="truncate text-sm font-semibold text-white">
                        {match.players.map((p) => p.name).join(' vs ') || 'Duel'}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {match.problemTitle} · {match.matchType.toLowerCase()} · {match.spectatorCount} watching
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void spectateMatch(match.id)}>
                    <Eye className="h-4 w-4" />
                    Watch
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Challenge a member */}
        <Card className="arena-panel p-5">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
            <Swords className="h-4 w-4 text-cyan-300" />
            Challenge a Member
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            Every duel gets a fresh Python DSA problem matched to the average of both your levels. 5 sample tests are revealed; the rest stay hidden.
          </p>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading members...
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredMembers.map(({ member, hasPending }) => (
                <div key={member.uid} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-9 w-9 rounded-xl">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                      <p className="truncate text-xs text-slate-400">{member.skillLevel?.toLowerCase() || 'member'}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={hasPending ? 'secondary' : 'default'}
                    disabled={hasPending || challengeBusyUid !== null}
                    onClick={() => void challengeMember(member.uid)}
                  >
                    {challengeBusyUid === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : hasPending ? 'Pending' : 'Duel'}
                  </Button>
                </div>
              ))}
              {filteredMembers.length === 0 ? (
                <p className="col-span-full rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
                  No members found.
                </p>
              ) : null}
            </div>
          )}
        </Card>

        {/* Leaderboard */}
        <Card className="arena-panel p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Trophy className="h-4 w-4 text-amber-300" />
            Arena Leaderboard
          </h3>
          <div className="space-y-2">
            {ladder.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
                No ranked duels played yet. Be the first on the board!
              </p>
            ) : (
              ladder.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5',
                    entry.id === currentUser.uid ? 'border-cyan-400/30 bg-cyan-500/10' : 'border-white/10 bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono text-sm text-slate-400">{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.name}</p>
                      <p className="text-xs text-slate-400">
                        {entry.rank} · {entry.winRate}% wins
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-cyan-200">{entry.rating}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
