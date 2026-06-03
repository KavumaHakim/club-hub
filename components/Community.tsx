import React, { useMemo, useState } from 'react';
import { Team, User } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { TrophyIcon } from './icons/TrophyIcon';
import { UsersIcon } from './icons/UsersIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import MemberPortfolioModal from './MemberPortfolioModal';
import Tooltip from './Tooltip';
import ConfirmationModal from './ConfirmationModal';

interface CommunityProps {
    currentUser: User;
}

const Community: React.FC<CommunityProps> = ({ currentUser }) => {
    const {
        allUsers,
        showcaseItems,
        suggestions,
        teams,
        isLoadingTeams,
        teamsError,
        fetchTeams,
        showToast
    } = useData();
    const [teamForm, setTeamForm] = useState({ name: '', description: '' });
    const [memberInvite, setMemberInvite] = useState<Record<string, string>>({});
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

    const userMap = useMemo(() => {
        return new Map(allUsers.map(user => [user.uid, user]));
    }, [allUsers]);

    const recognitionBoard = useMemo(() => {
        const showcaseCount = new Map<string, number>();
        const suggestionCount = new Map<string, number>();
        const badgeCount = new Map<string, number>();

        showcaseItems.forEach(item => {
            showcaseCount.set(item.userUid, (showcaseCount.get(item.userUid) || 0) + 1);
        });

        suggestions.forEach(item => {
            suggestionCount.set(item.userId, (suggestionCount.get(item.userId) || 0) + 1);
        });

        allUsers.forEach(user => {
            badgeCount.set(user.uid, user.badges?.length || 0);
        });

        return allUsers
            .filter(user => user.status === 'APPROVED')
            .map(user => {
                const showcaseScore = showcaseCount.get(user.uid) || 0;
                const suggestionScore = suggestionCount.get(user.uid) || 0;
                const badges = badgeCount.get(user.uid) || 0;
                const score = showcaseScore * 3 + suggestionScore + badges * 2;
                return {
                    user,
                    score,
                    showcaseScore,
                    suggestionScore,
                    badges
                };
            })
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }, [allUsers, showcaseItems, suggestions]);

    const topMember = recognitionBoard[0];
    const stats = useMemo(() => {
        const approvedMembers = allUsers.filter(user => user.status === 'APPROVED').length;
        const totalTeams = teams.length;
        return { approvedMembers, totalTeams };
    }, [allUsers, teams]);

    const handleCreateTeam = async () => {
        if (!teamForm.name.trim()) return;
        try {
            const created = await api.createTeam({
                name: teamForm.name.trim(),
                description: teamForm.description.trim(),
                createdBy: currentUser.uid
            });
            await api.addTeamMember(created.id, currentUser.uid);
            await fetchTeams();
            setTeamForm({ name: '', description: '' });
            showToast('Team created.', 'success');
        } catch (error) {
            console.error("Failed to create team", error);
            showToast('Failed to create team.', 'error');
        }
    };

    const handleRequestJoin = async (teamId: string) => {
        try {
            await api.requestTeamJoin(teamId, currentUser.uid);
            await fetchTeams();
            showToast('Join request sent to team owner.', 'success');
        } catch (error) {
            console.error("Failed to join team", error);
            showToast('Failed to send join request.', 'error');
        }
    };

    const handleLeaveTeam = async (teamId: string) => {
        try {
            await api.removeTeamMember(teamId, currentUser.uid);
            await fetchTeams();
        } catch (error) {
            console.error("Failed to leave team", error);
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
            console.error("Failed to add member", error);
            showToast('Failed to add member.', 'error');
        }
    };

    const handleApproveRequest = async (teamId: string, requestId: string, requesterId: string) => {
        try {
            await api.approveTeamJoinRequest({
                requestId,
                teamId,
                requesterId,
                reviewedBy: currentUser.uid
            });
            await fetchTeams();
            showToast('Member approved.', 'success');
        } catch (error) {
            console.error("Failed to approve request", error);
            showToast('Failed to approve request.', 'error');
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await api.rejectTeamJoinRequest({
                requestId,
                reviewedBy: currentUser.uid
            });
            await fetchTeams();
            showToast('Request rejected.', 'info');
        } catch (error) {
            console.error("Failed to reject request", error);
            showToast('Failed to reject request.', 'error');
        }
    };

    const confirmDeleteTeam = async () => {
        if (!teamToDelete) return;
        try {
            await api.deleteTeam({ teamId: teamToDelete.id, requesterId: currentUser.uid });
            await fetchTeams();
            showToast('Team deleted.', 'success');
        } catch (error) {
            console.error("Failed to delete team", error);
            showToast('Failed to delete team.', 'error');
        } finally {
            setTeamToDelete(null);
        }
    };


    const directoryMembers = useMemo(() => {
        const term = memberSearch.trim().toLowerCase();
        return allUsers
            .filter(user => user.status === 'APPROVED')
            .filter(user => {
                if (!term) return true;
                return user.name.toLowerCase().includes(term) || user.username.toLowerCase().includes(term);
            })
            .slice(0, 20);
    }, [allUsers, memberSearch]);

    return (
        <>
        <div className="max-w-6xl mx-auto space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-gradient-to-br from-white via-sky-50/60 to-purple-50/50 dark:from-gray-900 dark:via-sky-900/15 dark:to-purple-900/15 p-6 md:p-8 shadow-sm">
                <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-sky-300/30 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-purple-300/25 blur-3xl"></div>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-sky-500/80 dark:text-sky-300">Community</p>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">Community Hub</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
                            Celebrate wins, form teams, and ship together. This is the heartbeat of the club.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Tooltip text="Create a new team and invite members.">
                            <button
                                onClick={handleCreateTeam}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-sky-700 transition-all"
                            >
                                <PlusCircleIcon className="w-4 h-4" /> Create Team
                            </button>
                        </Tooltip>
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900/10 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold">
                            <CheckCircleIcon className="w-4 h-4" /> Build teams for projects
                        </div>
                    </div>
                </div>
                <div className="relative z-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-gray-700/60 p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvedMembers}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-gray-700/60 p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Teams</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTeams}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-gray-700/60 p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Spotlight</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{topMember ? 'Live' : '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-gray-700/60 p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Highlights</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{recognitionBoard.length}</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <TrophyIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recognition Board</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Points from showcases, suggestions, and badges.</p>
                        </div>
                    </div>

                    {recognitionBoard.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recognition data yet. Submit showcases or suggestions to appear here.</p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
                            <div className="rounded-2xl bg-gradient-to-br from-sky-500/10 via-purple-500/10 to-indigo-900/10 border border-sky-200/60 dark:border-sky-500/30 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Top Contributor</p>
                                {topMember ? (
                                    <div className="mt-3 flex items-center gap-4">
                                        <img
                                            src={topMember.user.avatarUrl || `https://i.pravatar.cc/120?u=${topMember.user.username}`}
                                            alt={topMember.user.name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-white/80 dark:border-gray-900 shadow-lg"
                                        />
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{topMember.user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">@{topMember.user.username}</p>
                                            <p className="text-sm font-semibold text-sky-600 dark:text-sky-300 mt-1">{topMember.score} pts</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No spotlight yet.</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                {recognitionBoard.map((entry, index) => (
                                    <div key={entry.user.uid} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <img
                                            src={entry.user.avatarUrl || `https://i.pravatar.cc/40?u=${entry.user.username}`}
                                            alt={entry.user.name}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">{entry.user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.user.username}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-sky-600 dark:text-sky-400">{entry.score} pts</p>
                                            <p className="text-[11px] text-gray-400">Showcases {entry.showcaseScore} • Ideas {entry.suggestionScore} • Badges {entry.badges}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-sky-500/25 via-purple-500/25 to-indigo-900/20 dark:from-sky-500/35 dark:via-purple-500/35 dark:to-indigo-500/25 border border-sky-300/60 dark:border-sky-500/40 rounded-3xl p-6 shadow-[0_20px_60px_-30px_rgba(236,72,153,0.6)]">
                    <div className="absolute -top-16 -right-12 w-48 h-48 bg-sky-400/20 blur-3xl rounded-full"></div>
                    <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-purple-500/20 blur-3xl rounded-full"></div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <SparklesIcon />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Member Spotlight</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Top community contributor this cycle.</p>
                        </div>
                    </div>
                    {topMember ? (
                        <div className="relative z-10">
                            <p className="text-xl font-black text-gray-900 dark:text-white">{topMember.user.name}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">@{topMember.user.username}</p>
                            <p className="text-sm text-sky-700 dark:text-sky-200 mt-2">Showcases {topMember.showcaseScore} • Ideas {topMember.suggestionScore} • Badges {topMember.badges}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No spotlight yet. Start contributing to appear here.</p>
                    )}
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <UsersIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Form squads for projects and study groups.</p>
                        </div>
                    </div>
                    <Tooltip text="Create a new team and invite members.">
                        <button
                            onClick={handleCreateTeam}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors"
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Create Team
                        </button>
                    </Tooltip>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <input
                        value={teamForm.name}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Team name"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    />
                    <input
                        value={teamForm.description}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Short description"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm md:col-span-2"
                    />
                </div>

                {isLoadingTeams ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading teams...</p>
                ) : teamsError ? (
                    <p className="text-sm text-red-500 dark:text-red-400">{teamsError}</p>
                ) : teams.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No teams yet. Create the first one.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {teams.map(team => {
                            const isMember = team.memberIds.includes(currentUser.uid);
                            const isOwner = team.createdBy === currentUser.uid;
                            const pendingRequests = (team.joinRequests || []).filter(req => req.status === 'PENDING');
                            const myRequest = (team.joinRequests || []).find(req => req.requesterId === currentUser.uid && req.status === 'PENDING');
                            const canManageMembers = isOwner;
                            const availableMembers = allUsers
                                .filter(user => user.status === 'APPROVED')
                                .filter(user => !team.memberIds.includes(user.uid));
                            return (
                                <div key={team.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">{team.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{team.description || 'No description'}</p>
                                        </div>
                                        {isOwner ? (
                                            <Tooltip text="Delete this team and remove all members.">
                                                <button
                                                    onClick={() => setTeamToDelete(team)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </Tooltip>
                                        ) : isMember ? (
                                            <button
                                                onClick={() => handleLeaveTeam(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                            >
                                                Leave
                                            </button>
                                        ) : myRequest ? (
                                            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                                Requested
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleRequestJoin(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                                            >
                                                Request Join
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {team.memberIds.slice(0, 6).map(uid => {
                                            const user = userMap.get(uid);
                                            return (
                                                <img
                                                    key={uid}
                                                    src={user?.avatarUrl || `https://i.pravatar.cc/40?u=${user?.username || uid}`}
                                                    alt={user?.name || 'Member'}
                                                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                                />
                                            );
                                        })}
                                        {team.memberIds.length > 6 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">+{team.memberIds.length - 6} more</span>
                                        )}
                                    </div>
                                    {isOwner && pendingRequests.length > 0 && (
                                        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 p-3 space-y-2">
                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 uppercase tracking-wide">Join Requests</p>
                                            {pendingRequests.map(req => {
                                                const requester = userMap.get(req.requesterId);
                                                return (
                                                    <div key={req.id} className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={requester?.avatarUrl || `https://i.pravatar.cc/40?u=${requester?.username || req.requesterId}`}
                                                                alt={requester?.name || 'Member'}
                                                                className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                                            />
                                                            <div className="text-xs text-gray-700 dark:text-gray-200">
                                                                <p className="font-semibold">{requester?.name || 'Member'}</p>
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">@{requester?.username || 'unknown'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleApproveRequest(team.id, req.id, req.requesterId)}
                                                                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRequest(req.id)}
                                                                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                            >
                                                                Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {canManageMembers && availableMembers.length > 0 && (
                                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                            <select
                                                value={memberInvite[team.id] ?? ''}
                                                onChange={(e) => setMemberInvite(prev => ({ ...prev, [team.id]: e.target.value }))}
                                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm flex-1"
                                            >
                                                <option value="">Invite member</option>
                                                {availableMembers.map(user => (
                                                    <option key={user.uid} value={user.uid}>
                                                        {user.name} (@{user.username})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAddMember(team.id)}
                                                className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                                            >
                                                Invite
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Member Portfolio</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Browse achievements and activity.</p>
                    </div>
                    <input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search members..."
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-56"
                    />
                </div>

                {directoryMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No members found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directoryMembers.map(member => (
                            <div key={member.uid} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.avatarUrl || `https://i.pravatar.cc/40?u=${member.username}`}
                                        alt={member.name}
                                        className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{member.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">@{member.username}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{member.badges?.length || 0} badges</span>
                                    <button
                                        onClick={() => setSelectedMember(member)}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                                    >
                                        View Portfolio
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

        </div>
        <MemberPortfolioModal
            isOpen={!!selectedMember}
            user={selectedMember}
            onClose={() => setSelectedMember(null)}
        />
        <ConfirmationModal
            isOpen={!!teamToDelete}
            onClose={() => setTeamToDelete(null)}
            onConfirm={confirmDeleteTeam}
            title="Delete Team"
            message={`Delete "${teamToDelete?.name}"? This will remove the team, join requests, and team challenges.`}
            confirmText="Delete"
            isDangerous
        />
        </>
    );
};

export default Community;
