import React, { useState } from 'react';
import { User } from '../types';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string }) => Promise<void>;
}

const AddAnnouncement: React.FC<AddAnnouncementProps> = ({ currentUser, onAddAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            alert('Please fill out both title and message.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddAnnouncement({ title, message });
            setTitle('');
            setMessage('');
        } catch (error) {
            alert('Failed to post announcement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-start space-x-4">
                 <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                <form onSubmit={handleSubmit} className="space-y-3 flex-grow">
                    <input
                        id="announcement-title"
                        type="text"
                        placeholder="Announcement Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                    <textarea
                        id="announcement-message"
                        placeholder="What's on your mind?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    ></textarea>
                    <div className="text-right">
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement;
