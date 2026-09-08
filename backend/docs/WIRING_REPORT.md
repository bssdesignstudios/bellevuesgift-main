# WIRING REPORT — Marketplace Coming Soon Gate

**Surface:** `MaintenancePage.tsx` (public storefront Coming Soon page) + the middleware, model and toggle that control it
**Client:** Bellevue Gifts & Supplies Ltd. (bellevuegifts.com / bellevuepos.cloud)
**Branch:** `feat/marketplace-coming-soon`
**Date:** 2026-09-08
**Verified against:** local Laravel server on `127.0.0.1:8110`, sqlite dev DB, vite dev server

**VERDICT: PASS (local).** Not deployed — see *Blocked on owner decision* at the end.

---

## Why this work exists

`docs/agent-control/EXECUTION_PROTOCOL.md:103-104` locks the launch rule:

> Public storefront should not be launched yet · Coming Soon mode is required · Internal operations must remain accessible

The storefront was nevertheless serving the full public shop. Root cause below.

---

## Root causes found and fixed

| # | Cause | Evidence | Fix |
|---|---|---|---|
| 1 | Every deploy force-disabled Coming Soon | `.github/workflows/deploy.yml:73` wrote `MAINTENANCE_MODE=false` then `config:cache` | Line removed; flag moved to `store_settings` |
| 2 | The gate covered only half the app | `bootstrap/app.php:33` registered `StorefrontMaintenance` on the **web** group; `routes/api.php` is the **api** group | Registered on both groups |
| 3 | `/api/storefront/products` served wholesale cost while "closed" | Verified `200` + `cost` / `markup_percentage` in the payload | Now `503` |
| 4 | Any logged-in customer could flip the switch off | `routes/api.php:100` = `auth:web` with no role guard; `CustomerRegisterController:28,42` creates a `role: customer` user on that same guard | `role:admin` on the settings **write** routes |
| 5 | Settings page 500 (and `/pos/login` with it) | `StoreSetting` declared `$primaryKey='key'`, but the table PK is a `uuid id` NOT NULL with no default; `ModuleGate:55` calls `ensureModuleFlagsExist()` on every admin/POS request | `HasUuid` trait; `ensureModuleFlagsExist()` now reads keys once and writes only what is missing |

---

## Files changed

- `app/Models/StoreSetting.php` — UUID PK fix, cheaper flag bootstrap, `isMaintenanceMode()` / `setMaintenanceMode()`
- `app/Http/Middleware/StorefrontMaintenance.php` — DB-backed flag, `bellevuepos.cloud` host exemption, JSON 503 for API callers, `Retry-After` + `no-store`
- `app/Http/Controllers/AdminSettingsController.php` — toggle persists to DB, reports state read back from storage, no more `.env` rewrite / `config:clear`
- `bootstrap/app.php` — middleware prepended to the api group as well as web
- `routes/api.php` — `role:admin` on `PUT /settings` and `POST /settings/maintenance`
- `database/migrations/2026_09_08_120000_enable_storefront_coming_soon.php` — creates the flag row and turns Coming Soon **ON**
- `resources/js/Pages/MaintenancePage.tsx` — full rewrite
- `.github/workflows/deploy.yml` — stopped force-writing `MAINTENANCE_MODE`

---

## Route verification — Coming Soon ON

| Path | Expected | Actual |
|---|---|---|
| `/` | 503 Coming Soon | **503** |
| `/shop` | 503 | **503** |
| `/api/storefront/products` | 503, no catalogue | **503** `{"message":"Our online store is temporarily unavailable."}` |
| `/api/products` | 503 | **503** |
| `/api/orders/track` | 503 | **503** |
| `/pos/login` | 200 | **200** |
| `/login` | 200 | **200** |
| `/up` | 200 | **200** |
| `/offline` | 200 | **200** |
| `Host: bellevuepos.cloud` `/pos/login` | 200 | **200** |
| `Host: bellevuepos.cloud` `/api/pos/registers` | 200 | **200** |

Response headers on `/`: `HTTP/1.1 503`, `Retry-After: 86400`, `Cache-Control: no-store, no-cache, must-revalidate`.

## Toggle round trip (real admin session, real endpoint)

| Action | API response | DB `store_settings.maintenance_mode` | Storefront `/` |
|---|---|---|---|
| Switch OFF | `{"maintenance_mode":false}` | `0` | **200** |
| Switch ON | `{"maintenance_mode":true}` | `1` | **503** |

`/admin/settings` returns 200 and renders `AdminSettings`. `GET /api/admin/settings` returns the full flag set with `maintenance_mode` sourced from the database.

## Page verification

- Renders at **375px** with no horizontal overflow; content verified by text extraction and screenshot.
- Real `bellevue-logo.webp` — the placeholder "+" SVG is gone.
- **No eyebrow pill** (house rule).
- Contacts come from `STORE_INFO` — `info@bellevuegifts.com`, `+1 (242) 352-5555` — so the page can no longer drift from the rest of the site. (Previously hardcoded `sales@`.)
- Hours match `ContactPage.tsx:98-100` and `AboutPage.tsx:108-110` verbatim; departments match `StorefrontHeader.tsx:22-35`; "over twenty years" from `AboutPage.tsx:30`.
- Only three interactive elements, all real and all reachable behind the middleware: `tel:`, `mailto:`, and `/pos/login`.
- Contrast (measured): white on `#00005D` 18.13:1 · `#00005D` on white 18.13:1 · `#00005D` on `#E1F8EF` 16.30:1 · `slate-600` on white 7.58:1 — all AA with margin.
- One `motion-safe` fade; `prefers-reduced-motion` gets no animation. The old `animate-pulse` dot is gone.
- Semantics: one `<h1>` (the message), one `<h2>`, `<header>`/`<main>`/`<footer>` landmarks, `<dl>` for the trading board, 44px+ targets, focus rings that are never navy-on-navy.

No `local.ERROR` entries in `storage/logs/laravel.log` during the run.

---

## Deliberately NOT done in this pass

Real, verified, and out of scope for a Coming Soon task — each needs its own change and its own test:

1. **`/api/pos/*` has no authentication.** `routes/api.php:64-91` — unauthenticated `POST /api/pos/checkout` returns **422, not 401**; `GET /api/pos/registers` returns live register data. Refunds, payments, session open/close and repair-ticket lookups sit on that group.
2. **`/api/admin/*` still has no role guard** beyond the two settings writes locked here.
3. **`db:seed --force` runs on every deploy** and `ShopSeeder:17-64` uses `User::updateOrCreate`, so **every staff password and POS PIN is reset to hardcoded repo values on each deploy** (`admin@bellevuegifts.com` → `password`, PIN `0000`; real staff → `bellevue123`). Rotate credentials and change these to `firstOrCreate` before the next deploy.
4. **nginx has no `default_server` catch-all**, so any hostname pointed at `143.198.3.55` is served the real site — confirmed live with `auth976296.live`, which returns the storefront, the customer login and the POS PIN pad under a lookalike domain.
5. PWA/service-worker restructure, favicon and OG share-image assets, `/ops/clear-cache` route removal, route-duplication cleanup.

## Blocked on owner decision

Deploying means pushing `main`, which auto-deploys **and** runs `db:seed --force` — item 3 above. That would reset staff passwords and PINs in production. Not triggered without an explicit go-ahead.
