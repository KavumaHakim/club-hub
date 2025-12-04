
import React from 'react';

export const WifiOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L5.636 18.364M15.536 8.464a5 5 0 010 7.072m-7.072 0a5 5 0 010-7.072m7.072 0L8.464 15.536" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01" />
    </svg>
);
