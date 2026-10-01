import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User, ShowcaseItem, Tab, ShowcaseComment } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { HeartIcon } from './icons/HeartIcon';
import { CodeIcon } from './icons/CodeIcon';
import { CopyIcon } from './icons/CopyIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SendIcon } from './icons/SendIcon';
// FIX: Changed to a named import to match the corrected export from CodeRunnerModal.
import { CodeRunnerModal } from './CodeRunnerModal';
import Tooltip from './Tooltip';
import { PageIntro, EmptyState, EYEBROW, BTN_PRIMARY } from './SplitKit';
import { SearchIcon } from './icons/SearchIcon';

interface ShowcaseProps {
    currentUser: User;
    setActiveTab: (tab: Tab) => void;
}

// Minimal syntax highlighting logic
const SYNTAX_REGEX = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)\b|[\[\]\{\}\(\),:])/g;

const MiniSyntaxHighlighter: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (/^".*"$/.test(part) || /^'.*'$/.test(part)) return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>;
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)$/.test(part)) return <span key={i} className="text-ch-violet font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-ch-muted font-bold">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const detectShowcaseLanguage = (code: string) => {
    if (!code) return 'JS';
    if (/<\s*!doctype|<\s*html|<\s*head|<\s*body|<\s*div|<\s*script|<\s*style/i.test(code)) return 'HTML';
    if (/import\s+|def\s+|print\s*\(/.test(code)) return 'PY';
    return 'JS';
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch {
        return dateString;
    }
};

const ShowcaseCard: React.FC<{
    item: ShowcaseItem,
    currentUser: User,
    onLike: (id: string, likes: string[]) => void,
    onClone: (code: string) => void,
    onRun: (code: string, title: string) => void
}> = ({ item, currentUser, onLike, onClone, onRun }) => {
    const [likes, setLikes] = useState(item.likes || []);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<ShowcaseComment[]>([]);
    const [commentCount, setCommentCount] = useState(item.commentCount || 0);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { showAlert } = useData();
    const languageBadge = useMemo(() => detectShowcaseLanguage(item.codeContent), [item.codeContent]);

    const isLiked = likes.includes(currentUser.uid);

    useEffect(() => {
        setLikes(item.likes || []);
        setCommentCount(item.commentCount || 0);
    }, [item]);

    const handleToggleComments = async () => {
        if (!showComments) {
            setIsLoadingComments(true);
            try {
                const fetchedComments = await api.getShowcaseComments(item.id);
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
            const comment = await api.addShowcaseComment(item.id, currentUser.uid, newComment);
            setComments([...comments, comment]);
            setCommentCount(prev => prev + 1);
            setNewComment('');
        } catch (error) {
            console.error("Failed to post comment", error);
            showAlert({
                title: 'Comment Failed',
                message: 'Failed to post your comment. Please try again.',
                type: 'error'
            });
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="bg-ch-bg border border-ch-divider overflow-hidden flex flex-col transition-all duration-300">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <img
                            src={item.userAvatarUrl || `https://i.pravatar.cc/40?u=${item.userUid}`}
                            alt={item.userName}
                            className="w-8 h-8 border border-ch-divider"
                        />
                        <div>
                            <h3 className="font-bold text-ch-text text-lg leading-tight line-clamp-1" title={item.title}>{item.title}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-ch-muted">by {item.userName} • {formatDate(item.createdAt)}</p>
                                <span className={`px-2 py-0.5 text-[10px] font-semibold ${languageBadge === 'HTML'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                                        : languageBadge === 'PY'
                                            ? 'bg-ch-accent-soft text-ch-accent'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200'
                                    }`}>
                                    {languageBadge}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-ch-muted text-sm mb-4 line-clamp-2">{item.description}</p>

                <div className="bg-gray-900 p-3 font-mono text-xs text-gray-300 h-32 overflow-hidden relative group cursor-pointer" onClick={() => onRun(item.codeContent, item.title)}>
                    <div className="absolute top-0 right-0 p-1 bg-gray-900/80 z-10">
                        <CodeIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    {/* Run Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <div className="bg-ch-accent text-ch-on-accent p-2 transform scale-90 transition-transform">
                            <PlayIcon className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="whitespace-pre-wrap break-all">
                        <MiniSyntaxHighlighter text={item.codeContent.slice(0, 300) + (item.codeContent.length > 300 ? '...' : '')} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                </div>
            </div>

            <div className="px-5 py-3 bg-ch-surface border-t border-ch-divider flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tooltip text="Like this showcase to support the creator.">
                        <button
                            onClick={() => onLike(item.id, likes)}
                            className={`flex items-center gap-1 px-2 py-1 transition-colors ${isLiked ? 'text-ch-accent bg-ch-accent-soft' : 'text-ch-muted hover:bg-ch-surface-2'}`}
                        >
                            <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                            <span className="text-xs font-medium">{likes.length}</span>
                        </button>
                    </Tooltip>
                    <Tooltip text="Open comments and join the discussion.">
                        <button
                            onClick={handleToggleComments}
                            className={`flex items-center gap-1 px-2 py-1 transition-colors ${showComments ? 'text-ch-violet bg-ch-accent-soft' : 'text-ch-muted hover:bg-ch-surface-2'}`}
                        >
                            <ChatBubbleIcon className="h-4 w-4" />
                            <span className="text-xs font-medium">{commentCount}</span>
                        </button>
                    </Tooltip>
                </div>

                <div className="flex gap-2">
                    <Tooltip text="Run this code snippet in the playground.">
                        <button
                            onClick={() => onRun(item.codeContent, item.title)}
                            className="p-1.5 transition-colors text-ch-muted hover:bg-ch-surface-2"
                        >
                            <PlayIcon className="h-4 w-4" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Copy this code into your playground editor.">
                        <button
                            onClick={() => onClone(item.codeContent)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-ch-text bg-ch-bg border border-ch-divider hover:bg-ch-surface px-3 py-1.5 transition-colors"
                        >
                            <CopyIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Clone</span>
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="bg-ch-surface border-t border-ch-divider p-4 animate-fade-in-down">
                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                        {isLoadingComments ? (
                            <p className="text-center text-xs text-ch-muted">Loading comments...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-center text-xs text-ch-muted italic">No comments yet. Start the discussion!</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 text-sm">
                                    <img src={comment.userAvatarUrl || `https://i.pravatar.cc/24?u=${comment.userId}`} alt={comment.userName} className="w-6 h-6 object-cover flex-shrink-0 mt-1" />
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-ch-text text-xs">{comment.userName}</span>
                                            <span className="text-[10px] text-ch-muted">{formatDate(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-ch-text text-xs mt-0.5">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={handlePostComment} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 pl-3 pr-3 py-1.5 bg-ch-bg border border-ch-divider text-xs focus:ring-1 focus:ring-ch-accent placeholder-ch-muted outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isPosting}
                            className="p-1.5 bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <SendIcon className="w-3 h-3 transform rotate-90" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const Leaderboard: React.FC<{ items: ShowcaseItem[], allUsers: User[] }> = ({ items, allUsers }) => {
    const rankings = useMemo(() => {
        const userLikes: Record<string, number> = {};
        items.forEach(item => {
            const likes = item.likes || [];
            if (likes.length > 0) {
                userLikes[item.userUid] = (userLikes[item.userUid] || 0) + likes.length;
            }
        });

        return Object.entries(userLikes)
            .map(([uid, count]) => ({
                uid,
                count,
                user: allUsers.find(u => u.uid === uid)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5
    }, [items, allUsers]);

    if (rankings.length === 0) return null;

    return (
        <section className="mb-10 border-2 border-ch-rule">
            <div className="flex items-baseline justify-between border-b-2 border-ch-rule px-5 py-3">
                <span className={EYEBROW}>Top Contributors</span>
                <span className="text-[11px] text-ch-muted">By likes received</span>
            </div>
            <div className="grid grid-cols-1 gap-px bg-ch-divider sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {rankings.map((rank, index) => (
                    <div
                        key={rank.uid}
                        className={`flex items-center gap-3 px-4 py-4 ${index === 0 ? 'bg-ch-accent text-ch-on-accent' : 'bg-ch-bg'}`}
                    >
                        <span className={`text-[28px] font-extrabold leading-none tracking-[-0.04em] ${index === 0 ? '' : 'text-ch-muted'}`}>{index + 1}</span>
                        <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-extrabold">{rank.user?.name || 'Unknown'}</p>
                            <p className={`flex items-center gap-1 text-[11px] font-semibold ${index === 0 ? 'opacity-80' : 'text-ch-muted'}`}>
                                <HeartIcon className="h-3 w-3 fill-current" /> {rank.count} like{rank.count === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

const Showcase: React.FC<ShowcaseProps> = ({ currentUser, setActiveTab }) => {
    const { showcaseItems, isLoadingShowcase, showcaseError, fetchShowcaseItems, allUsers } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    // Runner Modal State
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [runnerCode, setRunnerCode] = useState('');
    const [runnerTitle, setRunnerTitle] = useState('');

    const handleLike = useCallback(async (id: string, currentLikes: string[]) => {
        try {
            await api.toggleShowcaseLike(id, currentUser.uid, currentLikes);
            await fetchShowcaseItems();
        } catch (error) {
            console.error("Failed to like item:", error);
        }
    }, [currentUser.uid, fetchShowcaseItems]);

    const handleClone = useCallback((code: string) => {
        const event = new CustomEvent('open-in-playground', { detail: code });
        window.dispatchEvent(event);
        setActiveTab('playground');
    }, [setActiveTab]);

    const handleRun = useCallback((code: string, title: string) => {
        setRunnerCode(code);
        setRunnerTitle(title);
        setRunnerOpen(true);
    }, []);

    const filteredItems = showcaseItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoadingShowcase) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-12 w-12 border-2 border-ch-divider border-t-ch-accent"></div>
            </div>
        );
    }

    if (showcaseError) {
        return <div className="text-center p-8 text-red-500">{showcaseError}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <PageIntro
                eyebrow="Gallery"
                title="Code Showcase"
                description="Discover and share awesome Python snippets created by the club."
                actions={
                    <label className="flex w-full items-center gap-2.5 border-2 border-ch-rule px-3 md:w-72 [&_svg]:h-4 [&_svg]:w-4">
                        <span className="flex-none text-ch-muted"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Search snippets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
                        />
                    </label>
                }
            />

            <Leaderboard items={showcaseItems} allUsers={allUsers} />

            {filteredItems.length === 0 ? (
                <EmptyState
                    title="No code snippets found"
                    description="Be the first to publish your code from the Playground!"
                    action={
                        <Tooltip text="Open the playground to publish your first showcase.">
                            <button onClick={() => setActiveTab('playground')} className={BTN_PRIMARY}>
                                Go to Playground
                            </button>
                        </Tooltip>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <ShowcaseCard
                            key={item.id}
                            item={item}
                            currentUser={currentUser}
                            onLike={handleLike}
                            onClone={handleClone}
                            onRun={handleRun}
                        />
                    ))}
                </div>
            )}

            <CodeRunnerModal
                isOpen={runnerOpen}
                onClose={() => setRunnerOpen(false)}
                code={runnerCode}
                title={runnerTitle}
            />
        </div>
    );
};

export default Showcase;
