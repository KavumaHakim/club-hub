
import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { XIcon } from './icons/XIcon';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation to finish
    }, 4000); // Auto dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error': return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'warning': return <ExclamationCircleIcon className="w-6 h-6 text-yellow-500" />;
      default: return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'border-green-500';
      case 'error': return 'border-red-500';
      case 'warning': return 'border-yellow-500';
      default: return 'border-blue-500';
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 bg-ch-bg border-l-4 ${getBorderColor()} border-y border-r border-ch-divider transform transition-all duration-300 ease-in-out mb-3 w-80 sm:w-96
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in-right'}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-ch-text leading-snug">
          {toast.message}
        </p>
      </div>
      <button 
        onClick={handleClose}
        className="text-ch-muted hover:text-ch-text transition-colors"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: ToastType[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
