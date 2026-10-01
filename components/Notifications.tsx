

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { BellIcon } from './icons/BellIcon';
import { User, AppNotification, Tab } from '../types';

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

interface NotificationsProps {
  currentUser: User;
  setActiveTab: (tab: Tab) => void;
  isSidebarCollapsed: boolean;
}

const Notifications: React.FC<NotificationsProps> = ({ currentUser, setActiveTab, isSidebarCollapsed }) => {
    const { notifications, fetchNotifications, isLoadingNotifications, notificationPrefs, updateNotificationPrefs } = useData();
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

    const handleNotificationClick = useCallback(async (notification: AppNotification) => {
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
            updateNotificationPrefs({ browserEnabled: true });
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
                if (!vapidKey) return;
                const subscription = existing || await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });
                await api.upsertPushSubscription(currentUser.uid, subscription);
            } catch (err) {
                console.error("Failed to subscribe for push notifications", err);
            }
        }
    }, [updateNotificationPrefs]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleToggle}
              className="relative p-2 text-ch-muted hover:bg-ch-surface focus:outline-none focus:ring-2 focus:ring-ch-accent transition-colors"
              aria-label="Toggle notifications"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex h-4 w-4 bg-ch-accent text-ch-on-accent text-[10px] items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute top-full mt-2 right-0 w-80 bg-ch-bg border border-ch-divider z-50 transform transition-all duration-300 ease-in-out origin-top-right"
                    style={{ transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
                >
                    <div className="p-3 flex justify-between items-center border-b border-ch-divider">
                        <h4 className="font-semibold text-ch-text">Notifications</h4>
                        <div className="flex gap-2 items-center">
                            {(permission === 'default' || !notificationPrefs.browserEnabled) && (
                                <button 
                                    onClick={requestPermission} 
                                    className="text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 hover:bg-blue-200 transition-colors"
                                >
                                    Enable Browser
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-ch-accent hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {isLoadingNotifications ? (
                            <p className="p-4 text-center text-sm text-ch-muted">Loading...</p>
                        ) : notifications.length === 0 ? (
                            <p className="p-4 text-center text-sm text-ch-muted">No notifications yet.</p>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`w-full text-left p-3 flex items-start gap-3 hover:bg-ch-surface transition-colors border-b border-ch-divider ${!n.isRead ? 'bg-ch-accent-soft' : ''}`}
                                >
                                    {!n.isRead && <div className="w-2 h-2 bg-ch-accent mt-1.5 flex-shrink-0"></div>}
                                    <div className={n.isRead ? 'pl-5' : ''}>
                                        <p className="text-sm text-ch-text">{n.message}</p>
                                        <p className="text-xs text-ch-muted mt-1">{n.createdAt}</p>
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
