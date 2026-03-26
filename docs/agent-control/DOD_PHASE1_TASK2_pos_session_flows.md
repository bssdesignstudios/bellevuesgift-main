# TASK DEFINITION OF DONE
Phase 1 — Task 2: POS Session Flow UI

---

## Task Name
P1: EOD close session UI + Refund admin PIN gate + Admin force-close session

## Phase
Phase 1 — Operational Core

## Date
2026-03-25

---

## Root Cause

### Refund — No auth gate
`OrderController::refund()` had complete logic but no admin authorization gate.
Any authenticated user could POST `/api/pos/orders/{id}/refund` and issue a refund.
The route was also missing from `web.php` entirely.

### EOD Close — No UI
`PosController::closeSession` existed and was now routed (Task 1), but `POSPage.tsx`
had no button or dialog to invoke it. Cashiers had no way to close their session at
end of day from the POS terminal.

`closeSession` in `useRegister.ts` also had an incomplete `onSuccess` handler — it
cleared `activeSessionId` but not `activeRegisterId` or localStorage, meaning the
POS could appear to have an active register after a close.

`PosController::closeSession` had no admin PIN validation or already-closed guard.

### Admin Force-Close — No UI
`AdminRegisters.tsx` showed whether a register had an active session but provided
no mechanism for an admin to force-close a stale or orphaned session.

---

## Fix Applied

### Refund Route + PIN Gate

**1. backend/routes/web.php**
- Added to POS middleware group:
  - `GET  /api/pos/orders/lookup`       → `OrderController::lookup`
  - `POST /api/pos/orders/{id}/refund`  → `OrderController::refund`

**2. backend/app/Http/Controllers/OrderController.php**
- Changed `refund($id)` to `refund(Request $request, $id)`
- Added admin PIN validation: `admin_pin` required, string, size:4
- Validates against `User` model: `pos_pin = $pin AND role = admin AND is_active = true`
- Returns 403 if PIN invalid
- Added double-refund guard: returns 422 if `order->status === 'refunded'`

**3. backend/resources/js/Pages/POSPage.tsx — RefundTab**
- Added `showPinDialog` and `adminPin` state
- "Process Refund" button now opens PIN dialog
- `processRefund()` sends `{ admin_pin: adminPin }` in POST body
- Dialog: 4-digit numeric PIN input, password-masked, clears on close/success

### EOD Close Session

**4. backend/app/Http/Controllers/PosController.php — closeSession**
- Added validation: `admin_pin` required, string, size:4
- Validates admin PIN same pattern as refund
- Returns 403 if PIN invalid
- Returns 422 if `session->closed_at !== null` (already closed guard)

**5. backend/resources/js/hooks/useRegister.ts**
- Added `adminPin: string` to `closeSession` mutation type
- Sends `admin_pin` in PUT body
- `onSuccess`: clears `activeRegisterId`, `activeSessionId`, and localStorage

**6. backend/resources/js/Pages/POSPage.tsx — header**
- Added `Power` icon import
- Destructured `currentSession` and `closeSession` from `useRegister`
- Added 4 state vars: `showCloseDialog`, `closingBalance`, `closeNotes`, `closeAdminPin`
- Added `activeRegisterName` derived from `registers` + `activeRegisterId`
- Added EOD close `Dialog` (session summary, closing balance, notes, PIN, confirm button)
- Added "Close Register" button in header — visible only when `hasActiveSession`

### Admin Force-Close

**7. backend/resources/js/Pages/admin/AdminRegisters.tsx**
- Added `PowerOff` to lucide-react imports
- Added 4 state vars: `forceCloseRegister`, `forceCloseBalance`, `forceCloseNotes`, `forceClosePin`
- Added `forceClose` `useMutation` calling `PUT /api/pos/session/{sessionId}`
  with `closing_balance`, `notes`, `admin_pin`
- `onSuccess`: clears all state, invalidates `['admin-registers']` query
- Added Force Close `Dialog`: session summary (opened time, opening balance),
  closing balance input, notes input, admin PIN input, destructive confirm button
  — confirm disabled unless PIN is 4 digits and closing balance is entered
- Added "Force Close" button in table row actions — renders only when `reg.active_session !== null`

---

## Files Changed
- `backend/routes/web.php`
- `backend/app/Http/Controllers/OrderController.php`
- `backend/app/Http/Controllers/PosController.php`
- `backend/resources/js/hooks/useRegister.ts`
- `backend/resources/js/Pages/POSPage.tsx`
- `backend/resources/js/Pages/admin/AdminRegisters.tsx`

---

## Database / API Impact

No new migrations.

Routes added:
- `GET  /api/pos/orders/lookup`
- `POST /api/pos/orders/{id}/refund`

Existing endpoint behaviour changed:
- `PUT /api/pos/session/{session}` — now requires `admin_pin` field (breaking for any direct calls without PIN)

---

## Verification Steps

### Refund
1. Log in as cashier, open POS, load an order via lookup
2. Click "Process Refund" — PIN dialog should appear
3. Enter wrong PIN → 403 toast "Invalid admin PIN"
4. Enter correct admin PIN → refund processes, order shows refunded
5. Attempt second refund on same order → 422 toast "already refunded"

### EOD Close
1. Log in as cashier, open POS with active session
2. Header should show "Close Register" button
3. Click it — dialog shows register name, opened time, opening balance
4. Enter closing balance, optional notes, admin PIN
5. Wrong PIN → 403 toast
6. Correct PIN → session closes, "Close Register" button disappears, RegisterSelector appears
7. Refresh page — POS shows register selector (session cleared from localStorage)

### Admin Force-Close
1. Log in as admin, open /admin/registers
2. A register with open session should show "Force Close" button in its row
3. Click it — dialog shows session summary (opened time, opening balance)
4. Enter closing balance, optional notes, admin PIN
5. Wrong PIN → 403 toast
6. Correct PIN → session closes, row updates to show "Closed" state
7. "Force Close" button disappears for that row

---

## Verification Result
- Code: PASS (logic verified by inspection)
- Admin PIN pattern: consistent across refund, EOD close, force-close

---

## Regression Check

| Area          | Status | Notes |
|---------------|--------|-------|
| checkout      | OK     | Unchanged |
| inventory     | OK     | Unchanged |
| auth          | OK     | No auth changes |
| routes        | OK     | Two new routes added; no existing routes changed |
| refund        | OK     | Now requires admin PIN (intended breaking change) |
| EOD close     | OK     | Now requires admin PIN (intended breaking change) |
| force-close   | OK     | New; reuses existing endpoint |
| register open | OK     | openSession unchanged |
| gift cards    | OK     | Unchanged |

---

## Remaining Gaps (Phase 1 still open)

- [ ] Switch cashier flow — no UI to hand off an open session to a new cashier without float recount
- [ ] Production migration must be run: `php artisan migrate`
- [ ] Admin must manually correct product prices that are currently $0.00

---

## Final Status
COMPLETE — Refund PIN gate, EOD close UI, and admin force-close all implemented.
Switch cashier flow is the only remaining Phase 1 open item.
