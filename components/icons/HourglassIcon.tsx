
import React from 'react';

export const HourglassIcon: React.FC<{className?: string}> = ({className}) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
        </defs>
        <path d="M18 2H6v4l4 4-4 4v4h12v-4l-4-4 4-4V2z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* Top sand */}
        <path d="M16 4.1V8.5L12 12 8 8.5V4.1z" fill="url(#sandGradient)" style={{ animation: 'sand-flow-top 2s ease-in-out infinite' }} />
        
        {/* Bottom sand */}
        <path d="M8 15.5L12 12l4 3.5V19.9H8z" fill="url(#sandGradient)" style={{ animation: 'sand-flow-bottom 2s ease-in-out infinite' }}/>
    </svg>
);
