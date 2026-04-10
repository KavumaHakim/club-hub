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
                const reg = await navigator.serviceWorker.ready;
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
                
                if (vapidKey) {
                    try {
                        const subscription = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidKey)
                        });
                        await api.upsertPushSubscription(userId, subscription);
                        updateNotificationPrefs({ browserEnabled: true });
                    } catch (subErr) {
                        console.error("Subscription failed:", subErr);
                    }
                }
                
                setStep('success');
                setTimeout(() => {
                    onClose();
                }, 2000);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative border border-white/20 animate-fade-in-up">
                
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-500/20 to-purple-600/20 -z-10" />
                
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all z-20"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="p-8 pt-12 text-center">
                    {step === 'prompt' && (
                        <>
                            <div className="relative inline-block mb-8">
                                <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/30 rotate-3 transform transition-transform hover:rotate-0">
                                    <BellIcon className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg animate-pulse">
                                    <SparklesIcon className="w-4 h-4 text-gray-900" />
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                                Don't Miss Out!
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed px-2">
                                Get instant alerts for <span className="text-pink-600 dark:text-pink-400 font-bold">new challenges</span>, 
                                <span className="text-purple-600 dark:text-purple-400 font-bold"> club announcements</span>, and 
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold"> chat messages</span> directly on your device.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleEnable}
                                    disabled={isSubmitting}
                                    className="w-full py-4.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Enabling...
                                        </>
                                    ) : (
                                        'Activate Notifications'
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-transparent text-gray-500 dark:text-gray-400 rounded-2xl font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                                >
                                    Maybe later
                                </button>
                            </div>
                            
                            <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">
                                Manage anytime in Profile Settings
                            </p>
                        </>
                    )}

                    {step === 'success' && (
                        <div className="py-12 animate-scale-in">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/30">
                                <CheckIcon className="w-12 h-12 text-white" />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">You're All Set!</h3>
                            <p className="text-gray-600 dark:text-gray-400">Notifications have been successfully enabled.</p>
                        </div>
                    )}

                    {step === 'denied' && (
                        <div className="py-6">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                                <BellIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Permissions Required</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">
                                It looks like notifications are blocked. To enable them, click the lock icon in your browser's address bar and set notifications to "Allow".
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold transition-all"
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
