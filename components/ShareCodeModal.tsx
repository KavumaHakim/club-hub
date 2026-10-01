
import React, { useState, useMemo } from 'react';
import { User, Room } from '../types';
import { useData } from '../DataContext';
import { XIcon } from './icons/XIcon';
import { SendIcon } from './icons/SendIcon';
import { CheckIcon } from './icons/CheckIcon';
import * as api from '../services/apiService';

interface ShareCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentUser: User;
}

const ShareCodeModal: React.FC<ShareCodeModalProps> = ({ isOpen, onClose, code, currentUser }) => {
    const { rooms, allUsers, fetchRooms, showToast } = useData();
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]); // Stores Room IDs or User IDs
    const [searchTerm, setSearchTerm] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    // Helper to get room name
    const getRoomName = (room: Room) => {
        if (room.title) return room.title;
        const others = room.participantIds
            .filter(uid => uid !== currentUser.uid)
            .map(uid => allUsers.find(u => u.uid === uid)?.name || 'Unknown');
        return others.join(', ') || 'Personal Notes';
    };

    // Prepare list of targets
    // 1. Existing Rooms
    const chatTargets = rooms.map(room => ({
        id: room.id,
        type: 'ROOM' as const,
        name: getRoomName(room),
    }));

    // 2. Users (for new DMs)
    const userTargets = allUsers
        .filter(u => u.uid !== currentUser.uid && u.status === 'APPROVED')
        .map(user => ({
            id: user.uid,
            type: 'USER' as const,
            name: user.name,
            avatarUrl: user.avatarUrl
        }));

    // Filter logic
    const filteredChats = chatTargets.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredUsers = userTargets.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleSelection = (id: string) => {
        setSelectedTargetIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        setIsSending(true);
        try {
            const messageContent = `${comment ? comment + '\n\n' : ''}\`\`\`python\n${code}\n\`\`\``;
            
            // Resolve targets to Room IDs (creating new rooms if necessary)
            const finalRoomIds = new Set<string>();

            for (const targetId of selectedTargetIds) {
                const isRoom = rooms.some(r => r.id === targetId);
                
                if (isRoom) {
                    finalRoomIds.add(targetId);
                } else {
                    // It's a user ID. Check if DM exists.
                    const existingDMRoom = rooms.find(r => 
                        !r.title && 
                        r.participantIds.length === 2 && 
                        r.participantIds.includes(targetId) &&
                        r.participantIds.includes(currentUser.uid)
                    );

                    if (existingDMRoom) {
                        finalRoomIds.add(existingDMRoom.id);
                    } else {
                        // Create new DM room
                        const newRoomId = await api.createRoom(null, [currentUser.uid, targetId]);
                        finalRoomIds.add(newRoomId);
                    }
                }
            }

            // Send to unique rooms
            const promises = Array.from(finalRoomIds).map(roomId => 
                api.sendMessage(roomId, currentUser.uid, messageContent)
            );

            await Promise.all(promises);
            
            // Refresh rooms just in case new ones were created
            await fetchRooms();

            showToast(`Code shared with ${selectedTargetIds.length} recipient(s)!`, "success");
            onClose();
            setSelectedTargetIds([]);
            setComment('');
        } catch (error) {
            console.error("Failed to share code:", error);
            showToast("Failed to share code.", "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[85vh] animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text">
                    <XIcon />
                </button>
                
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4">Share Code</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-ch-text mb-1">Add a comment (optional)</label>
                    <input 
                        type="text" 
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent outline-none"
                        placeholder="Check this out..."
                    />
                </div>

                <input 
                    type="text" 
                    placeholder="Search people or groups..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 mb-4 border border-ch-divider focus:ring-ch-accent outline-none"
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                    {filteredChats.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-ch-muted uppercase tracking-wider mb-2">Recent Chats</h4>
                            {filteredChats.map(chat => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => toggleSelection(chat.id)}
                                    className={`flex items-center p-2 cursor-pointer border transition-colors ${selectedTargetIds.includes(chat.id) ? 'border-ch-accent bg-ch-accent-soft' : 'border-transparent hover:bg-ch-surface'}`}
                                >
                                    <div className="w-8 h-8 bg-ch-surface-2 flex items-center justify-center text-xs font-bold text-ch-muted mr-3 flex-shrink-0">
                                        {chat.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-ch-text flex-1 truncate">{chat.name}</span>
                                    {selectedTargetIds.includes(chat.id) && <CheckIcon className="text-ch-accent w-5 h-5" />}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredUsers.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-ch-muted uppercase tracking-wider mb-2">Members</h4>
                            {filteredUsers.map(user => (
                                <div 
                                    key={user.id} 
                                    onClick={() => toggleSelection(user.id)}
                                    className={`flex items-center p-2 cursor-pointer border transition-colors ${selectedTargetIds.includes(user.id) ? 'border-ch-accent bg-ch-accent-soft' : 'border-transparent hover:bg-ch-surface'}`}
                                >
                                    <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.id}`} className="w-8 h-8 mr-3 flex-shrink-0" alt={user.name} />
                                    <span className="text-sm font-medium text-ch-text flex-1 truncate">{user.name}</span>
                                    {selectedTargetIds.includes(user.id) && <CheckIcon className="text-ch-accent w-5 h-5" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-ch-divider">
                    <button 
                        onClick={handleSend}
                        disabled={selectedTargetIds.length === 0 || isSending}
                        className="w-full py-2 text-ch-on-accent font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform bg-ch-accent hover:bg-ch-accent-deep"
                    >
                        {isSending ? 'Sending...' : (
                            <>
                                <SendIcon className="w-4 h-4 transform rotate-90" />
                                Share Code ({selectedTargetIds.length})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareCodeModal;
