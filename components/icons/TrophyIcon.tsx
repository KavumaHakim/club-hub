

import React from 'react';

// FIX: Replaced corrupted SVG content with a proper trophy icon.
// The previous icon was a mix of a clock and sparkles.
// This also ensures the component correctly accepts a className prop.
export const TrophyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6m-3-4v4M12 3v12a3 3 0 01-3 3H7a3 3 0 01-3-3V9a3 3 0 013-3h2m8 0h2a3 3 0 013 3v6a3 3 0 01-3 3h-2a3 3 0 01-3-3V3z" />
    </svg>
);