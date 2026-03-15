import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
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
  impersonating: Staff | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; staff?: Staff | null }>;
  signOut: () => Promise<void>;
  impersonate: (staff: Staff | null) => void;
  effectiveStaff: Staff | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Turn a server staff payload { id, name, email, role } into a full Staff object */
function toStaff(data: { id: number | string; name: string; email: string; role: string }): Staff {
  return {
    id: String(data.id),
    auth_user_id: null,
    name: data.name,
    email: data.email,
    role: data.role as Staff['role'],
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

/** Read the CSRF token that Laravel bakes into the meta tag */
function csrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') ?? '' : '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<Staff | null>(null);

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

  const initializeAuth = useCallback(() => {
    setLoading(true);
    setAuthError(null);

    // Real session – trust what the server shared via Inertia
    if (serverStaff) {
      const s = toStaff(serverStaff);
      setStaff(s);
      setUser({ id: serverStaff.id, email: serverStaff.email });
    } else {
      setStaff(null);
      setUser(null);
    }

    setLoading(false);
  }, [serverStaff]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ── sign in ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: Error | null; staff?: Staff | null }> => {
    try {
      const res = await fetch('/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken(),
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const body = await res.json();
          // Laravel validation errors come as { errors: { email: ['...'] } }
          message = body?.errors?.email?.[0] ?? body?.message ?? message;
        } catch {
          // non-JSON error body
        }
        return { error: new Error(message) };
      }

      const data = await res.json();          // { staff: { id, name, email, role } }
      const s = toStaff(data.staff);
      setStaff(s);
      setUser({ id: data.staff.id, email: data.staff.email });
      setAuthError(null);

      return { error: null, staff: s };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  // ── sign out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    setImpersonating(null);

    try {
      await fetch('/staff/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrfToken(),
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });
    } catch {
      // best-effort – clear local state regardless
    }

    setStaff(null);
    setUser(null);
  };

  // ── impersonation ──────────────────────────────────────────────────────────
  const impersonate = (targetStaff: Staff | null) => {
    if (staff?.role !== 'admin') return;
    setImpersonating(targetStaff);
  };

  const effectiveStaff = impersonating ?? staff;

  // ── derived ────────────────────────────────────────────────────────────────
  const session = user ? { user } : null;

  const retryAuth = useCallback(() => {
    initializeAuth();
  }, [initializeAuth]);

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
