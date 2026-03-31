

import React, { useState } from 'react';
import { User, FeedItemType } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string, type: FeedItemType, pollOptions?: string[] }) => Promise<void>;
}

const AddAnnouncement: React.FC<AddAnnouncementProps> = ({ currentUser, onAddAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedItemType>('NEWS_UPDATE');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isTitleRequired = type === 'NEWS_UPDATE' || type === 'EVENT_ANNOUNCEMENT';
    const validPollOptions = pollOptions.filter(o => o.trim() !== '');
    const isValid =
        message.trim().length > 0 &&
        (!isTitleRequired || title.trim().length > 0) &&
        (type !== 'POLL' || validPollOptions.length >= 2);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        
        // Validation
        if (!message.trim()) {
            setErrorMsg('Please enter a message or question.');
            return;
        }
        // Title is required for News and Events
        if ((type === 'NEWS_UPDATE' || type === 'EVENT_ANNOUNCEMENT') && !title.trim()) {
            setErrorMsg('Please add a title for news or event announcements.');
            return;
        }

        if (type === 'POLL') {
            if (validPollOptions.length < 2) {
                setErrorMsg('Polls must have at least 2 options.');
                return;
            }
        }
        
        setIsSubmitting(true);
        try {
            await onAddAnnouncement({ 
                title, 
                message, 
                type, 
                pollOptions: type === 'POLL' ? validPollOptions : undefined 
            });
            setTitle('');
            setMessage('');
            setType('NEWS_UPDATE');
            setPollOptions(['', '']);
        } catch (error) {
            console.error(error);
            setErrorMsg('Failed to post announcement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addOption = () => {
        setPollOptions([...pollOptions, '']);
    };

    const removeOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 p-5 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 mb-8 transition-all hover:shadow-lg">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="w-10 h-10 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600" />
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Post as {currentUser.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Share news, events, or questions with the club.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-900/60 p-1.5 rounded-xl">
                        {[
                            { id: 'NEWS_UPDATE', label: 'News' },
                            { id: 'EVENT_ANNOUNCEMENT', label: 'Event' },
                            { id: 'MEMBER_POST', label: 'Post' },
                            { id: 'POLL', label: 'Poll' }
                        ].map((pill) => (
                            <button
                                key={pill.id}
                                type="button"
                                onClick={() => setType(pill.id as FeedItemType)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    type === pill.id
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-700/70'
                                }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>

                    {type !== 'POLL' && (
                        <div className="space-y-1">
                            <input
                                id="announcement-title"
                                type="text"
                                placeholder={type === 'MEMBER_POST' ? "Title (optional)" : "Add a title"}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            />
                            {isTitleRequired && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Title is required for news and event announcements.</p>
                            )}
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <textarea
                            id="announcement-message"
                            placeholder={type === 'POLL' ? "Ask a question..." : "What's on your mind?"}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={type === 'POLL' ? 2 : 3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                        ></textarea>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{type === 'POLL' ? 'Make it short and clear.' : 'Keep it concise and helpful.'}</span>
                            <span>{message.length} chars</span>
                        </div>
                    </div>

                    {type === 'POLL' && (
                        <div className="space-y-2">
                            {pollOptions.map((option, index) => (
                                <div key={index} className="flex gap-2 items-center animate-fade-in-down">
                                    <input
                                        type="text"
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                                    />
                                    {pollOptions.length > 2 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeOption(index)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                            aria-label="Remove option"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={addOption}
                                className="w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-2 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:border-purple-300 flex items-center justify-center gap-1"
                            >
                                <PlusCircleIcon className="w-4 h-4" /> Add Option
                            </button>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg p-2">
                            <span className="font-semibold">Fix:</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {isValid ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : null}
                            <span>{isValid ? 'Ready to post' : 'Fill the required fields'}</span>
                        </div>
                        <button type="submit" disabled={isSubmitting || !isValid} className="px-6 py-2 font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all transform active:scale-95">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement;
