import React from 'react';

export const GamepadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.5h10.5a2.25 2.25 0 012.25 2.25v3.5a2.25 2.25 0 01-2.25 2.25h-1.35a1.5 1.5 0 01-1.06-.44l-1.64-1.64h-2.6l-1.64 1.64a1.5 1.5 0 01-1.06.44H6.75A2.25 2.25 0 014.5 14.25v-3.5A2.25 2.25 0 016.75 8.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h-2m1-1v2m6.5-1.5h.01m2 0h.01m-2 2h.01m2 0h.01" />
  </svg>
);
