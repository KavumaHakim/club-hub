
import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpCircleIcon } from './icons/ArrowUpCircleIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { useData } from '../DataContext';

interface MembersProps {
    currentUser: User;
}

const Members: React.FC<MembersProps> = ({ currentUser }) => {
    const { allUsers, isLoadingUsers, allUsersError, fetchUsers, onlineUsers } = useData();
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

    const handleAction = async (action: () => Promise<any>) => {
        try {
            await action();
            await fetchUsers(); // Refetch from context after any action
        } catch (error: any) {
            console.error("Failed to perform user action:", error);
            alert(error.message || "An error occurred. Please try again.");
        }
    };

    const onDeleteUser = (uid: string) => handleAction(() => api.deleteUser(uid));
    const onUpdateUserRole = (uid: string, role: 'MEMBER' | 'PATRON') => handleAction(() => api.updateUser(uid, { role }));
    const onApproveUser = (uid: string) => handleAction(() => api.approveMember(uid));
    
    if (isLoadingUsers) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading members...</div>;
    }

    if (allUsersError) {
        return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Error fetching members: ${allUsersError}`}</div>;
    }

    const activeMembers = allUsers.filter(u => u.status === 'APPROVED');
    const pendingMembers = allUsers.filter(u => u.status === 'PENDING');
    
    const usersToDisplay = activeTab === 'active' ? activeMembers : pendingMembers;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 pb-0">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Manage Club Members</h2>
                
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
                        <p>{activeTab === 'active' ? "No active members found." : "No pending requests."}</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Phone Number</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Role</th>
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
                                    <td className="py-4 px-4 text-right">
                                        <div className="inline-flex items-center space-x-2">
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
                                                onClick={() => onDeleteUser(user.uid)}
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
        </div>
    );
};

export default Members;
