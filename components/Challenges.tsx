
import React, { useState, useMemo, useEffect } from 'react';
import { User, Challenge, ChallengeSubmission, SubmissionStatus } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { TrophyIcon } from './icons/TrophyIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ChallengesProps {
    currentUser: User;
}

const Leaderboard: React.FC<{ users: User[] }> = ({ users }) => {
    const rankedUsers = useMemo(() => {
        return [...users]
            .sort((a, b) => (b.badges?.length || 0) - (a.badges?.length || 0))
            .slice(0, 10);
    }, [users]);

    if (rankedUsers.length === 0) return null;

    return (
        <div className="mb-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <TrophyIcon className="h-6 w-6 text-yellow-300" /> Badge Leaderboard
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {rankedUsers.map((user, index) => (
                        <div key={user.uid} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors">
                            <div className="relative">
                                <img 
                                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
                                    className={`w-10 h-10 rounded-full border-2 ${index === 0 ? 'border-yellow-300' : index === 1 ? 'border-gray-300' : index === 2 ? 'border-orange-400' : 'border-white/30'}`}
                                    alt={user.name} 
                                />
                                <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/20 ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-900' : index === 2 ? 'bg-orange-500 text-white' : 'bg-black/50 text-white'}`}>
                                    {index + 1}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{user.name}</p>
                                <p className="text-xs text-yellow-100 flex items-center gap-1">
                                    <BadgeCheckIcon className="w-3 h-3" /> {user.badges?.length || 0} Badges
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ChallengeCard: React.FC<{
    challenge: Challenge;
    currentUser: User;
    onOpenSubmission: (id: string) => void;
    onOpenReview: (id: string, title: string) => void;
}> = ({ challenge, currentUser, onOpenSubmission, onOpenReview }) => {
    const isPatron = currentUser.role === 'PATRON';
    const hasBadge = currentUser.badges?.includes(challenge.title);
    const isExpired = new Date(challenge.deadline) < new Date();

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md flex flex-col ${hasBadge ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{challenge.title}</h4>
                    {hasBadge && <BadgeCheckIcon className="text-green-500 h-6 w-6 flex-shrink-0" />}
                </div>
                
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3 gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${challenge.status === 'ACTIVE' && !isExpired ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {challenge.status === 'ACTIVE' && !isExpired ? 'Active' : 'Closed'}
                    </span>
                    <span>• Deadline: {new Date(challenge.deadline).toLocaleDateString()}</span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {challenge.description}
                </p>
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                {isPatron ? (
                    <button 
                        onClick={() => onOpenReview(challenge.id, challenge.title)}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                    >
                        Review Submissions
                    </button>
                ) : (
                    !hasBadge && challenge.status === 'ACTIVE' && !isExpired && (
                        <button 
                            onClick={() => onOpenSubmission(challenge.id)}
                            className="text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Submit Solution
                        </button>
                    )
                )}
                {hasBadge && !isPatron && (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" /> Completed
                    </span>
                )}
                 {!hasBadge && (challenge.status !== 'ACTIVE' || isExpired) && !isPatron && (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        Expired
                    </span>
                )}
            </div>
        </div>
    );
};

const CreateChallengeModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (title: string, desc: string, date: string) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !deadline) return;
        setIsSubmitting(true);
        await onSubmit(title, description, deadline);
        setIsSubmitting(false);
        onClose();
        setTitle('');
        setDescription('');
        setDeadline('');
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50">{isSubmitting ? 'Posting...' : 'Create Challenge'}</button>
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
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

const ReviewSubmissionsModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void, 
    challengeId: string,
    challengeTitle: string,
}> = ({ isOpen, onClose, challengeId, challengeTitle }) => {
    const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            // Update local list
            setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status } : s));
        } catch (error) {
            console.error(error);
            alert("Failed to update submission status.");
        }
    };

    if (!isOpen) return null;

    return (
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
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-3">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">{sub.content}</pre>
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
    );
};

const Challenges: React.FC<ChallengesProps> = ({ currentUser }) => {
    const { challenges, allUsers, fetchChallenges, isLoadingChallenges, challengesError } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [selectedReviewChallenge, setSelectedReviewChallenge] = useState<{ id: string, title: string } | null>(null);

    const isPatron = currentUser.role === 'PATRON';

    const handleCreateChallenge = async (title: string, description: string, deadline: string) => {
        await api.addChallenge({
            title,
            description,
            deadline,
            createdBy: currentUser.uid
        });
        await fetchChallenges();
    };

    const handleSubmitSolution = async (content: string) => {
        if (selectedChallengeId) {
            await api.submitChallenge(selectedChallengeId, currentUser.uid, content);
            await fetchChallenges();
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

    if (isLoadingChallenges) return <div className="text-center p-8 text-gray-500">Loading challenges...</div>;
    if (challengesError) return <div className="text-center p-8 text-red-500">Error: {challengesError}</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Challenges & Badges</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Complete challenges to earn badges and climb the leaderboard.</p>
                </div>
                {isPatron && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-pink-500/25 transition-all"
                    >
                        <PlusCircleIcon /> Create Challenge
                    </button>
                )}
            </div>

            <Leaderboard users={allUsers} />

            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Active Challenges</h3>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                        No active challenges at the moment.
                    </div>
                ) : (
                    challenges.map(challenge => (
                        <ChallengeCard 
                            key={challenge.id}
                            challenge={challenge}
                            currentUser={currentUser}
                            onOpenSubmission={openSubmission}
                            onOpenReview={openReview}
                        />
                    ))
                )}
            </div>

            <CreateChallengeModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSubmit={handleCreateChallenge} 
            />

            <SubmitSolutionModal 
                isOpen={isSubmitModalOpen} 
                onClose={() => setIsSubmitModalOpen(false)} 
                onSubmit={handleSubmitSolution} 
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
