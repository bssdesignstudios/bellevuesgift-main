# AGENT HANDOFF NOTE

---

## Before continuing this project, the next agent must:

### 1. Read (in order):
- docs/agent-control/EXECUTION_PROTOCOL.md
- docs/agent-control/PHASE_TRACKER.md
- docs/agent-control/TASK_BOARD.md
- docs/agent-control/ — latest DOD report (highest numbered file)

### 2. Confirm:
- current phase (check PHASE_TRACKER.md)
- current task (check TASK_BOARD.md)
- forbidden scope (check TASK_BOARD.md — Forbidden section)
- deployed codebase path (backend/ only)

### 3. Continue only from the latest approved state.

---

## Do NOT:
- restart audits or discovery
- widen scope beyond the current phase
- re-evaluate decisions already documented as COMPLETE
- work in src/ (that is NOT the production codebase)
- spawn multiple agents

---

## Source of truth for all code changes:
- backend/resources/js/
- backend/routes/web.php
- backend/app/Http/Controllers/
- backend/app/Models/
- backend/database/migrations/

---

## Current state summary (update this with each handoff):

Last completed task:
- Phase 2A: Backend Repair Operations
- DOD: docs/agent-control/DOD_PHASE2A_repair_operations.md

Previous completed tasks:
- Phase 1 / Task 3: DOD_PHASE1_TASK3_switch_cashier.md
- Phase 1 / Task 2: DOD_PHASE1_TASK2_pos_session_flows.md
- Phase 1 / Task 1: DOD_PHASE1_TASK1_pricing_pos_routes.md

PHASE 1 — OPERATIONAL CORE IS COMPLETE.
PHASE 2 — REPAIR OPERATIONS IS COMPLETE.

Next phase:
- Phase 3: Settings + Coming Soon (see PHASE_TRACKER.md)

Pending migrations to run on production:
- backend/database/migrations/2026_03_25_000000_fix_product_cost_zero_pricing.php
- backend/database/migrations/2026_03_25_200000_extend_repair_tickets_phase2.php

---

## Stack reminder:
- Laravel + Inertia + React (TypeScript)
- PostgreSQL
- Auth: session-based via Laravel
- Staff identity: User model (users table) + Staff model (staff table, UUID PK)
- POS staff_id = staff.id (UUID), resolved via AuthController::resolveStaff()
- Inertia shares auth.staff.staff_uuid via HandleInertiaRequests middleware
