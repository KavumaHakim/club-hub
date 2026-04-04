import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidthClassName?: string;
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top', maxWidthClassName }) => {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        className={`pointer-events-none absolute z-50 hidden group-hover:block group-focus-within:block ${
          positionClasses[position]
        }`}
      >
        <span
          className={`block text-[11px] leading-snug text-white bg-gray-900/95 dark:bg-black/90 px-2.5 py-1.5 rounded-md shadow-lg border border-white/10 ${
            maxWidthClassName || 'max-w-[240px]'
          }`}
        >
          {text}
        </span>
      </span>
    </span>
  );
};

export default Tooltip;
