
import React, { useState } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { CheckIcon } from './icons/CheckIcon';
import * as api from '../services/apiService';

interface SubmitToChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentUser: User;
}

const SubmitToChallengeModal: React.FC<SubmitToChallengeModalProps> = ({ isOpen, onClose, code, currentUser }) => {
    const { challenges, fetchChallenges } = useData();
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            alert("Challenge submitted successfully!");
            onClose();
            setSelectedChallengeId(null);
        } catch (error: any) {
            console.error("Submission failed:", error);
            alert("Failed to submit: " + error.message);
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
        </div>
    );
};

export default SubmitToChallengeModal;
