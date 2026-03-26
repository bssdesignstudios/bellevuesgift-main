# BELLEVUE RETAIL OS — TASK BOARD
Version: 1.0

Purpose:
Track current task, blockers, and next approved execution item.

---

## CURRENT TASK
Phase: Phase 3 — Settings + Coming Soon

Status: NOT STARTED — awaiting execution prompt

Previous phase (Phase 2) is COMPLETE.
See: docs/agent-control/DOD_PHASE2A_repair_operations.md

Pending production actions before Phase 3:
- Deploy Phase 1 + Phase 2 code to production
- Run: php artisan migrate (runs both Phase 1 cost fix + Phase 2 repair columns)
- Admin to manually re-enter $0.00 product prices

Phase 2 completed scope:
- [x] add backend Repair Intake page for walk-in staff
- [x] split Repair sidebar section into Repair Intake + Repair Tickets
- [x] ensure backend-created repairs enter the same ticket lifecycle
- [x] technician assignment with assigned_at logging
- [x] payment integration (amount_paid, payment_status, Pay Now)
- [x] audit/event timeline (repair_ticket_logs)

Forbidden in Phase 2:
- Coming Soon
- Settings
- Super Admin
- SMTP / Resend
- SEO
- sidebar redesign unrelated to Repair
- quotes/invoices/statements

---

## KNOWN ROOT CAUSES / FINDINGS

### Pricing — RESOLVED
- Production audit found all non-gift-card products priced at $0.00
- Root cause: Product.php saving hook overrides price to 0 when cost = 0
- Secondary cause: AdminProducts.tsx mutation sent cost: 0 (not null) when field was empty or zero
- Fix applied:
  - Product.php: boot hook now guards cost > 0 before recalculating price
  - AdminProducts.tsx: useEffect and mutation treat cost <= 0 as null
  - Migration 2026_03_25_000000_fix_product_cost_zero_pricing.php: sets cost = NULL
    where cost = 0 AND SKU not GC-* to neutralize existing bad data

### POS Routes — RESOLVED
- PosController had full register/session/activity methods but none were routed
- RegisterController had full admin register CRUD but was not imported or routed
- Fix applied in backend/routes/web.php:
  - GET  /api/pos/registers      → PosController::getRegisters
  - GET  /api/pos/session        → PosController::getCurrentSession
  - POST /api/pos/session        → PosController::openSession
  - PUT  /api/pos/session/{id}   → PosController::closeSession
  - POST /api/pos/activity       → PosController::logActivity
  - GET  /api/admin/registers    → RegisterController::index
  - POST /api/admin/registers    → RegisterController::store
  - PUT  /api/admin/registers/{id}         → RegisterController::update
  - POST /api/admin/registers/{id}/assign  → RegisterController::assignStaff
  - GET  /api/admin/staff        → StaffController::index

### POS Session Flow — RESOLVED (Task 2 + Task 3)
- EOD close: dialog + admin PIN UI added to POSPage header
- Refund authorization: admin PIN gate added to OrderController::refund
- Admin force-close: Force Close button + dialog added to AdminRegisters
- Switch cashier: Switch Cashier button in POSPage; join-session flow in PosLoginPage;
  getCurrentSession now queries by register only (no staff_id filter)

---

## BLOCKERS
- None currently on code path
- Prices in DB are still $0.00 until migration runs on production

---

## WORKING RULE
Only execute the current approved task.
Do not absorb new shareholder requests into current execution unless explicitly approved.

---

## LATEST APPROVED NEXT TASKS

### Immediate — Phase 1 remaining
- EOD close session UI in POS
- Switch cashier flow
- Refund admin authorization
- Admin force-close session

### After Phase 1
- Phase 2: backend repair intake
- Phase 3: settings + coming soon

### After that
- Phase 4: quotes / invoices / statements

---

## AGENT CHECKLIST BEFORE STARTING
- [ ] read EXECUTION_PROTOCOL.md
- [ ] read PHASE_TRACKER.md
- [ ] read TASK_BOARD.md (this file)
- [ ] read latest DOD report
- [ ] confirm current phase
- [ ] confirm scope
- [ ] continue only if aligned
