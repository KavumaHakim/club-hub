
import React, { useState } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { CheckIcon } from './icons/CheckIcon';
import * as api from '../services/apiService';
import { autoEvaluateChallenge } from '../services/geminiService';
import { FormattedMessage } from './FormattedMessage';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';

interface SubmitToChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentUser: User;
}

const SubmitToChallengeModal: React.FC<SubmitToChallengeModalProps> = ({ isOpen, onClose, code, currentUser }) => {
    const { challenges, fetchChallenges, showToast, fetchUsers } = useData();
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<{ 
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
        title: 'AI Evaluation'
    });

    if (!isOpen) return null;

    const activeChallenges = challenges.filter(c => {
        const isExpired = new Date(c.deadline) < new Date();
        const isCompleted = currentUser.badges?.includes(c.title);
        return c.status === 'ACTIVE' && !isExpired && !isCompleted;
    });

    const handleSubmit = async () => {
        if (!selectedChallengeId) return;
        
        setIsSubmitting(true);
        try {
            const submissionId = await api.submitChallenge(selectedChallengeId, currentUser.uid, code);
            const challenge = challenges.find(c => c.id === selectedChallengeId);
            const challengeTitle = challenge?.title || 'Challenge';
            const challengeDescription = challenge?.description || '';
            
            setAiFeedback({ 
                isOpen: true, 
                content: '', 
                weaknesses: '',
                improvements: '',
                passed: null,
                isLoading: true, 
                title: `Evaluation: ${challengeTitle}` 
            });

            try {
                const result = await autoEvaluateChallenge(challengeTitle, challengeDescription, code);
                
                // Award badge if passed
                if (result.passed) {
                    await api.reviewSubmission(submissionId, 'APPROVED', challengeTitle, currentUser.uid);
                    showToast(`Congratulations! You earned the ${challengeTitle} badge!`, "success");
                    await fetchUsers(); // Refresh user data to show new badge
                } else {
                    await api.reviewSubmission(submissionId, 'REJECTED', challengeTitle, currentUser.uid);
                }

                setAiFeedback({ 
                    isOpen: true, 
                    content: result.feedback, 
                    weaknesses: result.weaknesses,
                    improvements: result.improvements,
                    passed: result.passed,
                    isLoading: false, 
                    title: `Evaluation: ${challengeTitle}` 
                });
                
                await fetchChallenges(); // Refresh data
            } catch (e) {
                console.error("AI evaluation failed:", e);
                setAiFeedback({ 
                    isOpen: true, 
                    content: "AI evaluation is unavailable right now, but your solution has been submitted for manual review.", 
                    weaknesses: '',
                    improvements: '',
                    passed: null,
                    isLoading: false, 
                    title: `Evaluation: ${challengeTitle}` 
                });
            }
            setSelectedChallengeId(null);
        } catch (error: any) {
            console.error("Submission failed:", error);
            showToast("Failed to submit: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <XIcon />
                </button>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrophyIcon className="text-yellow-500" />
                    Submit to Challenge
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select an active challenge to submit your current code as a solution.
                </p>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1">
                    {activeChallenges.length === 0 ? (
                        <div className="text-center p-6 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <p>No active challenges available to submit to.</p>
                            <p className="text-xs mt-1">Check back later or complete existing ones!</p>
                        </div>
                    ) : (
                        activeChallenges.map(challenge => (
                            <div 
                                key={challenge.id}
                                onClick={() => setSelectedChallengeId(challenge.id)}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedChallengeId === challenge.id 
                                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700 bg-gray-50 dark:bg-gray-700/30'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{challenge.title}</h4>
                                    {selectedChallengeId === challenge.id && <CheckIcon className="text-sky-500 w-5 h-5" />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{challenge.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                                        Due: {new Date(challenge.deadline).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!selectedChallengeId || isSubmitting}
                    className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-900 text-white rounded-lg font-bold shadow-md hover:from-sky-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                </button>
            </div>

            {aiFeedback.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                        <button onClick={() => setAiFeedback(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors">
                            <XIcon />
                        </button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-xl ${aiFeedback.passed ? 'bg-green-100 dark:bg-green-900/30' : aiFeedback.passed === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-sky-100 dark:bg-sky-900/30'}`}>
                                {aiFeedback.passed ? (
                                    <TrophyIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                                ) : aiFeedback.passed === false ? (
                                    <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                                ) : (
                                    <SparklesIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {aiFeedback.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {aiFeedback.passed ? 'Challenge Passed!' : aiFeedback.passed === false ? 'Challenge Not Yet Passed' : 'Instant AI evaluation on your submission'}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            {aiFeedback.isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
                                    <p className="text-gray-500 animate-pulse font-medium">Analyzing your code against challenge requirements...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4 text-sky-500" />
                                            Verdict & Feedback
                                        </h4>
                                        <FormattedMessage text={aiFeedback.content} isUser={false} />
                                    </div>

                                    {aiFeedback.weaknesses && (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                                            <h4 className="text-sm font-bold text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                                                <AlertTriangleIcon className="w-4 h-4" />
                                                Areas for Improvement / Missing Requirements
                                            </h4>
                                            <div className="text-sm text-red-800 dark:text-red-300">
                                                <FormattedMessage text={aiFeedback.weaknesses} isUser={false} />
                                            </div>
                                        </div>
                                    )}

                                    {aiFeedback.improvements && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                                                <LightbulbIcon className="w-4 h-4" />
                                                Suggested Enhancements
                                            </h4>
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <FormattedMessage text={aiFeedback.improvements} isUser={false} />
                                            </div>
                                        </div>
                                    )}

                                    <section className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <TrophyIcon className={`w-4 h-4 ${aiFeedback.passed ? 'text-yellow-500' : 'text-gray-400'}`} />
                                            Badge Status
                                        </h4>
                                        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${aiFeedback.passed ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                            <div className={`p-3 rounded-xl ${aiFeedback.passed ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                <TrophyIcon className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {aiFeedback.passed ? 'Badge Earned!' : 'Badge Locked'}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {aiFeedback.passed 
                                                        ? `Congratulations! You've successfully unlocked the ${aiFeedback.title.replace('Evaluation: ', '')} badge.` 
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
                                onClick={() => setAiFeedback(prev => ({ ...prev, isOpen: false }))} 
                                className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                            >
                                {aiFeedback.passed ? 'Awesome!' : 'Got it'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmitToChallengeModal;
