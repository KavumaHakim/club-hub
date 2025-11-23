
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Message, Room } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { supabase } from '../services/supabaseClient';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { XIcon } from './icons/XIcon';
import { SendIcon } from './icons/SendIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { FaceSmileIcon } from './icons/FaceSmileIcon';
import { TrashIcon } from './icons/TrashIcon';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface ChatProps {
    currentUser: User;
}

// Helper to get a room name. If title exists, use it. Else, list other participants.
const getRoomName = (room: Room, allUsers: User[], currentUserId: string) => {
    if (room.title) return room.title;
    
    // Filter out current user
    const others = room.participantIds
        .filter(uid => uid !== currentUserId)
        .map(uid => allUsers.find(u => u.uid === uid)?.name || 'Unknown');
        
    if (others.length === 0) return "Personal Notes";
    return others.join(', ');
};

// Helper to get room avatar (first other person or group icon)
const getRoomAvatar = (room: Room, allUsers: User[], currentUserId: string) => {
     const others = room.participantIds
        .filter(uid => uid !== currentUserId)
        .map(uid => allUsers.find(u => u.uid === uid));
    
    if (others.length === 0) return null;
    if (others.length === 1) return others[0]?.avatarUrl;
    // Return undefined to signal generic group icon
    return undefined; 
};

const NewChatModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    currentUser: User;
    allUsers: User[];
    onCreate: (selectedUserIds: string[], title?: string) => void;
}> = ({ isOpen, onClose, currentUser, allUsers, onCreate }) => {
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
        // For 1-on-1, we ignore the title. For groups, title is optional.
        onCreate(selectedUserIds, selectedUserIds.length > 1 ? groupTitle : undefined);
        onClose();
        setSelectedUserIds([]);
        setGroupTitle('');
        setSearchTerm('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Message</h3>
                 
                 {selectedUserIds.length > 1 && (
                    <input 
                        type="text" 
                        placeholder="Group Name (Optional)" 
                        value={groupTitle}
                        onChange={e => setGroupTitle(e.target.value)}
                        className="mb-4 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                 )}

                 <input 
                    type="text" 
                    placeholder="Search people..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="mb-4 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                 />

                 <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {filteredUsers.map(user => (
                        <div 
                            key={user.uid} 
                            onClick={() => toggleUser(user.uid)}
                            className={`flex items-center p-2 rounded-lg cursor-pointer border ${selectedUserIds.includes(user.uid) ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} className="w-8 h-8 rounded-full mr-3" alt={user.name} />
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{user.name}</span>
                            {selectedUserIds.includes(user.uid) && <span className="ml-auto text-pink-500">✓</span>}
                        </div>
                    ))}
                 </div>

                 <button 
                    disabled={selectedUserIds.length === 0}
                    onClick={handleSubmit}
                    className="w-full py-2 px-4 bg-pink-600 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {selectedUserIds.length > 1 ? 'Create Group' : 'Chat'}
                 </button>
            </div>
        </div>
    );
};

const Chat: React.FC<ChatProps> = ({ currentUser }) => {
    const { rooms, allUsers, isLoadingRooms, fetchRooms, unreadMessageCounts, clearUnreadCount } = useData();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId), [rooms, activeRoomId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);
    
    // Close emoji picker on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    // Clear unread count when room becomes active or if messages come while active
    useEffect(() => {
        if (activeRoomId && unreadMessageCounts[activeRoomId] > 0) {
            clearUnreadCount(activeRoomId);
        }
    }, [activeRoomId, unreadMessageCounts, clearUnreadCount]);

    // Function to fetch messages (used for initial load and polling)
    const loadMessages = useCallback(async (roomId: string, showLoadingIndicator = false) => {
        if (showLoadingIndicator) setIsLoadingMessages(true);
        try {
            const msgs = await api.getRoomMessages(roomId);
            setMessages(prev => {
                // Check if arrays are identical (same length and same IDs)
                if (prev.length === msgs.length) {
                     const isDifferent = prev.some((m, i) => m.id !== msgs[i].id);
                     if (!isDifferent) return prev;
                }
                return msgs;
            });
            if (showLoadingIndicator) scrollToBottom();
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            if (showLoadingIndicator) setIsLoadingMessages(false);
        }
    }, []);

    // Manual Refresh Handler
    const handleRefresh = async () => {
        if (!activeRoomId) return;
        setIsRefreshing(true);
        await loadMessages(activeRoomId, false);
        setIsRefreshing(false);
        scrollToBottom();
    };
    
    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await api.deleteMessage(messageId);
            // Optimistically remove from UI
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            console.error("Failed to delete message:", error);
            alert("Failed to delete message.");
        }
    };

    // Effect for room change: Fetch initial messages & Set up Realtime
    useEffect(() => {
        if (!activeRoomId) return;

        // 1. Initial Load
        loadMessages(activeRoomId, true);
        
        // Clear unread count immediately upon opening
        clearUnreadCount(activeRoomId);

        // 2. Real-time subscription
        setRealtimeStatus('CONNECTING');
        
        // We subscribe to ALL message inserts/deletes on the table and filter client-side.
        const channel = supabase.channel(`room-listener:${activeRoomId}`)
            .on(
                'postgres_changes',
                { 
                    event: '*', // Listen to INSERT, DELETE, etc.
                    schema: 'public', 
                    table: 'messages',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
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
                                if (prev.some(m => m.id === newMsg.id)) return prev;
                                return [...prev, newMsg];
                            });
                            scrollToBottom();
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        if (deletedId) {
                             setMessages(prev => prev.filter(m => m.id !== deletedId));
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status for room ${activeRoomId}:`, status);
                setRealtimeStatus(status);
            });

        return () => {
            supabase.removeChannel(channel);
        };

    }, [activeRoomId, loadMessages, clearUnreadCount]);

    // 3. Polling Fallback (Crucial for when Realtime fails due to RLS or Network)
    useEffect(() => {
        if (!activeRoomId) return;

        const intervalId = setInterval(() => {
            // Poll silently without showing loading indicator
            loadMessages(activeRoomId, false);
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(intervalId);
    }, [activeRoomId, loadMessages]);


    useEffect(() => {
        scrollToBottom();
    }, [messages.length, activeRoomId]); // Scroll when message count changes or room changes

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage(''); // Optimistic clear
        setShowEmojiPicker(false);

        if (activeRoomId) {
            try {
                const sentMsg = await api.sendMessage(activeRoomId, currentUser.uid, content);
                
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                scrollToBottom();
                
            } catch (error) {
                console.error("Failed to send message", error);
                alert("Failed to send message");
                setNewMessage(content); // Restore on fail
            }
        }
    };
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleCreateRoom = async (participantIds: string[], title?: string) => {
        try {
            if (participantIds.length === 1) {
                const targetId = participantIds[0];
                const existingRoom = rooms.find(r => 
                    r.participantIds.length === 2 && 
                    r.participantIds.includes(targetId) && 
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
            alert("Could not create chat.");
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

    const getConnectionStatusColor = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return 'bg-green-500';
            case 'CONNECTING': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };

    const getConnectionStatusText = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return 'Live';
            case 'CONNECTING': return 'Connecting...';
            default: return 'Offline';
        }
    };

    return (
        <div className="flex h-full bg-white dark:bg-gray-900 shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Sidebar / Room List */}
            <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Messages</h2>
                    <button onClick={() => setIsModalOpen(true)} className="text-pink-600 hover:text-pink-700 dark:text-pink-400">
                        <PlusCircleIcon />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoadingRooms ? (
                        <div className="p-4 text-center text-gray-500">Loading chats...</div>
                    ) : rooms.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <ChatBubbleIcon />
                            <p className="mt-2">No conversations yet.</p>
                            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-pink-600 hover:underline">Start a chat</button>
                        </div>
                    ) : (
                        rooms.map(room => {
                            const isActive = room.id === activeRoomId;
                            const roomName = getRoomName(room, allUsers, currentUser.uid);
                            const avatar = getRoomAvatar(room, allUsers, currentUser.uid);
                            const unreadCount = unreadMessageCounts[room.id] || 0;
                            
                            return (
                                <div 
                                    key={room.id} 
                                    onClick={() => switchToRoom(room.id)}
                                    className={`p-4 flex items-center cursor-pointer transition-colors ${isActive ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className="relative flex-shrink-0 mr-3">
                                        {avatar ? (
                                            <img src={avatar} alt={roomName} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {roomName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{roomName}</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                            Open to chat
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2 self-start mt-0.5">
                                        {new Date(room.updatedAt).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`${!isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-white dark:bg-gray-900 relative`}>
                {activeRoom ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 shadow-sm z-10">
                            <div className="flex items-center">
                                <button 
                                    className="md:hidden mr-3 text-gray-500"
                                    onClick={() => setIsSidebarOpen(true)}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex flex-col">
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight">
                                        {getRoomName(activeRoom, allUsers, currentUser.uid)}
                                    </h2>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{getConnectionStatusText()}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                                title="Refresh messages"
                            >
                                <RefreshIcon />
                            </button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                            {isLoadingMessages ? (
                                <div className="text-center py-10 text-gray-500">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.senderId === currentUser.uid;
                                    const sender = allUsers.find(u => u.uid === msg.senderId);
                                    
                                    // Check if message is less than 24 hours old
                                    const isRecent = (Date.now() - new Date(msg.createdAt).getTime()) < 24 * 60 * 60 * 1000;
                                    const canDelete = isMe && isRecent;

                                    return (
                                        <div key={msg.id} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <img 
                                                    src={sender?.avatarUrl || `https://i.pravatar.cc/24?u=${msg.senderId}`} 
                                                    alt={sender?.name} 
                                                    className="w-8 h-8 rounded-full mr-2 self-end mb-1"
                                                    title={sender?.name}
                                                />
                                            )}
                                            <div className="flex flex-col max-w-[70%]">
                                                <div className={`relative px-4 py-2 shadow-sm rounded-2xl ${
                                                    isMe 
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none' 
                                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-600'
                                                }`}>
                                                    {!isMe && <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mb-1">{sender?.name || 'Unknown'}</p>}
                                                    <p className="whitespace-pre-wrap break-words text-sm md:text-base">{msg.content}</p>
                                                    {canDelete && (
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className={`absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-pink-200 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-red-500'}`}
                                                            title="Delete message"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-right text-gray-400' : 'text-left text-gray-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 relative">
                             {showEmojiPicker && (
                                <div className="absolute bottom-20 left-4 z-20" ref={emojiPickerRef}>
                                    <EmojiPicker 
                                        onEmojiClick={onEmojiClick} 
                                        theme={Theme.AUTO}
                                        searchDisabled
                                        width={300}
                                        height={400}
                                    />
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-3 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                                    aria-label="Insert Emoji"
                                >
                                    <FaceSmileIcon />
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 max-h-32 min-h-[2.5rem] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                                >
                                    <SendIcon className="h-5 w-5 transform rotate-90" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <ChatBubbleIcon />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Select a conversation</h3>
                        <p className="mt-2">Choose a chat from the sidebar or start a new one.</p>
                    </div>
                )}
            </div>

            <NewChatModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                currentUser={currentUser}
                allUsers={allUsers}
                onCreate={handleCreateRoom}
            />
        </div>
    );
};

export default Chat;
