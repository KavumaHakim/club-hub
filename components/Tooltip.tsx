import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidthClassName?: string;
  /** Wrapper classes; defaults to inline-flex. Pass e.g. "flex w-full" for a full-width child. */
  className?: string;
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top', maxWidthClassName, className = 'inline-flex' }) => {
  return (
    // A named group, so a parent that is itself a `group` (cards) can't show every
    // tooltip inside it. Keyboard focus shows it too, but a mouse click doesn't
    // leave it stuck open.
    <span className={`relative group/tip ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute z-50 hidden group-hover/tip:block group-has-[:focus-visible]/tip:block ${
          positionClasses[position]
        }`}
      >
        <span
          className={`block text-[11px] leading-snug text-ch-bg bg-ch-text px-2.5 py-1.5 ${
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
