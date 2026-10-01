
import React from 'react';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = "Confirm", cancelText = "Cancel", isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4">
      <div className="bg-ch-bg max-w-sm w-full p-6 relative border-2 border-ch-rule text-center animate-fade-in-up">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 mb-4 ${isDangerous ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
            <ExclamationCircleIcon className="h-6 w-6" />
        </div>
        <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text mb-2">{title}</h3>
        <p className="text-sm text-ch-muted mb-6">
            {message}
        </p>
        <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-ch-surface text-ch-text font-medium hover:bg-ch-surface-2 transition-colors"
            >
                {cancelText}
            </button>
            <button 
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 px-4 py-2 text-white font-medium transition-colors ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-ch-accent hover:bg-ch-accent-deep'}`}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
