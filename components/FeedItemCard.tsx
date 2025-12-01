

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedItem, FeedItemType, User, FeedComment, PollOption } from '../types';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SendIcon } from './icons/SendIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import * as api from '../services/apiService';
import LinkPreview from './LinkPreview';

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
  POLL: {
    text: 'Poll',
    bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
    textClass: 'text-yellow-700 dark:text-yellow-300',
  },
};

interface FeedItemCardProps {
  item: FeedItem;
  currentUser: User;
  onDelete?: (id: string) => void;
  staggerDelay?: number;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, currentUser, onDelete, staggerDelay = 0 }) => {
  const config = badgeConfig[item.type];
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentCount || 0);
  
  // Poll State
  const [pollOptions, setPollOptions] = useState<PollOption[]>(item.pollOptions || []);
  const [isVoting, setIsVoting] = useState(false);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    
    element.style.transitionDelay = `${staggerDelay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible');
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [staggerDelay]);

  useEffect(() => {
      const handleClickOutside = () => setContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
      if (currentUser.role === 'PATRON' && onDelete) {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
      }
  };

  const handleToggleComments = async () => {
      if (!showComments) {
          setIsLoadingComments(true);
          try {
              const fetchedComments = await api.getFeedComments(item.id);
              setComments(fetchedComments);
              setCommentCount(fetchedComments.length);
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
          setCommentCount(prev => prev + 1);
          setNewComment('');
      } catch (error) {
          console.error("Failed to post comment", error);
          alert("Failed to post comment.");
      } finally {
          setIsPosting(false);
      }
  };

  const handleVote = async (optionId: string) => {
      if (isVoting) return;
      setIsVoting(true);
      
      try {
          await api.votePoll(item.id, optionId, currentUser.uid);
          
          // Optimistic update
          setPollOptions(prev => {
              // Reset previous vote
              const reset = prev.map(opt => ({
                  ...opt,
                  votes: opt.isVoted ? opt.votes - 1 : opt.votes,
                  isVoted: false
              }));
              
              // Apply new vote
              return reset.map(opt => ({
                  ...opt,
                  votes: opt.id === optionId ? opt.votes + 1 : opt.votes,
                  isVoted: opt.id === optionId
              }));
          });
      } catch (error) {
          console.error("Failed to vote", error);
          alert("Failed to record vote.");
      } finally {
          setIsVoting(false);
      }
  };

  const totalVotes = useMemo(() => pollOptions.reduce((acc, curr) => acc + curr.votes, 0), [pollOptions]);

  const renderMessageContent = (content: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(content)) {
          const parts = content.split(urlRegex);
          return (
              <div className="whitespace-pre-wrap break-words w-full min-w-0 text-gray-600 dark:text-gray-300 leading-relaxed">
                  {parts.map((part, i) => {
                      if (part.match(urlRegex)) {
                          return <LinkPreview key={i} url={part} />;
                      }
                      return <span key={i}>{part}</span>;
                  })}
              </div>
          );
      }
      return <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>;
  };
  
  return (
    <div 
        ref={cardRef}
        onContextMenu={handleContextMenu}
        className="scroll-animate group bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300"
    >
        <div className="bg-white dark:bg-gray-800 rounded-[1.4rem] p-5 sm:p-6 h-full relative overflow-hidden">
             {/* Decorative gradient blur top right */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full opacity-50 blur-2xl group-hover:from-pink-100 group-hover:to-purple-100 dark:group-hover:from-pink-900/30 dark:group-hover:to-purple-900/30 transition-colors duration-500 pointer-events-none"></div>

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
                {item.type === 'POLL' ? (
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight flex items-start gap-2">
                        <ChartBarIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                        {item.message}
                    </h3>
                ) : (
                    <>
                        {item.title && (
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">
                                {item.title}
                            </h3>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            {renderMessageContent(item.message)}
                        </div>
                    </>
                )}

                {/* Poll Options */}
                {item.type === 'POLL' && pollOptions.length > 0 && (
                    <div className="space-y-3 mt-4">
                        {pollOptions.map(option => {
                            const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                            return (
                                <div key={option.id} className="relative group/poll">
                                    <div 
                                        className={`relative z-10 flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            option.isVoted 
                                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/10' 
                                            : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                                        }`}
                                        onClick={() => handleVote(option.id)}
                                    >
                                        <span className={`text-sm font-medium ${option.isVoted ? 'text-pink-700 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {option.text}
                                        </span>
                                        {option.isVoted && <span className="text-pink-500 text-xs font-bold">Voted</span>}
                                    </div>
                                    {/* Progress Bar Background */}
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-gray-100 dark:bg-gray-700 rounded-xl transition-all duration-500 ease-out -z-0 opacity-50"
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                    <div className="absolute right-3 top-3.5 text-xs font-bold text-gray-400 dark:text-gray-500">
                                        {percent}%
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} total
                        </p>
                    </div>
                )}
            </div>

            {/* Footer / Interactive Area */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
                <div>
                    <button 
                        onClick={handleToggleComments}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group/btn ${showComments ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400'}`}
                    >
                         <ChatBubbleIcon />
                         <span className="text-xs font-medium">
                             Comments
                         </span>
                         {commentCount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
                                showComments 
                                ? 'bg-white/30 text-purple-700 dark:text-purple-200' 
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                            }`}>
                                {commentCount}
                            </span>
                         )}
                    </button>
                </div>
                
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    #{String(item.id).slice(0,4)}
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

        {/* Context Menu for Patrons */}
        {contextMenu && onDelete && (
            <div 
                className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 min-w-[160px] animate-fade-in-up"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={() => onDelete(item.id)}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                >
                    <TrashIcon /> 
                    <span className="font-medium">Delete Post</span>
                </button>
            </div>
        )}
    </div>
  );
};

export default FeedItemCard;