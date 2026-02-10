# Authentication Agent: Evidence Report

## Summary

The application has **three authentication systems**:
1. **Laravel Auth** - Staff authentication (production)
2. **Supabase Auth** - Customer + staff authentication (legacy)
3. **Demo Mode** - localStorage-based bypass (development)

## Evidence

### 1. Laravel Staff Authentication

**Controller:** `backend/app/Http/Controllers/AuthController.php`

```php
// Line 14-15: Allowed staff roles
$staffRoles = ['admin', 'cashier', 'warehouse', 'warehouse_manager', 'finance'];
```

**Login Controller:** `backend/app/Http/Controllers/Auth/LoginController.php`

| Role | Redirect Path | Line |
|------|---------------|------|
| `admin` | `/admin` | L45 |
| `cashier` | `/pos` | L49 |
| `warehouse_manager` | `/kiosk/warehouse` | L53 |
| Other | `/shop` | L56 |

### 2. Staff Credentials (Seeders)

**File:** `backend/database/seeders/ShopSeeder.php`

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `admin@bellevue.com` | `password` | `admin` | ✅ Seeded |
| `cashier@bellevue.com` | `password` | `cashier` | ✅ Seeded |
| `warehouse@bellevue.com` | `password` | `warehouse_manager` | ✅ Seeded |
| `finance@bellevue.com` | `password` | `finance` | ❌ Not seeded |
| `warehouse_staff@bellevue.com` | `password` | `warehouse` | ❌ Not seeded |

### 3. Supabase Customer Auth

**File:** `src/contexts/CustomerAuthContext.tsx`

```typescript
// Line 137-167: Sign up flow
const signUp = async (email: string, password: string, name: string, phone?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  // Creates customer profile in customers table
};
```

### 4. Supabase Staff Auth

**File:** `src/contexts/AuthContext.tsx`

```typescript
// Line 40-58: Fetch staff profile
const fetchStaffProfile = useCallback(async (userId: string) => {
  const { data: staffData } = await supabase
    .from('staff')
    .select('*')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return staffData;
}, []);
```

### 5. Demo Mode System

**File:** `src/lib/demoSession.ts`

```typescript
// Line 17-21: Demo accounts
export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; name: string }> = {
  cashier: { email: 'cashier1@bellevue.demo', name: 'Maria Santos' },
  warehouse: { email: 'warehouse1@demo.com', name: 'Warehouse Manager' },
  admin: { email: 'admin1@demo.com', name: 'Admin User' },
};

// Line 66-70: Fixed demo UUIDs
const DEMO_STAFF_UUIDS: Record<DemoRole, string> = {
  cashier: '00000000-0000-0000-0000-000000000001',
  warehouse: '00000000-0000-0000-0000-000000000002',
  admin: '00000000-0000-0000-0000-000000000003',
};
```

### 6. RBAC Middleware (Laravel)

**File:** `backend/routes/web.php`

```php
// POS access
Route::middleware(['auth', 'role:admin,cashier,warehouse,warehouse_manager'])

// Admin access (overview)
Route::middleware(['role:admin,finance'])

// Staff management (admin only)
Route::middleware(['role:admin'])
```

### 7. User Model Role Check

**File:** `backend/app/Models/User.php`

```php
// Line 60-68
public function hasRole(string $role): bool
{
    return $this->role === $role;
}

public function hasAnyRole(array $roles): bool
{
    return in_array($this->role, $roles);
}
```

## Issues Found

1. **Email Heuristic in Frontend**
   - File: `backend/resources/js/Pages/StaffLoginPage.tsx:37`
   - Issue: `router.visit(email.includes('admin') ? '/admin' : '/pos')`
   - Fix: Use authenticated user's role property

2. **Missing Roles in Seeders**
   - `finance` role not seeded
   - `warehouse` role not seeded (distinct from `warehouse_manager`)

3. **Finance Role Redirect**
   - Not handled in LoginController
   - Should redirect to `/admin`

## Recommendations

1. Update `StaffLoginPage.tsx` to use role-based redirects
2. Add missing roles to `ShopSeeder.php`
3. Update `LoginController.php` to handle `finance` role
4. Disable demo mode in production environment
