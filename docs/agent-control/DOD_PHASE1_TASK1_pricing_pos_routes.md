# TASK DEFINITION OF DONE
Phase 1 — Task 1: Product Pricing Fix + POS Route Wiring

---

## Task Name
P0: Fix live product pricing data
P1: Wire missing POS register/session routes

## Phase
Phase 1 — Operational Core

## Date
2026-03-25

---

## Root Cause

### P0 — Product Pricing
Three compounding bugs caused all non-gift-card products to show $0.00:

1. **Product.php saving hook** — `Product::boot()` runs on every save and
   recalculates price using: `price = cost + (cost * markup / 100)`.
   The guard was `cost !== null`, which also triggered when `cost = 0.00`
   (numeric zero stored in the DB). With cost=0, price was always forced to 0
   regardless of what was entered in the price field.

2. **AdminProducts.tsx mutation** — The form sent
   `cost: form.cost ? parseFloat(form.cost) : null`.
   In JavaScript, `'0' ? ...` evaluates the string `'0'` as truthy, so
   `parseFloat('0') = 0` was sent — not null. This persisted cost=0 to the DB,
   arming the saving hook.

3. **AdminProducts.tsx useEffect** — The auto-price-calculator fired whenever
   cost or markup changed, including when cost=0. It set `form.price = '0.00'`
   before the user could set a manual price, overwriting any existing value.

4. **Data** — Products already in the DB have `cost = 0.00` stored.
   Even with the code fixed, any future save on those records would
   re-trigger the (fixed) hook. The cost column must be nulled out.

### P1 — POS Routes
`PosController` had complete methods for register/session/activity management
but none were registered in `web.php`. The `RegisterController` was also
not imported and had no routes. The frontend's `useRegister` hook was
calling endpoints that returned 404, causing:
- `registers` query to fail → RegisterSelector never rendered correctly
- `openSession` to fail → no session could be opened
- POS remained operational but untracked

---

## Fix Applied

### P0 Fixes

**1. backend/app/Models/Product.php**
- Changed boot hook guard from `$product->cost !== null`
  to `$product->cost !== null && $product->cost > 0`
- Zero cost no longer triggers price recalculation

**2. backend/resources/js/Pages/admin/AdminProducts.tsx**
- useEffect: added `costValue > 0` guard — auto-calculation only runs
  when cost is a real positive number
- mutation: changed `form.cost ? parseFloat(form.cost) : null`
  to `(form.cost && parseFloat(form.cost) > 0) ? parseFloat(form.cost) : null`
  — cost=0 is now sent as null

**3. backend/database/migrations/2026_03_25_000000_fix_product_cost_zero_pricing.php**
- Sets `cost = NULL` for all products where `cost = 0`
  AND `sku NOT LIKE 'GC-%'` (excludes gift cards)
- Neutralizes existing bad data in production
- Safe to run: does not change price column, only clears bad cost value

### P1 Fixes

**4. backend/routes/web.php**
- Added `RegisterController` import
- Added to POS middleware group (auth + role:admin,cashier,warehouse,warehouse_manager):
  - GET  /api/pos/registers      → PosController::getRegisters
  - GET  /api/pos/session        → PosController::getCurrentSession
  - POST /api/pos/session        → PosController::openSession
  - PUT  /api/pos/session/{session} → PosController::closeSession
  - POST /api/pos/activity       → PosController::logActivity
- Added to admin middleware group (role:admin):
  - GET  /api/admin/registers             → RegisterController::index
  - POST /api/admin/registers             → RegisterController::store
  - PUT  /api/admin/registers/{id}        → RegisterController::update
  - POST /api/admin/registers/{id}/assign → RegisterController::assignStaff
  - GET  /api/admin/staff                 → StaffController::index

---

## Files Changed
- `backend/app/Models/Product.php`
- `backend/resources/js/Pages/admin/AdminProducts.tsx`
- `backend/database/migrations/2026_03_25_000000_fix_product_cost_zero_pricing.php` (new)
- `backend/routes/web.php`

---

## Database / API Impact

Migrations:
- `2026_03_25_000000_fix_product_cost_zero_pricing.php`
  — Sets `cost = NULL` on non-gift-card products where cost = 0
  — Must be run on production to take effect

Endpoints added:
- GET  /api/pos/registers
- GET  /api/pos/session
- POST /api/pos/session
- PUT  /api/pos/session/{session}
- POST /api/pos/activity
- GET  /api/admin/registers
- POST /api/admin/registers
- PUT  /api/admin/registers/{id}
- POST /api/admin/registers/{id}/assign
- GET  /api/admin/staff

Models affected:
- `Product` — saving hook now guards `cost > 0`

---

## Verification Steps

### P0 Pricing
1. In admin, open an existing product that was showing $0.00
2. Confirm the price field shows $0.00 (existing bad data — expected until migration runs)
3. Set a real price (e.g. $19.99), save
4. Confirm the product now shows $19.99 in the list and in POS
5. Open that product again, confirm price is still $19.99 (saving hook did not zero it)
6. Run migration on production: `php artisan migrate`
7. Confirm all non-gift-card products no longer have cost = 0 in DB
8. Confirm gift card products ($25/$50/$100/$250) still show correct prices

### P1 POS Session
1. Log in as cashier via /pos/login
2. Open /pos — RegisterSelector dialog should appear (registers load from API)
3. Select a register, enter opening balance, click Open Register
4. Confirm session opens (selector closes, register name shows in header)
5. Refresh page — confirm session is still active (getCurrentSession loads it)
6. Log in as admin, open /admin/registers
7. Confirm registers list loads
8. Create a new register, confirm it appears
9. Assign a cashier to the register, confirm save succeeds

---

## Verification Result
- Code: PASS (logic verified by inspection)
- Live data: PARTIAL — migration must be run on production to fix existing $0.00 prices
- POS routes: PASS (routes wired, controller methods confirmed correct)

---

## Regression Check

| Area        | Status  | Notes |
|-------------|---------|-------|
| checkout    | OK      | ProductController unchanged |
| inventory   | OK      | No inventory logic touched |
| auth        | OK      | No auth changes |
| routes      | OK      | Only additions, no changes to existing routes |
| admin       | OK      | AdminProducts form now sends cost=null instead of 0 |
| POS         | OK      | New routes add functionality; existing category/product routes unchanged |
| gift cards  | OK      | GC- SKUs explicitly excluded from data migration |

---

## Remaining Gaps (Phase 1 still open)

- [ ] EOD close session UI — PosController::closeSession is routed but no button/dialog in POSPage
- [ ] Switch cashier flow — no UI to hand off an open register session to a new cashier
- [ ] Refund admin authorization — no admin auth gate on refund path
- [ ] Admin force-close session — no button in AdminRegisters to close an open session
- [ ] Production migration must be run: `php artisan migrate`
- [ ] Admin must manually correct product prices that are currently $0.00

---

## Final Status
PARTIAL — P0 code fix complete, data fix migration created (needs deploy + run).
P1 route wiring complete. POS session UI flows (close, switch, refund, force-close) still pending.
