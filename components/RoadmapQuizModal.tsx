
import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { evaluateMilestoneAnswer } from '../services/geminiService';

interface RoadmapQuestion {
    question: string;
    options: string[];
    correctIndex: number;
}

interface RoadmapQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionData: RoadmapQuestion | null;
    onPass: () => void;
}

const RoadmapQuizModal: React.FC<RoadmapQuizModalProps> = ({ isOpen, onClose, questionData, onPass }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedOption(null);
            setFeedback(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !questionData) return null;

    const handleSubmit = async () => {
        if (selectedOption === null) return;
        
        setIsSubmitting(true);
        const isCorrect = selectedOption === questionData.correctIndex;
        
        try {
            const explanation = await evaluateMilestoneAnswer(
                questionData.question, 
                questionData.options[selectedOption], 
                isCorrect
            );
            
            setFeedback({
                isCorrect,
                message: explanation
            });

            if (isCorrect) {
                setTimeout(() => {
                    onPass();
                    onClose();
                }, 2500); // Close after delay to read feedback
            }
        } catch (error) {
            console.error(error);
            // Fallback
            setFeedback({
                isCorrect,
                message: isCorrect ? "Correct! Well done." : "Incorrect. Please try again."
            });
             if (isCorrect) {
                setTimeout(() => {
                    onPass();
                    onClose();
                }, 2000);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <XIcon />
                </button>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Milestone Assessment</h3>
                
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">
                    {questionData.question}
                </p>

                <div className="space-y-3 mb-6">
                    {questionData.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedOption(index)}
                            disabled={isSubmitting || feedback !== null}
                            className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                                selectedOption === index 
                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                            } ${feedback && index === questionData.correctIndex ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                              ${feedback && selectedOption === index && !feedback.isCorrect ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                            `}
                        >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> {option}
                        </button>
                    ))}
                </div>

                {feedback && (
                    <div className={`p-4 rounded-xl mb-4 flex items-start gap-3 ${feedback.isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
                        {feedback.isCorrect ? <CheckCircleIcon className="w-6 h-6 flex-shrink-0" /> : <XCircleIcon className="w-6 h-6 flex-shrink-0" />}
                        <p className="text-sm">{feedback.message}</p>
                    </div>
                )}

                {!feedback && (
                    <button 
                        onClick={handleSubmit}
                        disabled={selectedOption === null || isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Grading...' : 'Submit Answer'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default RoadmapQuizModal;
