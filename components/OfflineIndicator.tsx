
import React from 'react';
import { WifiOffIcon } from './icons/WifiOffIcon';

const OfflineIndicator: React.FC = () => {
    return (
        <div 
            className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg border-2 border-gray-700 animate-fade-in-up"
            role="status"
            aria-live="polite"
        >
            <WifiOffIcon className="w-5 h-5 text-red-400" />
            <span className="text-sm font-semibold">Offline Mode</span>
        </div>
    );
};

export default OfflineIndicator;
