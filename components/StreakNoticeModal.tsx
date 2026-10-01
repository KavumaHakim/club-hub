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
        bar: 'bg-red-500',
      }
    : {
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        card: 'border-amber-200 dark:border-amber-900/30',
        bar: 'bg-amber-500',
      };

  return (
    <div className="fixed inset-0 z-[85] bg-black/60 flex items-center justify-center p-4">
      <div className={`relative w-full max-w-lg overflow-hidden border-2 bg-ch-bg ${tone.card}`}>
        <div className={`absolute inset-x-0 top-0 h-1.5 ${tone.bar} pointer-events-none`} />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-ch-muted hover:bg-ch-surface hover:text-ch-text transition-colors"
          aria-label="Close streak notice"
        >
          <XIcon />
        </button>

        <div className="relative px-6 pt-7 pb-6">
          <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${tone.chip}`}>
            Streak Update
          </span>
          <h2 className="mt-4 text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ch-muted">
            {message}
          </p>

          <div className="mt-5 border border-ch-divider bg-ch-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ch-muted">
              How It Works
            </p>
            <p className="mt-2 text-sm text-ch-text">
              You start with 1 grace. Earn an extra grace for every 5 streak days you reach (up to a maximum of 5). Graces protect your streak when you miss a day.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-ch-text text-ch-bg font-semibold hover:opacity-90 transition-opacity"
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

