import { ConnectionStatus, IntegrityLevel, DuelStatus } from './types';

export const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getIntegrityTone = (level: IntegrityLevel) => {
  if (level === 'Critical') return 'text-rose-200 border-rose-400/30 bg-rose-500/10';
  if (level === 'Warning') return 'text-amber-100 border-amber-400/30 bg-amber-500/10';
  return 'text-emerald-100 border-emerald-400/30 bg-emerald-500/10';
};

export const getConnectionTone = (connection: ConnectionStatus) => {
  if (connection === 'Reconnecting') return 'text-rose-300';
  if (connection === 'Degraded') return 'text-amber-300';
  return 'text-emerald-300';
};

export const getTimerTone = (status: DuelStatus, remaining: number) => {
  if (status === 'sudden-death') return 'text-rose-200';
  if (status === 'overtime') return 'text-fuchsia-200';
  if (remaining <= 60) return 'text-rose-200';
  return 'text-cyan-100';
};
