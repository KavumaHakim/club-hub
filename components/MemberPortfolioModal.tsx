import React, { useEffect, useMemo, useState } from 'react';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { UsersIcon } from './icons/UsersIcon';
import { FormattedMessage } from './FormattedMessage';

interface MemberPortfolioModalProps {
    isOpen: boolean;
    user: User | null;
    onClose: () => void;
}

const StatPill: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
    <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${tone}`}>
        {label}: <span className="ml-1 text-sm font-bold">{value}</span>
    </div>
);

const MemberPortfolioModal: React.FC<MemberPortfolioModalProps> = ({ isOpen, user, onClose }) => {
    const { showcaseItems, suggestions, feedItems, teams } = useData();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        const load = async () => {
            setIsLoadingAttendance(true);
            try {
                const records = await api.getAttendance(user.uid);
                setAttendance(records);
            } catch (error) {
                console.error("Failed to fetch attendance for member", error);
                setAttendance([]);
            } finally {
                setIsLoadingAttendance(false);
            }
        };
        load();
    }, [isOpen, user]);

    const attendanceSummary = useMemo(() => {
        return attendance.reduce(
            (acc, record) => {
                acc[record.status] = (acc[record.status] || 0) + 1;
                return acc;
            },
            { Present: 0, Absent: 0, Excused: 0 } as { [key in AttendanceStatus]: number }
        );
    }, [attendance]);

    const memberShowcases = useMemo(() => (
        showcaseItems.filter(item => item.userUid === user?.uid).slice(0, 5)
    ), [showcaseItems, user?.uid]);

    const memberSuggestions = useMemo(() => (
        suggestions.filter(item => item.userId === user?.uid).slice(0, 5)
    ), [suggestions, user?.uid]);

    const memberTeams = useMemo(() => (
        teams.filter(team => team.memberIds.includes(user?.uid || ''))
    ), [teams, user?.uid]);

    const recentActivity = useMemo(() => {
        if (!user) return [];
        const toTime = (value?: string) => {
            if (!value) return 0;
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };
        const entries: Array<{ id: string; action: string; detail: string; time: string }> = [];

        showcaseItems.forEach(item => {
            if (item.userUid !== user.uid) return;
            entries.push({
                id: `showcase:${item.id}`,
                action: 'Shared a showcase',
                detail: item.title,
                time: item.createdAt
            });
        });

        suggestions.forEach(item => {
            if (item.userId !== user.uid) return;
            entries.push({
                id: `suggestion:${item.id}`,
                action: item.type === 'BUG' ? 'Reported a bug' : 'Suggested a feature',
                detail: item.title,
                time: item.createdAt
            });
        });

        feedItems.forEach(item => {
            if (item.author !== user.name) return;
            entries.push({
                id: `feed:${item.id}`,
                action: 'Posted on the feed',
                detail: item.title || item.message,
                time: item.timestamp
            });
        });

        return entries
            .filter(entry => toTime(entry.time) > 0)
            .sort((a, b) => toTime(b.time) - toTime(a.time))
            .slice(0, 6);
    }, [feedItems, suggestions, showcaseItems, user]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-purple-500/10 to-indigo-900/10 dark:from-sky-500/20 dark:via-purple-500/20 dark:to-indigo-500/20"></div>
                    <div className="relative p-6 flex items-start justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <img
                                src={user.avatarUrl || `https://i.pravatar.cc/80?u=${user.username}`}
                                alt={user.name}
                                className="w-16 h-16 rounded-full border-2 border-white/80 dark:border-gray-900 shadow-md object-cover"
                            />
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <StatPill label="Badges" value={user.badges?.length || 0} tone="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200" />
                                    <StatPill label="Showcases" value={memberShowcases.length} tone="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200" />
                                    <StatPill label="Suggestions" value={memberSuggestions.length} tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200" />
                                    <StatPill label="Teams" value={memberTeams.length} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="px-6 pt-6">
                    <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">About</h4>
                        {user.bio?.trim() ? (
                            <FormattedMessage text={user.bio} isUser={false} />
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300">No bio added yet.</p>
                        )}
                    </section>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                    <div className="space-y-6">
                        <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <BadgeCheckIcon className="w-4 h-4 text-yellow-500" />
                                Achievements
                            </h4>
                            {user.badges && user.badges.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {user.badges.map((badge, idx) => (
                                        <span key={`${badge}-${idx}`} className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200 rounded-full">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No badges yet.</p>
                            )}
                        </section>

                        <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Showcase Highlights</h4>
                            {memberShowcases.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No showcases yet.</p>
                            ) : (
                                <div className="mt-3 space-y-3">
                                    {memberShowcases.map(item => (
                                        <div key={item.id} className="p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                                            <p className="text-[11px] text-gray-400 mt-2">Shared {item.createdAt}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Activity</h4>
                            {recentActivity.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No recent activity yet.</p>
                            ) : (
                                <ul className="mt-3 space-y-3">
                                    {recentActivity.map(entry => (
                                        <li key={entry.id}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.action}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{entry.detail}</p>
                                            <p className="text-[11px] text-gray-400 mt-1">{entry.time}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <div className="space-y-6">
                        <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-sky-500" />
                                Teams
                            </h4>
                            {memberTeams.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Not part of a team yet.</p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    {memberTeams.map(team => (
                                        <li key={team.id} className="flex items-center justify-between">
                                            <span>{team.name}</span>
                                            <span className="text-xs text-gray-400">{team.memberIds.length} members</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Attendance Snapshot</h4>
                            {isLoadingAttendance ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading attendance...</p>
                            ) : (
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 p-2 text-xs">
                                        <CheckCircleIcon className="w-4 h-4 mx-auto mb-1" />
                                        Present {attendanceSummary.Present}
                                    </div>
                                    <div className="rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 p-2 text-xs">
                                        <XCircleIcon className="w-4 h-4 mx-auto mb-1" />
                                        Absent {attendanceSummary.Absent}
                                    </div>
                                    <div className="rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 p-2 text-xs">
                                        <ExclamationCircleIcon className="w-4 h-4 mx-auto mb-1" />
                                        Excused {attendanceSummary.Excused}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberPortfolioModal;
