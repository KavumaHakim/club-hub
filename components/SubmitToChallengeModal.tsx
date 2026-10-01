
import React, { useState } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { submitChallengeSolution, ChallengeEvaluationError, type ChallengeTestReport } from '../services/challengeJudge';
import { hasTestCases } from '../services/challengeRunner';
import ChallengeTestResults from './ChallengeTestResults';
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
        title: string,
        tests?: ChallengeTestReport
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
        const challenge = challenges.find(c => c.id === selectedChallengeId);
        if (!challenge) return;
        const title = `Evaluation: ${challenge.title}`;

        setIsSubmitting(true);
        setAiFeedback({ isOpen: true, content: '', weaknesses: '', improvements: '', passed: null, isLoading: true, title });
        try {
            const result = await submitChallengeSolution(challenge, currentUser.uid, code);
            if (result.passed) {
                showToast(`Congratulations! You earned the ${challenge.title} badge!`, "success");
                await fetchUsers(); // Refresh user data to show new badge
            }
            setAiFeedback({
                isOpen: true,
                content: result.feedback,
                weaknesses: result.weaknesses,
                improvements: result.improvements,
                passed: result.passed,
                isLoading: false,
                title,
                tests: result.tests
            });
            await fetchChallenges(); // Refresh data
            setSelectedChallengeId(null);
        } catch (error: any) {
            if (error instanceof ChallengeEvaluationError) {
                console.error("Challenge evaluation failed:", error);
                setAiFeedback({
                    isOpen: true,
                    content: hasTestCases(challenge)
                        ? "Your code couldn't be run against the tests right now. Please try again in a moment."
                        : "AI evaluation is unavailable right now, but your solution has been submitted for manual review.",
                    weaknesses: '',
                    improvements: '',
                    passed: null,
                    isLoading: false,
                    title
                });
                setSelectedChallengeId(null);
            } else {
                console.error("Submission failed:", error);
                setAiFeedback(prev => ({ ...prev, isOpen: false, isLoading: false }));
                showToast("Failed to submit: " + error.message, "error");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[80vh] animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text">
                    <XIcon />
                </button>
                
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4 flex items-center gap-2">
                    <TrophyIcon className="text-yellow-500" />
                    Submit to Challenge
                </h3>
                
                <p className="text-sm text-ch-muted mb-4">
                    Select an active challenge to submit your current code as a solution.
                </p>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1">
                    {activeChallenges.length === 0 ? (
                        <div className="text-center p-6 text-ch-muted border-2 border-dashed border-ch-divider">
                            <p>No active challenges available to submit to.</p>
                            <p className="text-xs mt-1">Check back later or complete existing ones!</p>
                        </div>
                    ) : (
                        activeChallenges.map(challenge => (
                            <div 
                                key={challenge.id}
                                onClick={() => setSelectedChallengeId(challenge.id)}
                                className={`p-3 border-2 cursor-pointer transition-all ${
                                    selectedChallengeId === challenge.id 
                                    ? 'border-ch-accent bg-ch-accent-soft' 
                                    : 'border-ch-divider hover:border-ch-accent bg-ch-surface'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-ch-text text-sm">{challenge.title}</h4>
                                    {selectedChallengeId === challenge.id && <CheckIcon className="text-ch-accent w-5 h-5" />}
                                </div>
                                <p className="text-xs text-ch-muted line-clamp-2 mb-2">{challenge.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-ch-surface-2 text-ch-muted">
                                        Due: {new Date(challenge.deadline).toLocaleDateString()}
                                    </span>
                                    {hasTestCases(challenge) && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-ch-accent-soft text-ch-accent">
                                            {challenge.testCases?.length} tests · {challenge.language === 'javascript' ? 'JS' : 'Python'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!selectedChallengeId || isSubmitting}
                    className="w-full py-2 text-ch-on-accent font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-ch-accent hover:bg-ch-accent-deep"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                </button>
            </div>

            {aiFeedback.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-ch-bg max-w-2xl w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[90vh]">
                        <button onClick={() => setAiFeedback(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text hover:border-2 border-ch-rule transition-colors">
                            <XIcon />
                        </button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 ${aiFeedback.passed ? 'bg-green-100 dark:bg-green-900/30' : aiFeedback.passed === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-ch-accent-soft'}`}>
                                {aiFeedback.passed ? (
                                    <TrophyIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                                ) : aiFeedback.passed === false ? (
                                    <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                                ) : (
                                    <SparklesIcon className="w-8 h-8 text-ch-accent" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">
                                    {aiFeedback.title}
                                </h3>
                                <p className="text-xs text-ch-muted">
                                    {aiFeedback.passed ? 'Challenge Passed!' : aiFeedback.passed === false ? 'Challenge Not Yet Passed' : 'Instant AI evaluation on your submission'}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            {aiFeedback.isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="animate-spin h-12 w-12 border-2 border-ch-divider border-t-ch-accent"></div>
                                    <p className="text-ch-muted animate-pulse font-medium">Analyzing your code against challenge requirements...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-ch-surface p-4 border border-ch-divider">
                                        <h4 className="text-sm font-bold text-ch-text mb-2 flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4 text-ch-accent" />
                                            Verdict & Feedback
                                        </h4>
                                        <FormattedMessage text={aiFeedback.content} isUser={false} />
                                    </div>

                                    {aiFeedback.tests && <ChallengeTestResults report={aiFeedback.tests} />}

                                    {aiFeedback.weaknesses && !aiFeedback.tests && (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20">
                                            <h4 className="text-sm font-bold text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                                                <ExclamationCircleIcon className="w-4 h-4" />
                                                Areas for Improvement / Missing Requirements
                                            </h4>
                                            <div className="text-sm text-red-800 dark:text-red-300">
                                                <FormattedMessage text={aiFeedback.weaknesses} isUser={false} />
                                            </div>
                                        </div>
                                    )}

                                    {aiFeedback.improvements && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/20">
                                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                                                <LightBulbIcon className="w-4 h-4" />
                                                Suggested Enhancements
                                            </h4>
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <FormattedMessage text={aiFeedback.improvements} isUser={false} />
                                            </div>
                                        </div>
                                    )}

                                    <section className="pt-4 border-t border-ch-divider">
                                        <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <TrophyIcon className={`w-4 h-4 ${aiFeedback.passed ? 'text-yellow-500' : 'text-ch-muted'}`} />
                                            Badge Status
                                        </h4>
                                        <div className={`p-5 border flex items-center gap-4 ${aiFeedback.passed ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' : 'bg-ch-surface border-ch-divider'}`}>
                                            <div className={`p-3 ${aiFeedback.passed ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-ch-surface-2 text-ch-muted'}`}>
                                                <TrophyIcon className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-ch-text">
                                                    {aiFeedback.passed ? 'Badge Earned!' : 'Badge Locked'}
                                                </p>
                                                <p className="text-sm text-ch-muted">
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
                                className="px-6 py-2.5 bg-ch-text text-ch-bg font-bold hover:opacity-90 transition-opacity"
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
