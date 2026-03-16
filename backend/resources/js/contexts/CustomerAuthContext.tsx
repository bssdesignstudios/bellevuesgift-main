import React, { createContext, useContext, useState, ReactNode } from 'react';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';

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
  user: any;
  session: any;
  customer: Partial<CustomerProfile> | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: Error | null }>;
  retryAuth: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const { props } = usePage();
  const customer = (props as any).auth?.customer ?? null;
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      await axios.post('/api/customer/register', { email, password, name, phone });
      setLoading(false);
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      return { error: new Error(error.response?.data?.message || 'Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await axios.post('/login', { email, password });
      setLoading(false);
      router.reload(); // Refresh to get the customer data from shared props
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      return { error: new Error(error.response?.data?.message || 'Login failed') };
    }
  };

  const signOut = async () => {
    try {
      await axios.post('/logout');
      router.visit('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    // Implementation for profile update
    return { error: null };
  };

  const retryAuth = () => {
    router.reload();
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user: customer,
        session: customer ? { user: customer } : null,
        customer,
        loading,
        authError,
        signUp,
        signIn,
        signOut,
        updateProfile,
        retryAuth,
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
