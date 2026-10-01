import React, { useEffect, useMemo, useState } from 'react';
import { Tab, Team, User } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { fetchDuelProfiles, type DuelProfileRecord } from '../services/duelService';
import { SearchIcon } from './icons/SearchIcon';
import MemberPortfolioModal from './MemberPortfolioModal';
import ConfirmationModal from './ConfirmationModal';
import InitialsTile, { TILE_COLORS } from './InitialsTile';
import { useMediaQuery } from '../lib/useMediaQuery';

interface CommunityProps {
    currentUser: User;
    setActiveTab?: (tab: Tab) => void;
}

type RosterFilter = 'ALL' | 'PATRONS' | 'MEMBERS' | 'ONLINE' | 'DORMANT';
type BoardTab = 'BOARD' | 'TEAMS';
type Presence = 'Online' | 'Away' | 'Dormant';

const FILTERS: Array<{ id: RosterFilter; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'PATRONS', label: 'Patrons' },
    { id: 'MEMBERS', label: 'Members' },
    { id: 'ONLINE', label: 'Online' },
    { id: 'DORMANT', label: 'Dormant' },
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** No login for this long reads as dormant. */
const DORMANT_AFTER_DAYS = 14;

const daysSince = (iso?: string) => {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? Infinity : (Date.now() - t) / DAY_MS;
};

const presenceOf = (user: User, online: Set<string>): Presence => {
    if (online.has(user.uid)) return 'Online';
    const last = Math.min(daysSince(user.lastLogin), daysSince(user.streakLastActiveDate));
    return last > DORMANT_AFTER_DAYS ? 'Dormant' : 'Away';
};

const PRESENCE_DOT: Record<Presence, string> = {
    Online: 'var(--ch-accent)',
    Away: 'var(--ch-violet)',
    Dormant: 'var(--ch-divider)',
};

const capitalise = (value?: string) => (value ? value.charAt(0) + value.slice(1).toLowerCase() : '');

const SectionLabel: React.FC<{ label: string; meta?: React.ReactNode }> = ({ label, meta }) => (
    <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">{label}</p>
        {meta !== undefined && <span className="text-[11px] text-ch-muted">{meta}</span>}
    </div>
);

const Community: React.FC<CommunityProps> = ({ currentUser, setActiveTab }) => {
    const {
        allUsers,
        onlineUsers,
        isLoadingUsers,
        teams,
        isLoadingTeams,
        teamsError,
        fetchTeams,
        fetchUsers,
        showToast,
    } = useData();
    const isPatron = currentUser.role === 'PATRON';
    const showBoard = useMediaQuery('(min-width: 1280px)');

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<RosterFilter>('ALL');
    const [boardTab, setBoardTab] = useState<BoardTab>('BOARD');
    const [duels, setDuels] = useState<Record<string, DuelProfileRecord>>({});
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [teamForm, setTeamForm] = useState({ name: '', description: '' });
    const [memberInvite, setMemberInvite] = useState<Record<string, string>>({});
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const online = useMemo(() => new Set(onlineUsers), [onlineUsers]);
    const userMap = useMemo(() => new Map(allUsers.map(user => [user.uid, user])), [allUsers]);
    const approved = useMemo(() => allUsers.filter(user => user.status === 'APPROVED'), [allUsers]);
    const pendingSignups = useMemo(() => allUsers.filter(user => user.status === 'PENDING'), [allUsers]);

    // Duel W/L for the roster; a failure only blanks that column.
    useEffect(() => {
        if (approved.length === 0) return;
        let cancelled = false;
        fetchDuelProfiles(approved.map(user => user.uid))
            .then(profiles => { if (!cancelled) setDuels(profiles); })
            .catch(error => console.error('Failed to load duel records', error));
        return () => { cancelled = true; };
    }, [approved.length]);

    const roster = useMemo(() => {
        const term = search.trim().toLowerCase();
        return approved
            .map(user => ({ user, presence: presenceOf(user, online) }))
            .filter(({ user, presence }) => {
                if (filter === 'PATRONS' && user.role !== 'PATRON') return false;
                if (filter === 'MEMBERS' && user.role !== 'MEMBER') return false;
                if (filter === 'ONLINE' && presence !== 'Online') return false;
                if (filter === 'DORMANT' && presence !== 'Dormant') return false;
                if (!term) return true;
                return [user.name, user.username, user.studentClass, user.skillLevel]
                    .some(field => field?.toLowerCase().includes(term));
            })
            .sort((a, b) => {
                // Patrons first, then online, then longest streak.
                if (a.user.role !== b.user.role) return a.user.role === 'PATRON' ? -1 : 1;
                if ((a.presence === 'Online') !== (b.presence === 'Online')) return a.presence === 'Online' ? -1 : 1;
                return (b.user.streakCount || 0) - (a.user.streakCount || 0);
            });
    }, [approved, online, filter, search]);

    const membership = useMemo(() => {
        let onlineCount = 0;
        let active = 0;
        let dormant = 0;
        approved.forEach(user => {
            const presence = presenceOf(user, online);
            if (presence === 'Online') onlineCount += 1;
            if (presence === 'Dormant') dormant += 1;
            if (presence === 'Online' || Math.min(daysSince(user.lastLogin), daysSince(user.streakLastActiveDate)) <= 7) active += 1;
        });
        return { total: approved.length, online: onlineCount, active, dormant };
    }, [approved, online]);

    // Team join requests addressed to teams this user owns.
    const teamRequests = useMemo(() => teams
        .filter(team => team.createdBy === currentUser.uid)
        .flatMap(team => (team.joinRequests || [])
            .filter(req => req.status === 'PENDING')
            .map(req => ({ team, req, requester: userMap.get(req.requesterId) }))),
    [teams, currentUser.uid, userMap]);

    const requestCount = (isPatron ? pendingSignups.length : 0) + teamRequests.length;

    // ---------- actions ----------
    const handleApproveSignup = async (uid: string) => {
        try {
            await api.approveMember(uid);
            await fetchUsers();
            showToast('Member admitted.', 'success');
        } catch (error) {
            console.error('Failed to approve member', error);
            showToast('Failed to admit member.', 'error');
        }
    };

    const handleCreateTeam = async () => {
        if (!teamForm.name.trim()) return;
        try {
            const created = await api.createTeam({
                name: teamForm.name.trim(),
                description: teamForm.description.trim(),
                createdBy: currentUser.uid,
            });
            await api.addTeamMember(created.id, currentUser.uid);
            await fetchTeams();
            setTeamForm({ name: '', description: '' });
            showToast('Team created.', 'success');
        } catch (error) {
            console.error('Failed to create team', error);
            showToast('Failed to create team.', 'error');
        }
    };

    const handleRequestJoin = async (teamId: string) => {
        try {
            await api.requestTeamJoin(teamId, currentUser.uid);
            await fetchTeams();
            showToast('Join request sent to team owner.', 'success');
        } catch (error) {
            console.error('Failed to join team', error);
            showToast('Failed to send join request.', 'error');
        }
    };

    const handleLeaveTeam = async (teamId: string) => {
        try {
            await api.removeTeamMember(teamId, currentUser.uid);
            await fetchTeams();
        } catch (error) {
            console.error('Failed to leave team', error);
            showToast('Failed to leave team.', 'error');
        }
    };

    const handleAddMember = async (teamId: string) => {
        const targetId = memberInvite[teamId];
        if (!targetId) return;
        try {
            await api.addTeamMember(teamId, targetId);
            await fetchTeams();
            setMemberInvite(prev => ({ ...prev, [teamId]: '' }));
            showToast('Member added.', 'success');
        } catch (error) {
            console.error('Failed to add member', error);
            showToast('Failed to add member.', 'error');
        }
    };

    const handleApproveRequest = async (teamId: string, requestId: string, requesterId: string) => {
        try {
            await api.approveTeamJoinRequest({ requestId, teamId, requesterId, reviewedBy: currentUser.uid });
            await fetchTeams();
            showToast('Member approved.', 'success');
        } catch (error) {
            console.error('Failed to approve request', error);
            showToast('Failed to approve request.', 'error');
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await api.rejectTeamJoinRequest({ requestId, reviewedBy: currentUser.uid });
            await fetchTeams();
            showToast('Request declined.', 'info');
        } catch (error) {
            console.error('Failed to reject request', error);
            showToast('Failed to decline request.', 'error');
        }
    };

    const confirmDeleteTeam = async () => {
        if (!teamToDelete) return;
        try {
            await api.deleteTeam({ teamId: teamToDelete.id, requesterId: currentUser.uid });
            await fetchTeams();
            showToast('Team deleted.', 'success');
        } catch (error) {
            console.error('Failed to delete team', error);
            showToast('Failed to delete team.', 'error');
        } finally {
            setTeamToDelete(null);
        }
    };

    const exportRoster = () => {
        const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = [
            ['Name', 'Username', 'Role', 'Class', 'Skill level', 'Streak', 'Duel wins', 'Duel losses', 'Status', 'Badges'],
            ...roster.map(({ user, presence }) => [
                user.name, user.username, user.role, user.studentClass || '', user.skillLevel || '',
                user.streakCount || 0, duels[user.uid]?.seasonWins ?? '', duels[user.uid]?.seasonLosses ?? '',
                presence, user.badges?.length || 0,
            ]),
        ];
        const blob = new Blob([rows.map(row => row.map(escape).join(',')).join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clubhub-roster-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // ---------- pieces ----------
    const smallBtn = 'flex items-center px-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] transition-colors duration-100';

    const requestsBlock = (
        <div className="border-b-2 border-ch-rule px-5 pb-5 pt-[18px]">
            <SectionLabel label="Join requests" meta={<span className="font-extrabold text-ch-accent">{requestCount}</span>} />
            {requestCount === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">No requests waiting.</p>
            ) : (
                <>
                    {isPatron && pendingSignups.map((user, index) => (
                        <div key={user.uid} className="flex items-center gap-3 border-t border-ch-divider py-[11px]">
                            <InitialsTile name={user.name} size={28} color={TILE_COLORS[index % TILE_COLORS.length]} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
                                <p className="mt-0.5 truncate text-[11px] text-ch-muted">{user.studentClass || 'No class'} · new sign-up</p>
                            </div>
                            <div className="flex h-[26px] flex-none items-stretch border border-ch-rule">
                                <button onClick={() => handleApproveSignup(user.uid)} className={`${smallBtn} bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep`}>Admit</button>
                                <button
                                    onClick={() => setActiveTab?.('members')}
                                    className={`${smallBtn} border-l border-ch-rule text-ch-muted hover:bg-ch-surface hover:text-ch-text`}
                                    title="Open Members to review or remove"
                                >
                                    Review
                                </button>
                            </div>
                        </div>
                    ))}
                    {teamRequests.map(({ team, req, requester }, index) => (
                        <div key={req.id} className="flex items-center gap-3 border-t border-ch-divider py-[11px]">
                            <InitialsTile name={requester?.name || '?'} size={28} color={TILE_COLORS[(index + 2) % TILE_COLORS.length]} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold leading-tight">{requester?.name || 'Member'}</p>
                                <p className="mt-0.5 truncate text-[11px] text-ch-muted">wants to join {team.name}</p>
                            </div>
                            <div className="flex h-[26px] flex-none items-stretch border border-ch-rule">
                                <button onClick={() => handleApproveRequest(team.id, req.id, req.requesterId)} className={`${smallBtn} bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep`}>Admit</button>
                                <button onClick={() => handleRejectRequest(req.id)} className={`${smallBtn} border-l border-ch-rule text-ch-muted hover:bg-ch-surface hover:text-ch-text`}>No</button>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );

    const groupsBlock = (
        <div className="px-5 pb-5 pt-[18px]">
            <SectionLabel label="Groups" meta={`${teams.length} team${teams.length === 1 ? '' : 's'}`} />
            {isLoadingTeams ? (
                <p className="py-2 text-[13px] text-ch-muted">Loading teams…</p>
            ) : teams.length === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">No teams yet.</p>
            ) : (
                teams.map(team => {
                    const owner = userMap.get(team.createdBy);
                    const mine = team.createdBy === currentUser.uid ? 'Yours' : team.memberIds.includes(currentUser.uid) ? 'Member' : null;
                    return (
                        <button key={team.id} onClick={() => setBoardTab('TEAMS')} className="flex w-full items-center gap-3 border-t border-ch-divider py-2.5 text-left transition-opacity duration-100 hover:opacity-65">
                            <span className="w-[30px] flex-none text-[17px] font-extrabold tracking-[-0.02em] text-ch-muted">{team.memberIds.length}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-bold leading-tight">{team.name}</span>
                                <span className="mt-0.5 block truncate text-[11px] text-ch-muted">Led by {owner?.name || 'a member'}</span>
                            </span>
                            {mine && <span className="flex-none bg-ch-accent-soft px-[7px] py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-ch-accent-deep">{mine}</span>}
                        </button>
                    );
                })
            )}
        </div>
    );

    const teamsBlock = (
        <div className="px-5 pb-6 pt-[18px]">
            <SectionLabel label="Start a team" />
            <div className="mb-6 space-y-2">
                <input
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Team name"
                    className="w-full border border-ch-divider px-3 py-2 text-[13px]"
                />
                <input
                    value={teamForm.description}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description"
                    className="w-full border border-ch-divider px-3 py-2 text-[13px]"
                />
                <button
                    onClick={handleCreateTeam}
                    disabled={!teamForm.name.trim()}
                    className="flex h-9 w-full items-center bg-ch-accent px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ch-on-accent transition-colors hover:bg-ch-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Create team
                </button>
            </div>

            <SectionLabel label="All teams" meta={teams.length} />
            {teamsError ? (
                <p className="py-2 text-[13px] text-red-500">{teamsError}</p>
            ) : teams.length === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">No teams yet. Create the first one.</p>
            ) : (
                teams.map(team => {
                    const isMember = team.memberIds.includes(currentUser.uid);
                    const isOwner = team.createdBy === currentUser.uid;
                    const myRequest = (team.joinRequests || []).find(req => req.requesterId === currentUser.uid && req.status === 'PENDING');
                    const invitable = approved.filter(user => !team.memberIds.includes(user.uid));
                    return (
                        <div key={team.id} className="border-t border-ch-divider py-3">
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-bold leading-tight">{team.name}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[11px] text-ch-muted">{team.description || 'No description'}</p>
                                </div>
                                {isOwner ? (
                                    <button onClick={() => setTeamToDelete(team)} className={`${smallBtn} h-[26px] border border-ch-rule text-ch-muted hover:bg-red-600 hover:text-white`}>Delete</button>
                                ) : isMember ? (
                                    <button onClick={() => handleLeaveTeam(team.id)} className={`${smallBtn} h-[26px] border border-ch-rule text-ch-muted hover:bg-ch-surface hover:text-ch-text`}>Leave</button>
                                ) : myRequest ? (
                                    <span className={`${smallBtn} h-[26px] border border-ch-divider text-ch-muted`}>Requested</span>
                                ) : (
                                    <button onClick={() => handleRequestJoin(team.id)} className={`${smallBtn} h-[26px] bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep`}>Join</button>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {team.memberIds.slice(0, 8).map((uid, index) => (
                                    <span key={uid} title={userMap.get(uid)?.name}>
                                        <InitialsTile name={userMap.get(uid)?.name || '?'} size={22} color={TILE_COLORS[index % TILE_COLORS.length]} />
                                    </span>
                                ))}
                                {team.memberIds.length > 8 && <span className="self-center text-[11px] text-ch-muted">+{team.memberIds.length - 8}</span>}
                            </div>
                            {isOwner && invitable.length > 0 && (
                                <div className="mt-2.5 flex items-stretch border border-ch-divider">
                                    <select
                                        value={memberInvite[team.id] ?? ''}
                                        onChange={(e) => setMemberInvite(prev => ({ ...prev, [team.id]: e.target.value }))}
                                        className="min-w-0 flex-1 border-0 px-2 py-1.5 text-[12px]"
                                        aria-label={`Invite a member to ${team.name}`}
                                    >
                                        <option value="">Invite member…</option>
                                        {invitable.map(user => <option key={user.uid} value={user.uid}>{user.name}</option>)}
                                    </select>
                                    <button
                                        onClick={() => handleAddMember(team.id)}
                                        disabled={!memberInvite[team.id]}
                                        className={`${smallBtn} border-l border-ch-divider text-ch-text hover:bg-ch-surface disabled:opacity-50`}
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    const onlineShare = membership.total ? (membership.online / membership.total) * 100 : 0;
    const activeShare = membership.total ? ((membership.active - membership.online) / membership.total) * 100 : 0;

    return (
        <div className="flex h-full min-h-0 items-stretch">

            {/* ---------- Roster ---------- */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
                    <label className="flex min-w-[140px] flex-1 items-center gap-2.5 px-4 sm:px-6 [&_svg]:h-4 [&_svg]:w-4">
                        <span className="flex-none text-ch-muted opacity-70"><SearchIcon /></span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search members"
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
                        />
                    </label>
                    <div className="ch-scroll flex min-w-0 flex-shrink items-stretch overflow-x-auto">
                        {FILTERS.map(pill => (
                            <button
                                key={pill.id}
                                onClick={() => setFilter(pill.id)}
                                className={`flex flex-none items-center border-l border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                                    filter === pill.id ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                                }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                        {!showBoard && (
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="flex flex-none items-center gap-1.5 border-l-2 border-ch-rule px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-text transition-colors hover:bg-ch-surface"
                            >
                                Teams
                                {requestCount > 0 && <span className="bg-ch-accent px-1.5 text-ch-on-accent">{requestCount}</span>}
                            </button>
                        )}
                        {isPatron && (
                            <button
                                onClick={exportRoster}
                                className="hidden flex-none items-center border-l-2 border-ch-rule px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-text transition-colors hover:bg-ch-surface sm:flex"
                                title="Download the filtered roster as CSV"
                            >
                                Export
                            </button>
                        )}
                    </div>
                </div>

                {/* Column heads */}
                <div className="flex h-[34px] flex-none items-stretch border-b border-ch-divider bg-ch-surface text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">
                    <div className="w-16 flex-none border-r border-ch-divider" />
                    <div className="flex min-w-0 flex-1 items-center px-5">Member</div>
                    <div className="hidden w-28 flex-none items-center md:flex">Class</div>
                    <div className="hidden w-24 flex-none items-center sm:flex">Streak</div>
                    <div className="hidden w-[88px] flex-none items-center lg:flex">Duels</div>
                    <div className="flex w-[104px] flex-none items-center pr-5 sm:w-[120px]">Status</div>
                </div>

                <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
                    {isLoadingUsers ? (
                        <p className="px-6 py-10 text-[13px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Loading members…</p>
                    ) : roster.length === 0 ? (
                        <div className="px-6 py-20 sm:px-16">
                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Nothing here</p>
                            <h3 className="mb-3 text-[28px] font-extrabold tracking-[-0.02em]">No members found</h3>
                            <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-ch-muted">Try another name or filter.</p>
                        </div>
                    ) : (
                        roster.map(({ user, presence }, index) => {
                            const streak = user.streakCount || 0;
                            const duel = duels[user.uid];
                            return (
                                <button
                                    key={user.uid}
                                    onClick={() => setSelectedMember(user)}
                                    className={`flex w-full items-stretch border-b border-ch-divider text-left transition-colors duration-100 hover:bg-ch-surface ${user.uid === currentUser.uid ? 'bg-ch-accent-soft' : ''}`}
                                >
                                    <div className="flex w-16 flex-none items-center justify-center border-r border-ch-divider">
                                        <InitialsTile name={user.name} size={34} color={TILE_COLORS[index % TILE_COLORS.length]} />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-[13px]">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <p className="truncate text-[15px] font-bold leading-tight tracking-[-0.01em]">{user.name}</p>
                                            {user.role === 'PATRON' && (
                                                <span className="flex-none bg-ch-accent px-[7px] py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-ch-on-accent">Patron</span>
                                            )}
                                        </div>
                                        <p className="mt-[3px] truncate text-[12px] text-ch-muted">
                                            @{user.username}
                                            {user.skillLevel ? ` · ${capitalise(user.skillLevel)}` : ''}
                                            {` · ${user.badges?.length || 0} badge${user.badges?.length === 1 ? '' : 's'}`}
                                        </p>
                                    </div>
                                    <div className="hidden w-28 flex-none items-center text-[13px] font-semibold text-ch-muted md:flex">
                                        {user.studentClass || (user.role === 'PATRON' ? 'Staff' : '—')}
                                    </div>
                                    <div className="hidden w-24 flex-none items-center gap-[7px] sm:flex">
                                        <span className={`text-[15px] font-extrabold tracking-[-0.02em] ${streak >= 10 ? 'text-ch-accent' : streak === 0 ? 'text-ch-muted' : ''}`}>{streak}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ch-muted">d</span>
                                    </div>
                                    <div className="hidden w-[88px] flex-none items-center text-[13px] font-bold text-ch-muted lg:flex">
                                        {duel && duel.seasonWins + duel.seasonLosses > 0 ? `${duel.seasonWins}W ${duel.seasonLosses}L` : '—'}
                                    </div>
                                    <div className="flex w-[104px] flex-none items-center gap-2 pr-5 sm:w-[120px]">
                                        <span className="h-2 w-2 flex-none" style={{ background: PRESENCE_DOT[presence] }} />
                                        <span className="text-[12px] font-semibold text-ch-muted">{presence}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ---------- Board ---------- */}
            {showBoard && (
                <aside className="flex min-h-0 w-[392px] flex-none flex-col border-l-2 border-ch-rule">
                    <div className="flex-none bg-ch-accent px-6 pb-6 pt-[26px] text-ch-on-accent">
                        <div className="mb-3.5 flex items-baseline justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Membership</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
                                {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="mb-[18px] flex items-end gap-3">
                            <span className="text-[82px] font-extrabold leading-[0.82] tracking-[-0.05em]">{membership.total}</span>
                            <span className="pb-2 text-[15px] font-bold leading-tight">{membership.active}<br />active this week</span>
                        </div>
                        {/* Online / active / dormant split across the roster. */}
                        <div className="mb-3 flex h-9 border border-black/[0.28]" title={`${membership.online} online · ${membership.active} active · ${membership.dormant} dormant`}>
                            <div style={{ width: `${onlineShare}%`, background: 'var(--ch-on-accent)' }} />
                            <div style={{ width: `${activeShare}%`, background: 'rgba(0,0,0,0.26)' }} />
                        </div>
                        <div className="flex items-center justify-between border-t-2 border-black/[0.28] pt-3">
                            <span className="text-[11.5px] font-semibold">{membership.online} online · {membership.dormant} dormant</span>
                            <span className="text-[11.5px] font-extrabold">{requestCount} request{requestCount === 1 ? '' : 's'} pending</span>
                        </div>
                    </div>

                    <div className="flex h-[42px] flex-none items-stretch border-b-2 border-t-2 border-ch-rule">
                        {([['BOARD', 'Roster board'], ['TEAMS', 'Teams']] as Array<[BoardTab, string]>).map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setBoardTab(id)}
                                className={`flex flex-1 items-center border-r border-ch-divider px-5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors last:border-r-0 ${
                                    boardTab === id ? 'bg-ch-accent-soft text-ch-text' : 'text-ch-muted hover:bg-ch-surface'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
                        {boardTab === 'BOARD' ? (<>{requestsBlock}{groupsBlock}</>) : teamsBlock}
                    </div>
                </aside>
            )}

            {/* Below xl the board opens as a sheet from the strip's Teams cell. */}
            {!showBoard && isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex bg-black/50">
                    <button onClick={() => setIsDrawerOpen(false)} className="flex-1" aria-label="Close teams" />
                    <div className="ch-scroll flex h-full w-[min(392px,92vw)] flex-col overflow-y-auto border-l-2 border-ch-rule bg-ch-bg">
                        <div className="flex h-[46px] flex-none items-center justify-between border-b-2 border-ch-rule px-5">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Teams & requests</span>
                            <button onClick={() => setIsDrawerOpen(false)} className="text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted hover:text-ch-text">Close</button>
                        </div>
                        {requestsBlock}
                        {teamsBlock}
                    </div>
                </div>
            )}

            <MemberPortfolioModal isOpen={!!selectedMember} user={selectedMember} onClose={() => setSelectedMember(null)} />
            <ConfirmationModal
                isOpen={!!teamToDelete}
                onClose={() => setTeamToDelete(null)}
                onConfirm={confirmDeleteTeam}
                title="Delete Team"
                message={`Delete "${teamToDelete?.name}"? This will remove the team, join requests, and team challenges.`}
                confirmText="Delete"
                isDangerous
            />
        </div>
    );
};

export default Community;
