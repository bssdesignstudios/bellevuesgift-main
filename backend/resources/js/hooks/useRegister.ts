import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  status: 'open' | 'closed';
  staff?: {
    id: string;
    name: string;
  };
}

export function useRegister(staffId: string | undefined) {
  const queryClient = useQueryClient();
  const [activeRegisterId, setActiveRegisterId] = useState<string | null>(() => {
    const stored = localStorage.getItem(REGISTER_STORAGE_KEY);
    if (!stored) return null;
    // Support both plain string and JSON format
    try {
      const parsed = JSON.parse(stored);
      return parsed.registerId || stored;
    } catch {
      return stored;
    }
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

  // Fetch current session for this register (any staff)
  const { data: currentSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ['register-session', activeRegisterId],
    queryFn: async () => {
      if (!activeRegisterId) return null;
      const response = await axios.get('/api/pos/session', {
        params: { register_id: activeRegisterId }
      });
      return response.data as RegisterSession | null;
    },
    enabled: !!activeRegisterId,
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
      const reg = registers?.find(r => r.id === variables.registerId);
      localStorage.setItem(REGISTER_STORAGE_KEY, JSON.stringify({
        registerId: variables.registerId,
        registerName: reg?.name || '',
      }));
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register session opened');
    },
    onError: (error) => {
      toast.error('Failed to open register: ' + (error as any).response?.data?.message || (error as Error).message);
    },
  });

  // Join existing register session
  const joinSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!staffId) throw new Error('No staff ID');
      const response = await axios.post('/api/pos/session/join', {
        session_id: sessionId,
        staff_id: staffId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setActiveSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Joined register session');
    },
    onError: (error) => {
      toast.error('Failed to join session: ' + ((error as any).response?.data?.message || (error as Error).message));
    },
  });

  // Switch cashier (logout from session)
  const switchCashier = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await axios.post('/api/pos/session/switch-cashier', {
        session_id: sessionId,
      });
      return response.data;
    },
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Switched out successfully');
    },
  });

  // End of Day: Close register session (Requires Admin PIN)
  const closeRegister = useMutation({
    mutationFn: async ({ sessionId, closingBalance, adminPin, notes }: { sessionId: string; closingBalance: number; adminPin: string; notes?: string }) => {
      const response = await axios.post('/api/pos/session/close-register', {
        session_id: sessionId,
        closing_balance: closingBalance,
        admin_pin: adminPin,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      toast.success('Register closed successfully');
    },
    onError: (error) => {
      toast.error('Failed to close register: ' + ((error as any).response?.data?.message || (error as Error).message));
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
    const reg = registers?.find(r => r.id === registerId);
    localStorage.setItem(REGISTER_STORAGE_KEY, JSON.stringify({
      registerId,
      registerName: reg?.name || '',
    }));
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
    isLoadingSession,
    selectRegister,
    openSession,
    joinSession,
    switchCashier,
    closeRegister,
    logActivity,
    hasActiveSession: !!currentSession && (!currentSession.closed_at && currentSession.status !== 'closed'),
  };
}
