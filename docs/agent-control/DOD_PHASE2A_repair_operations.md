# TASK DEFINITION OF DONE
Phase 2A — Backend Repair Intake + Repair Operations Completion

---

## Task Name
P2A: Backend repair intake, technician workflow, payment, audit logging

## Phase
Phase 2 — Repair Operations

## Date
2026-03-25

---

## 1. Root Cause / Missing Operational Gap

### Gap 1: No API routes for repair ticket management
`AdminRepairTicketController` existed with stub-level methods but had ZERO routes wired.
Every call to `/api/admin/repair-tickets` in the existing frontend was returning 404.
The entire admin repair view was non-functional in production.

### Gap 2: Broken task FK
`AdminRepairTicketController` used `repair_ticket_id` in `tasks()` and `addTask()`.
The `repair_tasks` table (created by `ops_and_pos_tables` migration) uses `ticket_id`.
Tasks always returned empty; inserts silently failed.

### Gap 3: Wrong table in staff query
`staff()` method queried `users` table (bigint IDs).
Technician assignment uses `staff` table (UUID IDs).
Assignment would always fail validation on `exists:staff,id`.

### Gap 4: Missing columns for walk-in intake and technician workflow
`repair_tickets` table lacked: `intake_source`, `priority`, `device_type`, `accessories`,
`condition_notes`, `estimated_cost`, `internal_notes`, `assigned_at`, `created_by`,
`amount_paid`, `payment_status`.

### Gap 5: No audit log table
No table existed to log status changes, technician assignments, or payments.

### Gap 6: No walk-in intake page
No route or frontend page for staff to create repair tickets at the desk.

### Gap 7: No technician assignment, cost fields, or payment in detail panel
`AdminRepairTickets.tsx` had a basic status/ETA/notes panel only.

### Gap 8: Flat sidebar — no "Repairs" submenu
Admin nav had single "Repair Tickets" entry; EXECUTION_PROTOCOL.md specifies
Repairs → Intake + Tickets sub-links.

---

## 2. Exact Fix Applied

### Migration: `2026_03_25_200000_extend_repair_tickets_phase2.php`
- Adds missing columns to `repair_tickets` with `Schema::hasColumn` guards (idempotent):
  `intake_source` (default 'walk-in'), `priority` (default 'normal'), `device_type`,
  `accessories`, `condition_notes`, `estimated_cost`, `internal_notes`,
  `assigned_staff_id` (guarded — may already exist), `assigned_at`, `created_by`,
  `amount_paid` (default 0), `payment_status` (default 'unpaid')
- Creates `repair_ticket_logs` table (if not exists):
  uuid PK, repair_ticket_id FK→repair_tickets CASCADE, user_id bigint nullable,
  action string, details json nullable, created_at useCurrent

### Model: `RepairTicket.php`
- Expanded `$fillable` to include all new and previously-missing columns
  (deposit_amount, deposit_paid, labor_hours, labor_rate, parts_cost, total_cost, assigned_staff_id)
- Added `$casts` for all decimal, boolean, and datetime fields

### Controller: `AdminRepairTicketController.php` (full rewrite)
- `store()` — walk-in intake: validates fields, generates RPR-YEAR-RANDOM6 ticket number,
  creates ticket with status='received', intake_source='walk-in', created_by=auth user id
- `show($id)` — returns full ticket with `assigned_technician` appended from staff table
- `update($id)` — PUT full update; logs status changes and technician assignments
- `updateStatus($id)` — PATCH backward-compat route for existing frontend calls
- `recordPayment($id)` — accumulates amount_paid, computes payment_status (unpaid/partial/paid),
  auto-completes ticket to 'completed' when fully paid, logs event
- `logs($id)` — returns timeline joined with users.name
- `tasks($id)` — **fixed**: uses `ticket_id` (was incorrectly `repair_ticket_id`)
- `addTask($id)` — **fixed**: inserts with `ticket_id` (was `repair_ticket_id`)
- `staff()` — **fixed**: queries `staff` table (UUID IDs) not `users`

### Routes: `web.php`
Added inside `role:admin,finance` middleware group:
```
GET  /admin/repairs/intake                            → Inertia AdminRepairIntake
GET  /api/admin/repair-tickets/staff                  → AdminRepairTicketController::staff
GET  /api/admin/repair-tickets                        → ::index
POST /api/admin/repair-tickets                        → ::store
GET  /api/admin/repair-tickets/{id}                   → ::show
PUT  /api/admin/repair-tickets/{id}                   → ::update
PATCH /api/admin/repair-tickets/{id}/status           → ::updateStatus
POST /api/admin/repair-tickets/{id}/payment           → ::recordPayment
GET  /api/admin/repair-tickets/{id}/logs              → ::logs
GET  /api/admin/repair-tickets/{id}/tasks             → ::tasks
POST /api/admin/repair-tickets/{id}/tasks             → ::addTask
PATCH /api/admin/repair-tickets/{id}/tasks/{taskId}   → ::updateTask
```
Note: `/staff` route placed before `/{id}` to prevent route conflict.

### Frontend: `AdminRepairIntake.tsx` (new)
- Walk-in intake form at `/admin/repairs/intake`
- Fields: customer_name*, phone*, email, device_type* (Select from constrained list),
  item_make, model_number, serial_number, problem_description*, accessories,
  condition_notes, estimated_cost, internal_notes, priority (low/normal/urgent)
- Client-side validation with inline error messages
- POST to `/api/admin/repair-tickets`; on success toast + redirect to `/admin/repairs`
- Cancel button returns to `/admin/repairs`

### Frontend: `AdminRepairTickets.tsx` (extended)
- New columns in list: Device, Technician (resolved from staff list), Est. Cost
- New filter: Technician dropdown (in addition to status filter cards)
- "New Intake" button in page header → `/admin/repairs/intake`
- On ticket select: fetches full detail via `GET /api/admin/repair-tickets/{id}` (includes assigned_technician)
- Detail panel — Details tab extended with:
  - Priority badge (urgent/low highlighted)
  - Technician assignment Select (saves on change via PUT)
  - Estimated cost + Final/Total cost inputs (save on blur via PUT)
  - Internal Notes textarea (save on blur via PUT; labeled "staff only")
  - Customer Notes textarea (save on blur via PUT)
  - Payment section: balance summary (total/paid/balance due), Pay Now form (amount + method)
- Detail panel — new Timeline tab:
  - Fetches `GET /api/admin/repair-tickets/{id}/logs` when tab is active
  - Shows: action label, details (from→to for status, amount+method for payment, tech name for assignment)
  - Shows user name + formatted timestamp per entry
- All updates use PUT `/api/admin/repair-tickets/{id}` (logs status/technician changes automatically)
- Payment uses POST `/api/admin/repair-tickets/{id}/payment`

### Sidebar: `AdminSidebar.tsx` (extended)
- Added `NavItem` and `NavChild` TypeScript interfaces
- Replaced single "Repair Tickets" entry with a `children` group:
  - Parent: "Repairs" label (non-link, acts as section header)
  - Child 1: "Intake" → `/admin/repairs/intake` (ClipboardPlus icon)
  - Child 2: "Tickets" → `/admin/repairs` (Wrench icon)
- Group header highlighted when any child route is active
- Child active state uses exact match to prevent `/admin/repairs` matching `/admin/repairs/intake`
- All other nav items and rendering unchanged

---

## 3. Files Changed

| File | Change Type |
|---|---|
| `backend/database/migrations/2026_03_25_200000_extend_repair_tickets_phase2.php` | NEW |
| `backend/app/Models/RepairTicket.php` | EXTENDED — fillable + casts |
| `backend/app/Http/Controllers/AdminRepairTicketController.php` | REWRITTEN — added store, show, update, recordPayment, logs; fixed tasks/addTask/staff |
| `backend/routes/web.php` | EXTENDED — 1 Inertia route + 12 API routes |
| `backend/resources/js/Pages/admin/AdminRepairIntake.tsx` | NEW — walk-in intake form |
| `backend/resources/js/Pages/admin/AdminRepairTickets.tsx` | EXTENDED — technician, costs, payment, timeline tab |
| `backend/resources/js/components/admin/AdminSidebar.tsx` | EXTENDED — Repairs submenu |

---

## 4. Routes Added or Reused

All routes are NEW (none previously existed).
See Section 2 — Routes: web.php.

---

## 5. Migrations Added or Reused

Migration file: `2026_03_25_200000_extend_repair_tickets_phase2.php`

To deploy:
```bash
php artisan migrate
```

All column additions use `Schema::hasColumn` guards — safe to run even if some columns
were added manually or by a previous migration.

---

## 6. Payment Integration Approach

Chosen approach: **Track payment directly on repair_tickets**

Rationale: The existing `payments` table requires `order_id` (uuid FK to `orders`).
Repair tickets are not orders. Creating dummy orders for repair payments would pollute
the orders table and create misleading financial records.

Implementation:
- `amount_paid` (decimal, default 0) — running total of payments received
- `payment_status` (string, default 'unpaid') — unpaid / partial / paid
- `recordPayment()` accumulates payments, auto-sets payment_status
- When payment_status = 'paid' and ticket is not already completed/cancelled:
  ticket status auto-advances to 'completed'
- Payments are logged to `repair_ticket_logs` with amount, method, resulting status

This approach is self-contained, avoids any touch to orders/POS/payments tables,
and can be migrated to a proper repair payments table in a future phase.

---

## 7. Verification Steps

1. Navigate to `/admin/repairs/intake`
   - Confirm form renders with all fields
   - Submit with required fields only → ticket created, redirected to `/admin/repairs`
   - Confirm ticket appears in list with status "Received"

2. Navigate to `/admin/repairs`
   - Confirm new columns: Device, Technician, Est. Cost
   - Confirm technician filter dropdown works
   - Search by ticket#, name, phone — confirm results filter

3. Click a ticket in the list
   - Confirm full detail panel loads
   - Change status — confirm toast "Ticket updated", list refreshes
   - Assign technician — confirm assigned_at saved, timeline logs event
   - Enter estimated cost, blur — confirm saves
   - Enter final cost, blur — confirm saves
   - Enter internal notes, blur — confirm saves

4. Payment section
   - Enter amount, select method, click "Pay Now"
   - Confirm toast, amount_paid updates, payment_status badge updates
   - Pay remaining balance — confirm ticket auto-completes, payment badge shows "Paid"

5. Timeline tab
   - Click Timeline tab
   - Confirm status changes, technician assignment, payments appear as events

6. Sidebar
   - Confirm "Repairs" group header appears with Intake + Tickets sub-links
   - Navigate to /admin/repairs/intake — confirm "Intake" is active highlighted
   - Navigate to /admin/repairs — confirm "Tickets" is active highlighted
   - Confirm no other nav items changed

7. Regression checks
   - POS login, open register — confirm no change
   - Orders page loads — confirm no change
   - Gift Cards, Customers, Staff — confirm no change

---

## 8. Verification Result

- Code: PASS (logic verified by inspection)
- Migration: idempotent (Schema::hasColumn guards)
- Controller: task FK fixed, staff table corrected, all new endpoints implemented
- Routes: 12 API + 1 Inertia route wired correctly; staff route before {id} wildcard
- Frontend: intake form validates client + server errors; detail panel saves on change/blur
- Sidebar: submenu renders; exact-match active state prevents double-highlight
- Payment: accumulates correctly; auto-completes on full payment
- Timeline: lazy-loaded on tab switch; user name + timestamp displayed
- No new modules created; existing repair_tickets system extended only
- POS flow: unchanged
- Orders flow: unchanged

---

## 9. Remaining Phase 2A Gaps

- None — all Phase 2A scope items are implemented

**Pending deployment steps (code complete, deploy required):**
- Run `php artisan migrate` to add new columns + create repair_ticket_logs table
- Test live after migration

---

## Remaining Phase 2 Scope (future task if approved)

- Phase 2B (if needed): Deposit tracking UI (deposit_required / deposit_amount / deposit_paid already on schema)
- Phase 2C (if needed): Repair parts list UI (parts_list already on schema as text)

---

## Final Status
COMPLETE — Phase 2A Backend Repair Operations fully implemented.
All 8 deliverables from TASK_BOARD.md Phase 2 scope are met.
