import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [loading] = useState(false);

  return (
    <CustomerAuthContext.Provider
      value={{
        user: null,
        session: null,
        customer: null,
        loading,
        authError: null,
        signUp: async () => ({ error: null }),
        signIn: async () => ({ error: null }),
        signOut: async () => {},
        updateProfile: async () => ({ error: null }),
        retryAuth: () => {},
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
