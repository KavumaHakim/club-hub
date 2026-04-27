import React, { useEffect, useState } from 'react';
import { flushOfflineQueue, getOfflineQueueCount } from '../services/offlineQueue';

const OfflineQueueStatus: React.FC = () => {
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueueCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const updateCount = () => setPendingCount(getOfflineQueueCount());
    const handleOnline = async () => {
      setIsSyncing(true);
      try {
        await flushOfflineQueue();
        setLastSynced(new Date().toLocaleTimeString());
      } finally {
        setIsSyncing(false);
        updateCount();
      }
    };

    window.addEventListener('clubhub-offline-queue-updated', updateCount as EventListener);
    window.addEventListener('online', handleOnline);
    updateCount();

    return () => {
      window.removeEventListener('clubhub-offline-queue-updated', updateCount as EventListener);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (pendingCount === 0 && !isSyncing && !lastSynced) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] px-4 py-2 rounded-full shadow-xl border border-white/20 bg-gray-900/90 text-white text-xs sm:text-sm backdrop-blur flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : pendingCount > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
      {isSyncing ? (
        <span>Syncing offline actions…</span>
      ) : pendingCount > 0 ? (
        <span>{pendingCount} offline action{pendingCount === 1 ? '' : 's'} pending sync</span>
      ) : (
        <span>Offline actions synced{lastSynced ? ` at ${lastSynced}` : ''}</span>
      )}
    </div>
  );
};

export default OfflineQueueStatus;
