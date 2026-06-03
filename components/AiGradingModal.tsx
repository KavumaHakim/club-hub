




import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { XIcon } from './icons/XIcon';
import { StarIcon } from './icons/StarIcon';
import { gradeProjectSubmission } from '../services/geminiService';

interface AiGradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskContent: string;
    submissionCode: string;
    onApplyGrade: (grade: number, feedback: string) => void;
}

const AiGradingModal: React.FC<AiGradingModalProps> = ({ isOpen, onClose, taskContent, submissionCode, onApplyGrade }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ grade: number, feedback: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && taskContent && submissionCode) {
            analyzeCode();
        } else {
            // Reset state when closed
            setResult(null);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const analyzeCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const analysis = await gradeProjectSubmission(taskContent, submissionCode);
            setResult(analysis);
        } catch (err: any) {
            console.error(err);
            setError("Failed to generate AI grade. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors">
                    <XIcon />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-sky-500 rounded-xl shadow-lg">
                        <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Auto-Grader</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini</p>
                    </div>
                </div>

                <div className="min-h-[200px] flex flex-col">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-sky-500 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SparklesIcon className="w-4 h-4 text-sky-500 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">Analyzing code quality...</p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                            <button 
                                onClick={analyzeCode}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Suggested Grade</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <StarIcon 
                                            key={star} 
                                            className={`w-8 h-8 ${result.grade >= star ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} 
                                            filled={result.grade >= star}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Feedback</h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    {result.feedback}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {result && !isLoading && (
                    <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onApplyGrade(result.grade, result.feedback)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-900 text-white rounded-xl font-bold hover:shadow-lg transition-all transform active:scale-95"
                        >
                            Apply Grade
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiGradingModal;