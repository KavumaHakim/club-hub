import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { QuizQuestion, evaluateShortAnswer } from '../services/geminiService';
import { FormattedMessage } from './FormattedMessage';

interface RoadmapQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizQuestions: QuizQuestion[] | null;
    onPass: () => void;
}

const RoadmapQuizModal: React.FC<RoadmapQuizModalProps> = ({ isOpen, onClose, quizQuestions, onPass }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
    const [score, setScore] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

    const resetQuiz = () => {
        setCurrentIndex(0);
        setUserAnswer('');
        setIsChecking(false);
        setFeedback(null);
        setScore(0);
        setQuizComplete(false);
        setTimeLeft(600);
    };

    useEffect(() => {
        if (isOpen) {
            resetQuiz();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && !quizComplete) {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setQuizComplete(true); // End quiz on timeout
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isOpen, quizComplete]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!isOpen || !quizQuestions || quizQuestions.length === 0) return null;

    const currentQuestion = quizQuestions[currentIndex];
    const totalQuestions = quizQuestions.length;
    const passingScore = Math.ceil(totalQuestions * 0.66); // 2 out of 3 usually

    const handleCheckAnswer = async () => {
        if (!userAnswer.trim()) return;
        setIsChecking(true);

        let isCorrect = false;
        let message = "";

        try {
            if (currentQuestion.type === 'SHORT_ANSWER') {
                // Use AI to grade
                const result = await evaluateShortAnswer(currentQuestion.question, userAnswer, currentQuestion.correctAnswer);
                isCorrect = result.correct;
                message = result.feedback;
            } else {
                // Strict equality for MC/TF
                // Normalize for case insensitivity if needed, but usually options match exactly
                isCorrect = userAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
                message = isCorrect ? "Correct! Well done." : `Incorrect. The correct answer was: ${currentQuestion.correctAnswer}`;
            }

            setFeedback({ isCorrect, message });
            if (isCorrect) setScore(prev => prev + 1);

        } catch (error) {
            console.error("Grading error", error);
            setFeedback({ isCorrect: false, message: "Error checking answer. Please try again." });
        } finally {
            setIsChecking(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setFeedback(null);
        } else {
            setQuizComplete(true);
        }
    };

    const handleFinish = () => {
        if (score >= passingScore) {
            onPass();
        }
        onClose();
    };

    // Render Logic for different inputs
    const renderInput = () => {
        if (currentQuestion.type === 'SHORT_ANSWER') {
            return (
                <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                    rows={3}
                    disabled={!!feedback || isChecking}
                />
            );
        }

        if (currentQuestion.type === 'TRUE_FALSE') {
            return (
                <div className="flex gap-4">
                    {['True', 'False'].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setUserAnswer(opt)}
                            disabled={!!feedback || isChecking}
                            className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${
                                userAnswer === opt
                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-md'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            );
        }

        // Multiple Choice
        return (
            <div className="space-y-3">
                {currentQuestion.options?.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => setUserAnswer(opt)}
                        disabled={!!feedback || isChecking}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center ${
                            userAnswer === opt
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center mr-3 text-xs font-bold flex-shrink-0">
                            {userAnswer === opt ? <div className="w-2.5 h-2.5 bg-current rounded-full" /> : String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                    </button>
                ))}
            </div>
        );
    };

    if (quizComplete) {
        const passed = score >= passingScore;
        const timedOut = timeLeft <= 0 && !passed;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${passed ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                        {passed ? <CheckCircleIcon className="w-10 h-10" /> : <XCircleIcon className="w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                        {timedOut ? "Time's Up!" : passed ? 'Assessment Passed!' : 'Needs Improvement'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        You scored {score} out of {totalQuestions}. {passed ? 'You have mastered this milestone.' : timedOut ? 'Review the material and try the quiz again.' : 'Review the material and try again.'}
                    </p>
                    <button 
                        onClick={passed ? handleFinish : resetQuiz}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${passed ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 dark:bg-gray-600 hover:bg-gray-900'}`}
                    >
                        {passed ? 'Continue Journey' : 'Try Again'}
                    </button>
                    {passed && (
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl">
                            {/* Simple confetti effect could go here */}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] animate-fade-in-up transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Question {currentIndex + 1} of {totalQuestions}</span>
                        <div className="w-32 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-sky-500 transition-all duration-500 ease-out" 
                                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`text-lg font-bold font-mono px-3 py-1 rounded-lg transition-colors ${timeLeft <= 30 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Question */}
                <div className="mb-6">
                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded mb-2 uppercase">
                        {currentQuestion.type.replace('_', ' ')}
                    </span>
                    <div className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                        <FormattedMessage text={currentQuestion.question} isUser={false} />
                    </div>
                </div>

                {/* Inputs */}
                <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                    {renderInput()}
                </div>

                {/* Feedback Area */}
                {feedback && (
                    <div className={`p-4 rounded-xl mb-4 flex items-start gap-3 animate-fade-in-up ${feedback.isCorrect ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'}`}>
                        <div className={`mt-0.5 p-1 rounded-full ${feedback.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {feedback.isCorrect ? <CheckIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${feedback.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                {feedback.isCorrect ? 'That is correct!' : 'Not quite right.'}
                            </p>
                            <p className={`text-sm mt-1 ${feedback.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                {feedback.message}
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="mt-auto pt-2">
                    {!feedback ? (
                        <button 
                            onClick={handleCheckAnswer}
                            disabled={!userAnswer || isChecking}
                            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex justify-center items-center gap-2"
                        >
                            {isChecking ? (
                                <>
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></span>
                                    Checking...
                                </>
                            ) : (
                                "Check Answer"
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-lg shadow-sky-500/30 transition-all transform active:scale-95"
                        >
                            {currentIndex < totalQuestions - 1 ? "Next Question" : "Finish Quiz"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadmapQuizModal;