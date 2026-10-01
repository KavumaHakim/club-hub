
import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpCircleIcon } from './icons/ArrowUpCircleIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SearchIcon } from './icons/SearchIcon';
import { PageIntro, RuledTabs } from './SplitKit';
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
        return <div className="text-center p-8 text-ch-muted">Loading members...</div>;
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
        <div>
            <PageIntro
                eyebrow="Patron only"
                title="Manage Club Members"
                description="Approve new sign-ups and review the active roster."
                actions={
                    <label className="flex w-full items-center gap-2.5 border-2 border-ch-rule px-3 md:w-72 [&_svg]:h-4 [&_svg]:w-4">
                        <span className="flex-none text-ch-muted"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
                        />
                    </label>
                }
            />

            <RuledTabs
                tabs={[
                    { id: 'active' as const, label: 'Active Members', count: activeMembers.length },
                    { id: 'pending' as const, label: 'Pending Approval', count: pendingMembers.length },
                ]}
                active={activeTab}
                onChange={setActiveTab}
            />

            <div className="overflow-x-auto border-2 border-ch-rule">
                {usersToDisplay.length === 0 ? (
                    <div className="text-center py-12 text-ch-muted">
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
                        <thead className="border-b-2 border-ch-divider">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-ch-muted">Name</th>
                                <th className="py-3 px-4 font-semibold text-ch-muted">Phone Number</th>
                                <th className="py-3 px-4 font-semibold text-ch-muted">Role</th>
                                {activeTab === 'active' && (
                                    <th className="py-3 px-4 font-semibold text-ch-muted">Last Seen</th>
                                )}
                                <th className="py-3 px-4 font-semibold text-ch-muted text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersToDisplay.map((user) => (
                                <tr key={user.uid} className="border-b border-ch-divider hover:bg-ch-surface transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center">
                                            <div className="relative mr-3">
                                                <img 
                                                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
                                                    alt={user.name} 
                                                    className="w-10 h-10 object-cover border border-ch-divider" 
                                                />
                                                {onlineUsers.includes(user.uid) && (
                                                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 ring-2 ring-white bg-green-500"></span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-ch-text">{user.name}</div>
                                                <div className="text-sm text-ch-muted">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-ch-muted">
                                        {user.phoneNumber || 'N/A'}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 text-xs font-medium ${user.role === 'PATRON' ? 'bg-ch-accent-soft text-ch-violet' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    {activeTab === 'active' && (
                                        <td className="py-4 px-4 text-sm text-ch-muted">
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
                                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                                                    >
                                                        View Portfolio
                                                    </button>
                                                </Tooltip>
                                            )}
                                            {activeTab === 'pending' && (
                                                <button 
                                                    onClick={() => onApproveUser(user.uid)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-medium"
                                                    aria-label={`Approve ${user.name}`}
                                                >
                                                    <CheckIcon className="w-4 h-4" /> Approve
                                                </button>
                                            )}
                                            {activeTab === 'active' && user.role === 'MEMBER' && (
                                                <button 
                                                    onClick={() => onUpdateUserRole(user.uid, 'PATRON')}
                                                    className="p-2 text-ch-muted hover:text-ch-accent hover:bg-ch-accent-soft transition-colors"
                                                    aria-label={`Promote ${user.name} to Patron`}
                                                    title="Promote to Patron"
                                                >
                                                    <ArrowUpCircleIcon />
                                                </button>
                                            )}
                                            {activeTab === 'active' && user.role === 'PATRON' && (
                                                <button
                                                    onClick={() => onUpdateUserRole(user.uid, 'MEMBER')}
                                                    className="p-2 text-ch-muted hover:text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label={`Demote ${user.name} to Member`}
                                                    title="Demote to Member"
                                                    disabled={user.uid === currentUser.uid}
                                                >
                                                    <ArrowDownCircleIcon />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setUserToDelete(user)}
                                                className={`p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'pending' ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-ch-muted hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'}`}
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
