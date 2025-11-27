
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { BellIcon } from './icons/BellIcon';
import { User, Notification, Tab } from '../types';

interface NotificationsProps {
  currentUser: User;
  setActiveTab: (tab: Tab) => void;
  isSidebarCollapsed: boolean;
}

const Notifications: React.FC<NotificationsProps> = ({ currentUser, setActiveTab, isSidebarCollapsed }) => {
    const { notifications, fetchNotifications, isLoadingNotifications } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(prev => !prev);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = useCallback(async (notification: Notification) => {
        if (!notification.isRead) {
            await api.markNotificationAsRead(notification.id);
        }
        if (notification.linkTo) {
            setActiveTab(notification.linkTo);
        }
        await fetchNotifications();
        setIsOpen(false);
    }, [setActiveTab, fetchNotifications]);

    const handleMarkAllRead = useCallback(async () => {
        if (unreadCount === 0) return;
        await api.markAllNotificationsAsRead(currentUser.uid);
        await fetchNotifications();
    }, [currentUser.uid, unreadCount, fetchNotifications]);

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            new Notification('Notifications Enabled', { 
                body: 'You will now receive alerts for club activities.',
                icon: '/favicon.svg'
            });
        }
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleToggle}
              className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              aria-label="Toggle notifications"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 text-white text-[10px] items-center justify-center shadow-sm">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 transform transition-all duration-300 ease-in-out origin-top-right"
                    style={{ transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
                >
                    <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Notifications</h4>
                        <div className="flex gap-2 items-center">
                            {permission === 'default' && (
                                <button 
                                    onClick={requestPermission} 
                                    className="text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                >
                                    Enable Push
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-pink-600 hover:underline dark:text-pink-400">
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {isLoadingNotifications ? (
                            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                        ) : notifications.length === 0 ? (
                            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`w-full text-left p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 ${!n.isRead ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
                                >
                                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 flex-shrink-0"></div>}
                                    <div className={n.isRead ? 'pl-5' : ''}>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{n.message}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{n.createdAt}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
