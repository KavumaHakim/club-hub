

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedItem, FeedItemType, User, FeedComment, PollOption, PollVoter } from '../types';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SendIcon } from './icons/SendIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CheckIcon } from './icons/CheckIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { ShareIcon } from './icons/ShareIcon';
import { UsersIcon } from './icons/UsersIcon';
import { XIcon } from './icons/XIcon';
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

const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    
    return "Just now";
};

// Modal Component for Viewing Voters
const PollVotersModal: React.FC<{ isOpen: boolean; onClose: () => void; options: PollOption[] }> = ({ isOpen, onClose, options }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <ChartBarIcon className="h-6 w-6 text-yellow-500" />
                    Poll Results
                </h3>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                    {options.map(option => (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{option.text}</h4>
                                <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                    {option.votes} vote{option.votes !== 1 ? 's' : ''}
                                </span>
                            </div>
                            
                            <div className="space-y-1 ml-1">
                                {option.voters && option.voters.length > 0 ? (
                                    option.voters.map(voter => (
                                        <div key={voter.uid} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <img 
                                                src={voter.avatarUrl || `https://i.pravatar.cc/40?u=${voter.name}`} 
                                                alt={voter.name} 
                                                className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{voter.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 italic pl-1">No votes yet.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
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
  
  // Interactions
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Poll State
  const [pollOptions, setPollOptions] = useState<PollOption[]>(item.pollOptions || []);
  const [isVoting, setIsVoting] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check bookmark status from local storage
    const bookmarks = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
    if (bookmarks.includes(item.id)) {
        setIsBookmarked(true);
    }

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
  }, [staggerDelay, item.id]);

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

  const handleBookmark = () => {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
      let newBookmarks;
      if (isBookmarked) {
          newBookmarks = bookmarks.filter((id: string) => id !== item.id);
      } else {
          newBookmarks = [...bookmarks, item.id];
      }
      localStorage.setItem('bookmarked_posts', JSON.stringify(newBookmarks));
      setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
      const textToCopy = `${item.title ? item.title + '\n' : ''}${item.message}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
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
                  isVoted: false,
                  voters: opt.isVoted ? (opt.voters || []).filter(v => v.uid !== currentUser.uid) : opt.voters
              }));
              
              // Apply new vote
              return reset.map(opt => {
                  if (opt.id === optionId) {
                      return {
                          ...opt,
                          votes: opt.votes + 1,
                          isVoted: true,
                          voters: [...(opt.voters || []), { uid: currentUser.uid, name: currentUser.name, avatarUrl: currentUser.avatarUrl }]
                      };
                  }
                  return opt;
              });
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
              <div className="whitespace-pre-wrap break-words w-full min-w-0 text-gray-700 dark:text-gray-300 leading-relaxed text-[15px]">
                  {parts.map((part, i) => {
                      if (part.match(urlRegex)) {
                          return <LinkPreview key={i} url={part} />;
                      }
                      return <span key={i}>{part}</span>;
                  })}
              </div>
          );
      }
      return <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-[15px]">{content}</p>;
  };
  
  return (
    <div 
        ref={cardRef}
        onContextMenu={handleContextMenu}
        className="scroll-animate group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden transform hover:-translate-y-0.5"
    >
        <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={item.authorAvatarUrl} 
                            alt={item.author} 
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" 
                        />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{item.author}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" title={item.timestamp}>
                            {getRelativeTime(item.timestamp)}
                        </p>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${config.bgClass} ${config.textClass}`}>
                    {config.text}
                </span>
            </div>

            {/* Content */}
            <div className="mb-4">
                {item.type === 'POLL' ? (
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight flex items-start gap-2">
                        <ChartBarIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        {item.message}
                    </h3>
                ) : (
                    <>
                        {item.title && (
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
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
                    <div className="space-y-2 mt-4">
                        {pollOptions.map(option => {
                            const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                            const isWinner = totalVotes > 0 && option.votes === Math.max(...pollOptions.map(o => o.votes));
                            
                            return (
                                <div 
                                    key={option.id} 
                                    className={`relative overflow-hidden rounded-lg border cursor-pointer transition-all duration-200 group/poll ${
                                        option.isVoted 
                                        ? 'border-purple-500 dark:border-purple-400 ring-1 ring-purple-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                    onClick={() => handleVote(option.id)}
                                >
                                    {/* Progress Bar Layer */}
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                                            option.isVoted
                                            ? 'bg-purple-100/80 dark:bg-purple-900/30' 
                                            : isWinner && totalVotes > 0
                                                ? 'bg-gray-100/80 dark:bg-gray-700/50'
                                                : 'bg-gray-50/80 dark:bg-gray-800/50' 
                                        }`}
                                        style={{ width: `${percent}%` }}
                                    />

                                    {/* Content Layer */}
                                    <div className="relative z-10 flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                option.isVoted
                                                ? 'border-purple-500 bg-purple-500 text-white'
                                                : 'border-gray-300 dark:border-gray-500 group-hover/poll:border-purple-400'
                                            }`}>
                                                {option.isVoted && <CheckIcon className="w-3 h-3" />}
                                            </div>
                                            <span className={`text-sm font-medium truncate ${
                                                option.isVoted ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                                {option.text}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-3">
                                            {percent}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex justify-between items-center mt-2 px-1">
                             <p className="text-xs text-gray-400 dark:text-gray-500">
                                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Interactive Area */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-4">
                    <button 
                        onClick={handleToggleComments}
                        className={`flex items-center gap-1.5 transition-colors ${showComments ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'}`}
                    >
                         <ChatBubbleIcon className="w-5 h-5" />
                         <span className="text-xs font-medium">{commentCount > 0 ? commentCount : 'Comment'}</span>
                    </button>
                    
                    <button 
                        onClick={handleBookmark}
                        className={`flex items-center gap-1.5 transition-colors ${isBookmarked ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400'}`}
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
                    >
                        <BookmarkIcon className="w-5 h-5" filled={isBookmarked} />
                    </button>

                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Copy to clipboard"
                    >
                        <ShareIcon className="w-5 h-5" />
                        {isCopied && <span className="text-xs text-blue-600 animate-fade-in">Copied!</span>}
                    </button>
                </div>

                {/* View Voters Button for Patrons */}
                {item.type === 'POLL' && currentUser.role === 'PATRON' && (
                    <button
                        onClick={() => setShowVotersModal(true)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded-lg"
                        title="View Voters"
                    >
                        <UsersIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Voters</span>
                    </button>
                )}
            </div>
        </div>

        {/* Comments Section */}
        {showComments && (
            <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/50 p-5 animate-fade-in-down">
                {/* Comments List */}
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {isLoadingComments ? (
                        <p className="text-center text-xs text-gray-500">Loading comments...</p>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 italic">No comments yet. Start the conversation!</p>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3 animate-fade-in">
                                <img src={comment.userAvatarUrl} alt={comment.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none text-sm flex-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-bold text-gray-900 dark:text-white text-xs">{comment.userName}</span>
                                        <span className="text-[10px] text-gray-400">{getRelativeTime(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handlePostComment} className="flex gap-3 items-center">
                    <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" alt="My Avatar" />
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..." 
                            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:ring-2 focus:ring-purple-500 dark:text-white placeholder-gray-500 transition-shadow shadow-sm"
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim() || isPosting}
                            className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <SendIcon className="w-3.5 h-3.5 transform rotate-90" />
                        </button>
                    </div>
                </form>
            </div>
        )}

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
                    <TrashIcon className="w-4 h-4" /> 
                    <span className="font-medium">Delete Post</span>
                </button>
            </div>
        )}

        {/* Voters Modal */}
        <PollVotersModal 
            isOpen={showVotersModal} 
            onClose={() => setShowVotersModal(false)} 
            options={pollOptions} 
        />
    </div>
  );
};

export default FeedItemCard;