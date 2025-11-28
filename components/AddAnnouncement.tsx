
import React, { useState } from 'react';
import { User, FeedItemType } from '../types';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string, type: FeedItemType }) => Promise<void>;
}

const AddAnnouncement: React.FC<AddAnnouncementProps> = ({ currentUser, onAddAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedItemType>('NEWS_UPDATE');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!message.trim()) {
            alert('Please enter a message.');
            return;
        }
        // Title is required for News and Events
        if ((type === 'NEWS_UPDATE' || type === 'EVENT_ANNOUNCEMENT') && !title.trim()) {
            alert('Please enter a title for this announcement type.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onAddAnnouncement({ title, message, type });
            setTitle('');
            setMessage('');
            setType('NEWS_UPDATE');
        } catch (error) {
            console.error(error);
            alert('Failed to post announcement.');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-8 transition-all hover:shadow-lg">
            <div className="flex items-start space-x-4">
                 <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="w-10 h-10 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600" />
                <form onSubmit={handleSubmit} className="space-y-3 flex-grow">
                    <div className="flex flex-col sm:flex-row gap-3">
                         <select
                            value={type}
                            onChange={(e) => setType(e.target.value as FeedItemType)}
                            className="sm:w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm font-medium"
                        >
                            <option value="NEWS_UPDATE">News Update</option>
                            <option value="EVENT_ANNOUNCEMENT">Event Announcement</option>
                            <option value="MEMBER_POST">General Post</option>
                        </select>
                        <input
                            id="announcement-title"
                            type="text"
                            placeholder={type === 'MEMBER_POST' ? "Title (Optional)" : "Title"}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                    </div>
                    <textarea
                        id="announcement-message"
                        placeholder="What's on your mind?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    ></textarea>
                    
                    <div className="flex justify-end items-center pt-2">
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all transform active:scale-95">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement;
