import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpCircleIcon } from './icons/ArrowUpCircleIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';
import { CheckIcon } from './icons/CheckIcon';

interface MembersProps {
    currentUser: User;
}

const Members: React.FC<MembersProps> = ({ currentUser }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const users = await api.getUsers();
            setAllUsers(users);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAction = async (action: () => Promise<any>) => {
        try {
            await action();
            await fetchUsers(); // Refetch after any action
        } catch (error) {
            console.error("Failed to perform user action:", error);
            alert("An error occurred. Please try again.");
        }
    };

    const onDeleteUser = (uid: string) => handleAction(() => api.deleteUser(uid));
    const onUpdateUserRole = (uid: string, role: 'MEMBER' | 'PATRON') => handleAction(() => api.updateUser(uid, { role }));
    const onApproveUser = (uid: string) => handleAction(() => api.updateUser(uid, { status: 'APPROVED' }));
    
    if (isLoading) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading members...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Manage Club Members</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allUsers.map((user) => (
                            <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-4 px-4">
                                    <div className="font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${user.status === 'APPROVED' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${user.role === 'PATRON' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="inline-flex items-center space-x-2">
                                        {user.status === 'PENDING' && (
                                            <button 
                                                onClick={() => onApproveUser(user.uid)}
                                                className="p-2 text-gray-500 hover:text-pink-600 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"
                                                aria-label={`Approve ${user.name}`}
                                            >
                                                <CheckIcon />
                                            </button>
                                        )}
                                        {user.status === 'APPROVED' && user.role === 'MEMBER' && (
                                            <button 
                                                onClick={() => onUpdateUserRole(user.uid, 'PATRON')}
                                                className="p-2 text-gray-500 hover:text-purple-600 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                                aria-label={`Promote ${user.name} to Patron`}
                                            >
                                                <ArrowUpCircleIcon />
                                            </button>
                                        )}
                                        {user.status === 'APPROVED' && user.role === 'PATRON' && (
                                            <button
                                                onClick={() => onUpdateUserRole(user.uid, 'MEMBER')}
                                                className="p-2 text-gray-500 hover:text-yellow-600 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label={`Demote ${user.name} to Member`}
                                                disabled={user.uid === currentUser.uid}
                                            >
                                                <ArrowDownCircleIcon />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => onDeleteUser(user.uid)}
                                            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={`Delete ${user.name}`}
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
            </div>
        </div>
    );
};

export default Members;