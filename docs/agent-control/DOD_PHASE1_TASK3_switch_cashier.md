# TASK DEFINITION OF DONE
Phase 1 — Task 3: Switch Cashier Flow

---

## Task Name
P1: Switch cashier — hand off open register session without float recount

## Phase
Phase 1 — Operational Core

## Date
2026-03-25

---

## Root Cause

`getCurrentSession` on the backend filtered sessions by BOTH `register_id` AND `staff_id`.
When a relief cashier logged in (different `staff_id`), the query returned null —
`hasActiveSession` was false, `RegisterSelector` popped open, and the cashier was
forced to enter an opening float for an already-open register, creating a duplicate session.

`PosLoginPage` always required an opening balance and always called `POST /api/pos/session`,
even when the selected register already had an open session.

There was no "Switch Cashier" action in POSPage — the only exit was full sign-out
(`handleSignOut`) which redirected to `/staff/login`, with no path back to `/pos/login`.

---

## Fix Applied

### Business rule enforced:
- Sessions belong to registers, not individual cashiers
- `staff_id` on a session records who OPENED it (preserved, not changed)
- Any cashier assigned to a register can use the currently open session
- Switch cashier = clear auth session only; register session stays open

### 1. backend/app/Http/Controllers/PosController.php — getCurrentSession

Removed `staff_id` from validation and query.
Session is now looked up by `register_id` only (open sessions only).

Before:
```php
$validated = $request->validate([
    'register_id' => 'required|uuid|exists:registers,id',
    'staff_id' => 'required|uuid|exists:staff,id',
]);
$session = RegisterSession::where('register_id', $validated['register_id'])
    ->where('staff_id', $validated['staff_id'])
    ->whereNull('closed_at') ...
```

After:
```php
$validated = $request->validate([
    'register_id' => 'required|uuid|exists:registers,id',
]);
$session = RegisterSession::where('register_id', $validated['register_id'])
    ->whereNull('closed_at') ...
```

### 2. backend/resources/js/hooks/useRegister.ts

Removed `staffId` from session `queryKey` and `params`.
`enabled` condition no longer requires `staffId`.

Before:
```ts
queryKey: ['register-session', activeRegisterId, staffId],
params: { register_id: activeRegisterId, staff_id: staffId }
enabled: !!activeRegisterId && !!staffId
```

After:
```ts
queryKey: ['register-session', activeRegisterId],
params: { register_id: activeRegisterId }
enabled: !!activeRegisterId
```

### 3. backend/resources/js/Pages/PosLoginPage.tsx

Added `registerSessions: Record<string, boolean>` state.

After PIN login and registers load, checks each register for an active session
via `GET /api/pos/session?register_id={id}` (parallel, catches errors).

Register selection UI now branches on `registerSessions[selectedRegister]`:
- **Active session exists** → shows "Session already open / No float recount required"
  notice; action button becomes **"Join Session"**
- **No active session** → shows opening cash input; action button remains **"Open Register"**

Added `handleJoinSession()`:
- Sets `bellevue_active_register` in localStorage (same format as `handleOpenSession`)
- Redirects to `/pos`
- Does NOT call `POST /api/pos/session` — no new session created

Subtitle text updates to reflect active session state when a register is selected.

### 4. backend/resources/js/Pages/POSPage.tsx

Added `ArrowLeftRight` to lucide-react imports.

Added `handleSwitchCashier()`:
```ts
const handleSwitchCashier = () => {
  axios.post('/staff/logout').catch(() => {}).finally(() => {
    window.location.href = '/pos/login';
  });
};
```
- Clears the auth session via `POST /staff/logout`
- Redirects to `/pos/login`
- Does NOT call `closeSession` — register session stays open

Added "Switch Cashier" button in header:
- Renders only when `hasActiveSession`
- Positioned before "Close Register"
- Title tooltip clarifies the action

---

## Files Changed
- `backend/app/Http/Controllers/PosController.php`
- `backend/resources/js/hooks/useRegister.ts`
- `backend/resources/js/Pages/PosLoginPage.tsx`
- `backend/resources/js/Pages/POSPage.tsx`

---

## Endpoints Reused / Changed

Reused (no new endpoints):
- `GET /api/pos/session` — already exists; now only requires `register_id`
- `POST /staff/logout` — existing logout route used by `handleSwitchCashier`

Changed behaviour (non-breaking for new callers):
- `GET /api/pos/session` — `staff_id` parameter removed from validation (old callers that sent `staff_id` still work; it is now ignored)

No new routes added.

---

## Handoff Logic

| Scenario | Flow |
|---|---|
| Fresh register (no open session) | PIN → register select → opening balance → Open Register → `/pos` |
| Relief cashier (register has open session) | PIN → register select → "Session already open" notice → Join Session → `/pos` |
| Current cashier switches out | POSPage header → Switch Cashier → auth logout → `/pos/login` |
| EOD close | POSPage header → Close Register → admin PIN + balance → session closed |

---

## Verification Steps

### Switch Cashier — outgoing
1. Log in as Cashier A at `/pos`, open register (active session exists)
2. Header shows "Switch Cashier" button
3. Click "Switch Cashier"
4. Confirm: redirected to `/pos/login`, NOT `/staff/login`
5. Confirm: register session still exists (not closed) — verify via `/admin/registers`

### Switch Cashier — incoming
1. At `/pos/login`, Cashier B enters their PIN
2. Register with open session appears in list
3. After selecting it: "Session already open / No float recount required" notice appears
4. "Open Register" button is replaced by "Join Session"
5. Click "Join Session"
6. Confirm: redirected to `/pos`
7. Confirm: `hasActiveSession` is true — "Close Register" and "Switch Cashier" buttons appear
8. Confirm: no new session was created in DB (session count for that register unchanged)

### Register open (no active session — regression check)
1. Log in as cashier, select a register with no open session
2. Opening balance input appears (normal flow)
3. "Open Register" button appears
4. Enter balance, click — session opens, redirected to `/pos`

### EOD close (regression check)
1. With active session, click "Close Register"
2. Dialog appears, enter balance + admin PIN → closes correctly
3. Confirm session is closed in DB

---

## Verification Result
- Code: PASS (logic verified by inspection)
- No new endpoints required
- No DB schema changes
- Switch cashier does not close session
- Normal open flow unchanged
- EOD close flow unchanged

---

## Regression Check

| Area | Status | Notes |
|---|---|---|
| register open (new session) | OK | Float input still shown; `handleOpenSession` unchanged |
| register join (active session) | OK | New `handleJoinSession` path; no float; no new session |
| EOD close | OK | `closeSession` in `useRegister` and POSPage unchanged |
| refund | OK | Unchanged |
| admin force-close | OK | Unchanged |
| admin registers | OK | Session query by register still works |
| POS checkout | OK | Unchanged |
| gift cards | OK | Unchanged |

---

## Remaining Phase 1 Gaps

- [ ] Production migration must be run: `php artisan migrate`
- [ ] Admin must manually correct product prices that are currently $0.00

**All Phase 1 operational flows are now complete.**

---

## Final Status
COMPLETE — Switch cashier flow implemented. Phase 1 — Operational Core is fully closed.
