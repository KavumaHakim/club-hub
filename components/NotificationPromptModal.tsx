import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { BellIcon } from './icons/BellIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import * as api from '../services/apiService';
import { useData } from '../DataContext';

interface NotificationPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({ isOpen, onClose, userId }) => {
    const { updateNotificationPrefs } = useData();
    const [step, setStep] = useState<'prompt' | 'success' | 'denied'>('prompt');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleEnable = async () => {
        setIsSubmitting(true);
        try {
            if (!('Notification' in window)) {
                onClose();
                return;
            }

            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                // Immediately close the modal and update UI
                onClose();
                updateNotificationPrefs({ browserEnabled: true });
                
                // Run the subscription process in the background
                const reg = await navigator.serviceWorker.ready;
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
                
                if (vapidKey) {
                    try {
                        const subscription = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidKey)
                        });
                        await api.upsertPushSubscription(userId, subscription);
                    } catch (subErr) {
                        console.error("Subscription failed:", subErr);
                        // Revert preferences if subscription explicitly fails
                        updateNotificationPrefs({ browserEnabled: false });
                    }
                }
            } else {
                setStep('denied');
            }
        } catch (error) {
            console.error("Failed to enable notifications:", error);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full overflow-hidden relative border border-white/20 animate-fade-in-up">
                
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-32 -z-10 bg-ch-accent-soft" />
                
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 text-ch-muted hover:text-ch-text p-2 hover:bg-ch-surface transition-all z-20"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="p-8 pt-12 text-center">
                    {step === 'prompt' && (
                        <>
                            <div className="relative inline-block mb-8">
                                <div className="w-24 h-24 flex items-center justify-center rotate-3 transform transition-transform hover:rotate-0 bg-ch-accent">
                                    <BellIcon className="w-12 h-12 text-ch-on-accent" />
                                </div>
                                <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 animate-pulse">
                                    <SparklesIcon className="w-4 h-4 text-ch-text" />
                                </div>
                            </div>

                            <h3 className="text-[28px] font-extrabold tracking-[-0.02em] text-ch-text mb-4 tracking-tight">
                                Don't Miss Out!
                            </h3>
                            <p className="text-ch-muted mb-8 leading-relaxed px-2">
                                Get instant alerts for <span className="text-ch-accent font-bold">new challenges</span>, 
                                <span className="text-ch-violet font-bold"> club announcements</span>, and 
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold"> chat messages</span> directly on your device.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleEnable}
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-ch-text text-ch-bg font-black text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:opacity-90"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin" />
                                            Enabling...
                                        </>
                                    ) : (
                                        'Activate Notifications'
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-transparent text-ch-muted font-bold hover:text-ch-text transition-all"
                                >
                                    Maybe later
                                </button>
                            </div>
                            
                            <p className="mt-6 text-[11px] text-ch-muted uppercase font-bold tracking-widest">
                                Manage anytime in Profile Settings
                            </p>
                        </>
                    )}

                    {step === 'success' && (
                        <div className="py-12 animate-scale-in">
                            <div className="w-24 h-24 bg-green-500 flex items-center justify-center mx-auto mb-8">
                                <CheckIcon className="w-12 h-12 text-white" />
                            </div>
                            <h3 className="text-[28px] font-extrabold tracking-[-0.02em] text-ch-text mb-2">You're All Set!</h3>
                            <p className="text-ch-muted">Notifications have been successfully enabled.</p>
                        </div>
                    )}

                    {step === 'denied' && (
                        <div className="py-6">
                            <div className="w-20 h-20 bg-ch-surface flex items-center justify-center mx-auto mb-6">
                                <BellIcon className="w-10 h-10 text-ch-muted" />
                            </div>
                            <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text mb-3">Permissions Required</h3>
                            <p className="text-ch-muted mb-8 text-sm">
                                It looks like notifications are blocked. To enable them, click the lock icon in your browser's address bar and set notifications to "Allow".
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-ch-text text-ch-bg font-bold transition-all hover:opacity-90"
                            >
                                Got it
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPromptModal;
