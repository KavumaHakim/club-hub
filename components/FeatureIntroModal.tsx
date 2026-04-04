import React from 'react';
import { XIcon } from './icons/XIcon';
import { FormattedMessage } from './FormattedMessage';

interface FeatureIntroModalProps {
  isOpen: boolean;
  title: string;
  body: string;
  onClose: () => void;
}

const FeatureIntroModal: React.FC<FeatureIntroModalProps> = ({ isOpen, title, body, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close feature intro"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-6">
          <FormattedMessage text={body} isUser={false} />
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureIntroModal;
