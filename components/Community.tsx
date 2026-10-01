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
import { PageIntro, StatStrip, BTN_PRIMARY } from './SplitKit';

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
            <div>
                <PageIntro
                    eyebrow="Community"
                    title="Community Hub"
                    description="Celebrate wins, form teams, and ship together. This is the heartbeat of the club."
                    actions={
                        <Tooltip text="Create a new team and invite members.">
                            <button onClick={handleCreateTeam} className={BTN_PRIMARY}>
                                <PlusCircleIcon /> Create Team
                            </button>
                        </Tooltip>
                    }
                />
                <StatStrip
                    stats={[
                        { label: 'Members', value: stats.approvedMembers },
                        { label: 'Teams', value: stats.totalTeams },
                        { label: 'Spotlight', value: topMember ? 'Live' : '—' },
                        { label: 'Highlights', value: recognitionBoard.length },
                    ]}
                />
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="bg-ch-bg border border-ch-divider p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrophyIcon />
                        <div>
                            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">Recognition Board</h3>
                            <p className="text-sm text-ch-muted">Points from showcases, suggestions, and badges.</p>
                        </div>
                    </div>

                    {recognitionBoard.length === 0 ? (
                        <p className="text-sm text-ch-muted">No recognition data yet. Submit showcases or suggestions to appear here.</p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
                            <div className="border border-ch-divider p-4 bg-ch-accent-soft">
                                <p className="text-xs uppercase tracking-[0.2em] text-ch-accent">Top Contributor</p>
                                {topMember ? (
                                    <div className="mt-3 flex items-center gap-4">
                                        <img
                                            src={topMember.user.avatarUrl || `https://i.pravatar.cc/120?u=${topMember.user.username}`}
                                            alt={topMember.user.name}
                                            className="w-16 h-16 object-cover border-2 border-white/80"
                                        />
                                        <div>
                                            <p className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">{topMember.user.name}</p>
                                            <p className="text-xs text-ch-muted">@{topMember.user.username}</p>
                                            <p className="text-sm font-semibold text-ch-accent mt-1">{topMember.score} pts</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-ch-muted">No spotlight yet.</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                {recognitionBoard.map((entry, index) => (
                                    <div key={entry.user.uid} className="flex items-center gap-3 bg-ch-surface p-3">
                                        <div className="h-8 w-8 bg-ch-text text-ch-bg flex items-center justify-center text-sm font-bold hover:opacity-90">
                                            {index + 1}
                                        </div>
                                        <img
                                            src={entry.user.avatarUrl || `https://i.pravatar.cc/40?u=${entry.user.username}`}
                                            alt={entry.user.name}
                                            className="w-10 h-10 object-cover border border-ch-divider"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-ch-text">{entry.user.name}</p>
                                            <p className="text-xs text-ch-muted">@{entry.user.username}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-ch-accent">{entry.score} pts</p>
                                            <p className="text-[11px] text-ch-muted">Showcases {entry.showcaseScore} • Ideas {entry.suggestionScore} • Badges {entry.badges}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden border border-ch-divider p-6 bg-ch-accent-soft">
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <SparklesIcon />
                        <div>
                            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text tracking-tight">Member Spotlight</h3>
                            <p className="text-sm text-ch-muted">Top community contributor this cycle.</p>
                        </div>
                    </div>
                    {topMember ? (
                        <div className="relative z-10">
                            <p className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">{topMember.user.name}</p>
                            <p className="text-sm text-ch-text">@{topMember.user.username}</p>
                            <p className="text-sm text-ch-accent mt-2">Showcases {topMember.showcaseScore} • Ideas {topMember.suggestionScore} • Badges {topMember.badges}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-ch-muted">No spotlight yet. Start contributing to appear here.</p>
                    )}
                </div>
            </section>

            <section className="bg-ch-bg border border-ch-divider p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <UsersIcon />
                        <div>
                            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">Teams</h3>
                            <p className="text-sm text-ch-muted">Form squads for projects and study groups.</p>
                        </div>
                    </div>
                    <Tooltip text="Create a new team and invite members.">
                        <button
                            onClick={handleCreateTeam}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-ch-accent text-ch-on-accent text-sm font-semibold hover:bg-ch-accent-deep transition-colors"
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
                        className="px-3 py-2 border border-ch-divider bg-ch-bg text-sm"
                    />
                    <input
                        value={teamForm.description}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Short description"
                        className="px-3 py-2 border border-ch-divider bg-ch-bg text-sm md:col-span-2"
                    />
                </div>

                {isLoadingTeams ? (
                    <p className="text-sm text-ch-muted">Loading teams...</p>
                ) : teamsError ? (
                    <p className="text-sm text-red-500 dark:text-red-400">{teamsError}</p>
                ) : teams.length === 0 ? (
                    <p className="text-sm text-ch-muted">No teams yet. Create the first one.</p>
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
                                <div key={team.id} className="border border-ch-divider p-4 bg-ch-surface">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-md font-semibold text-ch-text">{team.name}</h4>
                                            <p className="text-xs text-ch-muted">{team.description || 'No description'}</p>
                                        </div>
                                        {isOwner ? (
                                            <Tooltip text="Delete this team and remove all members.">
                                                <button
                                                    onClick={() => setTeamToDelete(team)}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </Tooltip>
                                        ) : isMember ? (
                                            <button
                                                onClick={() => handleLeaveTeam(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold bg-ch-surface-2 text-ch-text"
                                            >
                                                Leave
                                            </button>
                                        ) : myRequest ? (
                                            <span className="px-3 py-1.5 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                                Requested
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleRequestJoin(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep"
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
                                                    className="w-8 h-8 border border-ch-divider object-cover"
                                                />
                                            );
                                        })}
                                        {team.memberIds.length > 6 && (
                                            <span className="text-xs text-ch-muted">+{team.memberIds.length - 6} more</span>
                                        )}
                                    </div>
                                    {isOwner && pendingRequests.length > 0 && (
                                        <div className="mt-4 border border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 p-3 space-y-2">
                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 uppercase tracking-wide">Join Requests</p>
                                            {pendingRequests.map(req => {
                                                const requester = userMap.get(req.requesterId);
                                                return (
                                                    <div key={req.id} className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={requester?.avatarUrl || `https://i.pravatar.cc/40?u=${requester?.username || req.requesterId}`}
                                                                alt={requester?.name || 'Member'}
                                                                className="w-7 h-7 border border-ch-divider object-cover"
                                                            />
                                                            <div className="text-xs text-ch-text">
                                                                <p className="font-semibold">{requester?.name || 'Member'}</p>
                                                                <p className="text-[11px] text-ch-muted">@{requester?.username || 'unknown'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleApproveRequest(team.id, req.id, req.requesterId)}
                                                                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRequest(req.id)}
                                                                className="px-2.5 py-1 text-[11px] font-semibold bg-ch-surface-2 text-ch-text hover:bg-ch-surface-2"
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
                                                className="px-3 py-2 border border-ch-divider bg-ch-bg text-sm flex-1"
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
                                                className="px-3 py-2 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
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

            <section className="bg-ch-bg border border-ch-divider p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">Member Portfolio</h3>
                        <p className="text-sm text-ch-muted">Browse achievements and activity.</p>
                    </div>
                    <input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search members..."
                        className="px-3 py-2 border border-ch-divider bg-ch-bg text-sm w-56"
                    />
                </div>

                {directoryMembers.length === 0 ? (
                    <p className="text-sm text-ch-muted">No members found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directoryMembers.map(member => (
                            <div key={member.uid} className="border border-ch-divider p-4 bg-ch-surface">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.avatarUrl || `https://i.pravatar.cc/40?u=${member.username}`}
                                        alt={member.name}
                                        className="w-10 h-10 border border-ch-divider object-cover"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-ch-text">{member.name}</p>
                                        <p className="text-xs text-ch-muted">@{member.username}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-ch-muted">
                                    <span>{member.badges?.length || 0} badges</span>
                                    <button
                                        onClick={() => setSelectedMember(member)}
                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
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
