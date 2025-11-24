import React from 'react';

export const BugIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0a8.1 8.1 0 001.8-5.3M6 16H4m2 0a8.1 8.1 0 01-1.8-5.3M12 15V9m0 6h.01M20.24 8.9a6 6 0 10-12.48 0 6 6 0 0012.48 0zM12 15v5" />
    </svg>
);