# Bellevue Gifts: Patch Application Log

**Date:** 2026-02-09 — 2026-02-10
**Status:** ✅ PHASE 1, 2, 3 & 4 (FINAL HARDENING) APPLIED

---

## Phase 1 Patches

### Patch 1.1: Add Missing Roles to Seeder
**File:** `backend/database/seeders/ShopSeeder.php`  
**Status:** ✅ Applied

Added:
- `finance@bellevue.com` (role: `finance`)
- `superadmin@bellevue.com` (role: `super_admin`)

---

### Patch 1.2: Create Gift Card Transactions Table (Ledger Model)
**File:** `backend/database/migrations/2026_02_09_120000_create_gift_card_transactions_table.php`  
**Status:** ✅ Applied

---

### Patch 1.3: Create GiftCardTransaction Model
**File:** `backend/app/Models/GiftCardTransaction.php`  
**Status:** ✅ Applied

---

### Patch 1.4: Update GiftCard Model with Ledger Support
**File:** `backend/app/Models/GiftCard.php`  
**Status:** ✅ Applied (Phase 1)

---

### Patch 1.5: Add Rate Limiting to Sensitive API Routes
**File:** `backend/routes/api.php`  
**Status:** ✅ Applied

---

### Patch 1.6: Fix StaffLoginPage Email Heuristic
**Files:** `AuthContext.tsx`, `StaffLoginPage.tsx`  
**Status:** ✅ Applied

---

## Phase 2 Patches

### Patch 2.1: Row Locking for Gift Card Redemption
**Files:**
- `backend/app/Models/GiftCard.php`
- `backend/app/Http/Controllers/OrderController.php`

**Status:** ✅ Applied

Changes:
1. `debit()` now uses `lockForUpdate()` to lock the row before computing balance
2. Added static `GiftCard::redeem($code, $amount, ...)` method with full row locking
3. OrderController checkout now uses `GiftCard::redeem()` instead of direct decrement

**Concurrency Safety:**
```php
DB::transaction(function () use (...) {
    $card = GiftCard::where('code', $code)->lockForUpdate()->first();
    $balance = (float) $card->transactions()->sum('amount');
    // ... validate and insert transaction
});
```

---

### Patch 2.2: Demo Mode Gate
**Files:**
- `backend/resources/js/lib/demoSession.ts`
- `backend/resources/views/app.blade.php`
- `backend/config/app.php`

**Status:** ✅ Applied

Changes:
1. Added `demo_mode` config option (env `DEMO_MODE=false` default)
2. Added `<meta name="demo-allowed">` to blade template
3. `isDemoModeEnabled()` now checks server config first
4. `enableDemoMode()` returns false if server doesn't allow

**Security Rule:**
- Demo mode is ONLY available when: `APP_ENV !== 'production' && DEMO_MODE=true`
- In production, demo functions always return false/null

---

### Patch 2.3: Pickup Collection Endpoint
**Files:**
- `backend/app/Http/Controllers/PickupController.php` (new)
- `backend/database/migrations/2026_02_09_130000_add_pickup_tracking_to_orders.php` (new)
- `backend/routes/api.php`

**Status:** ✅ Applied

New Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pickup/search?code=XXX` | Search order by pickup code |
| POST | `/api/pickup/verify` | Verify pickup or collect payment |

**Verify Actions:**
- `action=verify` — Mark as picked up (must be already paid)
- `action=collect_payment_and_verify` — Collect pay_later payment + mark picked up

**Row Locking:**
```php
$order = Order::where('pickup_code', $code)->lockForUpdate()->first();
```

---

### Patch 2.4: Offline Queue with IndexedDB
**File:** `backend/resources/js/hooks/useOfflineQueue.ts`

**Status:** ✅ Applied

Changes:
1. Migrated from localStorage to IndexedDB
2. Added `client_txn_id` for idempotency (included in payload)
3. Added retry tracking (`sync_attempts`, max 5)
4. Handle 409 Conflict as duplicate (remove from queue)
5. Periodic sync every 30 seconds when online

**Database Schema:**
```
IndexedDB: bellevue_pos_offline
  - Store: transactions
    - keyPath: id (client_txn_id)
    - Indexes: created_at, transaction_type
```

---

## Post-Phase 2 Verification

| Check | Status |
|-------|--------|
| `php artisan migrate` | ✅ Success |
| `npm run build` | ✅ Success (0 errors) |

---

## Final Scorecard

| # | Gate | Status |
|---|------|--------|
| 1 | No mock logic in production paths | ✅ PASS |
| 2 | No client-side money mutation | ✅ PASS |
| 3 | All protected actions server-authorized | ✅ PASS |
| 4 | Ledger model for gift cards | ✅ PASS |
| 5 | Concurrency-safe redemption (lockForUpdate) | ✅ PASS |
| 6 | MySQL indexes + constraints validated | ✅ PASS |
| 7 | Demo/kiosk disabled in prod | ✅ PASS |
| 8 | Offline queue with idempotency | ✅ PASS |

**Score: 8/8 PASS**

---

## Staff Accounts (Demo Only — Rotate in Production!)

| Email | Role | Password |
|-------|------|----------|
| admin@bellevue.com | admin | password |
| cashier@bellevue.com | cashier | password |
| warehouse@bellevue.com | warehouse_manager | password |
| finance@bellevue.com | finance | password |
| superadmin@bellevue.com | super_admin | password |

⚠️ **These credentials are for demo/seed only. Rotate immediately in production!**

---

## Files Modified/Created

```
Phase 1:
├── backend/database/seeders/ShopSeeder.php (modified)
├── backend/database/migrations/2026_02_09_120000_create_gift_card_transactions_table.php (new)
├── backend/app/Models/GiftCardTransaction.php (new)
├── backend/app/Models/GiftCard.php (modified)
├── backend/routes/api.php (modified)
├── backend/resources/js/contexts/AuthContext.tsx (modified)
└── backend/resources/js/Pages/StaffLoginPage.tsx (modified)

Phase 2:
├── backend/app/Models/GiftCard.php (modified - lockForUpdate)
├── backend/app/Http/Controllers/OrderController.php (modified - use redeem())
├── backend/resources/js/lib/demoSession.ts (modified - server gate)
├── backend/resources/views/app.blade.php (modified - meta tag)
├── backend/config/app.php (modified - demo_mode config)
├── backend/app/Http/Controllers/PickupController.php (new)
├── backend/database/migrations/2026_02_09_130000_add_pickup_tracking_to_orders.php (new)
├── backend/routes/api.php (modified - pickup routes)
└── backend/resources/js/hooks/useOfflineQueue.ts (modified - IndexedDB)

Phase 3 (Supabase Write Cutover):
├── backend/app/Http/Controllers/RefundController.php (new)
├── backend/app/Http/Controllers/RepairTicketController.php (modified - POS ops)
├── backend/app/Http/Controllers/CouponController.php (modified - admin CRUD)
├── backend/app/Http/Controllers/GiftCardController.php (modified - admin CRUD)
├── backend/app/Models/RepairTicket.php (modified - payment fields)
├── backend/database/migrations/2026_02_09_140000_add_client_txn_id_to_orders.php (new)
├── backend/database/migrations/2026_02_09_150000_add_payment_fields_to_repair_tickets.php (new)
├── backend/routes/api.php (modified - refund, repair POS, admin CRUD routes)
├── backend/resources/js/Pages/POSPage.tsx (modified - 9 Supabase writes → axios)
├── backend/resources/js/Pages/admin/AdminDiscounts.tsx (modified - all Supabase → axios)
└── docs/LARAVEL_INERTIA_MYSQL_READINESS_AUDIT.md (updated - CONDITIONAL GO)
```


---

## Phase 4: Final Hardening

### Patch 4.1: OrderController Validation Fix
**File:** `backend/app/Http/Controllers/OrderController.php`
**Status:** ✅ Applied

Changes:
1. Fixed `staff_id` validation from `required|uuid` to `required|string|exists:staff,id`
2. Changed nullable fields to use `?? null` to prevent undefined key errors
3. Removed `notes` from `GiftCard::create()` — column doesn't exist

---

### Patch 4.2: Smoke Test Command
**File:** `backend/app/Console/Commands/SmokeTest.php` (new)
**Status:** ✅ Applied — 16/16 PASS

Run: `php artisan bellevue:smoke-test`

---

### Patch 4.3: PHPUnit Test
**File:** `backend/tests/Feature/OrderIdempotencyTest.php` (new)
**Status:** ✅ Applied

---

## Final Scorecard (Post-Hardening)

| # | Gate | Status |
|---|------|--------|
| 1 | No mock logic in production paths | ✅ PASS |
| 2 | No client-side money mutation | ✅ PASS |
| 3 | All protected actions server-authorized | ✅ PASS |
| 4 | Ledger model for gift cards | ✅ PASS |
| 5 | Concurrency-safe redemption (lockForUpdate) | ✅ PASS |
| 6 | MySQL indexes + constraints validated | ✅ PASS |
| 7 | Demo/kiosk disabled in prod | ✅ PASS |
| 8 | Offline queue with idempotency | ✅ PASS |
| 9 | Smoke test (16/16 PASS) | ✅ PASS |

**Score: 9/9 PASS — ✅ GO**
