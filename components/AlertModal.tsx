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
            case 'success': return 'bg-green-600';
            case 'warning': return 'bg-amber-500';
            case 'error': return 'bg-red-600';
            case 'confirm': return 'bg-blue-600';
            default: return 'bg-ch-accent';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success': return 'bg-green-600 hover:bg-green-700';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700';
            case 'error': return 'bg-red-600 hover:bg-red-700';
            case 'confirm': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-ch-accent hover:bg-ch-accent-deep';
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div
                className={`bg-ch-bg w-full max-w-sm overflow-hidden border-2 border-ch-rule transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                onTransitionEnd={() => !isOpen && setIsAnimating(false)}
            >
                <div className={`h-28 ${getHeaderColor()} border-b-2 border-ch-rule flex items-center justify-center relative overflow-hidden`}>
                    <div className="relative z-10 bg-ch-bg p-4 animate-bounce-slow">
                        {getIcon()}
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 text-white/80 hover:text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 text-center">
                    <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text mb-2 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-ch-muted font-medium leading-relaxed">
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
                                    className={`w-full py-4 ${getButtonColor()} text-white font-bold transition-all`}
                                >
                                    {confirmText}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 text-ch-muted font-bold hover:text-ch-text transition-colors"
                                >
                                    {cancelText}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className={`w-full py-4 ${getButtonColor()} text-white font-bold transition-all uppercase tracking-widest text-xs`}
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
