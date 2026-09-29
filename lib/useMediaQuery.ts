import { useEffect, useState } from 'react';

const matches = (query: string) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

/** Tracks a CSS media query so JS-driven layout agrees with Tailwind's breakpoints. */
export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(query);
    const update = () => setIsMatch(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return isMatch;
}
