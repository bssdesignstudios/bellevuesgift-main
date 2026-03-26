# TASK DEFINITION OF DONE TEMPLATE

---

## Task Name
[fill in]

## Phase
[fill in — e.g. Phase 1 — Operational Core]

## Date
[fill in]

---

## Root Cause
- What was actually causing the issue?
- Be specific: file, line, method

---

## Fix Applied
- What exact logic was changed?
- List each change with file path

---

## Files Changed
- path/to/file1.php
- path/to/file2.tsx
- path/to/migration.php

---

## Database / API Impact

Migrations:
- [migration filename] — [what it does]

Endpoints added or changed:
- METHOD /path → Controller::method

Models affected:
- [model name] — [what changed]

---

## Verification Steps
1. [step — e.g. open admin > products, confirm prices show correctly]
2. [step]
3. [step]

---

## Verification Result
- PASS / FAIL / PARTIAL

---

## Regression Check

| Area        | Status | Notes |
|-------------|--------|-------|
| checkout    | OK / SKIP | |
| inventory   | OK / SKIP | |
| auth        | OK / SKIP | |
| routes      | OK / SKIP | |
| admin       | OK / SKIP | |
| POS         | OK / SKIP | |
| gift cards  | OK / SKIP | |

---

## Remaining Gaps
- [list anything not yet done in this task]
- [or write NONE if task is fully complete]

---

## Final Status
- COMPLETE
- PARTIAL — [reason]
- BLOCKED — [reason]
