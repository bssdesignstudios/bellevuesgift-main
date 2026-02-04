import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
            await processSale(transaction.payload);
            break;
          case 'refund':
            await processRefund(transaction.payload);
            break;
          case 'inventory_adjustment':
            await processInventoryAdjustment(transaction.payload);
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

// Transaction processors
async function processSale(payload: any) {
  const { data: orderNumber } = await supabase.rpc('generate_order_number');
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      channel: 'pos',
      status: payload.fulfillment === 'pickup' ? 'ready_for_pickup' : 'completed',
      payment_status: payload.payment_method === 'pay_later' ? 'pending' : 'paid',
      payment_method: payload.payment_method,
      fulfillment_method: payload.fulfillment || 'in_store',
      customer_id: payload.customer_id,
      staff_id: payload.staff_id,
      register_id: payload.register_id,
      subtotal: payload.subtotal,
      discount_amount: payload.discount || 0,
      vat_amount: payload.vat,
      total: payload.total,
      notes: payload.notes || 'Offline transaction - synced',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert order items
  const orderItems = payload.items.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    sku: item.sku,
    name: item.name,
    qty: item.qty,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }));

  await supabase.from('order_items').insert(orderItems);

  // Update inventory
  for (const item of payload.items) {
    const { data: inv } = await supabase
      .from('inventory')
      .select('qty_on_hand')
      .eq('product_id', item.product_id)
      .single();
    
    if (inv) {
      await supabase
        .from('inventory')
        .update({ qty_on_hand: inv.qty_on_hand - item.qty })
        .eq('product_id', item.product_id);
    }
  }

  // Record payment
  if (payload.payment_method !== 'pay_later') {
    await supabase.from('payments').insert({
      order_id: order.id,
      method: payload.payment_method,
      amount: payload.total,
      reference: payload.payment_reference,
    });
  }

  return order;
}

async function processRefund(payload: any) {
  // Update original order
  await supabase
    .from('orders')
    .update({ status: 'refunded', notes: payload.reason })
    .eq('id', payload.order_id);

  // Restore inventory
  for (const item of payload.items) {
    const { data: inv } = await supabase
      .from('inventory')
      .select('qty_on_hand')
      .eq('product_id', item.product_id)
      .single();
    
    if (inv) {
      await supabase
        .from('inventory')
        .update({ qty_on_hand: inv.qty_on_hand + item.qty })
        .eq('product_id', item.product_id);
    }
  }
}

async function processInventoryAdjustment(payload: any) {
  await supabase.from('inventory_adjustments').insert({
    product_id: payload.product_id,
    adjustment_type: payload.type,
    qty_change: payload.qty_change,
    notes: payload.notes,
    staff_id: payload.staff_id,
  });

  const { data: inv } = await supabase
    .from('inventory')
    .select('qty_on_hand')
    .eq('product_id', payload.product_id)
    .single();
  
  if (inv) {
    await supabase
      .from('inventory')
      .update({ qty_on_hand: inv.qty_on_hand + payload.qty_change })
      .eq('product_id', payload.product_id);
  }
}
