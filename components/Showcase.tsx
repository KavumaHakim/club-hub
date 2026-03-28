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
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)$/.test(part)) return <span key={i} className="text-purple-600 dark:text-purple-400 font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-gray-500 dark:text-gray-500 font-bold">{part}</span>;
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
            alert("Failed to post comment.");
        } finally {
            setIsPosting(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <img 
                            src={item.userAvatarUrl || `https://i.pravatar.cc/40?u=${item.userUid}`} 
                            alt={item.userName} 
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                        />
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight line-clamp-1" title={item.title}>{item.title}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">by {item.userName} • {item.createdAt}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    languageBadge === 'HTML'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                                        : languageBadge === 'PY'
                                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200'
                                }`}>
                                    {languageBadge}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{item.description}</p>
                
                <div className="bg-gray-900 dark:bg-black rounded-lg p-3 font-mono text-xs text-gray-300 h-32 overflow-hidden relative group cursor-pointer" onClick={() => onRun(item.codeContent, item.title)}>
                    <div className="absolute top-0 right-0 p-1 bg-gray-900/80 rounded-bl-lg z-10">
                        <CodeIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    {/* Run Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <div className="bg-pink-600 text-white rounded-full p-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <PlayIcon className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="whitespace-pre-wrap break-all">
                        <MiniSyntaxHighlighter text={item.codeContent.slice(0, 300) + (item.codeContent.length > 300 ? '...' : '')} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onLike(item.id, likes)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${isLiked ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs font-medium">{likes.length}</span>
                    </button>
                    <button 
                        onClick={handleToggleComments}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${showComments ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <ChatBubbleIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{commentCount}</span>
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={() => onRun(item.codeContent, item.title)}
                        className="p-1.5 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Run Code"
                    >
                        <PlayIcon className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => onClone(item.codeContent)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                        <CopyIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Clone</span>
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 p-4 animate-fade-in-down">
                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                        {isLoadingComments ? (
                            <p className="text-center text-xs text-gray-500">Loading comments...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 italic">No comments yet. Start the discussion!</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 text-sm">
                                    <img src={comment.userAvatarUrl || `https://i.pravatar.cc/24?u=${comment.userId}`} alt={comment.userName} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1" />
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white text-xs">{comment.userName}</span>
                                            <span className="text-[10px] text-gray-400">{comment.createdAt}</span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 text-xs mt-0.5">{comment.content}</p>
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
                            className="flex-1 pl-3 pr-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 dark:text-white placeholder-gray-500 outline-none"
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim() || isPosting}
                            className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="mb-10 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">🏆</span> Top Contributors
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {rankings.map((rank, index) => (
                        <div key={rank.uid} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors">
                            <div className="relative">
                                <img 
                                    src={rank.user?.avatarUrl || `https://i.pravatar.cc/40?u=${rank.uid}`} 
                                    className="w-10 h-10 rounded-full border-2 border-white/30" 
                                    alt={rank.user?.name} 
                                />
                                <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/20 ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-900' : index === 2 ? 'bg-amber-700 text-amber-100' : 'bg-indigo-500 text-white'}`}>
                                    {index + 1}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{rank.user?.name || 'Unknown'}</p>
                                <p className="text-xs text-indigo-200 flex items-center gap-1">
                                    <HeartIcon className="w-3 h-3 fill-current" /> {rank.count} Likes
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    if (showcaseError) {
        return <div className="text-center p-8 text-red-500">{showcaseError}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Showcase</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Discover and share awesome Python snippets created by the club.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="Search snippets..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            </div>

            <Leaderboard items={showcaseItems} allUsers={allUsers} />

            {filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <CodeIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No code snippets found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Be the first to publish your code from the Playground!</p>
                    <button 
                        onClick={() => setActiveTab('playground')}
                        className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                    >
                        Go to Playground
                    </button>
                </div>
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
