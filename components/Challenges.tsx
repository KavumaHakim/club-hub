import React, { useState, useMemo, useEffect } from 'react';
import { User, Challenge, ChallengeSubmission, SubmissionStatus } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { analyzeChallengeSubmission, generateAIChallenge, autoEvaluateChallenge } from '../services/geminiService';
import { TrophyIcon } from './icons/TrophyIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { PlayIcon } from './icons/PlayIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { CodeRunnerModal } from './CodeRunnerModal';
import { FormattedMessage } from './FormattedMessage';
import Tooltip from './Tooltip';

interface ChallengesProps {
    currentUser: User;
    onMakeSubmission?: (challenge: Challenge) => void;
}

const DifficultyBadge: React.FC<{ difficulty?: string }> = ({ difficulty }) => {
    if (!difficulty) return null;
    let color = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    if (difficulty === 'BEGINNER') color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (difficulty === 'INTERMEDIATE') color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (difficulty === 'ADVANCED') color = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${color}`}>
            {difficulty}
        </span>
    );
};

const RankAvatar: React.FC<{ user: User, rank: number, className?: string }> = ({ user, rank, className }) => {
    let ringColor = 'border-gray-200 dark:border-gray-700';
    let badgeColor = 'bg-gray-500';

    if (rank === 1) { ringColor = 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'; badgeColor = 'bg-yellow-400 text-yellow-900'; }
    else if (rank === 2) { ringColor = 'border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.4)]'; badgeColor = 'bg-slate-300 text-slate-900'; }
    else if (rank === 3) { ringColor = 'border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.4)]'; badgeColor = 'bg-amber-600 text-amber-100'; }

    return (
        <div className={`relative flex flex-col items-center ${className}`}>
            <div className="relative">
                <img
                    src={user.avatarUrl || `https://i.pravatar.cc/80?u=${user.username}`}
                    className={`rounded-full object-cover border-4 ${ringColor} transition-transform hover:scale-105 ${rank === 1 ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'}`}
                    alt={user.name}
                />
                <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-2 border-white dark:border-gray-800 ${badgeColor}`}>
                    {rank}
                </div>
            </div>
            <div className="mt-3 text-center">
                <p className="font-bold text-white text-sm md:text-base truncate max-w-[100px] md:max-w-[120px] leading-tight">
                    {user.name}
                </p>
                <p className="text-xs text-white/80 flex items-center justify-center gap-1 mt-0.5">
                    <BadgeCheckIcon className="w-3 h-3" /> {user.badges?.length || 0}
                </p>
            </div>
        </div>
    );
};

const Leaderboard: React.FC<{ users: User[] }> = ({ users }) => {
    const rankedUsers = useMemo(() => {
        return [...users]
            .sort((a, b) => (b.badges?.length || 0) - (a.badges?.length || 0))
            .slice(0, 10);
    }, [users]);

    if (rankedUsers.length === 0) return null;

    const topThree = rankedUsers.slice(0, 3);
    const runnersUp = rankedUsers.slice(3);

    const podiumOrder = [];
    if (topThree[1]) podiumOrder.push({ user: topThree[1], rank: 2 });
    if (topThree[0]) podiumOrder.push({ user: topThree[0], rank: 1 });
    if (topThree[2]) podiumOrder.push({ user: topThree[2], rank: 3 });

    return (
        <div className="mb-10 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border border-gray-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <TrophyIcon className="h-7 w-7 text-yellow-400" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                            Hall of Fame
                        </span>
                    </h3>
                    <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full text-white/70">
                        Top Badge Earners
                    </span>
                </div>

                <div className="flex justify-center items-end gap-4 md:gap-8 mb-10 min-h-[160px]">
                    {podiumOrder.map((item) => (
                        <RankAvatar
                            key={item.user.uid}
                            user={item.user}
                            rank={item.rank}
                            className={item.rank === 1 ? '-mt-8 z-10' : ''}
                        />
                    ))}
                </div>

                {runnersUp.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                        {runnersUp.map((user, index) => (
                            <div key={user.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <div className="w-8 h-8 flex items-center justify-center font-bold text-white/50 text-sm">
                                    #{index + 4}
                                </div>
                                <img
                                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                                    className="w-10 h-10 rounded-full border border-white/10"
                                    alt={user.name}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">{user.name}</p>
                                    <p className="text-xs text-white/50 truncate">@{user.username}</p>
                                </div>
                                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                                    <BadgeCheckIcon className="w-3 h-3 text-yellow-400" />
                                    <span className="text-xs font-bold">{user.badges?.length || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ChallengeCard: React.FC<{
    challenge: Challenge;
    currentUser: User;
    onOpenSubmission: (id: string) => void;
    onOpenReview: (id: string, title: string) => void;
    onMakeSubmission?: (challenge: Challenge) => void;
}> = ({ challenge, currentUser, onOpenSubmission, onOpenReview, onMakeSubmission }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPatron = currentUser.role === 'PATRON';
    const hasBadge = currentUser.badges?.includes(challenge.title);
    const today = new Date();
    const deadline = new Date(challenge.deadline);
    const isExpired = deadline < today;

    const timeDiff = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let statusColor = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    let statusText = "Closed";

    if (hasBadge) {
        statusColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        statusText = "Completed";
    } else if (isExpired) {
        statusColor = "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
        statusText = "Expired";
    } else if (challenge.status === 'ACTIVE') {
        if (daysLeft <= 3) {
            statusColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            statusText = `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Left`;
        } else {
            statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
            statusText = "Active";
        }
    }

    return (
        <div className={`group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${isExpanded ? 'h-full scale-[1.02] z-10' : 'h-fit'} ${hasBadge ? 'ring-1 ring-green-500/20' : ''}`}>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide self-start ${statusColor}`}>
                            {statusText}
                        </span>
                        <DifficultyBadge difficulty={challenge.difficulty} />
                    </div>
                    <div className="flex items-center gap-2">
                        {hasBadge && <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full text-green-600 dark:text-green-400"><BadgeCheckIcon className="w-5 h-5" /></div>}
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all shadow-sm border border-gray-100 dark:border-gray-700"
                            title={isExpanded ? "Show Less" : "Show More"}
                        >
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {challenge.title}
                </h4>

                <div className={`mb-4 transition-all duration-300 ${!isExpanded ? 'line-clamp-2 overflow-hidden' : ''}`}>
                    {isExpanded ? (
                        <FormattedMessage text={challenge.description} isUser={false} />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {challenge.description.length > 120 ? challenge.description.substring(0, 120) + '...' : challenge.description}
                        </p>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <CalendarIcon />
                            <span className="ml-1.5">Due {deadline.toLocaleDateString()}</span>
                        </div>
                    </div>

                    {isPatron ? (
                        <Tooltip text="Review member submissions and approve badges.">
                            <button
                                onClick={() => onOpenReview(challenge.id, challenge.title)}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center gap-2"
                            >
                                Review Submissions
                            </button>
                        </Tooltip>
                    ) : (
                        !hasBadge && challenge.status === 'ACTIVE' && !isExpired ? (
                            <Tooltip text="Submit your solution to earn a badge.">
                                <button
                                    onClick={() => onMakeSubmission ? onMakeSubmission(challenge) : onOpenSubmission(challenge.id)}
                                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                >
                                    {onMakeSubmission ? 'Make a submission' : 'Submit Solution'}
                                </button>
                            </Tooltip>
                        ) : (
                            <button
                                disabled
                                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {hasBadge ? 'Badge Earned' : 'Challenge Closed'}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

const CreateChallengeModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (title: string, desc: string, date: string, diff: any) => Promise<void>,
    prefill?: { title: string, description: string, difficulty: any } | null
}> = ({ isOpen, onClose, onSubmit, prefill }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(prefill?.title || '');
        setDescription(prefill?.description || '');
        setDifficulty((prefill?.difficulty as any) || 'BEGINNER');
        setDeadline('');
    }, [isOpen, prefill]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !deadline) return;
        setIsSubmitting(true);
        await onSubmit(title, description, deadline, difficulty);
        setIsSubmitting(false);
        onClose();
        setTitle('');
        setDescription('');
        setDeadline('');
        setDifficulty('BEGINNER');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Post New Challenge</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Challenge Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" placeholder="e.g., Python Sorting Algorithm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" placeholder="Explain the task..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" />
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50">{isSubmitting ? 'Posting...' : 'Create Challenge'}</button>
                </form>
            </div>
        </div>
    );
};

const GenerateAIChallengeModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onGenerated: (title: string, desc: string, difficulty: any) => void
}> = ({ isOpen, onClose, onGenerated }) => {
    const [concepts, setConcepts] = useState('');
    const [skillLevel, setSkillLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
    const [language, setLanguage] = useState('Python');
    const [isGenerating, setIsGenerating] = useState(false);
    const { showAlert } = useData();

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concepts) return;
        setIsGenerating(true);
        try {
            const result = await generateAIChallenge(skillLevel, concepts, language);
            onGenerated(result.title, result.description, skillLevel);
            setConcepts('');
            onClose();
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Generation Failed',
                message: 'Failed to generate challenge. Please try again.',
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><XIcon /></button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                        <SparklesIcon className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">AI Challenge <span className="text-pink-600">Generator</span></h3>
                </div>

                <form onSubmit={handleGenerate} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Concepts to include</label>
                        <textarea
                            value={concepts}
                            onChange={e => setConcepts(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 transition-all outline-none"
                            placeholder="e.g. For loops, lists, string manipulation..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Skill Level</label>
                            <select
                                value={skillLevel}
                                onChange={e => setSkillLevel(e.target.value as any)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Language</label>
                            <select
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none"
                            >
                                <option value="Python">Python</option>
                                <option value="JavaScript">JavaScript</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                Crafting Challenge...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                Generate Challenge
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const SubmitSolutionModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (content: string) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content) return;
        setIsSubmitting(true);
        await onSubmit(content);
        setIsSubmitting(false);
        onClose();
        setContent('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Submit Solution</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solution (Text, Code, or Link)</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} required rows={6} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500 font-mono text-sm" placeholder="Paste your code or a link to your project here..." />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Submit'}</button>
                </form>
            </div>
        </div>
    );
};

const AnalysisModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    content: string,
    weaknesses?: string,
    improvements?: string,
    passed?: boolean | null,
    isLoading: boolean,
    title?: string,
    subtitle?: string,
    challengeTitle?: string
}> = ({ isOpen, onClose, content, weaknesses, improvements, passed, isLoading, title = 'AI Evaluation', subtitle = 'Powered by Gemini', challengeTitle }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors"><XIcon /></button>

                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-xl ${passed ? 'bg-green-100 dark:bg-green-900/30' : passed === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-pink-100 dark:bg-pink-900/30'}`}>
                        {passed ? (
                            <TrophyIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                        ) : passed === false ? (
                            <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                        ) : (
                            <SparklesIcon className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{passed ? 'Challenge Passed!' : passed === false ? 'Challenge Not Yet Passed' : subtitle}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                            <p className="text-gray-500 animate-pulse font-medium">Analyzing submission...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-pink-500" />
                                    Verdict & Feedback
                                </h4>
                                <FormattedMessage text={content} isUser={false} />
                            </div>

                            {weaknesses && (
                                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                                    <h4 className="text-sm font-bold text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                                        <ExclamationCircleIcon className="w-4 h-4" />
                                        Areas for Improvement / Missing Requirements
                                    </h4>
                                    <div className="text-sm text-red-800 dark:text-red-300">
                                        <FormattedMessage text={weaknesses} isUser={false} />
                                    </div>
                                </div>
                            )}

                            {improvements && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                                        <LightBulbIcon className="w-4 h-4" />
                                        Suggested Enhancements
                                    </h4>
                                    <div className="text-sm text-blue-800 dark:text-blue-300">
                                        <FormattedMessage text={improvements} isUser={false} />
                                    </div>
                                </div>
                            )}

                            <section className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <TrophyIcon className={`w-4 h-4 ${passed ? 'text-yellow-500' : 'text-gray-400'}`} />
                                    Badge Status
                                </h4>
                                <div className={`p-5 rounded-2xl border flex items-center gap-4 ${passed ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                    <div className={`p-3 rounded-xl ${passed ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                        <TrophyIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {passed ? 'Badge Earned!' : 'Badge Locked'}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {passed 
                                                ? `Congratulations! You've successfully unlocked the ${challengeTitle || 'challenge'} badge.` 
                                                : 'Correct the issues mentioned below and try again to earn your badge!'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                    >
                        {passed ? 'Awesome!' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ReviewSubmissionsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    challengeId: string,
    challengeTitle: string,
}> = ({ isOpen, onClose, challengeId, challengeTitle }) => {
    const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useData();

    // Runner State
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [runnerCode, setRunnerCode] = useState('');
    const [runnerTitle, setRunnerTitle] = useState('');

    // AI Analysis State
    const [analysis, setAnalysis] = useState<{ 
        isOpen: boolean, 
        content: string, 
        weaknesses: string,
        improvements: string,
        passed: boolean | null,
        isLoading: boolean 
    }>({
        isOpen: false,
        content: '',
        weaknesses: '',
        improvements: '',
        passed: null,
        isLoading: false
    });

    useEffect(() => {
        if (isOpen && challengeId) {
            const fetchSubs = async () => {
                setIsLoading(true);
                const data = await api.getSubmissions(challengeId);
                setSubmissions(data);
                setIsLoading(false);
            };
            fetchSubs();
        }
    }, [isOpen, challengeId]);

    const handleReview = async (subId: string, status: 'APPROVED' | 'REJECTED', userId: string) => {
        try {
            await api.reviewSubmission(subId, status, challengeTitle, userId);
            setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status } : s));
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Update Failed',
                message: 'Failed to update submission status.',
                type: 'error'
            });
        }
    };

    const handleRunCode = (code: string, userName: string) => {
        setRunnerCode(code);
        setRunnerTitle(`Submission by ${userName}`);
        setRunnerOpen(true);
    };

    const handleAnalyze = async (sub: ChallengeSubmission) => {
        setAnalysis({ isOpen: true, content: '', isLoading: true });
        try {
            const result = await analyzeChallengeSubmission(challengeTitle, sub.content);
            setAnalysis({ isOpen: true, content: result, isLoading: false });
        } catch (e) {
            setAnalysis({ isOpen: true, content: "Error analyzing submission. Please ensure your API key is configured.", isLoading: false });
        }
    }

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Submissions: {challengeTitle}</h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {isLoading ? (
                            <p className="text-center text-gray-500">Loading submissions...</p>
                        ) : submissions.length === 0 ? (
                            <p className="text-center text-gray-500">No submissions yet.</p>
                        ) : (
                            submissions.map(sub => (
                                <div key={sub.id} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <img src={sub.userAvatarUrl || `https://i.pravatar.cc/40?u=${sub.userId}`} className="w-8 h-8 rounded-full" alt={sub.userName} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{sub.userName}</p>
                                                <p className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${sub.status === 'APPROVED' ? 'bg-green-100 text-green-700' : sub.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-3 relative group">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <button
                                                onClick={() => handleAnalyze(sub)}
                                                className="p-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-600 dark:bg-gray-700 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 rounded-md text-gray-500 dark:text-gray-400 transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                                                title="Analyze with AI"
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRunCode(sub.content, sub.userName)}
                                                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-500 dark:text-gray-400 transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                                                title="Run Code"
                                            >
                                                <PlayIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono max-h-60 overflow-y-auto custom-scrollbar pt-8">{sub.content}</pre>
                                    </div>
                                    {sub.status === 'PENDING' && (
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleReview(sub.id, 'REJECTED', sub.userId)} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1">
                                                <XCircleIcon className="w-4 h-4" /> Reject
                                            </button>
                                            <button onClick={() => handleReview(sub.id, 'APPROVED', sub.userId)} className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-1">
                                                <CheckIcon className="w-4 h-4" /> Approve & Award Badge
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <CodeRunnerModal
                isOpen={runnerOpen}
                onClose={() => setRunnerOpen(false)}
                code={runnerCode}
                title={runnerTitle}
            />
            <AnalysisModal
                isOpen={analysis.isOpen}
                content={analysis.content}
                isLoading={analysis.isLoading}
                onClose={() => setAnalysis(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
};

const Challenges: React.FC<ChallengesProps> = ({ currentUser, onMakeSubmission }) => {
    const { challenges, allUsers, fetchChallenges, isLoadingChallenges, challengesError, showToast, fetchUsers } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [selectedReviewChallenge, setSelectedReviewChallenge] = useState<{ id: string, title: string } | null>(null);
    const [autoFeedback, setAutoFeedback] = useState<{ 
        isOpen: boolean, 
        content: string, 
        weaknesses: string,
        improvements: string,
        passed: boolean | null,
        isLoading: boolean, 
        title: string 
    }>({
        isOpen: false,
        content: '',
        weaknesses: '',
        improvements: '',
        passed: null,
        isLoading: false,
        title: 'AI Feedback'
    });

    const [prefillData, setPrefillData] = useState<{ title: string, description: string, difficulty: any } | null>(null);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');

    const isPatron = currentUser.role === 'PATRON';

    const handleCreateChallenge = async (title: string, description: string, deadline: string, difficulty: any) => {
        await api.addChallenge({
            title,
            description,
            deadline,
            difficulty,
            createdBy: currentUser.uid
        });
        setPrefillData(null);
        await fetchChallenges();
    };

    const handleAIChallengeGenerated = (title: string, description: string, difficulty: any) => {
        setPrefillData({ title, description, difficulty });
        setIsAIModalOpen(false);
        setIsCreateModalOpen(true);
    };

    const handleSubmitSolution = async (content: string) => {
        if (selectedChallengeId) {
            try {
                const submissionId = await api.submitChallenge(selectedChallengeId, currentUser.uid, content);
                const challenge = challenges.find(c => c.id === selectedChallengeId);
                const challengeTitle = challenge?.title || 'Challenge';
                const challengeDescription = challenge?.description || '';

                setAutoFeedback({ 
                    isOpen: true, 
                    content: '', 
                    weaknesses: '',
                    improvements: '',
                    passed: null,
                    isLoading: true, 
                    title: `Feedback: ${challengeTitle}` 
                });

                try {
                    const result = await autoEvaluateChallenge(challengeTitle, challengeDescription, content);
                    
                    // Award badge if passed
                    if (result.passed) {
                        await api.reviewSubmission(submissionId, 'APPROVED', challengeTitle, currentUser.uid);
                        showToast(`Congratulations! You earned the ${challengeTitle} badge!`, "success");
                        await fetchUsers(); // Refresh user data to show new badge
                    } else {
                        await api.reviewSubmission(submissionId, 'REJECTED', challengeTitle, currentUser.uid);
                    }

                    setAutoFeedback({ 
                        isOpen: true, 
                        content: result.feedback, 
                        weaknesses: result.weaknesses,
                        improvements: result.improvements,
                        passed: result.passed,
                        isLoading: false, 
                        title: `Feedback: ${challengeTitle}` 
                    });
                    
                    await fetchChallenges();
                } catch (e) {
                    console.error("AI evaluation failed:", e);
                    setAutoFeedback({ 
                        isOpen: true, 
                        content: "AI feedback is unavailable right now, but your solution has been submitted.", 
                        weaknesses: '',
                        improvements: '',
                        passed: null,
                        isLoading: false, 
                        title: `Feedback: ${challengeTitle}` 
                    });
                }
            } catch (error: any) {
                console.error("Submission failed:", error);
                showToast("Failed to submit: " + error.message, "error");
            }
        }
    };

    const openSubmission = (id: string) => {
        setSelectedChallengeId(id);
        setIsSubmitModalOpen(true);
    };

    const openReview = (id: string, title: string) => {
        setSelectedReviewChallenge({ id, title });
        setIsReviewModalOpen(true);
    };

    const filteredChallenges = useMemo(() => {
        const today = new Date();
        return challenges.filter(c => {
            const isExpired = new Date(c.deadline) < today;
            const hasBadge = currentUser.badges?.includes(c.title);

            if (activeTab === 'ACTIVE') {
                return c.status === 'ACTIVE' && !isExpired && !hasBadge;
            }
            if (activeTab === 'COMPLETED') {
                return hasBadge;
            }
            return true;
        });
    }, [challenges, activeTab, currentUser.badges]);

    if (isLoadingChallenges) return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            <p>Loading challenges...</p>
        </div>
    );

    if (challengesError) return <div className="text-center p-8 text-red-500">Error: {challengesError}</div>;

    return (
        <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                        Challenges & <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Badges</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                        Push your limits, solve problems, and earn exclusive badges to climb the club leaderboard.
                    </p>
                </div>
                {isPatron && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Tooltip text="Describe concepts and let AI craft a scenario-based challenge.">
                            <button
                                onClick={() => setIsAIModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                            >
                                <SparklesIcon className="w-5 h-5 text-pink-600" /> Generate with AI
                            </button>
                        </Tooltip>
                        <Tooltip text="Post a custom challenge with title, description, and deadline.">
                            <button
                                onClick={() => { setPrefillData(null); setIsCreateModalOpen(true); }}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                <PlusCircleIcon /> Create Challenge
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            <Leaderboard users={allUsers} />

            <div className="mb-8">
                <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-1">
                    <button
                        onClick={() => setActiveTab('ACTIVE')}
                        className={`pb-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors relative focus:outline-none ${activeTab === 'ACTIVE' ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Active Challenges
                    </button>
                    <button
                        onClick={() => setActiveTab('COMPLETED')}
                        className={`pb-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors relative focus:outline-none ${activeTab === 'COMPLETED' ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Completed ({currentUser.badges?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`pb-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors relative focus:outline-none ${activeTab === 'ALL' ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        All History
                    </button>
                </div>
            </div>

            {filteredChallenges.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrophyIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {activeTab === 'COMPLETED' ? "No badges earned yet" : "No challenges found"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'COMPLETED'
                            ? "Participate in active challenges to start earning badges!"
                            : "Check back later for new challenges."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredChallenges.map(challenge => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            currentUser={currentUser}
                            onOpenSubmission={openSubmission}
                            onOpenReview={openReview}
                            onMakeSubmission={onMakeSubmission}
                        />
                    ))}
                </div>
            )}

            <CreateChallengeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateChallenge}
                prefill={prefillData}
            />

            <SubmitSolutionModal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                onSubmit={handleSubmitSolution}
            />

            <GenerateAIChallengeModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onGenerated={handleAIChallengeGenerated}
            />

            <AnalysisModal
                isOpen={autoFeedback.isOpen}
                content={autoFeedback.content}
                weaknesses={autoFeedback.weaknesses}
                improvements={autoFeedback.improvements}
                passed={autoFeedback.passed}
                isLoading={autoFeedback.isLoading}
                title={autoFeedback.title}
                subtitle="Instant AI feedback on your submission"
                challengeTitle={autoFeedback.title.replace('Feedback: ', '')}
                onClose={() => setAutoFeedback(prev => ({ ...prev, isOpen: false }))}
            />

            {selectedReviewChallenge && (
                <ReviewSubmissionsModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    challengeId={selectedReviewChallenge.id}
                    challengeTitle={selectedReviewChallenge.title}
                />
            )}
        </div>
    );
};

export default Challenges;
