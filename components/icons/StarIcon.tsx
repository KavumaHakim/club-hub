import React from 'react';

export const StarIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className || "h-5 w-5"} 
        viewBox="0 0 20 20" 
        fill={filled ? "currentColor" : "none"} 
        stroke="currentColor" 
        strokeWidth={filled ? 0 : 1.5}
    >
        <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M10.868 2.884c.321-.772 1.415-.772 1.736 0l1.83 4.401 4.753.39c.845.073 1.18.976.544 1.58l-3.6 3.292c-.247.226-.364.56-.296.886l1.09 4.646c.196.835-.732 1.485-1.428.995l-4.14-2.583a.5.5 0 00-.492 0l-4.14 2.583c-.696.49-1.624-.16-1.428-.995l1.09-4.646c.068-.326-.05-.66-.296-.886l-3.6-3.292c-.636-.604-.301-1.507.544-1.58l4.753-.39 1.83-4.401z" 
        />
    </svg>
);
