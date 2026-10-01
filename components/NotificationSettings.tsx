import React, { useState } from 'react';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { supabase } from '../services/supabaseClient';

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const NotificationSettings: React.FC = () => {
    const { notificationPrefs, updateNotificationPrefs } = useData();
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    const requestPermission = async () => {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            new Notification('ClubHub Notifications Enabled', {
                body: 'You will receive alerts for new events, posts, and messages.',
                icon: '/favicon.svg'
            });
        }
        if (result !== 'granted') {
            updateNotificationPrefs({ browserEnabled: false });
        }
    };

    const handleToggleBrowser = async () => {
        if (!('Notification' in window)) return;
        if (!notificationPrefs.browserEnabled) {
            await requestPermission();
            if (Notification.permission === 'granted') {
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
                    const { data } = await supabase.auth.getUser();
                    const userId = data.user?.id;
                    if (userId) {
                        await api.upsertPushSubscription(userId, subscription);
                    }
                } catch (err) {
                    console.error("Failed to subscribe for push notifications", err);
                }
            }
        } else {
            updateNotificationPrefs({ browserEnabled: false });
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                if (existing) {
                    await existing.unsubscribe();
                    await api.deletePushSubscription(existing.endpoint);
                }
            } catch (err) {
                console.error("Failed to unsubscribe push notifications", err);
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">Notification Settings</h2>
                <p className="text-ch-muted mt-2">
                    Control when ClubHub sends you alerts for new events, posts, and messages.
                </p>
            </div>

            <div className="bg-ch-bg border border-ch-divider p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-ch-text">Browser Notifications</p>
                        <p className="text-sm text-ch-muted">Show native alerts when you’re away.</p>
                    </div>
                    <button
                        onClick={handleToggleBrowser}
                        className={`px-4 py-2 text-xs font-semibold transition-colors ${notificationPrefs.browserEnabled
                                ? 'bg-green-500 text-white'
                                : 'bg-ch-surface-2 text-ch-text'
                            }`}
                    >
                        {notificationPrefs.browserEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-ch-text">Notify Only When Away</p>
                        <p className="text-sm text-ch-muted">Don’t show browser alerts when this tab is focused.</p>
                    </div>
                    <button
                        onClick={() => updateNotificationPrefs({ notifyWhenAway: !notificationPrefs.notifyWhenAway })}
                        className={`px-4 py-2 text-xs font-semibold transition-colors ${notificationPrefs.notifyWhenAway
                                ? 'bg-indigo-500 text-white'
                                : 'bg-ch-surface-2 text-ch-text'
                            }`}
                        disabled={!notificationPrefs.browserEnabled}
                    >
                        {notificationPrefs.notifyWhenAway ? 'On' : 'Off'}
                    </button>
                </div>
                <div className="text-xs text-ch-muted">
                    Permission status: <span className="font-semibold">{permission}</span>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
