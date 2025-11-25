
import React from 'react';
import { ProjectData, User, ProjectTask } from '../types';
import * as api from '../services/apiService';
import StarRating from './StarRating';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface GradingViewProps {
    data: ProjectData | null;
    allUsers: User[];
    onGrade: (taskId: string, userId: string, grade: number) => void;
}

const GradingView: React.FC<GradingViewProps> = ({ data, allUsers, onGrade }) => {
    // Defensive check: Ensure data and tasks exist before processing
    if (!data || !data.tasks) {
        return (
            <div className="text-center p-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No project data available.</p>
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

    if (tasksWithSubmissions.length === 0) {
        return (
            <div className="text-center p-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Submissions to Grade</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Check back here when members have submitted their work for project tasks.</p>
            </div>
        );
    }
    
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
            {tasksWithSubmissions.map((task: ProjectTask) => (
                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">{task.content}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {Object.entries(task.submissions || {}).map(([userId, submission]: [string, any]) => {
                            const user = userMap.get(userId);
                            if (!user) return null;

                            const submissionUrl = submission?.filePath ? api.getSubmissionPublicUrl(submission.filePath) : null;
                            const fileName = submission?.filePath ? submission.filePath.split('/').pop() : 'File';
                            
                            return (
                                <div key={userId} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                                        <img 
                                            src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        {submissionUrl ? (
                                            <a
                                                href={submissionUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={fileName}
                                                className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                            >
                                                <DocumentTextIcon className="w-5 h-5" />
                                                <span className="truncate max-w-[150px]">{fileName}</span>
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No file attached</p>
                                        )}
                                    </div>
                                    
                                    <div className="w-full md:w-auto flex justify-end">
                                        <StarRating 
                                            rating={submission.grade}
                                            onRate={(newGrade) => onGrade(task.id, userId, newGrade)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GradingView;
