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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-ch-bg w-full max-w-xl overflow-hidden border-2 border-ch-rule">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ch-divider">
          <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-ch-muted hover:text-ch-text hover:bg-ch-surface"
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
            className="px-5 py-2 bg-ch-text text-ch-bg font-bold hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureIntroModal;
