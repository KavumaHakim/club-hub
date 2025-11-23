

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
    return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 h-full">
            <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-t-2 border-purple-500 animate-ping opacity-30"></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Fetching latest updates...</p>
        </div>
    );
  }
  
  if (feedItemsError) {
      return (
          <div className="flex items-center justify-center h-full p-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl text-center border border-red-100 dark:border-red-900/30">
                <div className="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Connection Error</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{feedItemsError}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                    Retry
                </button>
            </div>
          </div>
      );
  }

  return (
    <div className="relative min-h-full pb-12 overflow-hidden">
       {/* Animated Background Elements */}
       <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-300 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-300 dark:bg-indigo-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Restored Header Alignment */}
        <header className="mb-8 pt-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Club Feed
            </h2>
            <p className="text-md text-gray-500 dark:text-gray-400 mt-1">
              Latest announcements and community updates.
            </p>
        </header>
        
        {currentUser.role === 'PATRON' && (
            <div className="mb-10 transform transition-all hover:-translate-y-1 duration-300 relative z-20">
                <AddAnnouncement 
                    currentUser={currentUser}
                    onAddAnnouncement={handleAddAnnouncement}
                />
            </div>
        )}

        <div className="space-y-8 relative">
            {/* Timeline Line (Desktop only) */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent z-0"></div>

            {items.length === 0 ? (
                 <div className="text-center py-20 backdrop-blur-md bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-gray-300 dark:text-gray-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h2m-4 3h2m-4 3h2m-4 3h2m-4 3h2" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No new announcements at the moment.</p>
                 </div>
            ) : (
                items.map((item, index) => (
                <div
                    key={item.id}
                    className={`transform transition-all duration-700 ease-out pl-0 md:pl-20 relative ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                >
                    {/* Timeline Dot (Desktop only) */}
                    <div className="hidden md:flex absolute left-6 top-8 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 bg-gradient-to-r from-pink-500 to-purple-600 shadow-md z-10"></div>
                    
                    <FeedItemCard item={item} currentUser={currentUser} />
                </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
