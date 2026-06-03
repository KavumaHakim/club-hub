

import React, { useState, useEffect } from 'react';
import { ProjectTask, TaskPriority, User } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { UserAddIcon } from './icons/UserAddIcon';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: ProjectTask;
    currentUser: User;
    allUsers: User[];
    onSave: (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[], assigneeIds: string[] }) => Promise<void>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task, currentUser, allUsers, onSave }) => {
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert } = useData();

    useEffect(() => {
        if (isOpen) {
            if (task) {
                setContent(task.content);
                setPriority(task.priority);
                setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
                setTags(task.tags || []);
                setAssigneeIds(task.assigneeIds || []);
            } else {
                setContent('');
                setPriority('MEDIUM');
                setDueDate('');
                setTags([]);
                setAssigneeIds([]);
            }
            setNewTag('');
        }
    }, [isOpen, task]);

    if (!isOpen) return null;

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            if (!tags.includes(newTag.trim())) {
                setTags([...tags, newTag.trim()]);
            }
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const toggleAssignee = (userId: string) => {
        setAssigneeIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            await onSave({
                content,
                priority,
                dueDate: dueDate || undefined,
                tags,
                assigneeIds
            });
            onClose();
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Save Failed',
                message: 'Failed to save task.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const approvedMembers = allUsers.filter(u => u.status === 'APPROVED');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <XIcon />
                </button>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    {task ? 'Edit Task' : 'New Task'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-sky-500 focus:border-sky-500"
                            placeholder="What needs to be done?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as TaskPriority)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-sky-500 focus:border-sky-500"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-sky-500 focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignees</label>
                        <div className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto custom-scrollbar">
                            {approvedMembers.map(user => {
                                const isAssigned = assigneeIds.includes(user.uid);
                                return (
                                    <div
                                        key={user.uid}
                                        onClick={() => toggleAssignee(user.uid)}
                                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${isAssigned ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isAssigned ? 'bg-sky-500 border-sky-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                            {isAssigned && <CheckIcon className="w-3 h-3 text-white" />}
                                        </div>
                                        <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt={user.name} />
                                        <span className={`text-sm ${isAssigned ? 'font-semibold text-sky-800 dark:text-sky-300' : 'text-gray-700 dark:text-gray-300'}`}>{user.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (Press Enter)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded-full flex items-center">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-purple-900"><XIcon className="w-4 h-4" /></button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Frontend, Bug, etc..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-sky-500 focus:border-sky-500 text-sm"
                        />
                    </div>
                </form>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {isSubmitting ? 'Saving...' : (
                        <>
                            <CheckIcon /> Save Task
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default EditTaskModal;