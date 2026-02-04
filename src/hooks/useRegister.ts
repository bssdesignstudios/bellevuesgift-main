import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REGISTER_STORAGE_KEY = 'bellevue_active_register';

interface Register {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface RegisterSession {
  id: string;
  register_id: string;
  staff_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
}

export function useRegister(staffId: string | undefined) {
  const queryClient = useQueryClient();
  const [activeRegisterId, setActiveRegisterId] = useState<string | null>(() => {
    return localStorage.getItem(REGISTER_STORAGE_KEY);
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Fetch available registers
  const { data: registers } = useQuery({
    queryKey: ['registers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Register[];
    },
  });

  // Fetch current session
  const { data: currentSession } = useQuery({
    queryKey: ['register-session', activeRegisterId, staffId],
    queryFn: async () => {
      if (!activeRegisterId || !staffId) return null;
      
      const { data, error } = await supabase
        .from('register_sessions')
        .select('*')
        .eq('register_id', activeRegisterId)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as RegisterSession | null;
    },
    enabled: !!activeRegisterId && !!staffId,
  });

  // Open register session
  const openSession = useMutation({
    mutationFn: async ({ registerId, openingBalance }: { registerId: string; openingBalance: number }) => {
      if (!staffId) throw new Error('No staff ID');

      const { data, error } = await supabase
        .from('register_sessions')
        .insert({
          register_id: registerId,
          staff_id: staffId,
          opening_balance: openingBalance,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('pos_activity_logs').insert({
        register_id: registerId,
        staff_id: staffId,
        action: 'session_open',
        details: { opening_balance: openingBalance },
      });

      return data;
    },
    onSuccess: (data, variables) => {
      setActiveRegisterId(variables.registerId);
      setActiveSessionId(data.id);
      localStorage.setItem(REGISTER_STORAGE_KEY, variables.registerId);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register session opened');
    },
    onError: (error) => {
      toast.error('Failed to open register: ' + (error as Error).message);
    },
  });

  // Close register session
  const closeSession = useMutation({
    mutationFn: async ({ closingBalance, notes }: { closingBalance: number; notes?: string }) => {
      if (!currentSession) throw new Error('No active session');

      const { data, error } = await supabase
        .from('register_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          notes,
        })
        .eq('id', currentSession.id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('pos_activity_logs').insert({
        register_id: activeRegisterId,
        staff_id: staffId,
        action: 'session_close',
        details: { 
          closing_balance: closingBalance,
          expected_balance: currentSession.opening_balance, // Will be calculated server-side
          notes,
        },
      });

      return data;
    },
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register session closed');
    },
    onError: (error) => {
      toast.error('Failed to close register: ' + (error as Error).message);
    },
  });

  // Log POS activity
  const logActivity = async (action: string, details?: any) => {
    if (!activeRegisterId || !staffId) return;

    await supabase.from('pos_activity_logs').insert({
      register_id: activeRegisterId,
      staff_id: staffId,
      action,
      details,
    });
  };

  // Select register
  const selectRegister = (registerId: string) => {
    setActiveRegisterId(registerId);
    localStorage.setItem(REGISTER_STORAGE_KEY, registerId);
  };

  // Check if session is active
  useEffect(() => {
    if (currentSession) {
      setActiveSessionId(currentSession.id);
    }
  }, [currentSession]);

  return {
    registers,
    activeRegisterId,
    activeSessionId,
    currentSession,
    selectRegister,
    openSession,
    closeSession,
    logActivity,
    hasActiveSession: !!currentSession && !currentSession.closed_at,
  };
}
