# GO Verification — Final Hardening Evidence

**Date:** 2026-02-10
**Verdict:** ✅ GO

---

## 1. Smoke Test Results

```
╔═══════════════════════════════════════════╗
║   Bellevue Gifts — Smoke Test Suite       ║
╚═══════════════════════════════════════════╝

▶ Test 1: Order Idempotency (client_txn_id)
  ✅ PASS: First checkout returns 201
  ✅ PASS: First checkout has order
  ✅ PASS: First checkout idempotent=false
  ✅ PASS: Second checkout returns 200 (not 201)
  ✅ PASS: Second checkout idempotent=true
  ✅ PASS: Same order returned both times
  ✅ PASS: Only 1 order in DB with this txn_id (1)

▶ Test 2: Gift Card Ledger
  ✅ PASS: Gift card created
  ✅ PASS: Balance reflects credits (75.00)
  ✅ PASS: After redeem balance is 55.00

▶ Test 3: Unique Constraints
  ✅ PASS: orders.client_txn_id has UNIQUE index
  ✅ PASS: orders.pickup_code has UNIQUE index
  ✅ PASS: gift_cards.code has UNIQUE index

▶ Test 4: Security Infrastructure
  ✅ PASS: RoleMiddleware class exists
  ✅ PASS: POS checkout has auth:sanctum
  ✅ PASS: POS checkout has role middleware

Results: 16 PASS / 0 FAIL
```

---

## 2. Idempotency Design

| Component | Mechanism |
|---|---|
| Key | `client_txn_id` (nullable, unique) |
| Pre-check | `Order::where('client_txn_id', ...)->first()` returns 200 |
| Race guard | `try-catch UniqueConstraintViolationException` returns existing |
| Inventory lock | `Inventory::lockForUpdate()` inside DB transaction |
| Response flag | `idempotent: true/false` in JSON response |

---

## 3. Database Constraints

| Table.Column | Constraint | Verified |
|---|---|---|
| `orders.client_txn_id` | UNIQUE index | ✅ PRAGMA confirmed |
| `orders.pickup_code` | UNIQUE index | ✅ PRAGMA confirmed |
| `gift_cards.code` | UNIQUE index | ✅ PRAGMA confirmed |

---

## 4. API Security Matrix

### Authentication
All API routes behind `auth:sanctum`.

### Role-Based Access Control

| Endpoint Group | Allowed Roles | Middleware |
|---|---|---|
| POS (checkout, products, categories) | cashier, admin, super_admin | `role:cashier,admin,super_admin` |
| Refunds | finance, admin, super_admin | `role:finance,admin,super_admin` |
| Repairs | cashier, admin, super_admin | `role:cashier,admin,super_admin` |
| Pickup verification | cashier, admin, super_admin | `role:cashier,admin,super_admin` |
| Admin (CRUD, reports, staff) | admin, super_admin | `role:admin,super_admin` |
| Public repair status | None (throttled) | `throttle:10,1` |

### Throttling

| Endpoint | Rate Limit |
|---|---|
| `pos/refund/search` | 15/min |
| `pickup/search` | 20/min |
| `pos/repairs/search` | 20/min |
| `repair/status` | 10/min |
| `pos/coupons/validate` | 15/min |
| `pos/gift-cards/check` | 15/min |

---

## 5. Fixes Applied During Hardening

| Fix | File | Description |
|---|---|---|
| Validation rules | `OrderController.php` | Changed `staff_id` from `required|uuid` to `required|string|exists:staff,id` (staff table has UUID PKs, users have integer PKs) |
| Null-coalescing | `OrderController.php` | Added `?? null` on nullable fields (`customer_id`, `register_id`, `notes`) to prevent undefined key errors |
| Gift card notes | `OrderController.php` | Removed `notes` field from `GiftCard::create()` — column doesn't exist on DB |
| Migration idempotency | `add_payment_fields_to_repair_tickets` | Added `Schema::hasColumn` checks to prevent re-add errors |
| Role middleware JSON | `RoleMiddleware.php` | Returns 401/403 JSON for API requests instead of HTML redirect |

---

## 6. Deployment Checklist

```bash
# 1. Clear caches
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 2. Run migrations
php artisan migrate --force

# 3. Rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Verify smoke test
php artisan bellevue:smoke-test

# 5. Verify routes
php artisan route:list --path=api | grep -c "sanctum"
```

---

## 7. Run Command

```bash
php artisan bellevue:smoke-test
```

Exit code 0 = all pass. Exit code 1 = failures detected.
