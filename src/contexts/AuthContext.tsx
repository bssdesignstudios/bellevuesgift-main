import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Staff } from '@/types';
import { 
  isDemoModeEnabled, 
  getDemoSession, 
  createDemoStaff,
  DemoSession 
} from '@/lib/demoSession';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  loading: boolean;
  authError: string | null;
  impersonating: Staff | null;
  demoSession: DemoSession | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  impersonate: (staff: Staff | null) => void;
  effectiveStaff: Staff | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 6000; // 6 seconds timeout

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<Staff | null>(null);
  const [demoSession, setDemoSessionState] = useState<DemoSession | null>(null);

  const fetchStaffProfile = useCallback(async (userId: string) => {
    try {
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching staff profile:', error);
        return null;
      }
      return staffData as Staff | null;
    } catch (err) {
      console.error('Staff fetch exception:', err);
      return null;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    
    // Check for demo mode first
    const demoMode = isDemoModeEnabled();
    const storedDemoSession = getDemoSession();
    
    if (demoMode && storedDemoSession?.enabled) {
      // Use demo session - bypass Supabase entirely
      setDemoSessionState(storedDemoSession);
      const demoStaff = createDemoStaff(storedDemoSession.role);
      setStaff(demoStaff);
      setLoading(false);
      return;
    }
    
    // Create a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timed out');
      setLoading(false);
      setAuthError('Authentication timed out. Click "Continue Demo Mode" or refresh.');
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
        const staffData = await fetchStaffProfile(session.user.id);
        setStaff(staffData);
      } else {
        setStaff(null);
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (err) {
      console.error('Auth initialization error:', err);
      clearTimeout(timeoutId);
      setAuthError('Failed to initialize authentication');
      setLoading(false);
    }
  }, [fetchStaffProfile]);

  const retryAuth = useCallback(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let mounted = true;
    
    // Check for demo session on mount
    const storedDemoSession = getDemoSession();
    if (storedDemoSession?.enabled) {
      setDemoSessionState(storedDemoSession);
    }
    
    // Initialize auth
    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        // Skip if in demo mode
        if (isDemoModeEnabled() && getDemoSession()?.enabled) {
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        
        if (session?.user) {
          const staffData = await fetchStaffProfile(session.user.id);
          if (mounted) {
            setStaff(staffData);
          }
        } else {
          if (mounted) {
            setStaff(null);
            setImpersonating(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth, fetchStaffProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    setImpersonating(null);
    setDemoSessionState(null);
    await supabase.auth.signOut();
  };

  const impersonate = (targetStaff: Staff | null) => {
    // Only admins can impersonate
    if (staff?.role !== 'admin' && !demoSession) return;
    setImpersonating(targetStaff);
  };

  const effectiveStaff = impersonating ?? staff;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff,
        loading,
        authError,
        impersonating,
        demoSession,
        signIn,
        signOut,
        impersonate,
        effectiveStaff,
        retryAuth
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
