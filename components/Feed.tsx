import React, { useState, useEffect, useCallback } from 'react';
import { FeedItem, User, FeedItemType } from '../types';
import * as api from '../services/apiService';
import { HeartIcon } from './icons/HeartIcon';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string }) => Promise<void>;
}

// FIX: Added currentUser to the destructured props to make it available in the component.
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


interface FeedProps {
  currentUser: User;
}

const badgeMap: { [key in FeedItemType]: {
    text: string;
    style: string;
    borderColor: string;
    ringColor: string;
    lineColor: string;
} } = {
  EVENT_ANNOUNCEMENT: {
    text: 'Event',
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    borderColor: 'border-purple-500',
    ringColor: 'ring-purple-500/50',
    lineColor: 'bg-purple-400'
  },
  MEMBER_POST: {
    text: 'Post',
    style: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    borderColor: 'border-pink-500',
    ringColor: 'ring-pink-500/50',
    lineColor: 'bg-pink-400'
  },
  NEWS_UPDATE: {
    text: 'News',
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    borderColor: 'border-blue-500',
    ringColor: 'ring-blue-500/50',
    lineColor: 'bg-blue-400'
  },
};


interface FeedItemCardProps {
  item: FeedItem;
  onLike: (id: string) => void;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, onLike }) => {
  const badge = badgeMap[item.type];
  
  return (
    <div className="relative pl-14">
      {/* Timeline Avatar and Line */}
      <div className="absolute left-0 top-0 flex flex-col items-center h-full">
        <div className={`w-10 h-10 bg-white dark:bg-gray-800 rounded-full ring-4 ${badge.ringColor} flex-shrink-0`}>
            <img src={item.authorAvatarUrl} alt={item.author} className="w-full h-full rounded-full" />
        </div>
        <div className={`w-0.5 flex-grow ${badge.lineColor} mt-1`}></div>
      </div>

      {/* Content Card */}
      <div className="mb-8">
        <div className={`bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-lg border-t-4 ${badge.borderColor}`}>
          {/* Card Header */}
          <div className="flex items-center mb-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.author}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</p>
              </div>
          </div>
          
          {/* Card Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {item.title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>}
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{item.message}</p>
          </div>
         
          {/* Card Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${badge.style}`}>
                {badge.text}
             </span>
            {item.type === 'MEMBER_POST' && (
                <button
                    onClick={() => onLike(item.id)}
                    className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors focus:outline-none group"
                    aria-label="Like post"
                >
                    <HeartIcon className="group-hover:fill-red-200 dark:group-hover:fill-red-900/50" />
                    <span className="text-sm font-medium">{item.likes || 0}</span>
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
        const feedItems = await api.getFeedItems();
        setItems(feedItems);
    } catch(e) {
        console.error("Failed to fetch feed", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if(!isLoading) {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleAddAnnouncement = useCallback(async (data: { title: string, message: string }) => {
    await api.addFeedItem({ type: 'NEWS_UPDATE', ...data }, currentUser.uid);
    await fetchFeed();
  }, [fetchFeed, currentUser.uid]);

  const handleLike = (id: string) => {
    // Liking is client-side only for this demo.
    // A real implementation would update this in Firestore.
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id && item.type === 'MEMBER_POST'
          ? { ...item, likes: (item.likes || 0) + 1 }
          : item
      )
    );
  };
  
  if(isLoading) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading feed...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Activity Feed</h2>
        {currentUser.role === 'PATRON' && (
            <AddAnnouncement 
                currentUser={currentUser}
                onAddAnnouncement={handleAddAnnouncement}
            />
        )}
      <div className="relative">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`transform transition-all duration-700 ease-in-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <FeedItemCard item={item} onLike={handleLike} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
