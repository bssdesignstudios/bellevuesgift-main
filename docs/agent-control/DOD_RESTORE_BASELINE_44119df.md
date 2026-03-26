# DOD — RESTORE BASELINE

## Stable Commit
44119df5f100efa6c8a3f4a1b583d58ee41e8e92

## Purpose
Known good Bellevue recovery point after broken mixed-state rollback.

## Confirmed
- main force-reset to 44119df
- GitHub main force-updated to 44119df
- backup branch created:
  - backup/current-broken-19b46508
- restored state confirmed working by owner

## Rule
All future work must start from this baseline.
Do not re-run broad phase rebuilds.
Only do selective forward-port work from here.

## First approved next targets
1. RegisterSelector status dots + offline label
2. POS cashier chip + live clock
3. Sticky POS cart
4. Admin register activity timeline
5. Admin register session history
6. Admin register force-close detail sheet
