import React from 'react';
import { XIcon } from './icons/XIcon';

interface StreakNoticeModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: 'warning' | 'danger';
  onClose: () => void;
}

const StreakNoticeModal: React.FC<StreakNoticeModalProps> = ({
  isOpen,
  title,
  message,
  variant = 'warning',
  onClose,
}) => {
  if (!isOpen) return null;

  const tone = variant === 'danger'
    ? {
        chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        card: 'border-red-200 dark:border-red-900/30',
        glow: 'from-red-500/20 to-orange-500/10',
      }
    : {
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        card: 'border-amber-200 dark:border-amber-900/30',
        glow: 'from-amber-500/20 to-sky-500/10',
      };

  return (
    <div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`relative w-full max-w-lg overflow-hidden rounded-3xl border bg-white dark:bg-gray-800 shadow-2xl ${tone.card}`}>
        <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${tone.glow} pointer-events-none`} />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
          aria-label="Close streak notice"
        >
          <XIcon />
        </button>

        <div className="relative px-6 pt-7 pb-6">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${tone.chip}`}>
            Streak Update
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {message}
          </p>

          <div className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              How It Works
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
              You get one late exception to protect a streak. After that, the next missed gap resets it.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakNoticeModal;

