import React from 'react';

/** Up to two uppercase initials from a display name, or '?' when there are none. */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Tile fills, cycled by list position. */
export const TILE_COLORS = ['#BE185D', '#6D28D9', '#0E7490', '#B45309', '#15803D'];

/** Square initials tile — the board's only avatar treatment. */
const InitialsTile: React.FC<{ name: string; size: number; color: string }> = ({ name, size, color }) => (
  <div
    className="flex flex-none items-center justify-center font-extrabold text-white"
    style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }}
  >
    {initialsOf(name)}
  </div>
);

export default InitialsTile;
