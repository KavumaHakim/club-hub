import React from 'react';

export const KeyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 17 11.536 19 9.536 19 9.536 17 7.536 17 6 15.464a6 6 0 011.636-11.414A6 6 0 0115 7z" />
    </svg>
);