

import React, { useState } from 'react';
import { FeedItem, FeedItemType, User, FeedComment } from '../types';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SendIcon } from './icons/SendIcon';
import * as api from '../services/apiService';

const badgeConfig: { [key in FeedItemType]: {
    text: string;
    bgClass: string;
    textClass: string;
} } = {
  EVENT_ANNOUNCEMENT: {
    text: 'Event',
    bgClass: 'bg-purple-100 dark:bg-purple-500/20',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  MEMBER_POST: {
    text: 'Discussion',
    bgClass: 'bg-pink-100 dark:bg-pink-500/20',
    textClass: 'text-pink-700 dark:text-pink-300',
  },
  NEWS_UPDATE: {
    text: 'News',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
};

interface FeedItemCardProps {
  item: FeedItem;
  currentUser: User;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, currentUser }) => {
  const config = badgeConfig[item.type];
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleToggleComments = async () => {
      if (!showComments) {
          setIsLoadingComments(true);
          try {
              const fetchedComments = await api.getFeedComments(item.id);
              setComments(fetchedComments);
          } catch (error) {
              console.error("Failed to load comments", error);
          } finally {
              setIsLoadingComments(false);
          }
      }
      setShowComments(!showComments);
  };

  const handlePostComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      setIsPosting(true);
      try {
          const comment = await api.addFeedComment(item.id, currentUser.uid, newComment);
          setComments([...comments, comment]);
          setNewComment('');
      } catch (error) {
          console.error("Failed to post comment", error);
          alert("Failed to post comment.");
      } finally {
          setIsPosting(false);
      }
  };
  
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-[1.4rem] p-5 sm:p-6 h-full relative overflow-hidden">
             {/* Decorative gradient blur top right */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full opacity-50 blur-2xl group-hover:from-pink-100 group-hover:to-purple-100 dark:group-hover:from-pink-900/30 dark:group-hover:to-purple-900/30 transition-colors duration-500"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={item.authorAvatarUrl} 
                            alt={item.author} 
                            className="w-12 h-12 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-750 shadow-sm" 
                        />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{item.author}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.timestamp}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bgClass} ${config.textClass} shadow-sm border border-transparent dark:border-white/5`}>
                    {config.text}
                </span>
            </div>

            {/* Content */}
            <div className="mb-6 relative z-10">
                {item.title && (
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">
                        {item.title}
                    </h3>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                </div>
            </div>

            {/* Footer / Interactive Area */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
                <div>
                    <button 
                        onClick={handleToggleComments}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group/btn ${showComments ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400'}`}
                    >
                         <ChatBubbleIcon />
                         <span className="text-xs font-medium">Comments {comments.length > 0 && `(${comments.length})`}</span>
                    </button>
                </div>
                
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    #{item.id.slice(0,4)}
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 animate-fade-in-down relative z-10">
                    {/* Comments List */}
                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {isLoadingComments ? (
                            <p className="text-center text-xs text-gray-500">Loading comments...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 italic">No comments yet. Be the first!</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={comment.userAvatarUrl} alt={comment.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                    <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-2xl rounded-tl-none text-sm flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-gray-900 dark:text-white text-xs">{comment.userName}</span>
                                            <span className="text-[10px] text-gray-400">{comment.createdAt}</span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment Form */}
                    <form onSubmit={handlePostComment} className="flex gap-2 items-center">
                        <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" alt="My Avatar" />
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..." 
                                className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-gray-750 border-none rounded-full text-sm focus:ring-2 focus:ring-purple-500 dark:text-white placeholder-gray-500"
                            />
                            <button 
                                type="submit"
                                disabled={!newComment.trim() || isPosting}
                                className="absolute right-1 top-1 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <SendIcon className="w-3 h-3 transform rotate-90" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    </div>
  );
};

export default FeedItemCard;
