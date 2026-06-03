import React from 'react';
import { HourglassIcon } from './icons/HourglassIcon';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingApprovalModal: React.FC<PendingApprovalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const title = "Pending Approval";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-8 text-center text-white overflow-hidden border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #4c1d95, #be185d, #4c1d95)',
          backgroundSize: '200% 200%',
          animation: 'gradient-pan 10s ease infinite'
        }}
      >
        {/* Floating blobs */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-sky-500/30 rounded-full blur-3xl animate-[float_12s_ease-in-out_infinite]"></div>
        <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl animate-[float_15s_ease-in-out_infinite_2s]"></div>
        
        <div className="relative z-10">
          <div className="mx-auto mb-6">
            <HourglassIcon className="w-16 h-16 text-white/80 filter drop-shadow-lg" />
          </div>

          <h3 className="text-3xl font-black mb-4 tracking-tight filter drop-shadow-md flex justify-center">
            {title.split('').map((char, i) => (
              <span 
                key={i} 
                className="inline-block animate-[arrange-letter_0.8s_cubic-bezier(0.25,0.1,0.25,1)_forwards]"
                style={{
                  '--tx': `${Math.random() * 80 - 40}px`,
                  '--ty': `${Math.random() * 80 - 40}px`,
                  '--r': `${Math.random() * 180 - 90}deg`,
                  animationDelay: `${i * 0.05}s`
                } as React.CSSProperties}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h3>
          
          <div className="space-y-3 text-white/80 font-light">
            <p>
              Your account is waiting for a patron to review it. You'll be able to log in once approved.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center px-4 py-3 text-base font-bold text-purple-900 bg-white/90 hover:bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              Okay, I'll wait!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalModal;
