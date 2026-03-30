import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { TrophyIcon } from './icons/TrophyIcon';
import { UsersIcon } from './icons/UsersIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import MemberPortfolioModal from './MemberPortfolioModal';

interface CommunityProps {
    currentUser: User;
}

const Community: React.FC<CommunityProps> = ({ currentUser }) => {
    const {
        allUsers,
        showcaseItems,
        suggestions,
        teams,
        teamChallenges,
        isLoadingTeams,
        isLoadingTeamChallenges,
        teamsError,
        teamChallengesError,
        fetchTeams,
        fetchTeamChallenges,
        showToast
    } = useData();
    const [teamForm, setTeamForm] = useState({ name: '', description: '' });
    const [challengeForm, setChallengeForm] = useState({ teamId: '', title: '', description: '', dueDate: '' });
    const [submissionNote, setSubmissionNote] = useState<Record<string, string>>({});
    const [memberInvite, setMemberInvite] = useState<Record<string, string>>({});
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);

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

    const handleCreateChallenge = async () => {
        if (!challengeForm.teamId || !challengeForm.title.trim()) return;
        try {
            await api.createTeamChallenge({
                teamId: challengeForm.teamId,
                title: challengeForm.title.trim(),
                description: challengeForm.description.trim(),
                dueDate: challengeForm.dueDate || undefined,
                createdBy: currentUser.uid
            });
            await fetchTeamChallenges();
            setChallengeForm({ teamId: '', title: '', description: '', dueDate: '' });
            showToast('Team challenge created.', 'success');
        } catch (error) {
            console.error("Failed to create team challenge", error);
            showToast('Failed to create challenge.', 'error');
        }
    };

    const handleSubmitChallenge = async (challengeId: string) => {
        const note = submissionNote[challengeId]?.trim();
        if (!note) return;
        try {
            await api.upsertTeamChallengeSubmission({
                challengeId,
                userId: currentUser.uid,
                note
            });
            await fetchTeamChallenges();
            setSubmissionNote(prev => ({ ...prev, [challengeId]: '' }));
            showToast('Submission saved.', 'success');
        } catch (error) {
            console.error("Failed to submit challenge", error);
            showToast('Failed to submit challenge.', 'error');
        }
    };

    const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Community Hub</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Celebrate wins, form teams, and ship together.</p>
                </div>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
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
                                        <p className="text-sm font-bold text-pink-600 dark:text-pink-400">{entry.score} pts</p>
                                        <p className="text-[11px] text-gray-400">Showcases {entry.showcaseScore} • Ideas {entry.suggestionScore} • Badges {entry.badges}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-pink-500/25 via-purple-500/25 to-indigo-500/20 dark:from-pink-500/35 dark:via-purple-500/35 dark:to-indigo-500/25 border border-pink-300/60 dark:border-pink-500/40 rounded-3xl p-8 shadow-[0_20px_60px_-30px_rgba(236,72,153,0.6)]">
                    <div className="absolute -top-16 -right-12 w-48 h-48 bg-pink-400/20 blur-3xl rounded-full"></div>
                    <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-purple-500/20 blur-3xl rounded-full"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <SparklesIcon />
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Member Spotlight</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Top community contributor.</p>
                        </div>
                    </div>
                    {topMember ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-xl animate-pulse"></div>
                                <img
                                    src={topMember.user.avatarUrl || `https://i.pravatar.cc/120?u=${topMember.user.username}`}
                                    alt={topMember.user.name}
                                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white/80 dark:border-gray-900 shadow-xl"
                                />
                                <span className="absolute -bottom-1 -right-1 px-2 py-1 text-[11px] font-bold bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full shadow-md">
                                    #1
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{topMember.user.name}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">@{topMember.user.username}</p>
                                <p className="text-base text-pink-700 dark:text-pink-300 font-semibold mt-2">{topMember.score} points this week</p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="px-3 py-1 rounded-full bg-white/70 text-gray-900 shadow-sm">Showcases {topMember.showcaseScore}</span>
                                    <span className="px-3 py-1 rounded-full bg-white/70 text-gray-900 shadow-sm">Ideas {topMember.suggestionScore}</span>
                                    <span className="px-3 py-1 rounded-full bg-white/70 text-gray-900 shadow-sm">Badges {topMember.badges}</span>
                                </div>
                            </div>
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">Form squads for challenges and projects.</p>
                        </div>
                    </div>
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={handleCreateTeam}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700 transition-colors"
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Create Team
                        </button>
                    )}
                </div>

                {currentUser.role === 'PATRON' && (
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
                )}

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
                                        {isMember ? (
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
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700"
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

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircleIcon />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Challenges</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Work together and submit progress notes.</p>
                    </div>
                </div>

                {currentUser.role === 'PATRON' && teams.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                        <select
                            value={challengeForm.teamId}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, teamId: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        >
                            <option value="">Select team</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                        <input
                            value={challengeForm.title}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Challenge title"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <input
                            value={challengeForm.dueDate}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            type="date"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <button
                            onClick={handleCreateChallenge}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700"
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Add Challenge
                        </button>
                        <textarea
                            value={challengeForm.description}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Short description"
                            className="md:col-span-4 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                            rows={2}
                        />
                    </div>
                )}

                {isLoadingTeamChallenges ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading challenges...</p>
                ) : teamChallengesError ? (
                    <p className="text-sm text-red-500 dark:text-red-400">{teamChallengesError}</p>
                ) : teamChallenges.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No team challenges yet.</p>
                ) : (
                    <div className="space-y-4">
                        {teamChallenges.map(challenge => {
                            const team = teamsById.get(challenge.teamId);
                            const isMember = team?.memberIds.includes(currentUser.uid);
                            const submission = challenge.submissions[currentUser.uid];
                            return (
                                <div key={challenge.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">{challenge.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Team: {team?.name || 'Unknown team'} • Due {challenge.dueDate || 'TBD'}</p>
                                            {challenge.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{challenge.description}</p>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {Object.keys(challenge.submissions).length} submissions
                                        </div>
                                    </div>
                                    {isMember && (
                                        <div className="mt-3">
                                            <textarea
                                                value={submissionNote[challenge.id] ?? ''}
                                                onChange={(e) => setSubmissionNote(prev => ({ ...prev, [challenge.id]: e.target.value }))}
                                                placeholder={submission ? 'Update your progress note' : 'Add a progress note'}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                                                rows={2}
                                            />
                                            <div className="mt-2 flex items-center gap-3">
                                                <button
                                                    onClick={() => handleSubmitChallenge(challenge.id)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
                                                >
                                                    Submit Note
                                                </button>
                                                {submission && (
                                                    <span className="text-xs text-green-600 dark:text-green-400">
                                                        Submitted {new Date(submission.submittedAt).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
        <MemberPortfolioModal
            isOpen={!!selectedMember}
            user={selectedMember}
            onClose={() => setSelectedMember(null)}
        />
        </>
    );
};

export default Community;
