import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  island: string | null;
  address: string | null;
  is_favorite: boolean;
  auth_user_id: string;
  created_at: string;
}

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  customer: CustomerProfile | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: Error | null }>;
  retryAuth: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 8000;

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchCustomerProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching customer profile:', error);
        return null;
      }
      return data as CustomerProfile | null;
    } catch (err) {
      console.error('Customer fetch exception:', err);
      return null;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    const timeoutId = setTimeout(() => {
      console.warn('Customer auth initialization timed out');
      setLoading(false);
      setAuthError('Authentication timed out. Please refresh or try again.');
    }, AUTH_TIMEOUT_MS);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Get session error:', error);
        clearTimeout(timeoutId);
        setAuthError(error.message);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const customerData = await fetchCustomerProfile(session.user.id);
        setCustomer(customerData);
      } else {
        setCustomer(null);
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (err) {
      console.error('Customer auth initialization error:', err);
      clearTimeout(timeoutId);
      setAuthError('Failed to initialize authentication');
      setLoading(false);
    }
  }, [fetchCustomerProfile]);

  const retryAuth = useCallback(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let mounted = true;

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);

        if (session?.user) {
          const customerData = await fetchCustomerProfile(session.user.id);
          if (mounted) {
            setCustomer(customerData);
          }
        } else {
          if (mounted) {
            setCustomer(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth, fetchCustomerProfile]);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create customer profile
        const { error: profileError } = await supabase
          .from('customers')
          .insert({
            auth_user_id: data.user.id,
            name,
            email,
            phone: phone || null
          });

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    try {
      if (!customer?.id) throw new Error('No customer profile');

      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id);

      if (error) throw error;

      setCustomer(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        session,
        customer,
        loading,
        authError,
        signUp,
        signIn,
        signOut,
        updateProfile,
        retryAuth
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
