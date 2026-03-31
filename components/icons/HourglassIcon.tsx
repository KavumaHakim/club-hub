
import React from 'react';

export const HourglassIcon: React.FC<{className?: string}> = ({className}) => {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
            <g style={{ transformOrigin: '12px 12px', animation: 'clock-spin 4s linear infinite' }}>
                <line x1="12" y1="12" x2="12" y2="6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="12" x2="16.2" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
            </g>
        </svg>
    );
};
