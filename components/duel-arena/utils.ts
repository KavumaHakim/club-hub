import { ConnectionStatus, IntegrityLevel, DuelStatus } from './types';
import { TILE_COLORS } from '../InitialsTile';

/** Stable tile colour per person so the same player reads the same everywhere. */
export const colorFor = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
};

export const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getIntegrityTone = (level: IntegrityLevel) => {
  if (level === 'Critical') return 'text-ch-on-accent border-transparent bg-ch-accent';
  if (level === 'Warning') return 'text-ch-violet border-ch-violet';
  return 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400';
};

export const getConnectionTone = (connection: ConnectionStatus) => {
  if (connection === 'Reconnecting') return 'text-ch-accent';
  if (connection === 'Degraded') return 'text-ch-violet';
  return 'text-green-600 dark:text-green-400';
};

export const getTimerTone = (status: DuelStatus, remaining: number) => {
  if (status === 'sudden-death') return 'text-ch-accent';
  if (status === 'overtime') return 'text-ch-violet';
  if (remaining <= 60) return 'text-ch-accent';
  return 'text-ch-text';
};
