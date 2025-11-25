
import React, { useState, useEffect } from 'react';
import { ProjectTask, TaskPriority, User } from '../types';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: ProjectTask; // If provided, we are editing. If null, creating.
  currentUser: User;
  onSave: (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[] }) => Promise<void>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task, currentUser, onSave }) => {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // Reset or Populate
        if (task) {
            setContent(task.content);
            setPriority(task.priority);
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
            setTags(task.tags || []);
        } else {
            setContent('');
            setPriority('MEDIUM');
            setDueDate('');
            setTags([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
        await onSave({
            content,
            priority,
            dueDate: dueDate || undefined,
            tags
        });
        onClose();
    } catch (error) {
        console.error(error);
        alert("Failed to save task.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <XIcon />
        </button>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {task ? 'Edit Task' : 'New Task'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Content */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500 focus:border-pink-500"
                    placeholder="What needs to be done?"
                />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select 
                        value={priority}
                        onChange={e => setPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500 focus:border-pink-500"
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500 focus:border-pink-500"
                    />
                </div>
            </div>

            {/* Tags */}
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500 focus:border-pink-500 text-sm"
                />
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4"
            >
                {isSubmitting ? 'Saving...' : (
                    <>
                        <CheckIcon /> Save Task
                    </>
                )}
            </button>

        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
