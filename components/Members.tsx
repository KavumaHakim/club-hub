
import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpCircleIcon } from './icons/ArrowUpCircleIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useData } from '../DataContext';
import ConfirmationModal from './ConfirmationModal';
import MemberPortfolioModal from './MemberPortfolioModal';
import Tooltip from './Tooltip';

interface MembersProps {
    currentUser: User;
}

const Members: React.FC<MembersProps> = ({ currentUser }) => {
    const { allUsers, isLoadingUsers, allUsersError, fetchUsers, onlineUsers, showToast } = useData();
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [portfolioUser, setPortfolioUser] = useState<User | null>(null);

    const handleAction = async (action: () => Promise<any>, successMsg: string) => {
        try {
            await action();
            await fetchUsers(); // Refetch from context after any action
            showToast(successMsg, "success");
        } catch (error: any) {
            console.error("Failed to perform user action:", error);
            showToast(error.message || "An error occurred. Please try again.", "error");
        }
    };

    const onConfirmDelete = async () => {
        if (!userToDelete) return;
        
        try {
            // Explicitly call the API delete service
            await api.deleteUser(userToDelete.uid);
            // Refresh the data context
            await fetchUsers();
            showToast(`User ${userToDelete.name} has been removed.`, "success");
        } catch (error: any) {
            console.error("Deletion failed:", error);
            // Provide a very specific toast message for constraint violations
            showToast(error.message || "Permissions denied or database error", "error");
        } finally {
            setUserToDelete(null);
        }
    };

    const onUpdateUserRole = (uid: string, role: 'MEMBER' | 'PATRON') => 
        handleAction(() => api.updateUser(uid, { role }), `Role updated to ${role}.`);
    
    const onApproveUser = (uid: string) => 
        handleAction(() => api.approveMember(uid), "Member approved successfully.");
    
    if (isLoadingUsers) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading members...</div>;
    }

    if (allUsersError) {
        return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Error fetching members: ${allUsersError}`}</div>;
    }

    const activeMembers = allUsers.filter(u => u.status === 'APPROVED');
    const pendingMembers = allUsers.filter(u => u.status === 'PENDING');
    
    let usersToDisplay = activeTab === 'active' ? activeMembers : pendingMembers;

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        usersToDisplay = usersToDisplay.filter(u => 
            u.name.toLowerCase().includes(lowerTerm) || 
            u.username.toLowerCase().includes(lowerTerm)
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 pb-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Manage Club Members</h2>
                    
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-1">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-3 px-6 text-sm font-medium transition-colors relative focus:outline-none ${
                            activeTab === 'active' 
                            ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Active Members
                        <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs font-semibold">
                            {activeMembers.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-6 text-sm font-medium transition-colors relative focus:outline-none ${
                            activeTab === 'pending' 
                            ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Pending Approval
                        {pendingMembers.length > 0 && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 py-0.5 px-2 rounded-full text-xs font-semibold animate-pulse">
                                {pendingMembers.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="p-6 overflow-x-auto">
                {usersToDisplay.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p>
                            {searchTerm 
                                ? `No members found matching "${searchTerm}"` 
                                : activeTab === 'active' 
                                    ? "No active members found." 
                                    : "No pending requests."
                            }
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Phone Number</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                                {activeTab === 'active' && (
                                    <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Last Seen</th>
                                )}
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersToDisplay.map((user) => (
                                <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center">
                                            <div className="relative mr-3">
                                                <img 
                                                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
                                                    alt={user.name} 
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" 
                                                />
                                                {onlineUsers.includes(user.uid) && (
                                                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-green-500 shadow-sm"></span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                                        {user.phoneNumber || 'N/A'}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${user.role === 'PATRON' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    {activeTab === 'active' && (
                                        <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString(undefined, { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : 'Never'}
                                        </td>
                                    )}
                                    <td className="py-4 px-4 text-right">
                                        <div className="inline-flex items-center space-x-2">
                                            {activeTab === 'active' && (
                                                <Tooltip text="Open this member’s portfolio and achievements.">
                                                    <button
                                                        onClick={() => setPortfolioUser(user)}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                                                    >
                                                        View Portfolio
                                                    </button>
                                                </Tooltip>
                                            )}
                                            {activeTab === 'pending' && (
                                                <button 
                                                    onClick={() => onApproveUser(user.uid)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors text-xs font-medium"
                                                    aria-label={`Approve ${user.name}`}
                                                >
                                                    <CheckIcon className="w-4 h-4" /> Approve
                                                </button>
                                            )}
                                            {activeTab === 'active' && user.role === 'MEMBER' && (
                                                <button 
                                                    onClick={() => onUpdateUserRole(user.uid, 'PATRON')}
                                                    className="p-2 text-gray-500 hover:text-purple-600 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                                    aria-label={`Promote ${user.name} to Patron`}
                                                    title="Promote to Patron"
                                                >
                                                    <ArrowUpCircleIcon />
                                                </button>
                                            )}
                                            {activeTab === 'active' && user.role === 'PATRON' && (
                                                <button
                                                    onClick={() => onUpdateUserRole(user.uid, 'MEMBER')}
                                                    className="p-2 text-gray-500 hover:text-yellow-600 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label={`Demote ${user.name} to Member`}
                                                    title="Demote to Member"
                                                    disabled={user.uid === currentUser.uid}
                                                >
                                                    <ArrowDownCircleIcon />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setUserToDelete(user)}
                                                className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'pending' ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'}`}
                                                aria-label={`Delete ${user.name}`}
                                                title={activeTab === 'pending' ? "Reject Request" : "Remove User"}
                                                disabled={user.uid === currentUser.uid}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={onConfirmDelete}
                title={activeTab === 'pending' ? "Reject Request" : "Remove Member"}
                message={`Are you sure you want to remove ${userToDelete?.name}? This action cannot be undone.`}
                confirmText={activeTab === 'pending' ? "Reject" : "Remove"}
                isDangerous
            />
            <MemberPortfolioModal
                isOpen={!!portfolioUser}
                user={portfolioUser}
                onClose={() => setPortfolioUser(null)}
            />
        </div>
    );
};

export default Members;
