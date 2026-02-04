import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';
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
      const response = await axios.get('/api/pos/registers');
      return response.data as Register[];
    },
  });

  // Fetch current session
  const { data: currentSession } = useQuery({
    queryKey: ['register-session', activeRegisterId, staffId],
    queryFn: async () => {
      if (!activeRegisterId || !staffId) return null;
      const response = await axios.get('/api/pos/session', {
        params: { register_id: activeRegisterId, staff_id: staffId }
      });
      return response.data as RegisterSession | null;
    },
    enabled: !!activeRegisterId && !!staffId,
  });

  // Open register session
  const openSession = useMutation({
    mutationFn: async ({ registerId, openingBalance }: { registerId: string; openingBalance: number }) => {
      if (!staffId) throw new Error('No staff ID');
      const response = await axios.post('/api/pos/session', {
        register_id: registerId,
        staff_id: staffId,
        opening_balance: openingBalance,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      setActiveRegisterId(variables.registerId);
      setActiveSessionId(data.id);
      localStorage.setItem(REGISTER_STORAGE_KEY, variables.registerId);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register session opened');
    },
    onError: (error) => {
      toast.error('Failed to open register: ' + (error as any).response?.data?.message || (error as Error).message);
    },
  });

  // Close register session
  const closeSession = useMutation({
    mutationFn: async ({ closingBalance, notes }: { closingBalance: number; notes?: string }) => {
      if (!currentSession) throw new Error('No active session');
      const response = await axios.put(`/api/pos/session/${currentSession.id}`, {
        closing_balance: closingBalance,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register session closed');
    },
    onError: (error) => {
      toast.error('Failed to close register: ' + (error as any).response?.data?.message || (error as Error).message);
    },
  });

  // Log POS activity
  const logActivity = async (action: string, details?: any) => {
    if (!activeRegisterId || !staffId) return;
    await axios.post('/api/pos/activity', {
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
