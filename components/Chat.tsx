




import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Message, Room, Tab } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { supabase } from '../services/supabaseClient';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { XIcon } from './icons/XIcon';
import { SendIcon } from './icons/SendIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { FaceSmileIcon } from './icons/FaceSmileIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { UserRemoveIcon } from './icons/UserRemoveIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UserAddIcon } from './icons/UserAddIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CodeIcon } from './icons/CodeIcon';
import Tooltip from './Tooltip';
import { CopyIcon } from './icons/CopyIcon';
import LinkPreview from './LinkPreview';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import ConfirmationModal from './ConfirmationModal';

interface ChatProps {
    currentUser: User;
    setActiveTab: (tab: Tab) => void;
    theme: 'light' | 'dark';
}

// --- Syntax Highlighting Components ---

const SYNTAX_REGEX = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await)\b|[\[\]\{\}\(\),:])/gm;

const SyntaxHighlightedText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                // Comments
                if (part.startsWith('#')) return <span key={i} className="italic text-gray-500">{part}</span>;
                // Strings
                if (part.startsWith('"') || part.startsWith("'")) return <span key={i} className="text-green-400">{part}</span>;
                // Numbers
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
                // Keywords
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await)$/.test(part)) return <span key={i} className="text-purple-400 font-bold">{part}</span>;
                // Punctuation
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-yellow-500">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const CodeBlock: React.FC<{ code: string, language?: string }> = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 overflow-hidden bg-[#1e1e1e] border border-gray-700 w-full max-w-full text-left">
            <div className="flex justify-between items-center px-3 py-1.5 bg-[#252526] border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <CodeIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-[10px] font-mono uppercase font-semibold tracking-wider text-gray-400">
                        {language || 'PYTHON'}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="text-xs hover:text-white flex items-center gap-1.5 transition-colors px-2 py-0.5 hover:bg-gray-700 text-gray-400"
                    title="Copy Code"
                >
                    {copied ? (
                        <>
                            <CheckIcon className="h-3 w-3 text-green-400" />
                            <span className="text-green-400 font-medium">Copied</span>
                        </>
                    ) : (
                        <>
                            <CopyIcon className="h-3 w-3" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="p-3 overflow-x-auto custom-scrollbar">
                <pre className="text-xs md:text-sm font-mono text-[#d4d4d4] whitespace-pre leading-relaxed">
                    <SyntaxHighlightedText text={code.trim()} />
                </pre>
            </div>
        </div>
    );
};

// --- Helper Functions ---

const getRoomName = (room: Room, allUsers: User[], currentUserId: string) => {
    if (room.title) return room.title;

    const participants = room.participantIds || []; // Safety check

    const others = participants
        .filter(uid => uid !== currentUserId)
        .map(uid => allUsers.find(u => u.uid === uid)?.name || 'Unknown');

    if (others.length === 0) return "Personal Notes";
    return others.join(', ');
};

const getRoomAvatar = (room: Room, allUsers: User[], currentUserId: string) => {
    const participants = room.participantIds || []; // Safety check

    const others = participants
        .filter(uid => uid !== currentUserId)
        .map(uid => allUsers.find(u => u.uid === uid));

    if (others.length === 0) return null;
    if (others.length === 1) return others[0]?.avatarUrl;
    return undefined;
};

const NewChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    allUsers: User[];
    onlineUsers: string[];
    onCreate: (selectedUserIds: string[], title?: string) => void;
}> = ({ isOpen, onClose, currentUser, allUsers, onlineUsers, onCreate }) => {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupTitle, setGroupTitle] = useState('');

    if (!isOpen) return null;

    const availableUsers = allUsers.filter(u => u.uid !== currentUser.uid && u.status === 'APPROVED');
    const filteredUsers = availableUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleUser = (uid: string) => {
        setSelectedUserIds(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleSubmit = () => {
        if (selectedUserIds.length === 0) return;
        onCreate(selectedUserIds, selectedUserIds.length > 1 ? groupTitle : undefined);
        onClose();
        setSelectedUserIds([]);
        setGroupTitle('');
        setSearchTerm('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[80vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4">New Message</h3>

                {selectedUserIds.length > 1 && (
                    <input
                        type="text"
                        placeholder="Group Name (Optional)"
                        value={groupTitle}
                        onChange={e => setGroupTitle(e.target.value)}
                        className="mb-4 w-full px-3 py-2 border border-ch-divider"
                    />
                )}

                <input
                    type="text"
                    placeholder="Search people..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="mb-4 w-full px-3 py-2 border border-ch-divider"
                />

                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {filteredUsers.map(user => {
                        const isOnline = onlineUsers.includes(user.uid);
                        return (
                            <div
                                key={user.uid}
                                onClick={() => toggleUser(user.uid)}
                                className={`flex items-center p-2 cursor-pointer border ${selectedUserIds.includes(user.uid) ? 'border-ch-accent bg-ch-accent-soft' : 'border-transparent hover:bg-ch-surface'}`}
                            >
                                <div className="relative mr-3">
                                    <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} className="w-8 h-8" alt={user.name} />
                                    {isOnline && (
                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 ring-2 ring-white bg-green-500"></span>
                                    )}
                                </div>
                                <span className="text-ch-text font-medium">{user.name}</span>
                                {selectedUserIds.includes(user.uid) && <span className="ml-auto text-ch-accent">✓</span>}
                            </div>
                        );
                    })}
                </div>

                <button
                    disabled={selectedUserIds.length === 0}
                    onClick={handleSubmit}
                    className="w-full py-2 px-4 bg-ch-accent text-ch-on-accent font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {selectedUserIds.length > 1 ? 'Create Group' : 'Chat'}
                </button>
            </div>
        </div>
    );
};

const RoomDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    room: Room;
    allUsers: User[];
    currentUser: User;
    onlineUsers: string[];
    onRemoveMember: (roomId: string, userId: string) => Promise<void>;
    onAddMembers: (roomId: string, userIds: string[]) => Promise<void>;
    onRenameGroup: (roomId: string, newTitle: string) => Promise<void>;
}> = ({ isOpen, onClose, room, allUsers, currentUser, onlineUsers, onRemoveMember, onAddMembers, onRenameGroup }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(room.title || '');
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsEditingTitle(false);
            setIsAddingMode(false);
            setTempTitle(room.title || '');
            setSelectedUsersToAdd([]);
            setUserSearchTerm('');
            setMemberToRemove(null);
        }
    }, [isOpen, room]);

    if (!isOpen) return null;

    const participants = (room.participantIds || []).map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean) as User[];
    const isCreator = room.createdBy === currentUser.uid;

    const availableUsers = allUsers.filter(u =>
        !(room.participantIds || []).includes(u.uid) &&
        u.status === 'APPROVED' &&
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const handleRemoveClick = (userId: string, userName: string) => {
        setMemberToRemove({ id: userId, name: userName });
    };

    const confirmRemove = async () => {
        if (memberToRemove) {
            await onRemoveMember(room.id, memberToRemove.id);
            setMemberToRemove(null);
        }
    };

    const cancelRemove = () => {
        setMemberToRemove(null);
    };

    const handleSaveTitle = async () => {
        if (tempTitle.trim() !== room.title) {
            await onRenameGroup(room.id, tempTitle);
        }
        setIsEditingTitle(false);
    };

    const toggleUserSelection = (uid: string) => {
        setSelectedUsersToAdd(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleSubmitAddMembers = async () => {
        if (selectedUsersToAdd.length > 0) {
            await onAddMembers(room.id, selectedUsersToAdd);
            setIsAddingMode(false);
            setSelectedUsersToAdd([]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-sm w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[85vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>

                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-2">Group Info</h3>

                <div className="mb-4">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                className="flex-1 px-2 py-1 border border-ch-divider bg-ch-bg text-sm"
                                autoFocus
                            />
                            <button onClick={handleSaveTitle} className="text-green-500 hover:text-green-600"><CheckIcon className="h-5 w-5" /></button>
                            <button onClick={() => { setIsEditingTitle(false); setTempTitle(room.title || ''); }} className="text-red-500 hover:text-red-600"><XIcon className="h-5 w-5" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between group">
                            <p className="text-sm text-ch-muted font-medium truncate flex-1">
                                {room.title || 'Untitled Group'}
                            </p>
                            {isCreator && (
                                <button
                                    onClick={() => setIsEditingTitle(true)}
                                    className="p-1 text-ch-muted hover:text-ch-text opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mb-3 border-t border-ch-divider pt-3">
                    <h4 className="text-sm font-semibold text-ch-text uppercase tracking-wider">
                        {isAddingMode ? 'Add Members' : `Members (${participants.length})`}
                    </h4>
                    {isCreator && !isAddingMode && (
                        <button
                            onClick={() => setIsAddingMode(true)}
                            className="flex items-center gap-1 text-xs font-medium text-ch-accent hover:text-ch-accent hover:bg-ch-accent-soft px-2 py-1 transition-colors"
                        >
                            <UserAddIcon className="h-4 w-4" /> Add
                        </button>
                    )}
                    {isAddingMode && (
                        <button
                            onClick={() => setIsAddingMode(false)}
                            className="text-xs text-ch-muted hover:text-ch-text"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {isAddingMode ? (
                        <>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border border-ch-divider bg-ch-surface dark:bg-900 text-sm focus:outline-none focus:ring-1 focus:ring-ch-accent"
                            />
                            {availableUsers.length === 0 ? (
                                <p className="text-center text-ch-muted text-sm py-4">No users found to add.</p>
                            ) : (
                                availableUsers.map(user => (
                                    <div
                                        key={user.uid}
                                        onClick={() => toggleUserSelection(user.uid)}
                                        className={`flex items-center p-2 cursor-pointer border ${selectedUsersToAdd.includes(user.uid) ? 'border-ch-accent bg-ch-accent-soft' : 'border-transparent hover:bg-ch-surface'}`}
                                    >
                                        <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} className="w-8 h-8 mr-3" alt={user.name} />
                                        <span className="text-sm font-medium text-ch-text">{user.name}</span>
                                        {selectedUsersToAdd.includes(user.uid) && <span className="ml-auto text-ch-accent"><CheckIcon /></span>}
                                    </div>
                                ))
                            )}
                        </>
                    ) : (
                        participants.map(user => {
                            const isOnline = onlineUsers.includes(user.uid);
                            return (
                                <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-ch-surface group">
                                    <div className="flex items-center">
                                        <div className="relative mr-3">
                                            <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} className="w-10 h-10 border border-ch-divider" alt={user.name} />
                                            {isOnline && (
                                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 ring-2 ring-white bg-green-500"></span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-ch-text">{user.name}</p>
                                            <p className="text-xs text-ch-muted">
                                                {user.uid === room.createdBy ? 'Group Creator' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                    {isCreator && user.uid !== currentUser.uid && (
                                        <button
                                            onClick={() => handleRemoveClick(user.uid, user.name)}
                                            className="ml-2 p-2 text-ch-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                                            title="Remove member from group"
                                            aria-label="Remove member"
                                        >
                                            <UserRemoveIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {isAddingMode && selectedUsersToAdd.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-ch-divider">
                        <button
                            onClick={handleSubmitAddMembers}
                            className="w-full py-2 bg-ch-accent text-ch-on-accent font-medium text-sm hover:bg-ch-accent-deep transition-colors"
                        >
                            Add Selected ({selectedUsersToAdd.length})
                        </button>
                    </div>
                )}

                {memberToRemove && (
                    <div className="absolute inset-0 bg-ch-bg z-50 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 mb-3">
                            <UserRemoveIcon className="w-8 h-8" />
                        </div>
                        <h4 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text mb-2">Remove Member?</h4>
                        <p className="text-sm text-ch-muted mb-6">
                            Are you sure you want to remove <span className="font-semibold">{memberToRemove.name}</span> from this group?
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={cancelRemove}
                                className="flex-1 py-2 px-4 bg-ch-surface text-ch-text font-medium hover:bg-ch-surface-2 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemove}
                                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Chat: React.FC<ChatProps> = ({ currentUser, setActiveTab, theme }) => {
    const { rooms, allUsers, isLoadingRooms, fetchRooms, unreadMessageCounts, clearUnreadCount, onlineUsers, showAlert } = useData();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    const [newMessage, setNewMessage] = useState('');
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [stickerSearchQuery, setStickerSearchQuery] = useState('');
    const [stickerResults, setStickerResults] = useState<string[]>([]);
    const [isSearchingStickers, setIsSearchingStickers] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<Message | null>(null);

    const [contextMenu, setContextMenu] = useState<{ id: string, x: number, y: number, canDelete: boolean } | null>(null);
    const [roomContextMenu, setRoomContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [roomSearch, setRoomSearch] = useState('');
    const [roomFilter, setRoomFilter] = useState<'all' | 'dm' | 'groups'>('all');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const stickerPickerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const longPressTimerRef = useRef<number | null>(null);

    const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId), [rooms, activeRoomId]);

    const lowerRoomSearch = roomSearch.trim().toLowerCase();
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const participants = room.participantIds || [];
            const otherParticipants = participants.filter(uid => uid !== currentUser.uid);
            const titles = [room.title, ...otherParticipants.map(uid => allUsers.find(u => u.uid === uid)?.name)].filter(Boolean) as string[];
            const matchesSearch = lowerRoomSearch === '' || titles.some(title => title.toLowerCase().includes(lowerRoomSearch));

            const isDM = !room.title && participants.length === 2;
            const isGroup = room.title || participants.length > 2;

            if (roomFilter === 'dm' && !isDM) return false;
            if (roomFilter === 'groups' && !isGroup) return false;

            return matchesSearch;
        });
    }, [rooms, roomFilter, lowerRoomSearch, currentUser.uid, allUsers]);

    const roomFilterOptions = [
        { label: 'All', value: 'all', helper: 'Show every conversation' },
        { label: 'DMs', value: 'dm', helper: 'Direct messages only' },
        { label: 'Groups', value: 'groups', helper: 'Group chats only' }
    ] as const;

    const connectionLabels: Record<typeof realtimeStatus, string> = {
        CONNECTING: 'Connecting…',
        SUBSCRIBED: 'Realtime synced',
        TIMED_OUT: 'Timed out',
        CLOSED: 'Connection closed',
        CHANNEL_ERROR: 'Channel error'
    };
    const connectionColors: Record<typeof realtimeStatus, string> = {
        CONNECTING: 'bg-amber-400',
        SUBSCRIBED: 'bg-emerald-500',
        TIMED_OUT: 'bg-yellow-500',
        CLOSED: 'bg-gray-500',
        CHANNEL_ERROR: 'bg-red-500'
    };

    const connectionLabel = connectionLabels[realtimeStatus] || 'Connecting…';
    const connectionColor = connectionColors[realtimeStatus] || 'bg-amber-400';

    const formatDateGroup = (value: string) => {
        return new Date(value).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getReplyPreview = useCallback((msg: Message) => {
        if (msg.metadata?.type === 'sticker') return '[Sticker]';
        if (msg.metadata?.type === 'file') {
            return msg.metadata?.fileName ? `[File] ${msg.metadata.fileName}` : '[File] Attachment';
        }
        return msg.content || '';
    }, []);

    const buildReplyMetadata = useCallback((msg: Message) => {
        const sender = allUsers.find(u => u.uid === msg.senderId);
        return {
            id: msg.id,
            senderId: msg.senderId,
            senderName: sender?.name || 'Unknown',
            content: getReplyPreview(msg).slice(0, 160),
            type: msg.metadata?.type,
            fileName: msg.metadata?.fileName,
        };
    }, [allUsers, getReplyPreview]);

    const scrollToMessage = useCallback((messageId: string) => {
        const node = messageRefs.current[messageId];
        if (!node) return;
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.classList.add('ring-2', 'ring-ch-accent');
        window.setTimeout(() => {
            node.classList.remove('ring-2', 'ring-ch-accent');
        }, 1500);
    }, []);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const beginLongPressReply = useCallback((msg: Message) => {
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
            setReplyTarget(msg);
            textareaRef.current?.focus();
            longPressTimerRef.current = null;
        }, 450);
    }, [clearLongPressTimer]);

    const messageSections = useMemo(() => {
        const sections: Array<{ type: 'date'; label: string } | { type: 'message'; data: Message }> = [];
        let lastDateLabel = '';
        messages.forEach(msg => {
            const label = formatDateGroup(msg.createdAt);
            if (label !== lastDateLabel) {
                sections.push({ type: 'date', label });
                lastDateLabel = label;
            }
            sections.push({ type: 'message', data: msg });
        });
        return sections;
    }, [messages]);

    const isUserOnline = (uid: string) => onlineUsers.includes(uid);

    const getHeaderStatus = () => {
        if (!activeRoom) return null;

        // Safety check for participantIds
        const participants = activeRoom.participantIds || [];

        // DM Check
        if (!activeRoom.title && participants.length === 2) {
            const otherId = participants.find(id => id !== currentUser.uid);
            if (otherId && onlineUsers.includes(otherId)) {
                return { text: 'Online', color: 'bg-green-500' };
            }
            return { text: 'Offline', color: 'bg-ch-surface-2' };
        }

        // Group Check
        const onlineCount = participants.filter(id => onlineUsers.includes(id)).length;
        return { text: `${onlineCount} online`, color: onlineCount > 0 ? 'bg-green-500' : 'bg-ch-surface-2' };
    };

    const headerStatus = getHeaderStatus();

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 50);
    };

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
        }
    }, [newMessage]);

    useEffect(() => {
        if (!showStickerPicker) return;
        const fetchStickers = async () => {
            setIsSearchingStickers(true);
            try {
                const endpoint = stickerSearchQuery.trim()
                    ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(stickerSearchQuery)}&key=LIVDSRZULELA&limit=20&media_filter=minimal`
                    : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=20&media_filter=minimal`;
                const response = await fetch(endpoint);
                const json = await response.json();
                if (json.results) {
                    const urls = json.results.map((item: any) => item.media[0].tinygif.url);
                    setStickerResults(urls);
                }
            } catch (err) {
                console.error("Sticker fetch failed", err);
            } finally {
                setIsSearchingStickers(false);
            }
        };

        const timeoutId = setTimeout(fetchStickers, 500);
        return () => clearTimeout(timeoutId);
    }, [stickerSearchQuery, showStickerPicker]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target as Node)) {
                setShowStickerPicker(false);
            }
            setContextMenu(null);
            setRoomContextMenu(null);
        };
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', (e) => {
            if (contextMenu || roomContextMenu) {
            }
        });
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', () => { });
        };
    }, [contextMenu, roomContextMenu]);

    useEffect(() => {
        if (activeRoomId && unreadMessageCounts[activeRoomId] > 0) {
            clearUnreadCount(activeRoomId);
        }
    }, [activeRoomId, unreadMessageCounts, clearUnreadCount]);

    const loadMessages = useCallback(async (roomId: string, showLoadingIndicator = false) => {
        if (showLoadingIndicator) setIsLoadingMessages(true);
        try {
            const msgs = await api.getRoomMessages(roomId);
            setMessages(prev => {
                if (prev.length === msgs.length) {
                    const isDifferent = prev.some((m, i) => m.id !== msgs[i].id);
                    if (!isDifferent) return prev;
                }
                return msgs;
            });
            if (showLoadingIndicator) {
                setTimeout(() => scrollToBottom('auto'), 100);
            }
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            if (showLoadingIndicator) setIsLoadingMessages(false);
        }
    }, []);

    const handleRefresh = async () => {
        if (!activeRoomId) return;
        setIsRefreshing(true);
        await loadMessages(activeRoomId, false);
        setIsRefreshing(false);
        scrollToBottom('smooth');
    };

    const handleDeleteMessage = async () => {
        if (!messageToDelete) return;
        try {
            await api.deleteMessage(messageToDelete);
            setMessages(prev => prev.filter(m => m.id !== messageToDelete));
        } catch (error) {
            console.error("Failed to delete message:", error);
            showAlert({
                title: 'Error',
                message: 'Failed to delete message.',
                type: 'error'
            });
        } finally {
            setMessageToDelete(null);
        }
    };

    const handleDeleteRoom = async () => {
        if (!roomToDelete) return;
        try {
            await api.deleteRoom(roomToDelete);
            if (activeRoomId === roomToDelete) {
                setActiveRoomId(null);
            }
            await fetchRooms();
        } catch (error: any) {
            console.error("Failed to delete room:", error);
            showAlert({
                title: 'Error',
                message: "Failed to delete room: " + error.message,
                type: 'error'
            });
        } finally {
            setRoomToDelete(null);
        }
    };

    const handleRemoveMember = async (roomId: string, userId: string) => {
        try {
            await api.removeGroupMember(roomId, userId);
            await fetchRooms();
        } catch (error: any) {
            console.error("Failed to remove member:", error);
            showAlert({
                title: 'Error',
                message: "Failed to remove member: " + error.message,
                type: 'error'
            });
        }
    };

    const handleAddMembers = async (roomId: string, userIds: string[]) => {
        try {
            await api.addRoomMembers(roomId, userIds);
            await fetchRooms();
        } catch (error: any) {
            console.error("Failed to add members:", error);
            showAlert({
                title: 'Error',
                message: "Failed to add members: " + error.message,
                type: 'error'
            });
        }
    };

    const handleRenameGroup = async (roomId: string, newTitle: string) => {
        try {
            await api.updateRoomTitle(roomId, newTitle);
            await fetchRooms();
        } catch (error: any) {
            console.error("Failed to rename group:", error);
            showAlert({
                title: 'Error',
                message: "Failed to rename group: " + error.message,
                type: 'error'
            });
        }
    };

    const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
        const isMe = msg.senderId === currentUser.uid;
        const isRecent = (Date.now() - new Date(msg.createdAt).getTime()) < 24 * 60 * 60 * 1000;
        const canDelete = isMe && isRecent;
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 176;
        const menuHeight = canDelete ? 96 : 52;
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > window.innerWidth) x -= menuWidth;
        if (y + menuHeight > window.innerHeight) y -= menuHeight;

        setContextMenu({ id: msg.id, x, y, canDelete });
    };

    const handleRoomContextMenu = (e: React.MouseEvent, roomId: string) => {
        if (currentUser.role === 'PATRON') {
            e.preventDefault();
            e.stopPropagation();

            const menuWidth = 160;
            const menuHeight = 50;
            let x = e.clientX;
            let y = e.clientY;

            if (x + menuWidth > window.innerWidth) x -= menuWidth;
            if (y + menuHeight > window.innerHeight) y -= menuHeight;

            setRoomContextMenu({ id: roomId, x, y });
        }
    };

    useEffect(() => {
        if (!activeRoomId) return;

        loadMessages(activeRoomId, true);
        clearUnreadCount(activeRoomId);
        setContextMenu(null);
        setReplyTarget(null);
        setRealtimeStatus('CONNECTING');

        const channel = supabase.channel(`room-listener:${activeRoomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const rawMsg = payload.new as any;
                        if (rawMsg && rawMsg.room_id === activeRoomId) {
                            const newMsg: Message = {
                                id: rawMsg.id,
                                roomId: rawMsg.room_id,
                                senderId: rawMsg.sender_id,
                                content: rawMsg.content,
                                createdAt: rawMsg.created_at,
                                metadata: rawMsg.metadata
                            };

                            setMessages(prev => {
                                const exists = prev.some(m => m.id === newMsg.id);
                                if (exists) {
                                    return prev.map(m => m.id === newMsg.id ? newMsg : m);
                                }
                                return [...prev, newMsg];
                            });
                            if (payload.eventType === 'INSERT') {
                                scrollToBottom('smooth');
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        if (deletedId) {
                            setMessages(prev => prev.filter(m => m.id !== deletedId));
                        }
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'read_receipt' },
                (payload) => {
                    const { messageIds, readBy } = payload.payload;
                    if (messageIds && readBy) {
                        setMessages(prev => prev.map(m => {
                            if (messageIds.includes(m.id)) {
                                const newReadBy = [...(m.metadata?.readBy || [])];
                                if (!newReadBy.includes(readBy)) newReadBy.push(readBy);
                                return { ...m, metadata: { ...m.metadata, readBy: newReadBy } };
                            }
                            return m;
                        }));
                    }
                }
            )
            .subscribe((status) => {
                setRealtimeStatus(status);
            });

        return () => {
            clearLongPressTimer();
            supabase.removeChannel(channel);
        };

    }, [activeRoomId, loadMessages, clearUnreadCount, clearLongPressTimer]);

    useEffect(() => {
        if (!activeRoomId) return;
        const intervalId = setInterval(() => {
            loadMessages(activeRoomId, false);
        }, 5000);
        return () => clearInterval(intervalId);
    }, [activeRoomId, loadMessages]);

    useEffect(() => {
        if (!activeRoomId || !messages.length) return;

        const unreadMessagesIds = messages
            .filter(msg => msg.senderId !== currentUser.uid && !msg.metadata?.readBy?.includes(currentUser.uid))
            .map(msg => msg.id);

        if (unreadMessagesIds.length > 0) {
            // Update local state immediately for the reader
            setMessages(prev => prev.map(m => {
                if (unreadMessagesIds.includes(m.id)) {
                    const newReadBy = [...(m.metadata?.readBy || [])];
                    if (!newReadBy.includes(currentUser.uid)) newReadBy.push(currentUser.uid);
                    return { ...m, metadata: { ...m.metadata, readBy: newReadBy } };
                }
                return m;
            }));

            // Sync with backend
            api.markMessagesAsRead(unreadMessagesIds, currentUser.uid).then(() => {
                // Broadcast to sender for instant UI update
                supabase.channel(`room-listener:${activeRoomId}`).send({
                    type: 'broadcast',
                    event: 'read_receipt',
                    payload: { messageIds: unreadMessagesIds, readBy: currentUser.uid }
                });
            }).catch(console.error);
        }
    }, [activeRoomId, messages, currentUser.uid]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        const activeReply = replyTarget;
        const replyMetadata = activeReply ? { replyTo: buildReplyMetadata(activeReply) } : undefined;
        setNewMessage('');
        setShowEmojiPicker(false);
        setReplyTarget(null);

        if (activeRoomId) {
            try {
                const sentMsg = await api.sendMessage(activeRoomId, currentUser.uid, content, replyMetadata);
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                scrollToBottom('smooth');
            } catch (error) {
                console.error("Failed to send message", error);
                showAlert({
                    title: 'Error',
                    message: "Failed to send message",
                    type: 'error'
                });
                setNewMessage(content);
                setReplyTarget(activeReply);
            }
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
        textareaRef.current?.focus();
    };

    const handleCreateRoom = async (participantIds: string[], title?: string) => {
        try {
            if (participantIds.length === 1) {
                const targetId = participantIds[0];
                const existingRoom = rooms.find(r =>
                    (r.participantIds || []).length === 2 &&
                    (r.participantIds || []).includes(targetId) &&
                    !r.title
                );
                if (existingRoom) {
                    setActiveRoomId(existingRoom.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                    return;
                }
            }

            const allIds = [currentUser.uid, ...participantIds];
            const newRoomId = await api.createRoom(title || null, allIds);
            await fetchRooms();
            setActiveRoomId(newRoomId);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        } catch (error) {
            console.error("Error creating room:", error);
            showAlert({
                title: 'Error',
                message: "Could not create chat.",
                type: 'error'
            });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeRoomId) return;

        event.target.value = '';

        if (file.size > 2 * 1024 * 1024) {
            showAlert({
                title: 'File Too Large',
                message: "File size must be less than 2MB.",
                type: 'warning'
            });
            return;
        }

        try {
            const url = await api.uploadChatFile(file, activeRoomId, currentUser.uid);

            const metadata = {
                type: 'file',
                fileName: file.name,
                fileSize: file.size,
                fileUrl: url,
                fileType: file.type,
                ...(replyTarget ? { replyTo: buildReplyMetadata(replyTarget) } : {})
            };

            const sentMsg = await api.sendMessage(
                activeRoomId,
                currentUser.uid,
                `Sent a file: ${file.name}`,
                metadata
            );
            setMessages(prev => {
                if (prev.some(m => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
            setReplyTarget(null);
            scrollToBottom('smooth');

        } catch (error: any) {
            console.error("Upload failed", error);
            showAlert({
                title: 'Upload Failed',
                message: "Failed to upload file: " + error.message,
                type: 'error'
            });
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const switchToRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleOpenPythonFile = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to load file content");
            const text = await response.text();

            localStorage.setItem('playground_pending_code', text);

            const event = new CustomEvent('open-in-playground', { detail: text });
            window.dispatchEvent(event);

            setActiveTab('playground');
        } catch (error) {
            console.error("Error opening file:", error);
            showAlert({
                title: 'Error',
                message: "Could not open file in playground.",
                type: 'error'
            });
        }
    };

    const renderTextWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (!urlRegex.test(text)) return <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{text}</p>;

        const parts = text.split(urlRegex);
        return (
            <div className="whitespace-pre-wrap break-words text-sm md:text-base w-full min-w-0 inline leading-relaxed">
                {parts.map((part, i) => {
                    if (part.match(urlRegex)) {
                        return <LinkPreview key={i} url={part} onImageClick={setViewingImage} />;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    };

    const renderMessageContent = (msg: Message, isMe: boolean) => {
        if (msg.metadata && msg.metadata.type === 'sticker' && msg.metadata.url) {
            return (
                <div className="p-1">
                    <img src={msg.metadata.url} alt="Sticker" className="w-24 h-24 sm:w-32 sm:h-32 object-contain" draggable="false" />
                </div>
            );
        }

        if (msg.metadata && msg.metadata.type === 'file') {
            const isImage = msg.metadata.fileType?.startsWith('image/');
            const isPython = msg.metadata.fileName?.endsWith('.py');

            return (
                <div className="flex flex-col w-full min-w-0">
                    {isImage && (
                        <div className="mb-2 mt-1 relative group overflow-hidden">
                            <img
                                src={msg.metadata.fileUrl}
                                alt={msg.metadata.fileName}
                                className="max-w-full sm:max-w-[280px] max-h-[280px] object-cover cursor-pointer transition-transform duration-200 bg-black/5"
                                onClick={() => setViewingImage(msg.metadata.fileUrl)}
                                loading="lazy"
                            />
                        </div>
                    )}

                    <div className="flex items-center space-x-2 mb-1">
                        {!isImage && (
                            isPython ? <CodeIcon className="h-5 w-5 opacity-75 flex-shrink-0" /> : <DocumentTextIcon className="h-5 w-5 opacity-75 flex-shrink-0" />
                        )}
                        <span className="font-semibold truncate max-w-[180px] text-xs opacity-90">{msg.metadata.fileName}</span>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] opacity-70">{(msg.metadata.fileSize / 1024).toFixed(1)} KB</p>
                        <div className="flex gap-2">
                            {isPython && (
                                <button
                                    onClick={() => handleOpenPythonFile(msg.metadata.fileUrl)}
                                    className={`text-[10px] px-2 py-1 font-medium inline-block text-center transition-colors ${isMe
                                        ? 'bg-white/20 hover:bg-white/30 text-white'
                                        : 'bg-ch-accent-soft hover:bg-ch-accent-soft text-ch-violet'
                                        }`}
                                >
                                    Open Code
                                </button>
                            )}
                            <a
                                href={msg.metadata.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-[10px] px-2 py-1 font-medium inline-block text-center transition-colors ${isMe
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-ch-surface-2 hover:bg-ch-surface-2 text-ch-text'
                                    }`}
                            >
                                {isImage ? 'Open' : 'Download'}
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        // Code block handling
        // Check for ```lang ... ``` pattern
        const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;

        if (codeBlockRegex.test(msg.content)) {
            const parts = [];
            let lastIndex = 0;
            let match;

            // Reset lastIndex for execution loop
            codeBlockRegex.lastIndex = 0;

            while ((match = codeBlockRegex.exec(msg.content)) !== null) {
                // Text before code block
                if (match.index > lastIndex) {
                    const textPart = msg.content.slice(lastIndex, match.index);
                    if (textPart.trim()) {
                        parts.push(renderTextWithLinks(textPart));
                    }
                }

                // Code block
                const language = match[1];
                const code = match[2];
                parts.push(<CodeBlock key={match.index} code={code} language={language} />);

                lastIndex = match.index + match[0].length;
            }

            // Remaining text
            if (lastIndex < msg.content.length) {
                const remainingText = msg.content.slice(lastIndex);
                if (remainingText.trim()) {
                    parts.push(renderTextWithLinks(remainingText));
                }
            }

            return <div className="w-full min-w-0 flex flex-col">{parts}</div>;
        }

        // Regular text message
        return renderTextWithLinks(msg.content);
    };

    const renderReplyPreview = (msg: Message, isMe: boolean) => {
        const reply = msg.metadata?.replyTo;
        if (!reply) return null;

        return (
            <button
                type="button"
                onClick={() => scrollToMessage(reply.id)}
                className={`mb-2 w-full text-left border px-3 py-2 transition-colors ${isMe
                    ? 'border-white/20 bg-white/15 hover:bg-white/20'
                    : 'border-ch-divider bg-ch-surface hover:bg-ch-surface'
                    }`}
            >
                <p className={`text-[11px] font-bold ${isMe ? 'text-pink-100' : 'text-ch-accent'}`}>
                    Replying to {reply.senderId === currentUser.uid ? 'yourself' : (reply.senderName || 'message')}
                </p>
                <p className={`mt-1 line-clamp-2 text-xs ${isMe ? 'text-white/85' : 'text-ch-muted'}`}>
                    {reply.content}
                </p>
            </button>
        );
    };

    return (
        <div className="flex h-full bg-ch-bg overflow-hidden border border-ch-divider">
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/3 border-r-2 border-ch-rule bg-ch-bg`}>
                <div className="p-4 border-b-2 border-ch-rule bg-ch-bg space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">Messages</h2>
                        <button onClick={() => setIsModalOpen(true)} className="text-ch-accent hover:text-ch-accent p-2 hover:bg-ch-accent-soft transition-colors">
                            <PlusCircleIcon />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ch-muted">
                        <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 ${connectionColor}`}></span>
                            <span className="font-medium">{connectionLabel}</span>
                        </div>
                        <span className="text-xs text-ch-muted">{rooms.length} rooms • {filteredRooms.length} visible</span>
                    </div>
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                value={roomSearch}
                                onChange={(e) => setRoomSearch(e.target.value)}
                                placeholder="Search chats..."
                                className="w-full px-3 py-2 border border-ch-divider bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ch-accent focus:border-transparent"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {roomFilterOptions.map(option => (
                                <Tooltip key={option.value} text={option.helper}>
                                    <button
                                        onClick={() => setRoomFilter(option.value)}
                                        className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${roomFilter === option.value
                                            ? 'bg-ch-accent text-ch-on-accent border-ch-accent'
                                            : 'bg-ch-bg text-ch-muted border-ch-divider hover:border-ch-accent hover:text-ch-accent'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoadingRooms ? (
                        <div className="p-4 text-center text-ch-muted">Loading chats...</div>
                    ) : rooms.length === 0 ? (
                        <div className="p-8 text-center text-ch-muted">
                            <ChatBubbleIcon />
                            <p className="mt-2">No conversations yet.</p>
                            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-ch-accent hover:underline">Start a chat</button>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="p-8 text-center text-ch-muted space-y-2">
                            <ChatBubbleIcon />
                            <p>No chats match the filter.</p>
                            <p className="text-xs text-ch-muted">Reset filters or search for another member.</p>
                        </div>
                    ) : (
                        filteredRooms.map(room => {
                            const isActive = room.id === activeRoomId;
                            const roomName = getRoomName(room, allUsers, currentUser.uid);
                            const avatar = getRoomAvatar(room, allUsers, currentUser.uid);
                            const unreadCount = unreadMessageCounts[room.id] || 0;
                            const participants = room.participantIds || [];

                            let isOnline = false;
                            if (!room.title && participants.length === 2) {
                                const otherId = participants.find(id => id !== currentUser.uid);
                                if (otherId) isOnline = isUserOnline(otherId);
                            }

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => switchToRoom(room.id)}
                                    onContextMenu={(e) => handleRoomContextMenu(e, room.id)}
                                    className={`p-4 flex items-center cursor-pointer transition-colors border-b border-ch-divider ${isActive ? 'bg-ch-accent-soft border-l-4 border-l-ch-accent' : 'hover:bg-ch-surface border-l-4 border-l-transparent'}`}
                                >
                                    <div className="relative flex-shrink-0 mr-3">
                                        {avatar ? (
                                            <img src={avatar} alt={roomName} className="w-12 h-12 object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 flex items-center justify-center text-ch-on-accent font-bold text-lg bg-ch-accent">
                                                {roomName.charAt(0)}
                                            </div>
                                        )}
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 block h-3 w-3 ring-2 ring-white bg-green-500"></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-ch-text truncate">{roomName}</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-ch-accent text-ch-on-accent text-[10px] font-bold px-1.5 py-0.5 ml-2">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-ch-muted truncate mt-1">
                                            Active • updated {new Date(room.updatedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`${!isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-ch-bg relative min-w-0`}>
                {activeRoom ? (
                    <>
                        <div className="p-4 border-b-2 border-ch-rule flex items-center justify-between bg-ch-bg z-10">
                            <div className="flex items-center">
                                <button
                                    className="md:hidden mr-3 text-ch-muted hover:text-ch-text"
                                    onClick={() => setIsSidebarOpen(true)}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex flex-col cursor-pointer" onClick={() => setIsRoomDetailsOpen(true)}>
                                    <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text leading-tight hover:text-ch-accent transition-colors flex items-center gap-2">
                                        {getRoomName(activeRoom, allUsers, currentUser.uid)}
                                    </h2>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        {headerStatus && (
                                            <>
                                                <div className={`w-2 h-2 ${headerStatus.color}`}></div>
                                                <span className="text-xs text-ch-muted">{headerStatus.text}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsRoomDetailsOpen(true)}
                                    className="p-2 hover:bg-ch-surface text-ch-muted transition-all"
                                    title="Room Details"
                                >
                                    <InformationCircleIcon />
                                </button>
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className={`p-2 hover:bg-ch-surface text-ch-muted transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                                    title="Refresh messages"
                                >
                                    <RefreshIcon />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ch-surface">
                            {isLoadingMessages ? (
                                <div className="text-center py-10 text-ch-muted">Loading messages...</div>
                            ) : !messages.length ? (
                                <div className="text-center py-10 text-ch-muted">
                                    <p className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">No messages yet.</p>
                                    <p className="text-sm text-ch-muted">Start the conversation to see activity here.</p>
                                </div>
                            ) : (
                                messageSections.map((section, index) => {
                                    if (section.type === 'date') {
                                        return (
                                            <div key={`date-${section.label}-${index}`} className="flex justify-center">
                                                <span className="px-3 py-1 text-[11px] tracking-[0.4em] text-ch-muted bg-ch-bg border border-ch-divider">
                                                    {section.label}
                                                </span>
                                            </div>
                                        );
                                    }
                                    const msg = section.data;
                                    const isMe = msg.senderId === currentUser.uid;
                                    const sender = allUsers.find(u => u.uid === msg.senderId);

                                    return (
                                        <div
                                            key={msg.id}
                                            ref={(node) => { messageRefs.current[msg.id] = node; }}
                                            className={`flex group ${isMe ? 'justify-end' : 'justify-start'} relative transition-shadow`}
                                        >
                                            {!isMe && (
                                                <div className="relative mr-2 self-end mb-1">
                                                    <img
                                                        src={sender?.avatarUrl || `https://i.pravatar.cc/24?u=${msg.senderId}`}
                                                        alt={sender?.name}
                                                        className="w-8 h-8 border border-ch-divider"
                                                        title={sender?.name}
                                                    />
                                                    {sender && isUserOnline(sender.uid) && (
                                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 ring-1 ring-white bg-green-500"></span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex flex-col max-w-[85%] sm:max-w-[75%] min-w-0">
                                                <div className={`mb-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isMe ? 'flex justify-end pr-2' : 'flex justify-start pl-2'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReplyTarget(msg);
                                                            textareaRef.current?.focus();
                                                        }}
                                                        className="bg-ch-bg px-2.5 py-1 text-[11px] font-semibold text-ch-accent border border-ch-divider hover:bg-ch-accent-soft transition-colors"
                                                    >
                                                        Reply
                                                    </button>
                                                </div>
                                                <div
                                                    onTouchStart={() => beginLongPressReply(msg)}
                                                    onTouchEnd={clearLongPressTimer}
                                                    onTouchCancel={clearLongPressTimer}
                                                    onContextMenu={(e) => handleContextMenu(e, msg)}
                                                    className={`relative px-4 py-2 transition duration-200 ${isMe
                                                        ? 'text-ch-on-accent cursor-context-menu bg-ch-accent'
                                                        : 'bg-ch-bg text-ch-text border border-ch-divider'
                                                        }`}>
                                                    {!isMe && <p className="text-xs text-ch-accent font-bold mb-1">{sender?.name || 'Unknown'}</p>}
                                                    {renderReplyPreview(msg, isMe)}
                                                    {renderMessageContent(msg, isMe)}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end text-ch-muted' : 'justify-start text-ch-muted'}`}>
                                                    <p className="text-[10px]">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {isMe && (
                                                        <div className="flex">
                                                            {msg.metadata?.readBy?.length > 0 && msg.metadata.readBy.some((id: string) => id !== currentUser.uid) ? (
                                                                <div className="flex text-blue-500 dark:text-blue-400" title="Read">
                                                                    <CheckIcon className="w-3 h-3 -mr-1.5" />
                                                                    <CheckIcon className="w-3 h-3" />
                                                                </div>
                                                            ) : (
                                                                <div className="text-ch-muted" title="Sent">
                                                                    <CheckIcon className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-ch-surface border-t border-ch-divider relative z-20">
                            {showEmojiPicker && (
                                <div className="absolute bottom-20 left-4 z-20 overflow-hidden" ref={emojiPickerRef}>
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                                        searchDisabled
                                        width={300}
                                        height={350}
                                        previewConfig={{ showPreview: false }}
                                    />
                                </div>
                            )}
                            {showStickerPicker && (
                                <div className="absolute bottom-20 left-16 z-20 bg-ch-bg border border-ch-divider w-80 h-80 flex flex-col overflow-hidden animate-fade-in-up" ref={stickerPickerRef}>
                                    <div className="p-3 border-b border-ch-divider bg-ch-surface">
                                        <input
                                            type="text"
                                            placeholder="Search stickers..."
                                            value={stickerSearchQuery}
                                            onChange={(e) => setStickerSearchQuery(e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-ch-divider bg-ch-bg text-ch-text focus:ring-2 focus:ring-ch-accent focus:outline-none placeholder-ch-muted"
                                        />
                                    </div>
                                    <div className="flex-1 p-3 grid grid-cols-3 gap-2 overflow-y-auto bg-ch-bg">
                                        {isSearchingStickers && stickerResults.length === 0 ? (
                                            <div className="col-span-3 flex flex-col justify-center items-center h-full text-ch-muted space-y-2">
                                                <div className="w-5 h-5 border-2 border-ch-accent border-t-transparent animate-spin"></div>
                                                <p className="text-xs">Searching...</p>
                                            </div>
                                        ) : stickerResults.map((stickerUrl, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!activeRoom || !currentUser) return;
                                                setShowStickerPicker(false);
                                                api.sendMessage(activeRoom.id, currentUser.uid, '[Sticker]', {
                                                    type: 'sticker',
                                                    url: stickerUrl,
                                                    ...(replyTarget ? { replyTo: buildReplyMetadata(replyTarget) } : {})
                                                });
                                                setReplyTarget(null);
                                            }}
                                                className="hover:border-2 border-ch-rule transition-colors outline-none focus:ring-2 focus:ring-ch-accent flex items-center justify-center cursor-pointer"
                                            >
                                                <img src={stickerUrl} alt={`Sticker ${index}`} className="h-16 w-full object-contain" />
                                            </button>
                                        ))}
                                        {!isSearchingStickers && stickerResults.length === 0 && (
                                            <div className="col-span-3 flex justify-center items-center h-full text-ch-muted text-xs text-center px-4">
                                                No stickers found. Try another search!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="max-w-4xl mx-auto">
                                {replyTarget && (
                                    <div className="mb-3 flex items-start justify-between gap-3 border border-ch-divider bg-ch-accent-soft px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ch-accent">
                                                Replying To {replyTarget.senderId === currentUser.uid ? 'Yourself' : (allUsers.find(u => u.uid === replyTarget.senderId)?.name || 'Message')}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-sm text-ch-text">
                                                {getReplyPreview(replyTarget)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyTarget(null)}
                                            className="flex-shrink-0 p-1 text-ch-muted hover:bg-white/70 hover:text-ch-text transition-colors"
                                            aria-label="Cancel reply"
                                        >
                                            <XIcon />
                                        </button>
                                    </div>
                                )}
                            <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEmojiPicker(!showEmojiPicker);
                                    }}
                                    className="p-3 text-ch-muted hover:text-ch-accent transition-colors hover:bg-ch-surface border border-transparent hover:border-gray-200"
                                    aria-label="Insert Emoji"
                                >
                                    <FaceSmileIcon />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowStickerPicker(!showStickerPicker);
                                    }}
                                    className="p-3 text-ch-muted hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors hover:bg-ch-surface border border-transparent hover:border-gray-200"
                                    aria-label="Insert Sticker"
                                >
                                    <SparklesIcon />
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.py"
                                />
                                <button
                                    type="button"
                                    onClick={triggerFileUpload}
                                    className="p-3 text-ch-muted hover:text-ch-accent transition-colors hover:bg-ch-surface border border-transparent hover:border-gray-200"
                                    aria-label="Attach File"
                                    title="Attach File (< 2MB)"
                                >
                                    <PaperClipIcon />
                                </button>

                                <div className="flex-1 relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        rows={1}
                                        placeholder="Type a message..."
                                        className="w-full max-h-32 min-h-[3rem] py-3 pl-4 pr-12 border border-ch-divider bg-ch-bg text-ch-text focus:outline-none focus:ring-2 focus:ring-ch-accent focus:border-transparent resize-none transition-all overflow-hidden"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    />
                                    <div className="absolute right-2 bottom-1.5">
                                        <Tooltip text="Send your message to the room.">
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                className="p-2 bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep disabled:opacity-50 disabled:cursor-not-allowed transition-all transform flex items-center justify-center"
                                            >
                                                <SendIcon className="h-4 w-4 transform rotate-90" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </form>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-ch-muted">
                                    Press <span className="font-mono bg-ch-surface-2 px-1">Enter</span> to send, <span className="font-mono bg-ch-surface-2 px-1">Shift + Enter</span> for new line
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-ch-muted bg-ch-surface">
                        <div className="w-24 h-24 bg-ch-surface-2 flex items-center justify-center mb-4">
                            <ChatBubbleIcon />
                        </div>
                        <h3 className="text-xl font-semibold text-ch-muted">Select a conversation</h3>
                        <p className="mt-2 text-center">Choose a chat from the sidebar or start a new one to collaborate.</p>
                    </div>
                )}
            </div>

            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentUser={currentUser}
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                onCreate={handleCreateRoom}
            />

            {activeRoom && (
                <RoomDetailsModal
                    isOpen={isRoomDetailsOpen}
                    onClose={() => setIsRoomDetailsOpen(false)}
                    room={activeRoom}
                    allUsers={allUsers}
                    currentUser={currentUser}
                    onlineUsers={onlineUsers}
                    onRemoveMember={handleRemoveMember}
                    onAddMembers={handleAddMembers}
                    onRenameGroup={handleRenameGroup}
                />
            )}

            {contextMenu && (
                <div
                    className="fixed z-50 bg-ch-bg py-1 border border-ch-divider min-w-[160px] animate-fade-in-up"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            const target = messages.find(m => m.id === contextMenu.id) || null;
                            setReplyTarget(target);
                            setContextMenu(null);
                            textareaRef.current?.focus();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-ch-text hover:bg-ch-surface flex items-center gap-2 transition-colors"
                    >
                        <SendIcon className="rotate-180" />
                        <span className="font-medium">Reply</span>
                    </button>
                    {contextMenu.canDelete && (
                        <button
                            onClick={() => {
                                setMessageToDelete(contextMenu.id);
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                        >
                            <TrashIcon />
                            <span className="font-medium">Delete Message</span>
                        </button>
                    )}
                </div>
            )}

            {roomContextMenu && (
                <div
                    className="fixed z-50 bg-ch-bg py-1 border border-ch-divider min-w-[160px] animate-fade-in-up"
                    style={{ top: roomContextMenu.y, left: roomContextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setRoomToDelete(roomContextMenu.id);
                            setRoomContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                    >
                        <TrashIcon />
                        <span className="font-medium">Delete Group</span>
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={handleDeleteMessage}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
                confirmText="Delete"
                isDangerous
            />

            <ConfirmationModal
                isOpen={!!roomToDelete}
                onClose={() => setRoomToDelete(null)}
                onConfirm={handleDeleteRoom}
                title="Delete Group Chat"
                message="Are you sure you want to delete this group chat? All messages and data will be permanently removed."
                confirmText="Delete Group"
                isDangerous
            />

            {viewingImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setViewingImage(null)}
                >
                    <button
                        onClick={() => setViewingImage(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <XIcon />
                    </button>
                    <img
                        src={viewingImage}
                        alt="Full size view"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default Chat;
