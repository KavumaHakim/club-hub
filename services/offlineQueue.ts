import { supabase } from './supabaseClient';

type QueueOperation = 'insert' | 'upsert' | 'update' | 'delete';

export type OfflineQueueItem = {
  id: string;
  table: string;
  operation: QueueOperation;
  payload?: Record<string, any> | Record<string, any>[];
  match?: Record<string, any>;
  options?: Record<string, any>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

const QUEUE_KEY = 'clubhub_offline_queue_v1';
const MAX_ATTEMPTS = 5;

const isBrowser = () => typeof window !== 'undefined';

export const isOffline = () => isBrowser() && !navigator.onLine;

export const readOfflineQueue = (): OfflineQueueItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeOfflineQueue = (items: OfflineQueueItem[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('clubhub-offline-queue-updated', { detail: { count: items.length } }));
};

export const getOfflineQueueCount = () => readOfflineQueue().length;

export const queueSupabaseWrite = (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'attempts'>) => {
  const queued: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  writeOfflineQueue([...readOfflineQueue(), queued]);
  registerBackgroundSync();
  return queued;
};

const applyQueuedItem = async (item: OfflineQueueItem) => {
  if (item.operation === 'insert') {
    const { error } = await supabase.from(item.table).insert(item.payload as any);
    if (error) throw error;
    return;
  }

  if (item.operation === 'upsert') {
    const { error } = await supabase.from(item.table).upsert(item.payload as any, item.options as any);
    if (error) throw error;
    return;
  }

  if (item.operation === 'update') {
    let query = supabase.from(item.table).update(item.payload as any);
    if (item.match) query = query.match(item.match);
    const { error } = await query;
    if (error) throw error;
    return;
  }

  if (item.operation === 'delete') {
    let query = supabase.from(item.table).delete();
    if (item.match) query = query.match(item.match);
    const { error } = await query;
    if (error) throw error;
  }
};

export const flushOfflineQueue = async () => {
  if (isOffline()) return { flushed: 0, remaining: getOfflineQueueCount() };

  const queue = readOfflineQueue();
  const remaining: OfflineQueueItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await applyQueuedItem(item);
      flushed += 1;
    } catch (error: any) {
      const attempts = item.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.push({ ...item, attempts, lastError: error?.message || String(error) });
      } else {
        console.error('Dropping offline queue item after max attempts:', item, error);
      }
    }
  }

  writeOfflineQueue(remaining);
  return { flushed, remaining: remaining.length };
};

export const registerBackgroundSync = async () => {
  if (!isBrowser() || !('serviceWorker' in navigator)) return;
  try {
    const registration: any = await navigator.serviceWorker.ready;
    if ('sync' in registration) await registration.sync.register('clubhub-sync');
  } catch (error) {
    console.warn('Background sync registration failed:', error);
  }
};

export const startOfflineQueueSync = () => {
  if (!isBrowser()) return;
  window.addEventListener('online', () => {
    flushOfflineQueue().catch(error => console.warn('Offline queue flush failed:', error));
  });
  if (navigator.onLine) flushOfflineQueue().catch(() => undefined);
};
