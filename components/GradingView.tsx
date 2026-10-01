import React, { useState, useEffect } from 'react';
import { ProjectData, User, ProjectTask } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import StarRating from './StarRating';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlayIcon } from './icons/PlayIcon';
import AiGradingModal from './AiGradingModal';
// FIX: Changed to a named import to match the corrected export from CodeRunnerModal.
import { CodeRunnerModal } from './CodeRunnerModal';

interface GradingViewProps {
    data: ProjectData | null;
    allUsers: User[];
    onGrade: (taskId: string, userId: string, grade: number, feedback?: string) => void;
}

const GradingView: React.FC<GradingViewProps> = ({ data, allUsers, onGrade }) => {
    // State for AI Modal
    const [aiModal, setAiModal] = useState<{ isOpen: boolean, taskContent: string, submissionCode: string, taskId: string, userId: string }>({
        isOpen: false,
        taskContent: '',
        submissionCode: '',
        taskId: '',
        userId: ''
    });

    // State for Code Runner Modal
    const [runnerState, setRunnerState] = useState<{ isOpen: boolean, code: string, title: string }>({
        isOpen: false, code: '', title: ''
    });

    // State for local feedback input
    const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
    const { showAlert } = useData();

    // Update feedbackInputs when data changes
    useEffect(() => {
        if (data && data.tasks) {
            const newInputs: Record<string, string> = {};
            Object.values(data.tasks).forEach((task: unknown) => {
                const t = task as ProjectTask;
                if (t.submissions) {
                    Object.entries(t.submissions).forEach(([userId, sub]) => {
                        if (sub.feedback) {
                            newInputs[`${t.id}-${userId}`] = sub.feedback;
                        }
                    });
                }
            });
            setFeedbackInputs(prev => ({ ...prev, ...newInputs }));
        }
    }, [data]);

    // Defensive check: Ensure data and tasks exist before processing
    if (!data || !data.tasks) {
        return (
            <div className="text-center p-16 bg-ch-surface border-2 border-dashed border-ch-divider">
                <p className="text-ch-muted">No project data available.</p>
            </div>
        );
    }

    const tasksWithSubmissions = Object.values(data.tasks)
        .filter((task: ProjectTask) => task.submissions && Object.keys(task.submissions).length > 0)
        .sort((a: ProjectTask, b: ProjectTask) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    const userMap = new Map<string, User>();
    if (allUsers) {
        allUsers.forEach(user => userMap.set(user.uid, user));
    }

    const handleRunCode = async (submission: any, userName: string) => {
        if (!submission.filePath) return;
        try {
            const url = api.getSubmissionPublicUrl(submission.filePath);
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch code");
            const text = await response.text();
            setRunnerState({ isOpen: true, code: text, title: `Submission: ${userName}` });
        } catch (error) {
            console.error("Run error:", error);
            showAlert({
                title: 'Load Failed',
                message: 'Failed to load code.',
                type: 'error'
            });
        }
    };

    const handleAiGradeClick = async (task: ProjectTask, submission: any, userId: string) => {
        if (!submission.filePath) return;

        try {
            // Get public URL
            const url = api.getSubmissionPublicUrl(submission.filePath);

            // Fetch content
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch submission file.");
            const code = await response.text();

            setAiModal({
                isOpen: true,
                taskContent: task.content,
                submissionCode: code,
                taskId: task.id,
                userId: userId
            });

        } catch (error) {
            console.error("Error preparing AI grading:", error);
            showAlert({
                title: 'Load Failed',
                message: 'Could not load submission file for AI analysis. Ensure it is a text/code file.',
                type: 'error'
            });
        }
    };

    const handleApplyAiGrade = (grade: number, feedback: string) => {
        // Update local feedback state
        const key = `${aiModal.taskId}-${aiModal.userId}`;
        setFeedbackInputs(prev => ({ ...prev, [key]: feedback }));

        // Save to DB
        onGrade(aiModal.taskId, aiModal.userId, grade, feedback);
        setAiModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleFeedbackChange = (taskId: string, userId: string, text: string) => {
        setFeedbackInputs(prev => ({ ...prev, [`${taskId}-${userId}`]: text }));
    };

    const handleFeedbackBlur = (taskId: string, userId: string, grade?: number | null) => {
        // Only save if grade exists, otherwise it might look weird saving feedback for ungraded work (optional choice)
        // But let's allow saving feedback anytime. We need the current grade to pass to onGrade though.
        const currentGrade = grade || 0;
        const feedback = feedbackInputs[`${taskId}-${userId}`];
        if (feedback !== undefined) {
            onGrade(taskId, userId, currentGrade, feedback);
        }
    };

    if (tasksWithSubmissions.length === 0) {
        return (
            <div className="text-center p-16 bg-ch-surface border-2 border-dashed border-ch-divider">
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">No Submissions to Grade</h3>
                <p className="text-ch-muted mt-2">Check back here when members have submitted their work for project tasks.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
            {tasksWithSubmissions.map((task: ProjectTask) => (
                <div key={task.id} className="bg-ch-bg border border-ch-divider overflow-hidden">
                    <div className="p-4 bg-ch-surface border-b border-ch-divider">
                        <h3 className="font-bold text-ch-text">{task.content}</h3>
                        <p className="text-xs text-ch-muted mt-1">
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                    </div>

                    <div className="divide-y divide-ch-divider">
                        {Object.entries(task.submissions || {}).map(([userId, submission]: [string, any]) => {
                            const user = userMap.get(userId);
                            if (!user) return null;

                            const submissionUrl = submission?.filePath ? api.getSubmissionPublicUrl(submission.filePath) : null;
                            const fileName = submission?.filePath ? submission.filePath.split('/').pop() : 'File';
                            const isPythonFile = fileName.endsWith('.py');
                            const feedbackKey = `${task.id}-${userId}`;

                            return (
                                <div key={userId} className="p-4 flex flex-col gap-4 hover:bg-ch-surface transition-colors">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                                            <img
                                                src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                                                alt={user.name}
                                                className="w-10 h-10 object-cover border border-ch-divider"
                                            />
                                            <div>
                                                <p className="font-semibold text-ch-text">{user.name}</p>
                                                <p className="text-xs text-ch-muted">@{user.username}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            {submissionUrl ? (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={submissionUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download={fileName}
                                                        className="flex items-center gap-2 text-sm font-medium text-ch-violet hover:underline"
                                                    >
                                                        <DocumentTextIcon className="w-5 h-5" />
                                                        <span className="truncate max-w-[150px]">{fileName}</span>
                                                    </a>
                                                    {isPythonFile && (
                                                        <>
                                                            <button
                                                                onClick={() => handleRunCode(submission, user.name)}
                                                                className="p-1.5 bg-ch-surface text-ch-muted hover:bg-ch-surface-2 transition-all"
                                                                title="Run Code"
                                                            >
                                                                <PlayIcon className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAiGradeClick(task, submission, userId)}
                                                                className="p-1.5 text-ch-on-accent transition-all bg-ch-accent"
                                                                title="Auto-Grade with AI"
                                                            >
                                                                <SparklesIcon className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-ch-muted italic">No file attached</p>
                                            )}
                                        </div>

                                        <div className="w-full md:w-auto flex justify-end">
                                            <StarRating
                                                rating={submission.grade}
                                                onRate={(newGrade) => onGrade(task.id, userId, newGrade, feedbackInputs[feedbackKey])}
                                            />
                                        </div>
                                    </div>

                                    {/* Feedback Section */}
                                    <div className="w-full">
                                        <label htmlFor={`feedback-${feedbackKey}`} className="block text-xs font-bold text-ch-muted uppercase tracking-wide mb-1">
                                            Patron Feedback
                                        </label>
                                        <textarea
                                            id={`feedback-${feedbackKey}`}
                                            value={feedbackInputs[feedbackKey] || ''}
                                            onChange={(e) => handleFeedbackChange(task.id, userId, e.target.value)}
                                            onBlur={() => handleFeedbackBlur(task.id, userId, submission.grade)}
                                            placeholder="Write constructive feedback for the student..."
                                            className="w-full p-2 text-sm border border-ch-divider bg-ch-bg focus:ring-2 focus:ring-ch-accent focus:border-transparent min-h-[60px]"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <AiGradingModal
                isOpen={aiModal.isOpen}
                onClose={() => setAiModal(prev => ({ ...prev, isOpen: false }))}
                taskContent={aiModal.taskContent}
                submissionCode={aiModal.submissionCode}
                onApplyGrade={handleApplyAiGrade}
            />

            <CodeRunnerModal
                isOpen={runnerState.isOpen}
                onClose={() => setRunnerState(prev => ({ ...prev, isOpen: false }))}
                code={runnerState.code}
                title={runnerState.title}
            />
        </div>
    );
};

export default GradingView;