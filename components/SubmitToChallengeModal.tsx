
import React, { useState } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { CheckIcon } from './icons/CheckIcon';
import * as api from '../services/apiService';
import { analyzeChallengeSubmission } from '../services/geminiService';
import { FormattedMessage } from './FormattedMessage';
import { SparklesIcon } from './icons/SparklesIcon';

interface SubmitToChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentUser: User;
}

const SubmitToChallengeModal: React.FC<SubmitToChallengeModalProps> = ({ isOpen, onClose, code, currentUser }) => {
    const { challenges, fetchChallenges, showToast } = useData();
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<{ isOpen: boolean, content: string, isLoading: boolean, title: string }>({
        isOpen: false,
        content: '',
        isLoading: false,
        title: 'AI Feedback'
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
            await api.submitChallenge(selectedChallengeId, currentUser.uid, code);
            await fetchChallenges(); // Refresh data to potentially update UI elsewhere if needed
            showToast("Challenge submitted successfully!", "success");
            const challengeTitle = challenges.find(c => c.id === selectedChallengeId)?.title || 'Challenge';
            setAiFeedback({ isOpen: true, content: '', isLoading: true, title: `Feedback: ${challengeTitle}` });
            try {
                const result = await analyzeChallengeSubmission(challengeTitle, code);
                setAiFeedback({ isOpen: true, content: result, isLoading: false, title: `Feedback: ${challengeTitle}` });
            } catch (e) {
                setAiFeedback({ isOpen: true, content: "AI feedback is unavailable right now. Please try again later.", isLoading: false, title: `Feedback: ${challengeTitle}` });
            }
            onClose();
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
                                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700 bg-gray-50 dark:bg-gray-700/30'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{challenge.title}</h4>
                                    {selectedChallengeId === challenge.id && <CheckIcon className="text-pink-500 w-5 h-5" />}
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
                    className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold shadow-md hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                </button>
            </div>

            {aiFeedback.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
                        <button onClick={() => setAiFeedback(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors">
                            <XIcon />
                        </button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                                <SparklesIcon className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {aiFeedback.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Instant AI feedback on your submission</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                            {aiFeedback.isLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    <p className="text-gray-500 animate-pulse">Analyzing submission...</p>
                                </div>
                            ) : (
                                <FormattedMessage text={aiFeedback.content} isUser={false} />
                            )}
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setAiFeedback(prev => ({ ...prev, isOpen: false }))} 
                                className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmitToChallengeModal;
