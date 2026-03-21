import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { Staff } from '@/types';

// ── lightweight stand-in for the old Supabase User ──────────────────────────
interface SimpleUser {
  id: number | string;
  email: string;
}

interface AuthContextType {
  /** Truthy when a real (server-authenticated) session exists */
  user: SimpleUser | null;
  /** Kept for back-compat; mirrors user */
  session: { user: SimpleUser } | null;
  staff: Staff | null;
  loading: boolean;
  authError: string | null;
  impersonating: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; staff?: Staff | null }>;
  signOut: (redirectTo?: string) => Promise<void>;
  impersonate: (targetId: string | null, password?: string) => Promise<void>;
  effectiveStaff: Staff | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Turn a server staff payload { id, name, email, role, staff_uuid, impersonated_by_admin_id } into a full Staff object */
function toStaff(data: { id: number | string; name: string; email: string; role: string; staff_uuid?: string; impersonated_by_admin_id?: number | null }): Staff {
  return {
    id: String(data.id),
    staff_uuid: data.staff_uuid,
    auth_user_id: null,
    name: data.name,
    email: data.email,
    role: data.role as Staff['role'],
    is_active: true,
    impersonated_by_admin_id: data.impersonated_by_admin_id ?? null,
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // ── bootstrap from Inertia shared props ──────────────────────────────────
  // usePage() is only callable inside a component tree rendered by Inertia.
  // We wrap in try/catch so the provider can still mount outside Inertia (tests).
  let serverStaff: { id: number | string; name: string; email: string; role: string } | null = null;
  try {
    const page = usePage();
    serverStaff = (page.props as any)?.auth?.staff ?? null;
  } catch {
    // outside Inertia – ignore
  }

  // ── state — initialize directly from server props (no useEffect delay) ──
  const [user, setUser] = useState<SimpleUser | null>(() =>
    serverStaff ? { id: serverStaff.id, email: serverStaff.email } : null
  );
  const [staff, setStaff] = useState<Staff | null>(() =>
    serverStaff ? toStaff(serverStaff as any) : null
  );
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Impersonation state derived from server staff data
  const impersonating = !!(serverStaff as any)?.impersonated_by_admin_id;

  // Keep state in sync when Inertia page props change (e.g. navigating between pages)
  useEffect(() => {
    if (serverStaff) {
      const s = toStaff(serverStaff as any);
      setStaff(s);
      setUser({ id: serverStaff.id, email: serverStaff.email });
    } else {
      setStaff(null);
      setUser(null);
    }
  }, [serverStaff?.id]);

  // ── sign in ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: Error | null; staff?: Staff | null }> => {
    try {
      const { data } = await axios.post('/staff/login', { email, password });
      const s = toStaff(data.staff);
      setStaff(s);
      setUser({ id: data.staff.id, email: data.staff.email });
      setAuthError(null);

      return { error: null, staff: s };
    } catch (err: any) {
      const message = err?.response?.data?.errors?.email?.[0]
        ?? err?.response?.data?.message
        ?? 'Login failed';
      return { error: new Error(message) };
    }
  };

  // ── sign out ───────────────────────────────────────────────────────────────
  // redirectTo defaults to /staff/login for admin/warehouse; POS callers pass /pos/login
  const signOut = async (redirectTo: string = '/staff/login') => {
    try {
      await axios.post('/staff/logout');
    } catch {
      // best-effort – clear local state regardless
    }

    setStaff(null);
    setUser(null);
    window.location.href = redirectTo;
  };

  // ── impersonation ──────────────────────────────────────────────────────────
  const impersonate = async (targetId: string | null, password?: string) => {
    if (targetId) {
      // Start
      try {
        const { data } = await axios.post('/api/admin/impersonate', { 
          target_id: targetId,
          password: password 
        });
        // Full page reload to ensure all contexts/states are fresh
        window.location.reload();
      } catch (err: any) {
        throw new Error(err?.response?.data?.message || 'Impersonation failed');
      }
    } else {
      // Stop
      try {
        await axios.post('/api/admin/impersonate/stop');
        window.location.reload();
      } catch (err: any) {
        console.error('Failed to stop impersonation', err);
      }
    }
  };

  const effectiveStaff = staff; // Now server handles switching

  // ── derived ────────────────────────────────────────────────────────────────
  const session = user ? { user } : null;

  const retryAuth = useCallback(() => {
    // Force re-read from current Inertia page props
    if (serverStaff) {
      const s = toStaff(serverStaff as any);
      setStaff(s);
      setUser({ id: serverStaff.id, email: serverStaff.email });
    } else {
      setStaff(null);
      setUser(null);
    }
  }, [serverStaff?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff,
        loading,
        authError,
        impersonating,
        signIn,
        signOut,
        impersonate,
        effectiveStaff,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
