// Demo session management for reliable shareholder demos
// This provides a localStorage-based fallback when Supabase is unreachable
// SECURITY: Demo mode is only available when server explicitly allows it

export type DemoRole = 'admin' | 'cashier' | 'warehouse';

export interface DemoSession {
  enabled: boolean;
  role: DemoRole;
  email: string;
  name: string;
  createdAt: string;
}

const DEMO_SESSION_KEY = 'demo_session';
const DEMO_MODE_KEY = 'DEMO_MODE';

// Get server-side demo mode status from page meta (set by Laravel)
// Returns true only if APP_ENV !== 'production' AND DEMO_MODE env is true
function isServerDemoAllowed(): boolean {
  const meta = document.querySelector('meta[name="demo-allowed"]');
  return meta?.getAttribute('content') === 'true';
}

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; name: string }> = {
  cashier: { email: 'cashier1@bellevue.demo', name: 'Maria Santos' },
  warehouse: { email: 'warehouse1@demo.com', name: 'Warehouse Manager' },
  admin: { email: 'admin1@demo.com', name: 'Admin User' },
};

export function isDemoModeEnabled(): boolean {
  // Must be allowed by server AND enabled locally
  if (!isServerDemoAllowed()) {
    return false;
  }
  return localStorage.getItem(DEMO_MODE_KEY) === '1';
}

export function enableDemoMode(): boolean {
  // Refuse to enable if server doesn't allow
  if (!isServerDemoAllowed()) {
    console.warn('Demo mode is not available in this environment');
    return false;
  }
  localStorage.setItem(DEMO_MODE_KEY, '1');
  return true;
}

export function disableDemoMode(): void {
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
}

export function getDemoSession(): DemoSession | null {
  try {
    const stored = localStorage.getItem(DEMO_SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as DemoSession;
  } catch {
    return null;
  }
}

export function setDemoSession(role: DemoRole): DemoSession {
  const account = DEMO_ACCOUNTS[role];
  const session: DemoSession = {
    enabled: true,
    role,
    email: account.email,
    name: account.name,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(DEMO_MODE_KEY, '1');
  return session;
}

export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_SESSION_KEY);
}

// Fixed UUIDs for demo staff - these are valid UUIDs that won't conflict with real data
// Using a predictable pattern so they're recognizable but valid for database operations
const DEMO_STAFF_UUIDS: Record<DemoRole, string> = {
  cashier: '00000000-0000-0000-0000-000000000001',
  warehouse: '00000000-0000-0000-0000-000000000002',
  admin: '00000000-0000-0000-0000-000000000003',
};

export function createDemoStaff(role: DemoRole): {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: 'cashier' | 'warehouse_manager' | 'admin';
  is_active: boolean;
  created_at: string;
  is_demo: boolean;
} {
  const account = DEMO_ACCOUNTS[role];
  const mappedRole = role === 'warehouse' ? 'warehouse_manager' : role;

  return {
    id: DEMO_STAFF_UUIDS[role],
    auth_user_id: null,
    name: account.name,
    email: account.email,
    role: mappedRole as 'cashier' | 'warehouse_manager' | 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    is_demo: true, // Flag to indicate this is a demo staff record
  };
}

// Check if a staff ID is a demo staff ID
export function isDemoStaffId(staffId: string | null | undefined): boolean {
  if (!staffId) return false;
  return Object.values(DEMO_STAFF_UUIDS).includes(staffId);
}

// Check if current session allows access to a specific area
export function canAccessPOS(role?: DemoRole | string | null): boolean {
  if (!role) return false;
  return ['admin', 'cashier', 'warehouse', 'warehouse_manager'].includes(role);
}

export function canAccessAdmin(role?: DemoRole | string | null): boolean {
  if (!role) return false;
  return ['admin', 'warehouse', 'warehouse_manager'].includes(role);
}

export function canAccessStaffManagement(role?: DemoRole | string | null): boolean {
  if (!role) return false;
  return role === 'admin';
}
