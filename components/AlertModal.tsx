import React, { useEffect, useState } from 'react';
import { XIcon } from './icons/XIcon';
import { InformationCircleIcon as InfoIcon } from './icons/InformationCircleIcon';
import { ExclamationCircleIcon as AlertIcon } from './icons/ExclamationCircleIcon';
import { CheckCircleIcon as CheckIcon } from './icons/CheckCircleIcon';
import { XCircleIcon as ErrorIcon } from './icons/XCircleIcon';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertType;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    title,
    message,
    type,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
        }
    }, [isOpen]);

    if (!isOpen && !isAnimating) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckIcon className="w-12 h-12 text-green-500" />;
            case 'warning': return <AlertIcon className="w-12 h-12 text-amber-500" />;
            case 'error': return <ErrorIcon className="w-12 h-12 text-red-500" />;
            case 'confirm': return <AlertIcon className="w-12 h-12 text-blue-500" />;
            default: return <InfoIcon className="w-12 h-12 text-blue-500" />;
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'success': return 'from-green-500/20 to-emerald-500/20';
            case 'warning': return 'from-amber-500/20 to-orange-500/20';
            case 'error': return 'from-red-500/20 to-rose-500/20';
            case 'confirm': return 'from-blue-500/20 to-indigo-500/20';
            default: return 'from-blue-500/20 to-cyan-500/20';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success': return 'bg-green-600 hover:bg-green-700 shadow-green-500/25';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25';
            case 'error': return 'bg-red-600 hover:bg-red-700 shadow-red-500/25';
            case 'confirm': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25';
            default: return 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/25';
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div
                className={`bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                onTransitionEnd={() => !isOpen && setIsAnimating(false)}
            >
                <div className={`h-32 bg-gradient-to-br ${getHeaderColor()} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                    <div className="relative z-10 bg-white/90 dark:bg-gray-900/90 p-4 rounded-3xl shadow-premium animate-bounce-slow">
                        {getIcon()}
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 text-center">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        {message}
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                        {type === 'confirm' && onConfirm ? (
                            <>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`w-full py-4 ${getButtonColor()} text-white rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                >
                                    {confirmText}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className={`w-full py-4 ${getButtonColor()} text-white rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs`}
                            >
                                Continue
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
