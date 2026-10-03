import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const readSaved = (key: string): number | null => {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

/**
 * A side panel's width in px that the user can drag, remembered per browser.
 * `grow` is +1 when dragging right makes the panel wider (a left panel) and -1
 * when dragging left does (a right panel). `maxFor` caps the width from the
 * container's current size, so the panel next to it keeps room for code.
 */
export const useResizableWidth = (
  storageKey: string,
  { initial, min, max, grow }: { initial: number; min: number; max: number; grow: 1 | -1 },
  /** The row the panel sits in; its width caps how wide the panel can get. */
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  const [width, setWidth] = useState(() => readSaved(storageKey) ?? initial);
  const widthRef = useRef(width);
  widthRef.current = width;

  const clamp = useCallback(
    (w: number, minOther = 0) => {
      const room = containerRef.current ? containerRef.current.getBoundingClientRect().width - minOther : max;
      return Math.round(Math.max(min, Math.min(w, max, room)));
    },
    [min, max],
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      // storage blocked; the width just won't be remembered
    }
  }, [storageKey, width]);

  /** `minOther`: px the rest of the row needs (the editor plus any other panel). */
  const startDrag = (event: React.PointerEvent, minOther: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (e: PointerEvent) => setWidth(clamp(startWidth + (e.clientX - startX) * grow, minOther));
    const stop = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const nudge = (deltaTowardGrow: number, minOther: number) => setWidth((w) => clamp(w + deltaTowardGrow, minOther));
  const reset = () => setWidth(initial);

  return { width, startDrag, nudge, reset };
};

interface ResizeHandleProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Arrow key direction that makes the panel wider: 'left' for a right-hand panel. */
  widensWith: 'left' | 'right';
  onPointerDown: (event: React.PointerEvent) => void;
  onNudge: (delta: number) => void;
  onReset: () => void;
  className?: string;
}

/** A Split-style vertical divider you can drag, or focus and move with the arrow keys. */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({ label, value, min, max, widensWith, onPointerDown, onNudge, onReset, className }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    tabIndex={0}
    title={`${label}: drag, or use the arrow keys. Double-click to reset.`}
    onPointerDown={onPointerDown}
    onDoubleClick={onReset}
    onKeyDown={(e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = e.shiftKey ? 64 : 16;
      onNudge((e.key === 'ArrowLeft') === (widensWith === 'left') ? step : -step);
    }}
    className={cn(
      'group relative z-10 w-[6px] flex-none cursor-col-resize touch-none select-none outline-none',
      className,
    )}
  >
    {/* The visible rule; thickens to the accent on hover, drag and focus. */}
    <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-ch-rule transition-colors group-hover:w-[4px] group-hover:bg-ch-accent group-focus-visible:w-[4px] group-focus-visible:bg-ch-accent group-active:bg-ch-accent" />
  </div>
);
