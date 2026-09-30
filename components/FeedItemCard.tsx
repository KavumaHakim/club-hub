import React, { useState, useEffect, useMemo } from 'react';
import { FeedItem, FeedItemType, User, FeedComment, PollOption } from '../types';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SendIcon } from './icons/SendIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { ShareIcon } from './icons/ShareIcon';
import { UsersIcon } from './icons/UsersIcon';
import { XIcon } from './icons/XIcon';
import * as api from '../services/apiService';
import { useData } from '../DataContext';
import LinkPreview from './LinkPreview';

/** The kicker above each post. One accent, no per-type tinting — the type
 *  reads from the word, not from a colour. */
const typeLabel: { [key in FeedItemType]: string } = {
    EVENT_ANNOUNCEMENT: 'Event',
    MEMBER_POST: 'Discussion',
    NEWS_UPDATE: 'News',
    POLL: 'Poll',
};

const getRelativeTime = (dateString: string) => {
    // Supabase returns ISO strings; normalise space separator just in case
    const date = new Date(dateString.replace(' ', 'T'));
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(seconds) || seconds < 5) return "Just now";

    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + "y ago";

    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + "mo ago";

    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + "d ago";

    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + "h ago";

    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + "m ago";

    return "Just now";
};

// Modal Component for Viewing Voters
const PollVotersModal: React.FC<{ isOpen: boolean; onClose: () => void; options: PollOption[] }> = ({ isOpen, onClose, options }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="ch-shell relative flex max-h-[80vh] w-full max-w-md flex-col border-2 border-ch-rule bg-ch-bg p-6">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-1 text-ch-muted transition-colors hover:text-ch-text"
                    aria-label="Close"
                >
                    <XIcon className="h-5 w-5" />
                </button>

                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Poll</p>
                <h3 className="mb-6 text-[24px] font-extrabold tracking-[-0.02em]">Results</h3>

                <div className="ch-scroll flex-1 space-y-6 overflow-y-auto pr-2">
                    {options.map(option => (
                        <div key={option.id}>
                            <div className="mb-2 flex items-center justify-between border-b border-ch-divider pb-1.5">
                                <h4 className="text-[13px] font-bold">{option.text}</h4>
                                <span className="text-[11px] font-extrabold text-ch-muted">
                                    {option.votes} vote{option.votes !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div>
                                {option.voters && option.voters.length > 0 ? (
                                    option.voters.map(voter => (
                                        <div key={voter.uid} className="flex items-center gap-2 py-1">
                                            <img
                                                src={voter.avatarUrl || `https://i.pravatar.cc/40?u=${voter.name}`}
                                                alt={voter.name}
                                                className="h-6 w-6 flex-none object-cover"
                                            />
                                            <span className="truncate text-[12px] font-medium">{voter.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-1 text-[12px] text-ch-muted">No votes yet.</p>
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
    /** 1-based position in the feed — printed in the row's gutter. */
    index?: number;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, currentUser, onDelete, index }) => {
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
    const { showAlert } = useData();

    useEffect(() => {
        // Check bookmark status from local storage
        const bookmarks = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
        if (bookmarks.includes(item.id)) {
            setIsBookmarked(true);
        }
    }, [item.id]);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('contextmenu', handleClickOutside); // Close if right-click elsewhere
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('contextmenu', handleClickOutside);
        };
    }, []);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (currentUser.role === 'PATRON' && onDelete) {
            e.preventDefault();
            e.stopPropagation();
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
            showAlert({
                title: 'Post Failed',
                message: 'Failed to post comment.',
                type: 'error'
            });
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
            showAlert({
                title: 'Vote Failed',
                message: 'Failed to record vote.',
                type: 'error'
            });
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
                <div className="w-full min-w-0 max-w-[62ch] whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-ch-muted">
                    {parts.map((part, i) => {
                        if (part.match(urlRegex)) {
                            return <LinkPreview key={i} url={part} />;
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>
            );
        }
        return (
            <p className="max-w-[62ch] whitespace-pre-wrap text-[14.5px] leading-relaxed text-ch-muted">
                {content}
            </p>
        );
    };

    const actionButton = "flex items-center gap-[7px] text-[12px] font-semibold text-ch-muted transition-colors hover:text-ch-accent [&_svg]:h-[15px] [&_svg]:w-[15px]";

    return (
        <article
            onContextMenu={handleContextMenu}
            className="group flex items-stretch border-b border-ch-divider transition-colors hover:bg-ch-surface"
        >
            {/* Gutter — the post's number instead of a card edge */}
            <div className="hidden w-16 flex-none justify-center border-r border-ch-divider pt-[22px] sm:flex">
                <span className="text-[13px] font-extrabold tracking-[0.04em] text-ch-muted">
                    {index !== undefined ? String(index).padStart(2, '0') : ''}
                </span>
            </div>

            <div className="min-w-0 flex-1 px-4 pb-6 pt-[22px] sm:px-7">
                {/* Kicker line */}
                <div className="mb-2.5 flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ch-accent">
                        {typeLabel[item.type]}
                    </span>
                    <span className="h-px w-[18px] bg-ch-divider" />
                    <span className="text-[12px] text-ch-muted" title={item.timestamp}>
                        {item.author} · {getRelativeTime(item.timestamp)}
                    </span>
                </div>

                {/* Content */}
                {item.type === 'POLL' ? (
                    <h3 className="mb-2 max-w-[32ch] text-[25px] font-extrabold leading-[1.12] tracking-[-0.022em]">
                        {item.message}
                    </h3>
                ) : (
                    <>
                        {item.title && (
                            <h3 className="mb-2 max-w-[32ch] text-[25px] font-extrabold leading-[1.12] tracking-[-0.022em]">
                                {item.title}
                            </h3>
                        )}
                        <div className="mb-3.5">{renderMessageContent(item.message)}</div>
                    </>
                )}

                {/* Attached Image — printed flat, no rounding */}
                {item.imageUrl && (
                    <div className="mb-4 max-w-[62ch] border border-ch-divider">
                        <img
                            src={item.imageUrl}
                            alt={item.title || "Attached image"}
                            className="block h-auto max-h-[500px] w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Poll Options */}
                {item.type === 'POLL' && pollOptions.length > 0 && (
                    <div className="mb-3.5 max-w-[62ch]">
                        {pollOptions.map(option => {
                            const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

                            return (
                                <div
                                    key={option.id}
                                    className={`relative mb-1.5 cursor-pointer overflow-hidden border transition-colors ${
                                        option.isVoted ? 'border-ch-accent' : 'border-ch-divider hover:border-ch-rule'
                                    }`}
                                    onClick={() => handleVote(option.id)}
                                >
                                    {/* Progress field */}
                                    <div
                                        className="absolute left-0 top-0 h-full transition-[width] duration-500 ease-out"
                                        style={{
                                            width: `${percent}%`,
                                            background: option.isVoted ? 'var(--ch-accent-soft)' : 'var(--ch-surface-2)',
                                        }}
                                    />
                                    <div className="relative z-10 flex items-center justify-between px-3 py-2.5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className={`flex h-4 w-4 flex-none items-center justify-center border-2 ${
                                                    option.isVoted
                                                        ? 'border-ch-accent bg-ch-accent text-ch-on-accent'
                                                        : 'border-ch-rule'
                                                }`}
                                            >
                                                {option.isVoted && <CheckIcon className="h-2.5 w-2.5" />}
                                            </div>
                                            <span className="truncate text-[13.5px] font-semibold">{option.text}</span>
                                        </div>
                                        <span className="ml-3 text-[12px] font-extrabold text-ch-muted">{percent}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ch-muted">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5">
                    <button onClick={handleToggleComments} className={actionButton} title="Comments">
                        <ChatBubbleIcon />
                        {commentCount > 0 ? commentCount : 'Comment'}
                    </button>

                    <button
                        onClick={handleBookmark}
                        className={`${actionButton} ${isBookmarked ? 'text-ch-accent' : ''}`}
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
                    >
                        <BookmarkIcon filled={isBookmarked} />
                    </button>

                    <button onClick={handleShare} className={actionButton} title="Copy to clipboard">
                        <ShareIcon />
                        {isCopied && <span className="text-[11px] font-bold uppercase tracking-[0.1em]">Copied</span>}
                    </button>

                    {item.type === 'POLL' && currentUser.role === 'PATRON' && (
                        <button onClick={() => setShowVotersModal(true)} className={actionButton} title="View Voters">
                            <UsersIcon />
                            Voters
                        </button>
                    )}
                </div>

                {/* Comments */}
                {showComments && (
                    <div className="mt-5 border-t border-ch-divider pt-4">
                        <div className="ch-scroll mb-4 max-h-60 space-y-3 overflow-y-auto pr-2">
                            {isLoadingComments ? (
                                <p className="text-[12px] text-ch-muted">Loading comments…</p>
                            ) : comments.length === 0 ? (
                                <p className="text-[12px] text-ch-muted">No comments yet. Start the conversation.</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img
                                            src={comment.userAvatarUrl}
                                            alt={comment.userName}
                                            className="h-7 w-7 flex-none object-cover"
                                        />
                                        <div className="min-w-0 flex-1 border-l-2 border-ch-divider pl-3">
                                            <div className="mb-0.5 flex items-baseline justify-between gap-3">
                                                <span className="text-[12px] font-bold">{comment.userName}</span>
                                                <span className="flex-none text-[10px] text-ch-muted">
                                                    {getRelativeTime(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-[13px] leading-relaxed text-ch-muted">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handlePostComment} className="flex max-w-[62ch] items-stretch border border-ch-rule">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment…"
                                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[13px] text-ch-text placeholder-ch-muted focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isPosting}
                                className="flex flex-none items-center gap-2 border-l border-ch-rule bg-ch-accent px-4 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ch-on-accent transition-colors hover:bg-ch-accent-deep disabled:opacity-45"
                            >
                                <SendIcon className="h-3.5 w-3.5 rotate-90" />
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Context Menu for Patrons */}
            {contextMenu && onDelete && (
                <div
                    className="ch-shell fixed z-[100] min-w-[160px] border-2 border-ch-rule bg-ch-bg"
                    style={{
                        top: contextMenu.y,
                        left: Math.min(contextMenu.x, window.innerWidth - 170) // Ensure it doesn't go off-screen
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onDelete(item.id);
                            setContextMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-bold text-ch-accent transition-colors hover:bg-ch-accent hover:text-ch-on-accent [&_svg]:h-4 [&_svg]:w-4"
                    >
                        <TrashIcon />
                        Delete post
                    </button>
                </div>
            )}

            {/* Voters Modal */}
            <PollVotersModal
                isOpen={showVotersModal}
                onClose={() => setShowVotersModal(false)}
                options={pollOptions}
            />
        </article>
    );
};

export default FeedItemCard;
