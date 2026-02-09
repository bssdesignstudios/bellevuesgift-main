import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface QueuedTransaction {
  id: string; // client_txn_id for idempotency
  transaction_type: string;
  payload: any;
  created_at: string;
  sync_attempts: number;
  last_attempt_at?: string;
}

const DB_NAME = 'bellevue_pos_offline';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('transaction_type', 'transaction_type', { unique: false });
      }
    };
  });
}

async function getAllTransactions(): Promise<QueuedTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function addTransaction(txn: QueuedTransaction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(txn);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function updateTransaction(txn: QueuedTransaction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(txn);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function deleteTransaction(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearAllTransactions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Load pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getAllTransactions();
      setPendingCount(queue.length);
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

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

  const addToQueue = useCallback(async (transactionType: string, payload: any): Promise<string> => {
    // Generate client_txn_id for idempotency
    const clientTxnId = crypto.randomUUID();

    const newTransaction: QueuedTransaction = {
      id: clientTxnId,
      transaction_type: transactionType,
      payload: {
        ...payload,
        client_txn_id: clientTxnId, // Include in payload for server-side deduplication
      },
      created_at: new Date().toISOString(),
      sync_attempts: 0,
    };

    try {
      await addTransaction(newTransaction);
      await refreshPendingCount();
      toast.info('Transaction queued for sync');
    } catch (err) {
      console.error('Failed to queue transaction:', err);
      toast.error('Failed to save transaction offline');
    }

    return clientTxnId;
  }, [refreshPendingCount]);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const queue = await getAllTransactions();
    let synced = 0;
    let failed = 0;

    for (const transaction of queue) {
      // Skip if too many attempts (max 5)
      if (transaction.sync_attempts >= 5) {
        console.warn('Transaction exceeded max sync attempts:', transaction.id);
        continue;
      }

      try {
        // Update attempt count
        transaction.sync_attempts += 1;
        transaction.last_attempt_at = new Date().toISOString();
        await updateTransaction(transaction);

        // Process based on transaction type
        switch (transaction.transaction_type) {
          case 'sale':
            await axios.post('/api/pos/checkout', {
              ...transaction.payload,
              channel: 'pos',
              notes: transaction.payload.notes || 'Offline transaction - synced',
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

        // Remove from queue on success
        await deleteTransaction(transaction.id);
        synced++;
      } catch (error: any) {
        console.error('Failed to sync transaction:', transaction.id, error);

        // Check for duplicate (409 Conflict or specific error)
        if (error?.response?.status === 409 ||
          error?.response?.data?.message?.includes('duplicate') ||
          error?.response?.data?.message?.includes('already exists')) {
          // This transaction was already processed, remove it
          await deleteTransaction(transaction.id);
          synced++;
          console.log('Duplicate transaction removed:', transaction.id);
        } else {
          failed++;
        }
      }
    }

    await refreshPendingCount();

    if (synced > 0) {
      toast.success(`Synced ${synced} transaction(s)`);
    }
    if (failed > 0) {
      toast.error(`Failed to sync ${failed} transaction(s) - will retry`);
    }

    setIsSyncing(false);
    syncingRef.current = false;
  }, [refreshPendingCount]);

  const clearQueue = useCallback(async () => {
    await clearAllTransactions();
    setPendingCount(0);
  }, []);

  // Periodic sync attempt (every 30 seconds when online)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && pendingCount > 0 && !syncingRef.current) {
        syncQueue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingCount, syncQueue]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addToQueue,
    syncQueue,
    clearQueue,
  };
}

