# Laravel + Inertia + MySQL Readiness Audit (Post-Patch)

**Version:** 2.0  
**Date:** 2026-02-09  
**Commit:** `2ab808e` (HEAD → main)  
**Auditor:** Anti-Gravity Agent (QA Role)  
**Method:** Independent code inspection (no reliance on prior audit conclusions)

---

## Executive Summary

| # | Gate | Status | Blocker? |
|---|------|--------|----------|
| 1 | No mock logic in production paths | ✅ PASS | — |
| 2 | No client-side money mutation | ❌ **FAIL** | **YES** |
| 3 | All protected actions server-authorized | ⚠️ WARN | Semi |
| 4 | Ledger model for gift cards | ✅ PASS | — |
| 5 | Concurrency-safe redemption/pickup | ⚠️ WARN | Semi |
| 6 | MySQL indexes + constraints validated | ✅ PASS | — |
| 7 | Demo/kiosk disabled in prod | ✅ PASS | — |
| 8 | Inertia is the UI router | ⚠️ WARN | — |
| 9 | Offline queue with idempotency | ❌ **FAIL** | **YES** |
| 10 | Rate limiting on sensitive endpoints | ✅ PASS | — |

### Verdict: ❌ NO-GO

**Score: 6/10 PASS | 3 WARN | 2 FAIL**

Two critical FAILs block production cutover. The primary checkout flow is correctly routed through Laravel, but **POS sub-tabs (Pickup, Refund, Repair) still use the legacy Supabase JS client for direct client-side data mutations**, completely bypassing Laravel middleware, row locking, DB transactions, and the gift card ledger model. Additionally, the offline queue sends a `client_txn_id` but the **server never enforces idempotency**.

---

## Gate 1: No Mock Logic in Production Paths

**Status:** ✅ PASS

### Evidence

| Check | Result | File | Line |
|-------|--------|------|------|
| `DEMO_MODE` env default | `false` | `config/app.php` | L129 |
| Server meta tag gate | `APP_ENV !== 'production' && config('app.demo_mode')` | `app.blade.php` | L13 |
| Client checks server before enabling | `isServerDemoAllowed()` reads meta tag | `demoSession.ts` | L12-16 |
| No demo bypass in Laravel controllers | Confirmed | `grep -r 'demo' app/Http/` | 0 results |

**Analysis:** The demo mode is doubly-gated. The server only emits the `demo-allowed` meta tag when `APP_ENV !== production`. The client-side `demoSession.ts` reads this meta tag before allowing demo activation. Even if a user manipulates `localStorage`, the Laravel auth middleware prevents access to protected routes without a valid session.

**PATCH_LOG cross-reference:** Patch 2.2 ✅ Confirmed applied.

---

## Gate 2: No Client-Side Money Mutation

**Status:** ❌ **FAIL — CRITICAL BLOCKER**

### What Works (PASS)

The primary POS checkout flow correctly routes through Laravel:

```
POSPage.tsx CheckoutDialog → axios.post('/api/pos/checkout')
  → OrderController::checkout() → DB::transaction → GiftCard::redeem()
```

**Evidence:** `POSPage.tsx:557` — `await axios.post('/api/pos/checkout', {...})`

### What Fails

**Three POS sub-tabs perform money mutations directly via the Supabase JS client**, bypassing Laravel entirely:

#### PickupTab (L682-758)
| Operation | Line | Supabase Call | Severity |
|-----------|------|---------------|----------|
| Search order | L696 | `supabase.from('orders').select(...)` | READ |
| Update order status | L721 | `supabase.from('orders').update({ status: 'picked_up' })` | ❌ WRITE |
| Read inventory | L729 | `supabase.from('inventory').select(...)` | READ |
| Update inventory | L736 | `supabase.from('inventory').update({ qty_on_hand: ... })` | ❌ WRITE |

#### PickupPaymentForm (L844-903)
| Operation | Line | Supabase Call | Severity |
|-----------|------|---------------|----------|
| Insert payment record | L852 | `supabase.from('payments').insert({...})` | ❌ WRITE (MONEY) |
| Update payment status | L860 | `supabase.from('orders').update({ payment_status: 'paid' })` | ❌ WRITE (MONEY) |

#### RefundTab (L906-1028)
| Operation | Line | Supabase Call | Severity |
|-----------|------|---------------|----------|
| Search order | L916 | `supabase.from('orders').select(...)` | READ |
| Update order status to refunded | L938 | `supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded' })` | ❌ WRITE (MONEY) |
| Insert negative payment | L944 | `supabase.from('payments').insert({ amount: -N })` | ❌ WRITE (MONEY) |
| Update inventory (return stock) | L954-961 | `supabase.from('inventory').update(...)` | ❌ WRITE |

#### RepairTab (L1031-1100)
| Operation | Line | Supabase Call | Severity |
|-----------|------|---------------|----------|
| Search ticket | L1043 | `supabase.from('repair_tickets').select(...)` | READ |
| Mark picked up | L1065 | `supabase.from('repair_tickets').update({ status: 'completed' })` | ❌ WRITE |
| Collect deposit | L1086 | `supabase.from('repair_tickets').update({ deposit_paid: true })` | ❌ WRITE |

#### RepairPaymentForm (L1219-1290)
| Operation | Line | Supabase Call | Severity |
|-----------|------|---------------|----------|
| Insert payment | L1232 | `supabase.from('payments').insert({...})` | ❌ WRITE (MONEY) |
| Update ticket status | L1240 | `supabase.from('repair_tickets').update(...)` | ❌ WRITE |

### Additional Client-Side Mutations (Non-POS)

| File | Operation | Line | Tables |
|------|-----------|------|--------|
| `AdminDiscounts.tsx` | CRUD coupons | L59,67,170,173 | `coupons` |
| `AdminDiscounts.tsx` | CRUD gift cards | L233,316,319 | `gift_cards` ❌ |
| `ProductPage.tsx` | Wishlist toggle | L63-73 | `wishlists` |

### Impact

- **No authorization check** — Any authenticated Supabase user can mutate `payments` and `orders` tables
- **No DB transaction** — Inventory update and order status update are not atomic; a failure mid-sequence corrupts data
- **No row locking** — Concurrent pickup/refund operations can race
- **No audit trail** — No server-side logging of these critical financial operations
- **Direct gift card balance manipulation** — `AdminDiscounts.tsx:233` can update `gift_cards.is_active` and potentially bypass the ledger

### Remediation Required

All Supabase `.from(...).insert/update/delete` calls in POS sub-tabs MUST be replaced with `axios.post('/api/...')` calls to Laravel endpoints that use `DB::transaction()` and `lockForUpdate()`.

---

## Gate 3: All Protected Actions Server-Authorized

**Status:** ⚠️ WARN

### What Works

| Route Pattern | Middleware | Evidence |
|---------------|-----------|----------|
| `/pos` | `auth, role:admin,cashier,warehouse,warehouse_manager` | `web.php:182` |
| `/admin/*` | `auth, role:admin,finance` | `web.php:233-236` |
| `/kiosk/*` | `auth, role:admin,warehouse_manager,cashier` | `web.php:310+` |
| `POST /api/pos/checkout` | `auth:sanctum` | `api.php:49` |
| `POST /api/pickup/verify` | `auth:sanctum` | `api.php:57` |

**Middleware files verified:**
- `RoleMiddleware.php` — Checks `user->role` against allowed roles, redirects on failure
- `EnsureUserHasRole.php` — Checks `user->hasRole()`, aborts 403 on failure

### What Fails

The Supabase client uses `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key), which means **Supabase RLS (Row Level Security) is the only authorization gate** for the client-side mutations listed in Gate 2. If RLS policies are permissive or misconfigured, any client can mutate financial records.

**File:** `integrations/supabase/client.ts:6-12`

---

## Gate 4: Ledger Model for Gift Cards

**Status:** ✅ PASS

### Evidence

| Component | Status | File | Line |
|-----------|--------|------|------|
| `gift_card_transactions` migration | ✅ Created | `2026_02_09_120000_create_gift_card_transactions_table.php` | L13-42 |
| `GiftCardTransaction` model | ✅ Created | `app/Models/GiftCardTransaction.php` | L1-42 |
| `computed_balance` from ledger | ✅ `transactions()->sum('amount')` | `app/Models/GiftCard.php` | L99-103 |
| `credit()` creates transaction | ✅ Uses `GiftCardTransaction::create()` | `app/Models/GiftCard.php` | L108-117 |
| `debit()` creates transaction | ✅ Uses `GiftCardTransaction::create()` | `app/Models/GiftCard.php` | L119-145 |
| `redeem()` creates transaction | ✅ Uses `debit()` internally + state checks | `app/Models/GiftCard.php` | L147-176 |

**Note:** The legacy `balance` column on `gift_cards` still exists. The `GiftCard.php` model maintains it for backward compatibility, but the authoritative balance is computed from transactions.

**PATCH_LOG cross-reference:** Patch 1.2, 1.3, 1.4 ✅ Confirmed applied.

---

## Gate 5: Concurrency-Safe Redemption/Pickup

**Status:** ⚠️ WARN

### What Works (Backend)

| Operation | Lock Type | File | Line |
|-----------|-----------|------|------|
| Gift card debit | `lockForUpdate()` | `GiftCard.php` | L124 |
| Gift card redeem | `lockForUpdate()` | `GiftCard.php` | L158 |
| Pickup verify | `lockForUpdate()` on Order | `PickupController.php` | L35 |
| Checkout | `DB::transaction()` | `OrderController.php` | L92 |

### What Fails

The **POS PickupTab does NOT call `PickupController::verify()`**. Instead, it directly mutates the order via the Supabase client (see Gate 2, L721-746). This means:

- **No row lock** on concurrent pickup attempts
- **No atomic transaction** wrapping status + inventory update
- **No payment validation** before marking as picked up

The `PickupController` endpoint exists at `POST /api/pickup/verify` and is correctly implemented with `lockForUpdate()`, but **it is never called by the POS UI**.

**PATCH_LOG cross-reference:** Patch 2.1 (row locking) ✅ Applied in backend, but Patch 2.3 (pickup endpoint) ⚠️ Created but **not wired to POS UI**.

---

## Gate 6: MySQL Indexes + Constraints Validated

**Status:** ✅ PASS

| Table | Column(s) | Constraint | Evidence |
|-------|-----------|------------|----------|
| `orders` | `order_number` | `unique()` | `create_order_management_tables.php:15` |
| `orders` | `pickup_code` | `unique()` | `add_pickup_tracking_to_orders.php:31` |
| `gift_cards` | `code` | `unique()` | `create_order_management_tables.php:56` |
| `gift_card_transactions` | `gift_card_id, created_at` | `index()` | `create_gift_card_transactions_table.php:30` |
| `products` | `slug` | `unique()` | `create_shop_base_tables.php:26` |
| `products` | `sku` | `unique()` | `create_shop_base_tables.php:27` |
| `categories` | `slug` | `unique()` | `create_shop_base_tables.php:16` |
| `users` | `email` | `unique()` | Default Laravel migration |
| `repair_tickets` | `ticket_number` | `unique()` | `create_repair_service_tables.php:16` |
| `coupons` | `code` | `unique()` | `create_order_management_tables.php:66` |

**Money columns:** All use `DECIMAL(10,2)` — safe for MySQL.

---

## Gate 7: Demo/Kiosk Disabled in Production

**Status:** ✅ PASS

### Evidence Chain

1. **Config:** `config/app.php:129` — `'demo_mode' => env('DEMO_MODE', false)`
2. **Blade gate:** `app.blade.php:13` — Meta tag only emitted when `APP_ENV !== 'production' && DEMO_MODE === true`
3. **Client gate:** `demoSession.ts:12-16` — `isServerDemoAllowed()` reads the meta tag
4. **Client enforcement:** `enableDemoMode()` returns `false` if server doesn't allow (L30-34)
5. **Kiosk routes:** All protected by `auth + role` middleware in `web.php:310+`

**No backdoor found:** Even if a user forces `localStorage` values, the Laravel auth middleware blocks access to `/pos`, `/admin`, and `/kiosk/*` without a valid, correctly-roled session.

---

## Gate 8: Inertia is the UI Router

**Status:** ⚠️ WARN

### Routing: PASS

All `web.php` routes use `Inertia::render()`. The client uses `@inertiajs/react` `router.visit()` for navigation. No parallel SPA routing (e.g., React Router) was found.

### Data Flow: WARN

Multiple pages bypass Inertia's data flow by fetching data directly from the Supabase JS client instead of receiving it via Inertia shared props:

| Page | Data Source | Should Be |
|------|-------------|-----------|
| `ShopPage.tsx` | `supabase.from('products')` | Inertia prop via controller |
| `ProductPage.tsx` | `supabase.from('products')` | Inertia prop via controller |
| `CategoryPage.tsx` | `supabase.from('categories')` | Inertia prop via controller |
| `OrderPage.tsx` | `supabase.from('orders')` | Inertia prop via controller |
| `TrackOrderPage.tsx` | `supabase.from('orders')` | Inertia prop via controller |
| `CheckoutSuccessPage.tsx` | `supabase.from('orders')` | Inertia prop via controller |
| `AdminOrders.tsx` | `supabase.from('orders')` | Inertia prop via controller |
| `AdminStaff.tsx` | `supabase` | Inertia prop via controller |

**Impact:** These pages will **fail silently in production** if the Supabase connection is not configured or the Supabase project is decommissioned. The intent of the Laravel migration was to remove Supabase dependency entirely.

**Note:** POSPage.tsx correctly uses `axios.get('/api/pos/products')` and `axios.get('/api/pos/categories')` for the main product grid — this part is properly migrated.

---

## Gate 9: Offline Queue with Idempotency

**Status:** ❌ **FAIL — CRITICAL BLOCKER**

### Client-Side: Implemented

| Feature | Status | Evidence |
|---------|--------|----------|
| IndexedDB storage | ✅ | `useOfflineQueue.ts:32-67` |
| `client_txn_id` generation | ✅ | `useOfflineQueue.ts:100` |
| Retry tracking (max 5) | ✅ | `useOfflineQueue.ts:112-118` |
| 409 Conflict handling | ✅ | `useOfflineQueue.ts:134-136` |
| Auto-sync every 30s | ✅ | `useOfflineQueue.ts:185-195` |

### Server-Side: **NOT IMPLEMENTED**

| Feature | Status | Evidence |
|---------|--------|----------|
| `client_txn_id` uniqueness check | ❌ Not found | `grep -r 'client_txn_id' app/` → 0 results |
| Idempotency middleware | ❌ Not found | `grep -r 'idempoten' app/` → 0 results |
| 409 response on duplicate | ❌ Not found | No controller returns 409 |

**Impact:** If a POS client retries a transaction (e.g., due to network timeout), the server will process it again, creating **duplicate orders and double-charging customers**.

**PATCH_LOG cross-reference:** Patch 2.4 ✅ Client-side applied, but server-side was never implemented.

### Remediation Required

Add to `OrderController::checkout()`:
```php
$existing = Order::where('client_txn_id', $validated['client_txn_id'])->first();
if ($existing) {
    return response()->json($existing, 409);
}
```

And add a `client_txn_id` unique column to the `orders` migration.

---

## Gate 10: Rate Limiting on Sensitive Endpoints

**Status:** ✅ PASS

| Endpoint | Rate Limit | Evidence |
|----------|-----------|----------|
| `POST /api/pos/gift-cards/check` | `throttle:10,1` | `api.php:53` |
| `POST /api/repair/status` | `throttle:10,1` | `api.php:62` |

**PATCH_LOG cross-reference:** Patch 1.5 ✅ Confirmed applied.

---

## Cross-Reference: PATCH_LOG.md vs. Actual State

| Patch | PATCH_LOG Claim | Actual State |
|-------|-----------------|--------------|
| 1.1 Seeder roles | ✅ Applied | ✅ Confirmed |
| 1.2 gift_card_transactions table | ✅ Applied | ✅ Confirmed |
| 1.3 GiftCardTransaction model | ✅ Applied | ✅ Confirmed |
| 1.4 GiftCard ledger support | ✅ Applied | ✅ Confirmed |
| 1.5 Rate limiting | ✅ Applied | ✅ Confirmed |
| 1.6 StaffLoginPage email fix | ✅ Applied | ✅ Confirmed (backend) |
| 2.1 Row locking | ✅ Applied | ✅ Confirmed (backend) |
| 2.2 Demo mode gate | ✅ Applied | ✅ Confirmed |
| 2.3 Pickup endpoint | ✅ Applied | ⚠️ Created but **not wired to POS UI** |
| 2.4 Offline queue | ✅ Applied | ⚠️ Client only — **no server-side idempotency** |

**PATCH_LOG Final Scorecard claims 8/8 PASS — this is INACCURATE.** The scorecard does not acknowledge:
- The Supabase client-side mutations in POS sub-tabs
- The unconnected PickupController
- The missing server-side idempotency enforcement

---

## Cross-Reference: REMEDIATION_PLAN.md vs. Actual State

| Issue | Plan | Current Status |
|-------|------|----------------|
| 1.1 Email heuristic | Fix redirect by role | ✅ Fixed in backend `StaffLoginPage.tsx` |
| 1.2 Missing roles in seeder | Add finance, warehouse | ✅ Fixed |
| 1.3 Demo mode bypass | Env-gate in production | ✅ Fixed |
| 1.4 Reviews feature | Create `product_reviews` table | ⏸️ Not started (not a blocker) |
| 1.5 Internal analytics | Create `analytics_events` | ⏸️ Not started (not a blocker) |

---

## Supabase Client Dependency Inventory

The legacy Supabase JS client is still imported and actively used across **11 page components**:

| File | Reads | Writes | Critical? |
|------|-------|--------|-----------|
| `POSPage.tsx` | 3 | **14** | ❌ CRITICAL |
| `AdminDiscounts.tsx` | 2 | **7** | ⚠️ HIGH |
| `AdminOrders.tsx` | 1 | 0 | LOW |
| `AdminStaff.tsx` | 1 | 0 | LOW |
| `ShopPage.tsx` | 2 | 0 | LOW |
| `ProductPage.tsx` | 2 | **2** | MEDIUM |
| `CategoryPage.tsx` | 2 | 0 | LOW |
| `OrderPage.tsx` | 1 | 0 | LOW |
| `TrackOrderPage.tsx` | 1 | 0 | LOW |
| `CheckoutSuccessPage.tsx` | 2 | 0 | LOW |
| `debug/SupabaseStatus.tsx` | 1 | 0 | LOW |

**Client config:** `integrations/supabase/client.ts` — Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars.

---

## MISSING List (Exact Items — Ordered by Priority)

### P0 — Must Fix Before Production (Blockers)

1. **Replace Supabase client-side mutations in POS sub-tabs with Laravel API calls**
   - `PickupTab` → Use existing `POST /api/pickup/verify` (already built, just not wired)
   - `RefundTab` → Create `POST /api/pos/refund` endpoint with `DB::transaction()` + `lockForUpdate()`
   - `RepairTab` → Create `POST /api/repairs/{id}/pickup` and `POST /api/repairs/{id}/deposit` endpoints
   - `PickupPaymentForm` → Wire to `POST /api/pickup/verify` with `action=collect_payment_and_verify`
   - `RepairPaymentForm` → Wire to new repair payment endpoint

2. **Implement server-side idempotency for `client_txn_id`**
   - Add `client_txn_id` unique column to `orders` table
   - Check for existing order with same `client_txn_id` before processing
   - Return 409 Conflict with existing order data if duplicate

### P1 — Should Fix Before Production

3. **Replace Supabase mutations in `AdminDiscounts.tsx`**
   - Gift card CRUD → Laravel API endpoints
   - Coupon CRUD → Laravel API endpoints

4. **Replace Supabase reads in storefront pages with Inertia props or axios calls**
   - `ShopPage.tsx`, `ProductPage.tsx`, `CategoryPage.tsx`, `OrderPage.tsx`, `TrackOrderPage.tsx`, `CheckoutSuccessPage.tsx`

### P2 — Post-Launch

5. **Remove `integrations/supabase/` directory entirely** once all references are migrated
6. **Remove `VITE_SUPABASE_*` env vars** from `.env` and build config
7. **Implement product reviews** (REMEDIATION_PLAN §1.4)
8. **Implement analytics events** (REMEDIATION_PLAN §1.5)

---

## Recommended Patch Order (Phase 3)

```
Phase 3.1 — POS Sub-Tab Migration (P0, estimated: 4-6 hours)
├── Wire PickupTab to POST /api/pickup/verify (endpoint exists)
├── Create POST /api/pos/refund with DB::transaction + lockForUpdate
├── Create POST /api/repairs/{id}/status endpoints
├── Replace all supabase calls in POSPage.tsx sub-tabs
└── Remove supabase import from POSPage.tsx

Phase 3.2 — Idempotency (P0, estimated: 1-2 hours)
├── Migration: add client_txn_id (nullable, unique) to orders
├── OrderController: check for existing order before insert
└── Return 409 with existing order on duplicate

Phase 3.3 — Admin Migration (P1, estimated: 3-4 hours)
├── Create CouponController with full CRUD
├── Create GiftCardAdminController with CRUD
├── Replace AdminDiscounts.tsx supabase calls
└── Wire ProductPage wishlist to Laravel endpoint

Phase 3.4 — Storefront Data Migration (P1, estimated: 4-6 hours)
├── Update ShopPage to receive products via Inertia prop
├── Update ProductPage controller to pass product via Inertia
├── Update CategoryPage, OrderPage, TrackOrderPage
└── Update CheckoutSuccessPage
```

---

## Final Verdict

### ❌ NO-GO

| Category | Count |
|----------|-------|
| ✅ PASS | 6 |
| ⚠️ WARN | 2 |
| ❌ FAIL | 2 |

**The application CANNOT go to production** until:

1. **All client-side money mutations in POS sub-tabs are replaced with server-side Laravel endpoints** (Gate 2 FAIL). The Pickup, Refund, and Repair tabs currently allow any Supabase-authenticated client to directly insert payment records and modify order statuses without server-side authorization, transactions, or row locking.

2. **Server-side idempotency enforcement is implemented** (Gate 9 FAIL). Without this, the offline queue will create duplicate orders on retry, leading to double-charges.

**After Phase 3.1 + 3.2 are complete, re-audit should yield ⚠️ CONDITIONAL GO** (remaining WARNs are non-financial read operations that gracefully fail if Supabase is unavailable).

---

*Audit completed: 2026-02-09 | Next audit: After Phase 3 patches applied*
