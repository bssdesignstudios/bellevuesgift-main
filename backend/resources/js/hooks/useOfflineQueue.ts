import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface QueuedTransaction {
  id: string;
  transaction_type: string;
  payload: any;
  created_at: string;
}

const OFFLINE_STORAGE_KEY = 'bellevue_offline_queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending count from local storage
  useEffect(() => {
    const queue = getLocalQueue();
    setPendingCount(queue.length);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored - syncing...');
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline - transactions will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getLocalQueue = (): QueuedTransaction[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalQueue = (queue: QueuedTransaction[]) => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
    setPendingCount(queue.length);
  };

  const addToQueue = useCallback((transactionType: string, payload: any) => {
    const queue = getLocalQueue();
    const newTransaction: QueuedTransaction = {
      id: crypto.randomUUID(),
      transaction_type: transactionType,
      payload,
      created_at: new Date().toISOString(),
    };
    queue.push(newTransaction);
    saveLocalQueue(queue);
    return newTransaction.id;
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    const queue = getLocalQueue();
    const synced: string[] = [];
    const failed: string[] = [];

    for (const transaction of queue) {
      try {
        // Process based on transaction type
        switch (transaction.transaction_type) {
          case 'sale':
            await axios.post('/api/pos/checkout', {
              ...transaction.payload,
              channel: 'pos',
              notes: transaction.payload.notes || 'Offline transaction - synced'
            });
            break;
          case 'inventory_adjustment':
            await axios.post(`/api/admin/inventory/${transaction.payload.id}/adjust`, {
              adjustment_type: transaction.payload.type,
              qty_change: transaction.payload.qty_change,
              notes: transaction.payload.notes,
            });
            break;
          default:
            console.warn('Unknown transaction type:', transaction.transaction_type);
        }
        synced.push(transaction.id);
      } catch (error) {
        console.error('Failed to sync transaction:', transaction.id, error);
        failed.push(transaction.id);
      }
    }

    // Remove synced transactions from queue
    const remainingQueue = queue.filter(t => !synced.includes(t.id));
    saveLocalQueue(remainingQueue);

    if (synced.length > 0) {
      toast.success(`Synced ${synced.length} transaction(s)`);
    }
    if (failed.length > 0) {
      toast.error(`Failed to sync ${failed.length} transaction(s)`);
    }

    setIsSyncing(false);
  }, [isSyncing]);

  const clearQueue = useCallback(() => {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addToQueue,
    syncQueue,
    clearQueue,
  };
}
