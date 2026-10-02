import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../../types';
import { getUsers } from '../../services/apiService';
import type { DuelInviteRecord, LiveMatchSummary } from '../../services/duelService';
import { useDuelArenaStore } from './useDuelArenaStore';
import InitialsTile from '../InitialsTile';
import { colorFor } from './utils';
import { SearchIcon } from '../icons/SearchIcon';
import { SHELL_META_EVENT } from '../ShellHeader';
import { useMediaQuery } from '../../lib/useMediaQuery';

interface DuelLobbyProps {
  currentUser: User;
}

type LobbyFilter = 'ALL' | 'LIVE' | 'FOR_YOU' | 'WAITING' | 'LADDER';

type DuelRow =
  | { kind: 'live'; id: string; match: LiveMatchSummary }
  | { kind: 'incoming'; id: string; invite: DuelInviteRecord }
  | { kind: 'outgoing'; id: string; invite: DuelInviteRecord };

const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(m) || m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const matchTypeLabel = (type: string) => (type === 'CASUAL' ? 'Casual' : type === 'TOURNAMENT' ? 'Tournament' : 'Ranked');

const Player: React.FC<{ name: string; uid: string; align: 'left' | 'right'; you?: boolean }> = ({ name, uid, align, you }) => (
  <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${align === 'left' ? 'justify-end' : ''}`}>
    {align === 'right' && <span className="hidden flex-none sm:block"><InitialsTile name={name} size={26} color={colorFor(uid)} /></span>}
    <span className={`truncate text-[13px] font-bold sm:text-[14px] ${you ? 'text-ch-accent' : ''}`}>{you ? 'You' : name}</span>
    {align === 'left' && <span className="hidden flex-none sm:block"><InitialsTile name={name} size={26} color={colorFor(uid)} /></span>}
  </div>
);

const stateCell = 'flex h-[26px] items-center px-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em]';
const actionBtn = 'flex h-[26px] items-center px-2 sm:px-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50';

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

  const showBoard = useMediaQuery('(min-width: 1280px)');
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LobbyFilter>('ALL');
  const [boardTab, setBoardTab] = useState<'BOARD' | 'STANDINGS'>('BOARD');

  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    getUsers()
      .then((users) => {
        if (!cancelled) setMembers(users.filter((u) => u.uid !== currentUser.uid && u.status === 'APPROVED'));
      })
      .catch((error) => console.warn('Failed to load members for duel lobby', error))
      .finally(() => { if (!cancelled) setMembersLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser.uid]);

  const incoming = invitesIncoming.filter((invite) => invite.status === 'PENDING');
  const outgoing = invitesOutgoing.filter((invite) => invite.status === 'PENDING');

  // Header meta beside the page title.
  useEffect(() => {
    const parts = [`${liveMatches.length} live`];
    if (incoming.length) parts.push(`${incoming.length} challenge${incoming.length === 1 ? '' : 's'} waiting`);
    window.dispatchEvent(new CustomEvent(SHELL_META_EVENT, { detail: { tab: 'arena', meta: parts.join(' · ') } }));
  }, [liveMatches.length, incoming.length]);

  const term = search.trim().toLowerCase();
  const matches = (...names: Array<string | undefined>) => !term || names.some((n) => n?.toLowerCase().includes(term));

  const rows: DuelRow[] = useMemo(() => {
    const list: DuelRow[] = [
      ...incoming.map((invite) => ({ kind: 'incoming' as const, id: `in-${invite.id}`, invite })),
      ...liveMatches.map((match) => ({ kind: 'live' as const, id: `live-${match.id}`, match })),
      ...outgoing.map((invite) => ({ kind: 'outgoing' as const, id: `out-${invite.id}`, invite })),
    ];
    return list.filter((row) => {
      if (filter === 'LIVE' && row.kind !== 'live') return false;
      if (filter === 'FOR_YOU' && row.kind !== 'incoming') return false;
      if (filter === 'WAITING' && row.kind !== 'outgoing') return false;
      if (row.kind === 'live') return matches(row.match.problemTitle, ...row.match.players.map((p) => p.name));
      return matches(row.invite.senderName, row.invite.recipientName);
    });
  }, [incoming, liveMatches, outgoing, filter, term]);

  const challengeable = useMemo(() => {
    const pendingWith = new Set(outgoing.map((invite) => invite.recipientUid));
    return members
      .filter((m) => matches(m.name, m.username))
      .map((member) => ({ member, pending: pendingWith.has(member.uid) }))
      .slice(0, term ? 30 : 12);
  }, [members, outgoing, term]);

  const filters: Array<{ id: LobbyFilter; label: string; count?: number; narrowOnly?: boolean }> = [
    { id: 'ALL', label: 'All', count: incoming.length + liveMatches.length + outgoing.length },
    { id: 'LIVE', label: 'Live', count: liveMatches.length },
    { id: 'FOR_YOU', label: 'For you', count: incoming.length },
    { id: 'WAITING', label: 'Waiting', count: outgoing.length },
    { id: 'LADDER', label: 'Ladder', narrowOnly: true },
  ];

  const wins = profile?.seasonWins ?? 0;
  const losses = profile?.seasonLosses ?? 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const renderRow = (row: DuelRow) => {
    if (row.kind === 'live') {
      const [a, b] = row.match.players;
      const youPlay = row.match.players.some((p) => p.uid === currentUser.uid);
      return (
        <div key={row.id} className="flex items-stretch border-b border-ch-divider transition-colors duration-100 hover:bg-ch-surface">
          <div className="hidden w-16 flex-none flex-col items-center justify-center gap-1 border-r border-ch-divider sm:flex">
            <span className="h-2 w-2 bg-ch-accent" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-stretch justify-center px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Player name={a?.name || 'Player'} uid={a?.uid || 'a'} align="left" you={a?.uid === currentUser.uid} />
              <span className="flex-none text-[22px] font-extrabold tracking-[-0.03em] text-ch-muted">vs</span>
              <Player name={b?.name || 'Player'} uid={b?.uid || 'b'} align="right" you={b?.uid === currentUser.uid} />
            </div>
            <p className="mt-1.5 truncate text-[11px] sm:text-center">
              <span className="font-extrabold uppercase tracking-[0.12em] text-ch-accent">{row.match.problemTitle || 'Duel'}</span>
              <span className="text-ch-muted"> · {matchTypeLabel(row.match.matchType)} · {row.match.spectatorCount} watching{row.match.startedAt ? ` · started ${timeAgo(row.match.startedAt)}` : ''}</span>
            </p>
          </div>
          <div className="flex w-[118px] flex-none flex-col items-start justify-center gap-1.5 border-l border-ch-divider px-2.5 sm:w-[132px] sm:px-4">
            <span className={`${stateCell} border border-ch-accent text-ch-accent`}>Live</span>
            {!youPlay && (
              <button onClick={() => void spectateMatch(row.match.id)} className={`${actionBtn} text-ch-text hover:bg-ch-surface-2`}>Watch</button>
            )}
          </div>
        </div>
      );
    }

    const invite = row.invite;
    const incomingRow = row.kind === 'incoming';
    const busy = busyInviteId !== null;
    return (
      <div key={row.id} className={`flex items-stretch border-b border-ch-divider transition-colors duration-100 hover:bg-ch-surface ${incomingRow ? 'bg-ch-accent-soft' : ''}`}>
        <div className="hidden w-16 flex-none items-center justify-center border-r border-ch-divider sm:flex">
          <span className="h-2 w-2" style={{ background: incomingRow ? 'var(--ch-accent)' : 'var(--ch-violet)' }} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Player name={invite.senderName} uid={invite.senderUid} align="left" you={invite.senderUid === currentUser.uid} />
            <span className="flex-none text-[22px] font-extrabold tracking-[-0.03em] text-ch-muted">vs</span>
            <Player name={invite.recipientName} uid={invite.recipientUid} align="right" you={invite.recipientUid === currentUser.uid} />
          </div>
          <p className="mt-1.5 truncate text-[11px] sm:text-center">
            <span className="font-extrabold uppercase tracking-[0.12em] text-ch-accent">{matchTypeLabel(invite.matchType)} duel</span>
            <span className="text-ch-muted"> · Python · sent {timeAgo(invite.createdAt)}</span>
          </p>
        </div>
        <div className="flex w-[118px] flex-none flex-col items-start justify-center gap-1.5 border-l border-ch-divider px-2.5 sm:w-[132px] sm:px-4">
          {incomingRow ? (
            <>
              <span className={`${stateCell} bg-ch-accent text-ch-on-accent`}>For you</span>
              <div className="flex items-stretch border border-ch-rule">
                <button onClick={() => void acceptInvite(invite)} disabled={busy} className={`${actionBtn} text-ch-text hover:bg-ch-surface-2`}>
                  {busyInviteId === invite.id ? '…' : 'Accept'}
                </button>
                <button onClick={() => void declineInvite(invite.id)} disabled={busy} className={`${actionBtn} border-l border-ch-rule text-ch-muted hover:bg-ch-surface-2 hover:text-ch-text`}>
                  No
                </button>
              </div>
            </>
          ) : (
            <>
              <span className={`${stateCell} text-ch-muted`}>Waiting</span>
              <button onClick={() => void cancelInvite(invite.id)} disabled={busy} className={`${actionBtn} text-ch-muted hover:bg-ch-surface-2 hover:text-ch-text`}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const standings = (
    <div className="px-5 pb-5 pt-[18px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Standings</p>
        <span className="text-[11px] text-ch-muted">By rating</span>
      </div>
      {ladder.length === 0 ? (
        <p className="py-2 text-[13px] text-ch-muted">No duels played yet.</p>
      ) : (
        ladder.map((entry, index) => (
          <div key={entry.id} className={`flex items-center gap-3 border-t border-ch-divider py-2 ${entry.id === currentUser.uid ? 'bg-ch-accent-soft' : ''}`}>
            <span className={`w-5 text-[12px] font-extrabold ${index === 0 ? 'text-ch-accent' : 'text-ch-muted'}`}>{index + 1}</span>
            <InitialsTile name={entry.name} size={26} color={colorFor(entry.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{entry.name}</p>
              <p className="text-[11px] text-ch-muted">{entry.rank} · {entry.winRate}% wins</p>
            </div>
            <span className="text-[12px] font-extrabold text-ch-muted">{entry.rating}</span>
          </div>
        ))
      )}
    </div>
  );

  const forYou = (
    <div className="border-b-2 border-ch-rule px-5 pb-5 pt-[18px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Challenges for you</p>
        <span className="text-[11px] font-extrabold text-ch-accent">{incoming.length}</span>
      </div>
      {incoming.length === 0 ? (
        <p className="py-2 text-[13px] text-ch-muted">Nobody has challenged you yet.</p>
      ) : (
        incoming.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 border-t border-ch-divider py-[11px]">
            <InitialsTile name={invite.senderName} size={28} color={colorFor(invite.senderUid)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight">{invite.senderName}</p>
              <p className="mt-0.5 truncate text-[11px] text-ch-muted">{matchTypeLabel(invite.matchType)} · {timeAgo(invite.createdAt)}</p>
            </div>
            <button
              onClick={() => void acceptInvite(invite)}
              disabled={busyInviteId !== null}
              className={`${actionBtn} bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep`}
            >
              Accept
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 items-stretch">

      {/* ---------- Duels ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
          <label className="flex min-w-[140px] flex-1 items-center gap-2.5 px-4 sm:px-6 [&_svg]:h-4 [&_svg]:w-4">
            <span className="flex-none text-ch-muted opacity-70"><SearchIcon /></span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search duels or members"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
            />
          </label>
          <div className="ch-scroll flex min-w-0 flex-shrink items-stretch overflow-x-auto">
            {filters.filter((f) => !(f.narrowOnly && showBoard)).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex flex-none items-center gap-1.5 border-l border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  filter === f.id ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                }`}
              >
                {f.label}
                {f.count !== undefined && <span className="opacity-70">{f.count}</span>}
              </button>
            ))}
            <button
              onClick={() => void refreshLobby()}
              disabled={lobbyLoading}
              className="flex flex-none items-center border-l-2 border-ch-rule px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-text transition-colors hover:bg-ch-surface disabled:opacity-50"
            >
              {lobbyLoading ? 'Loading' : 'Refresh'}
            </button>
          </div>
        </div>

        {lobbyNotice && (
          <div className="flex flex-none items-center justify-between gap-4 border-b-2 border-ch-rule bg-ch-accent-soft px-6 py-2.5 text-[13px]">
            <span className="text-ch-text">{lobbyNotice}</span>
            <button onClick={dismissLobbyNotice} className="text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted hover:text-ch-text">Dismiss</button>
          </div>
        )}
        {lobbyError && (
          <div className="flex flex-none items-center justify-between gap-4 border-b-2 border-ch-rule px-6 py-2.5 text-[13px] text-ch-accent">
            <span>{lobbyError}</span>
            <button onClick={() => void refreshLobby()} className="text-[11px] font-bold uppercase tracking-[0.08em] hover:underline">Retry</button>
          </div>
        )}

        <div className="ch-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {filter === 'LADDER' ? standings : (
            <>
              {/* Column heads */}
              <div className="flex h-[34px] items-stretch border-b border-ch-divider bg-ch-surface text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">
                <div className="hidden w-16 flex-none border-r border-ch-divider sm:block" />
                <div className="flex min-w-0 flex-1 items-center justify-center px-6">Matchup</div>
                <div className="flex w-[118px] flex-none items-center px-2.5 sm:w-[132px] sm:px-4">State</div>
              </div>

              {rows.length === 0 ? (
                <div className="border-b-2 border-ch-rule px-6 py-12 sm:px-16">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Quiet arena</p>
                  <h3 className="mb-2 text-[24px] font-extrabold tracking-[-0.02em]">
                    {filter === 'ALL' ? 'No duels right now' : 'Nothing in this view'}
                  </h3>
                  <p className="max-w-[52ch] text-[14px] leading-relaxed text-ch-muted">Challenge a member below to start one.</p>
                </div>
              ) : (
                rows.map(renderRow)
              )}

              {(filter === 'ALL' || term) && (
                <div className="px-4 pb-8 pt-6 sm:px-6">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Challenge a member</p>
                    <span className="text-[11px] text-ch-muted">{membersLoading ? 'Loading…' : `${members.length} members`}</span>
                  </div>
                  {challengeable.length === 0 ? (
                    <p className="py-2 text-[13px] text-ch-muted">{membersLoading ? 'Loading members…' : 'No members match.'}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                      {challengeable.map(({ member, pending }) => (
                        <div key={member.uid} className="flex items-center gap-3 border-t border-ch-divider py-2.5">
                          <InitialsTile name={member.name} size={28} color={colorFor(member.uid)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-bold leading-tight">{member.name}</p>
                            <p className="truncate text-[11px] text-ch-muted">@{member.username}</p>
                          </div>
                          <button
                            onClick={() => void challengeMember(member.uid)}
                            disabled={pending || challengeBusyUid !== null}
                            className={`${actionBtn} border border-ch-rule text-ch-text hover:bg-ch-accent hover:text-ch-on-accent`}
                          >
                            {challengeBusyUid === member.uid ? '…' : pending ? 'Sent' : 'Challenge'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---------- Board ---------- */}
      {showBoard && (
        <aside className="flex min-h-0 w-[392px] flex-none flex-col border-l-2 border-ch-rule">
          <div className="flex-none bg-ch-accent px-6 pb-6 pt-[26px] text-ch-on-accent">
            <div className="mb-3.5 flex items-baseline justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Your record</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
                {profile ? `${profile.rankTier} ${profile.division}` : 'Unranked'}
              </span>
            </div>
            <div className="mb-[18px] flex items-end gap-3">
              <span className="text-[82px] font-extrabold leading-[0.82] tracking-[-0.05em]">{wins}</span>
              <span className="pb-2 text-[15px] font-bold leading-tight">win{wins === 1 ? '' : 's'}<br />{losses} loss{losses === 1 ? '' : 'es'}</span>
            </div>
            {/* Season split: wins against losses. */}
            <div className="mb-3 flex h-9 border border-black/[0.28]">
              <div style={{ width: `${winRate}%`, background: 'var(--ch-on-accent)' }} />
              <div style={{ width: `${wins + losses > 0 ? 100 - winRate : 0}%`, background: 'rgba(0,0,0,0.26)' }} />
            </div>
            <div className="flex items-center justify-between border-t-2 border-black/[0.28] pt-3">
              <span className="text-[11.5px] font-semibold">{winRate}% win rate · {profile?.currentStreak ?? 0} in a row</span>
              <span className="text-[11.5px] font-extrabold">{profile?.rating ?? '—'}</span>
            </div>
          </div>

          <div className="flex h-[42px] flex-none items-stretch border-b-2 border-t-2 border-ch-rule">
            {([['BOARD', 'Arena board'], ['STANDINGS', 'Standings']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setBoardTab(id)}
                className={`flex flex-1 items-center gap-2 border-r border-ch-divider px-5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors last:border-r-0 ${
                  boardTab === id ? 'bg-ch-accent-soft text-ch-text' : 'text-ch-muted hover:bg-ch-surface'
                }`}
              >
                <span className="h-1.5 w-1.5" style={{ background: boardTab === id ? 'var(--ch-accent)' : 'transparent' }} />
                {label}
              </button>
            ))}
          </div>

          <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
            {boardTab === 'BOARD' ? (<>{forYou}{standings}</>) : standings}
          </div>
        </aside>
      )}
    </div>
  );
};
