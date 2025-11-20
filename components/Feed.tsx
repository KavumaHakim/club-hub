import React, { useState, useEffect, useCallback } from 'react';
import { FeedItem, User, FeedItemType } from '../types';
import * as api from '../services/apiService';
import AddAnnouncement from './AddAnnouncement';
import FeedItemCard from './FeedItemCard';
import { useData } from '../DataContext';

interface FeedProps {
  currentUser: User;
}

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const { feedItems: items, isLoadingFeed, feedItemsError, fetchFeedItems } = useData();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // This effect is for the staggered animation, not for fetching.
    if(!isLoadingFeed) {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }
  }, [isLoadingFeed]);

  const handleAddAnnouncement = useCallback(async (data: { title: string, message: string, type: FeedItemType }) => {
    await api.addFeedItem({ ...data }, currentUser.uid);
    await fetchFeedItems();
  }, [fetchFeedItems, currentUser.uid]);

  if (isLoadingFeed) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading feed...</div>;
  }
  
  if (feedItemsError) {
      return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Error loading feed: ${feedItemsError}`}</div>;
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
            <FeedItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;