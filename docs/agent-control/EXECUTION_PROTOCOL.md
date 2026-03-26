# BELLEVUE RETAIL OS — EXECUTION PROTOCOL
Version: 1.0
Owner: Super Admin
Purpose: Keep all AI agents aligned, scoped, and production-safe.

---

## 1. CORE RULES

1. ONE AGENT ONLY
- Never spawn multiple agents
- Never parallelize work
- Never split the same task across sub-agents

2. DO NOT WIDEN SCOPE
- Only work on the currently approved phase/task
- Ignore unrelated improvements, refactors, or polish

3. DO NOT GUESS
- Verify before changing
- If unclear, stop and report uncertainty

4. WORK ONLY IN THE DEPLOYED CODEBASE

Allowed:
- backend/resources/js/
- backend/routes/
- backend/app/Http/Controllers/
- backend/app/Models/
- backend/database/migrations/

Forbidden unless explicitly approved:
- src/
- legacy/experimental code
- unrelated config or infra files

5. NEVER TOUCH PRODUCTION DIRECTLY
- Work locally first
- Validate locally
- Commit
- Push
- Deploy
- Verify live

6. EVERY TASK MUST END WITH DOD
No task is complete without a structured Definition of Done report.

---

## 2. SYSTEM TRUTH

Current production stack:
- Laravel + Inertia + React
- PostgreSQL
- Admin + POS are the operational core
- Public storefront is not the launch priority

Current real working codebase:
- backend/resources/js/
- backend/routes/web.php
- backend/app/Http/Controllers/

Not source of truth:
- src/

---

## 3. ACTIVE ROLES

Current planned roles:
- super_admin
- admin
- cashier

Future/optional:
- finance
- warehouse
- warehouse_manager

---

## 4. LOCKED BUSINESS RULES

### POS / REGISTER RULES
- Opening a closed register requires float
- Switching cashier does NOT require float recount
- Switching cashier does NOT close register session
- End-of-day closeout REQUIRES:
  - cash count
  - admin authorization
- Refunds REQUIRE admin authorization

### SALES FLOW RULES
- Quote can convert to invoice
- Invoice can be paid, partially paid, or charged to account
- Statements consolidate:
  - quote history
  - invoice history
  - payment history
  - customer account history

### LAUNCH RULES
- Public storefront should not be launched yet
- Coming Soon mode is required
- Internal operations must remain accessible

---

## 5. SIDEBAR HIERARCHY (LOCKED)

### OPERATIONS
- Dashboard
- POS Terminal
- Registers
- Inventory
- Products
- Categories

### CUSTOMERS & SERVICE
- Customers
- Repair
  - Repair Intake
  - Repair Tickets
- Vendors

### SALES & FINANCE
- Orders
- Quotes
- Invoices
- Statements
- Discounts
- Reports
- Expenses

### TEAM
- Staff

### SYSTEM
- Settings
- Help / SOP

---

## 6. LAUNCH-VISIBLE MODULES

Launch ON:
- Dashboard
- POS Terminal
- Registers
- Inventory
- Products
- Categories
- Orders
- Repair Tickets
- Customers
- Vendors
- Staff
- Discounts
- Reports
- Expenses
- Help / SOP
- Settings

Launch OFF unless explicitly enabled:
- Public storefront
- Customer dashboard frontend
- Gift cards
- Timesheets
- Payroll
- Platform-only controls
- Optional finance extras not approved yet

---

## 7. FEATURE FLAG PRINCIPLE

A feature must be:
1. enabled
2. role-allowed

Logic:
`visible = feature_enabled && user_has_permission`

Feature flags must be controlled by super_admin.

---

## 8. TASK EXECUTION STANDARD

Each task must follow this order:

1. Confirm phase
2. Confirm scope
3. Find root cause
4. Apply smallest safe fix
5. Validate
6. Write DOD report
7. Stop

---

## 9. GLOBAL DEFINITION OF DONE

A task is complete only if:
- feature works in UI
- API/database writes correctly
- no regressions introduced
- no broken routes
- no silent failures
- role/access behavior still correct
- code is committed cleanly
- verification is documented

---

## 10. AGENT HANDOFF RULE

Before a new agent continues:
- read this file fully
- read PHASE_TRACKER.md
- read TASK_BOARD.md
- read latest task DOD report
- continue only from current approved phase

The next agent must NOT:
- restart discovery
- reinterpret the system
- widen scope
- re-audit unrelated modules

---

## 11. PROMPT PREFIX STANDARD

Every prompt must begin with:

```
Enter [PLAN MODE or EXECUTION MODE].

CRITICAL:
- Use ONE AGENT ONLY
- Do NOT widen scope
- Follow EXECUTION_PROTOCOL.md strictly
- Work only in deployed codebase
- End with DOD
```

---

## 12. STOP RULE

If the agent becomes uncertain:
- stop
- report blocker
- do not improvise
