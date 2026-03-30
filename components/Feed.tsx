
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FeedItem, User, FeedItemType } from '../types';
import * as api from '../services/apiService';
import AddAnnouncement from './AddAnnouncement';
import FeedItemCard from './FeedItemCard';
import { useData } from '../DataContext';
import ConfirmationModal from './ConfirmationModal';
import { SearchIcon } from './icons/SearchIcon';
import { FilterIcon } from './icons/FilterIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';

interface FeedProps {
  currentUser: User;
}

type FilterCategory = 'ALL' | 'NEWS' | 'EVENTS' | 'DISCUSSIONS' | 'POLLS' | 'BOOKMARKED';

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const { 
      feedItems: items,
      isLoadingFeed,
      feedItemsError,
      fetchFeedItems,
      showToast,
      allUsers,
      onlineUsers,
      showcaseItems,
      suggestions,
      projectData,
      isLoadingUsers,
      isLoadingShowcase,
      isLoadingSuggestions,
      isLoadingProjects,
  } = useData();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [isMobileComposeOpen, setIsMobileComposeOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const [panelTop, setPanelTop] = useState(96);

  // Update bookmarked IDs on mount and when changed
  useEffect(() => {
      const updateBookmarks = () => {
          const stored = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
          setBookmarkedIds(stored);
      };
      updateBookmarks();
      // Listen for changes (hacky way to sync sibling components if needed, mostly for self-update)
      window.addEventListener('storage', updateBookmarks);
      return () => window.removeEventListener('storage', updateBookmarks);
  }, [items]); // Re-check when items reload

  const handleAddAnnouncement = useCallback(async (data: { title: string, message: string, type: FeedItemType, pollOptions?: string[] }) => {
    try {
        await api.addFeedItem(data, currentUser.uid);
        await fetchFeedItems();
        showToast("Announcement posted successfully!", "success");
        setIsMobileComposeOpen(false);
    } catch (error) {
        console.error("Failed to post announcement", error);
        showToast("Failed to create post.", "error");
    }
  }, [fetchFeedItems, currentUser.uid, showToast]);

  const handleDeletePost = async () => {
      if (!itemToDelete) return;
      try {
          await api.deleteFeedItem(itemToDelete);
          await fetchFeedItems();
          showToast("Post deleted.", "info");
      } catch (error) {
          console.error("Failed to delete item:", error);
          showToast("Failed to delete post.", "error");
      } finally {
          setItemToDelete(null);
      }
  };

  const filteredItems = useMemo(() => {
      return items.filter(item => {
          // Search Filter
          const matchesSearch = 
            item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.author.toLowerCase().includes(searchTerm.toLowerCase());

          if (!matchesSearch) return false;

          // Category Filter
          if (filter === 'ALL') return true;
          if (filter === 'NEWS') return item.type === 'NEWS_UPDATE';
          if (filter === 'EVENTS') return item.type === 'EVENT_ANNOUNCEMENT';
          if (filter === 'DISCUSSIONS') return item.type === 'MEMBER_POST';
          if (filter === 'POLLS') return item.type === 'POLL';
          if (filter === 'BOOKMARKED') {
              // Refresh bookmark list from local storage for accurate filtering
              const currentBookmarks = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
              return currentBookmarks.includes(item.id);
          }
          return true;
      });
  }, [items, searchTerm, filter, bookmarkedIds]);

  const onlineUserList = useMemo(() => {
      const onlineSet = new Set(onlineUsers);
      return allUsers.filter(user => onlineSet.has(user.uid));
  }, [allUsers, onlineUsers]);

  const challengeLeaders = useMemo(() => {
      return [...allUsers]
          .filter(user => user.status === 'APPROVED')
          .map(user => ({
              ...user,
              badgeCount: user.badges?.length || 0
          }))
          .sort((a, b) => {
              if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
              return a.name.localeCompare(b.name);
          })
          .slice(0, 5);
  }, [allUsers]);

  const recentInteractions = useMemo(() => {
      const toTime = (value?: string) => {
          if (!value) return 0;
          const time = new Date(value).getTime();
          return Number.isNaN(time) ? 0 : time;
      };

      const userMap = new Map(allUsers.map(user => [user.uid, user]));
      const entries: Array<{
          id: string;
          userName: string;
          userAvatarUrl?: string;
          action: string;
          meta: string;
          time: string;
      }> = [];

      showcaseItems.forEach(item => {
          entries.push({
              id: `showcase:${item.id}`,
              userName: item.userName || 'Unknown User',
              userAvatarUrl: item.userAvatarUrl,
              action: 'Shared a showcase',
              meta: item.title,
              time: item.createdAt,
          });
      });

      suggestions.forEach(suggestion => {
          entries.push({
              id: `suggestion:${suggestion.id}`,
              userName: suggestion.userName || 'Unknown User',
              userAvatarUrl: suggestion.userAvatarUrl,
              action: suggestion.type === 'BUG' ? 'Reported a bug' : 'Suggested a feature',
              meta: suggestion.title,
              time: suggestion.createdAt,
          });
      });

      items.forEach(item => {
          const label = item.type === 'EVENT_ANNOUNCEMENT' 
              ? 'Posted an event' 
              : item.type === 'NEWS_UPDATE' 
              ? 'Posted a news update'
              : item.type === 'POLL'
              ? 'Created a poll'
              : 'Posted a discussion';
          entries.push({
              id: `feed:${item.id}`,
              userName: item.author || 'Unknown User',
              userAvatarUrl: item.authorAvatarUrl,
              action: label,
              meta: item.title || item.message,
              time: item.timestamp,
          });
      });

      Object.values(projectData?.tasks || {}).forEach(task => {
          if (!task.submissions) return;
          Object.entries(task.submissions).forEach(([userId, submission]) => {
              if (!submission?.submittedAt) return;
              const user = userMap.get(userId);
              entries.push({
                  id: `submission:${task.id}:${userId}`,
                  userName: user?.name || 'Unknown User',
                  userAvatarUrl: user?.avatarUrl,
                  action: 'Submitted a project task',
                  meta: task.content,
                  time: submission.submittedAt,
              });
          });
      });

      return entries
          .filter(entry => toTime(entry.time) > 0)
          .sort((a, b) => toTime(b.time) - toTime(a.time))
          .slice(0, 8);
  }, [allUsers, showcaseItems, suggestions, items, projectData]);

  const recentActivityDisplay = useMemo(() => {
      return recentInteractions.slice(0, 5);
  }, [recentInteractions]);

  const isLoadingActivityFeed = isLoadingShowcase || isLoadingSuggestions || isLoadingProjects || isLoadingFeed;

  const formatInteractionTime = (dateString: string) => {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
      }).format(date);
  };

  useEffect(() => {
      if (isLoadingFeed || feedItemsError) return;
      const header = headerRef.current;
      if (!header) return;

      let raf = 0;
      const updateTop = () => {
          const appHeader = document.querySelector('[data-app-header="true"]') as HTMLElement | null;
          const appHeaderHeight = appHeader?.offsetHeight ?? 0;
          const headerHeight = header.offsetHeight || 0;
          const gap = 16;

          if (appHeaderHeight || headerHeight) {
              setPanelTop(Math.max(0, Math.round(appHeaderHeight + headerHeight + gap)));
              return;
          }

          const rect = header.getBoundingClientRect();
          const next = Math.max(0, Math.round(rect.bottom + 20));
          setPanelTop(next);
      };
      const scheduleUpdate = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(updateTop);
      };

      updateTop();
      scheduleUpdate();

      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(scheduleUpdate);
          observer.observe(header);
          const appHeader = document.querySelector('[data-app-header="true"]') as HTMLElement | null;
          if (appHeader) observer.observe(appHeader);
      }
      window.addEventListener('resize', scheduleUpdate);
      window.addEventListener('orientationchange', scheduleUpdate);
      window.addEventListener('load', scheduleUpdate);
      if (document?.fonts?.ready) {
          document.fonts.ready.then(scheduleUpdate).catch(() => {});
      }

      return () => {
          cancelAnimationFrame(raf);
          observer?.disconnect();
          window.removeEventListener('resize', scheduleUpdate);
          window.removeEventListener('orientationchange', scheduleUpdate);
          window.removeEventListener('load', scheduleUpdate);
      };
  }, [isLoadingFeed, feedItemsError]);

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
    <div className="relative min-h-full pb-12">
       {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 fixed">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 dark:bg-purple-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-300 dark:bg-pink-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-300 dark:bg-indigo-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        {/* Sticky Header with Search & Filter */}
        <header ref={headerRef} className="sticky top-0 z-30 pt-0 pb-3 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-md">
            <div className="mx-auto w-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Club Feed</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Stay updated with the latest news.</p>
                    </div>
                    {currentUser.role === 'PATRON' && (
                        <button 
                            onClick={() => setIsMobileComposeOpen(!isMobileComposeOpen)}
                            className="p-2 bg-pink-600 text-white rounded-full shadow-lg hover:bg-pink-700 transition-colors"
                            aria-label={isMobileComposeOpen ? 'Close post form' : 'Open post form'}
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-sm transition-all"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                        {[
                            { id: 'ALL', label: 'All' },
                            { id: 'NEWS', label: 'News' },
                            { id: 'EVENTS', label: 'Events' },
                            { id: 'DISCUSSIONS', label: 'Discuss' },
                            { id: 'POLLS', label: 'Polls' },
                            { id: 'BOOKMARKED', label: 'Saved' }
                        ].map((pill) => (
                            <button
                                key={pill.id}
                                onClick={() => setFilter(pill.id as FilterCategory)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                                    filter === pill.id 
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </header>

        <div className="relative mt-0 feed-layout">
            {/* Left Panel: Recent Activity */}
            <aside
                className="hidden lg:block fixed w-64 space-y-4"
                style={{ top: panelTop, left: 'var(--feed-panel-left)' }}
            >
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Recent Activity</h3>
                        <span className="text-xs text-gray-400">{recentActivityDisplay.length}</span>
                    </div>
                    {isLoadingActivityFeed ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
                    ) : recentActivityDisplay.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {recentActivityDisplay.map(activity => (
                                <li key={activity.id} className="flex items-start gap-3">
                                    <div className="relative mt-0.5">
                                        <img
                                            src={activity.userAvatarUrl || `https://i.pravatar.cc/40?u=${activity.userName}`}
                                            alt={activity.userName}
                                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-pink-500 border-2 border-white dark:border-gray-800"></span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {activity.userName}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {activity.action}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                                            {activity.meta}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {formatInteractionTime(activity.time)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            {/* Right Panel: Online Users */}
            <aside
                className="hidden lg:block fixed w-64 space-y-4"
                style={{ top: panelTop, right: 'var(--feed-panel-right)' }}
            >
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Online Now</h3>
                        <span className="text-xs font-semibold text-emerald-500">{onlineUserList.length}</span>
                    </div>
                    {isLoadingUsers ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                    ) : onlineUserList.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No users online.</p>
                    ) : (
                        <ul className="space-y-3">
                            {onlineUserList.slice(0, 6).map(user => (
                                <li key={user.uid} className="flex items-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                        />
                                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-800"></span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {onlineUserList.length > 6 && (
                        <p className="text-xs text-gray-400 mt-3">+{onlineUserList.length - 6} more online</p>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Challenges Leaderboard</h3>
                        <span className="text-xs text-gray-400">Top 5</span>
                    </div>
                    {isLoadingUsers ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading leaderboard...</p>
                    ) : challengeLeaders.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No leaderboard data yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {challengeLeaders.map((user, index) => (
                                <li key={user.uid} className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                        {index + 1}
                                    </div>
                                    <img
                                        src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200">
                                        {user.badgeCount} wins
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            {/* Center Column: Feed */}
            <div
                className="min-w-0"
                style={{ paddingLeft: 'var(--feed-side-offset)', paddingRight: 'var(--feed-side-offset-right)' }}
            >
                {/* Desktop Composer */}
                {/* Admin Composer (Hidden by default, revealed by + button) */}
                {currentUser.role === 'PATRON' && isMobileComposeOpen && (
                    <div className="mb-8 animate-fade-in-down">
                        <AddAnnouncement 
                            currentUser={currentUser}
                            onAddAnnouncement={handleAddAnnouncement}
                        />
                    </div>
                )}

                <div className="space-y-6 relative">
                    {filteredItems.length === 0 ? (
                         <div className="text-center py-20 backdrop-blur-md bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm mx-4 sm:mx-0">
                            <div className="text-gray-300 dark:text-gray-600 mb-4 bg-gray-100 dark:bg-gray-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                                <NewspaperIcon />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Posts Found</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                {filter === 'BOOKMARKED' ? "You haven't saved any posts yet." : "Try adjusting your search or filters."}
                            </p>
                            {filter !== 'ALL' && (
                                <button 
                                    onClick={() => { setFilter('ALL'); setSearchTerm(''); }}
                                    className="mt-4 text-pink-600 dark:text-pink-400 font-semibold hover:underline"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredItems.map((item, index) => (
                            <FeedItemCard 
                                key={item.id}
                                item={item} 
                                currentUser={currentUser} 
                                onDelete={setItemToDelete}
                                staggerDelay={index * 50}
                            />
                        ))
                    )}
                </div>
                
                <ConfirmationModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={handleDeletePost}
                    title="Delete Post"
                    message="Are you sure you want to delete this post? This action cannot be undone."
                    confirmText="Delete"
                    isDangerous
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Feed;
