# BELLEVUE RETAIL OS — PHASE TRACKER
Version: 1.0

Purpose:
Track all implementation phases in the correct order so agents do not drift.

---

## PHASE 0 — AUDIT & GROUND TRUTH
Status: COMPLETE

Completed:
- local audit
- production audit
- cash register / operational audit
- confirmed deployed codebase is backend/resources/js/
- confirmed src/ is not production source of truth

Outcome:
All future work must target Laravel/Inertia app only.

---

## PHASE 1 — OPERATIONAL CORE
Status: COMPLETE

Priority:
Critical

Scope:
- fix live product pricing issue
- end-of-day close session UI
- switch cashier flow
- refund admin authorization
- admin force-close register session

Definition of Done:
- non-gift-card prices are correct
- cashier can open register with float
- cashier can switch out without float recount
- relief cashier can join active register
- end-of-day close requires admin + count
- refund requires admin approval
- admin can force-close open session

Notes:
Do not include Coming Soon, Settings, Super Admin, SMTP, SEO, or platform work here.

Completed sub-tasks:
- [x] P0: Product pricing root cause found and fixed
- [x] P0: Data-fix migration created (2026_03_25_000000_fix_product_cost_zero_pricing.php)
- [x] P1: Missing POS register/session routes wired in web.php
- [x] P1: Missing admin register CRUD routes wired in web.php
- [x] P1: End-of-day close session UI (POS side) — Task 2
- [x] P1: Switch cashier flow (no float recount) — Task 3
- [x] P1: Refund admin authorization — Task 2
- [x] P1: Admin force-close register session — Task 2

Pending production steps (code complete, deploy required):
- run: php artisan migrate
- admin to re-enter $0.00 product prices manually after migration

---

## PHASE 2 — REPAIR OPERATIONS
Status: COMPLETE

Priority:
High

Scope:
- add backend Repair Intake
- split Repair section into:
  - Repair Intake
  - Repair Tickets
- ensure backend intake mirrors public repair form enough for walk-ins
- ensure backend-created repairs flow into normal repair tracking

Definition of Done:
- staff can create repair from backend
- repair enters same ticket lifecycle
- repair status tracking still works
- no regression in repair pipeline

Completed sub-tasks:
- [x] P2A: Migration (columns + repair_ticket_logs)
- [x] P2A: AdminRepairTicketController rewritten + bugs fixed
- [x] P2A: Routes wired (12 API + 1 Inertia)
- [x] P2A: AdminRepairIntake.tsx — walk-in intake form
- [x] P2A: AdminRepairTickets.tsx — technician, costs, payment, timeline
- [x] P2A: AdminSidebar.tsx — Repairs submenu

DOD: docs/agent-control/DOD_PHASE2A_repair_operations.md

Pending production steps:
- run: php artisan migrate

---

## PHASE 3 — SETTINGS + COMING SOON
Status: NOT STARTED

Priority:
High

Scope:
- create Admin Settings page
- create store_settings-backed controls
- implement Coming Soon toggle
- hide storefront from public while keeping internal tools live

Definition of Done:
- /admin/settings exists
- coming soon toggle exists
- public storefront can be hidden safely
- admin/POS/internal tools still work

---

## PHASE 4 — SALES & FINANCE MODULE
Status: NOT STARTED

Priority:
High

Scope:
- Quotes
- Invoices
- Statements
- customer billing history
- URL share
- email send
- PDF export

Definition of Done:
- quote can be created
- quote converts to invoice
- invoice can be paid / partial / on account
- statement aggregates customer financial history
- quote/invoice/statement can be:
  - shared by URL
  - emailed
  - downloaded as PDF

Notes:
Cashiers can create estimates/quotes if approved.
This module must not break POS or orders.

---

## PHASE 5 — FEATURE FLAGS / MODULE CONTROL
Status: NOT STARTED

Priority:
Medium

Scope:
- super_admin module toggles
- sidebar visibility by module
- route/API guard by module flag

Definition of Done:
- super_admin can enable/disable modules
- disabled modules disappear from admin
- disabled modules cannot be accessed directly

---

## PHASE 6 — STAFF SELF-SERVICE
Status: NOT STARTED

Priority:
Medium

Scope:
- staff profile page
- self-service password change
- possibly forgot password flow

Definition of Done:
- admin/cashier can update own profile
- staff can change own password safely

---

## PHASE 7 — PLATFORM / SUPER ADMIN CONTROLS
Status: NOT STARTED

Priority:
Medium

Scope:
- favicon
- branding
- SEO defaults
- Open Graph defaults
- mail provider config
- platform controls

Definition of Done:
- super_admin-only platform page exists
- admin cannot access it
- settings persist correctly

---

## PHASE 8 — MOCK DATA CLEANUP
Status: NOT STARTED

Priority:
Low

Scope:
- replace AdminTimesheets mock data
- replace AdminPettyCash mock data
- verify recurring invoices module

Definition of Done:
- those modules use real data
- no static placeholders remain

---

## CURRENT APPROVED EXECUTION ORDER

1. Phase 1 — Operational Core
2. Phase 2 — Repair Operations
3. Phase 3 — Settings + Coming Soon
4. Phase 4 — Sales & Finance
5. Phase 5 — Feature Flags / Module Control
6. Phase 6 — Staff Self-Service
7. Phase 7 — Platform / Super Admin
8. Phase 8 — Mock Data Cleanup
