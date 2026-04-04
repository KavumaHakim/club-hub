import React, { useMemo, useState, useEffect } from 'react';
import { User, FeatureFlags, SuggestionStatus } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { HourglassIcon } from './icons/HourglassIcon';
import Tooltip from './Tooltip';

interface AdminToolsProps {
    currentUser: User;
}

type PendingSubmission = {
    id: string;
    challengeId: string;
    challengeTitle: string;
    userId: string;
    userName: string;
    userAvatarUrl?: string;
    content: string;
    submittedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

const AdminTools: React.FC<AdminToolsProps> = ({ currentUser }) => {
    const {
        allUsers,
        onlineUsers,
        feedItems,
        showcaseItems,
        suggestions,
        challenges,
        projectData,
        fetchSuggestions,
        showToast,
        featureFlags,
        updateFeatureFlags,
        resetFeatureFlags
    } = useData();

    const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

    const analytics = useMemo(() => {
        const approvedMembers = allUsers.filter(u => u.status === 'APPROVED');
        const pendingMembers = allUsers.filter(u => u.status === 'PENDING');
        const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');
        const activeChallenges = challenges.filter(c => c.status === 'ACTIVE');
        const taskCount = projectData ? Object.keys(projectData.tasks).length : 0;

        return {
            approvedMembers: approvedMembers.length,
            pendingMembers: pendingMembers.length,
            onlineNow: onlineUsers.length,
            totalPosts: feedItems.length,
            totalShowcases: showcaseItems.length,
            pendingSuggestions: pendingSuggestions.length,
            activeChallenges: activeChallenges.length,
            projectTasks: taskCount
        };
    }, [allUsers, onlineUsers, feedItems, showcaseItems, suggestions, challenges, projectData]);

    const pendingSuggestions = useMemo(() => {
        return suggestions.filter(s => s.status === 'PENDING');
    }, [suggestions]);

    const loadPendingSubmissions = async () => {
        setIsLoadingSubmissions(true);
        try {
            const results = await Promise.all(
                challenges.map(challenge =>
                    api.getSubmissions(challenge.id).then(subs =>
                        subs.map(sub => ({
                            id: sub.id,
                            challengeId: sub.challengeId,
                            challengeTitle: challenge.title,
                            userId: sub.userId,
                            userName: sub.userName,
                            userAvatarUrl: sub.userAvatarUrl,
                            content: sub.content,
                            submittedAt: sub.submittedAt,
                            status: sub.status
                        }))
                    )
                )
            );
            const flat = results.flat();
            setPendingSubmissions(flat.filter(sub => sub.status === 'PENDING'));
        } catch (error: any) {
            console.error("Failed to load submissions", error);
            showToast("Failed to load challenge submissions.", "error");
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    useEffect(() => {
        loadPendingSubmissions();
    }, [challenges]);

    const handleSuggestionStatus = async (id: string, status: SuggestionStatus) => {
        try {
            await api.updateSuggestionStatus(id, status, currentUser.uid);
            await fetchSuggestions();
            showToast(`Suggestion marked as ${status.replace('_', ' ').toLowerCase()}.`, 'success');
        } catch (error: any) {
            console.error("Failed to update suggestion status", error);
            showToast("Failed to update suggestion status.", "error");
        }
    };

    const handleReviewSubmission = async (submission: PendingSubmission, status: 'APPROVED' | 'REJECTED') => {
        try {
            await api.reviewSubmission(submission.id, status, submission.challengeTitle, submission.userId);
            showToast(`Submission ${status.toLowerCase()}.`, 'success');
            await loadPendingSubmissions();
        } catch (error: any) {
            console.error("Failed to review submission", error);
            showToast("Failed to review submission.", "error");
        }
    };

    const flagOptions: Array<{ key: keyof FeatureFlags; label: string; description: string }> = [
        { key: 'showCommunity', label: 'Community Hub', description: 'Teams, recognition board, and team challenges.' },
        { key: 'showChallenges', label: 'Challenges', description: 'Member coding challenges and submissions.' },
        { key: 'showSuggestions', label: 'Suggestions', description: 'Feature & bug suggestions board.' },
        { key: 'showShowcase', label: 'Showcase', description: 'Member code showcases.' },
        { key: 'showProjects', label: 'Projects', description: 'Project task board.' },
        { key: 'showActivities', label: 'Activities', description: 'Events and RSVPs.' },
        { key: 'showAttendance', label: 'Attendance', description: 'Attendance tracking.' },
        { key: 'showResources', label: 'Resources', description: 'Resource library.' },
        { key: 'showRoadmap', label: 'Roadmap', description: 'Learning roadmaps.' },
        { key: 'showChat', label: 'Chat', description: 'Member messaging.' },
        { key: 'showPlayground', label: 'Playground', description: 'Code playground.' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Tools</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Moderate content, monitor health, and toggle features.</p>
            </div>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <ChartBarIcon />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Snapshot</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time club pulse.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Approved Members', value: analytics.approvedMembers },
                        { label: 'Pending Requests', value: analytics.pendingMembers },
                        { label: 'Online Now', value: analytics.onlineNow },
                        { label: 'Feed Posts', value: analytics.totalPosts },
                        { label: 'Showcase Items', value: analytics.totalShowcases },
                        { label: 'Pending Suggestions', value: analytics.pendingSuggestions },
                        { label: 'Active Challenges', value: analytics.activeChallenges },
                        { label: 'Project Tasks', value: analytics.projectTasks }
                    ].map(card => (
                        <div key={card.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <ClipboardListIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Moderation Queue</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending suggestions and submissions.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Suggestions</h4>
                            {pendingSuggestions.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">No pending suggestions.</p>
                            ) : (
                                <div className="space-y-3">
                                    {pendingSuggestions.map(suggestion => (
                                        <div key={suggestion.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{suggestion.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">By {suggestion.userName}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleSuggestionStatus(suggestion.id, 'IN_PROGRESS')}
                                                    className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                >
                                                    In Progress
                                                </button>
                                                <button
                                                    onClick={() => handleSuggestionStatus(suggestion.id, 'COMPLETED')}
                                                    className="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                >
                                                    Complete
                                                </button>
                                                <button
                                                    onClick={() => handleSuggestionStatus(suggestion.id, 'REJECTED')}
                                                    className="px-2.5 py-1 text-xs rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge Submissions</h4>
                            {isLoadingSubmissions ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Loading submissions...</p>
                            ) : pendingSubmissions.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">No pending submissions.</p>
                            ) : (
                                <div className="space-y-3">
                                    {pendingSubmissions.map(submission => (
                                        <div key={submission.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={submission.userAvatarUrl || `https://i.pravatar.cc/40?u=${submission.userName}`}
                                                    alt={submission.userName}
                                                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{submission.userName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{submission.challengeTitle}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{submission.content}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Tooltip text="Approve and award the badge if earned.">
                                                    <button
                                                        onClick={() => handleReviewSubmission(submission, 'APPROVED')}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                    >
                                                        <CheckCircleIcon className="w-3 h-3" /> Approve
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Reject the submission and notify the member.">
                                                    <button
                                                        onClick={() => handleReviewSubmission(submission, 'REJECTED')}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    >
                                                        <XCircleIcon className="w-3 h-3" /> Reject
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <HourglassIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Flags</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle modules for the whole club.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {flagOptions.map(option => (
                            <label key={option.key} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl p-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                                    checked={featureFlags[option.key]}
                                    onChange={(e) => updateFeatureFlags({ [option.key]: e.target.checked } as Partial<FeatureFlags>)}
                                />
                            </label>
                        ))}
                    </div>
                    <Tooltip text="Restore the default feature visibility for the whole club.">
                        <button
                            onClick={resetFeatureFlags}
                            className="mt-4 px-3 py-2 text-sm font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Reset Defaults
                        </button>
                    </Tooltip>
                </div>
            </section>
        </div>
    );
};

export default AdminTools;
