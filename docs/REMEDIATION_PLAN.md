# Bellevue Gifts: Remediation Plan

**Version:** 1.0  
**Date:** 2026-02-09  
**Status:** DRAFT (Remediation Only)

---

## 1. Confirmed Issues & Remediation Strategy

### 1.1 Frontend Email Heuristic for Redirects
- **Evidence:** 
    - `src/pages/StaffLoginPage.tsx`: Line 37
    - `backend/resources/js/Pages/StaffLoginPage.tsx`: Line 37
    - Code: `router.visit(email.includes('admin') ? '/admin' : '/pos');`
- **Problem:** Users with valid credentials but non-standard emails (e.g., `super.user@primary.com` as an admin, or `finance@bellevue.com`) are redirected to the wrong dashboard, leading to "Unauthorized" errors or incorrect UI.
- **Fix Approach:** Replace the email check with a lookup of the `user.role` property returned by the authentication response.
- **Acceptance Test:**
    1. Log in with `finance@bellevue.com`.
    2. Verify the system redirects to `/admin` (Overview) instead of `/pos`.
    3. Log in with a custom admin email not containing "admin".
    4. Verify the system redirects to `/admin`.

### 1.2 Missing Finance and Warehouse Roles in Seeders
- **Evidence:** `backend/database/seeders/ShopSeeder.php`
- **Problem:** Developer and QA environments lack the necessary accounts for testing Role-Based Access Control (RBAC) outside of the core three roles, leading to manual DB overrides and inconsistent testing.
- **Fix Approach:** Update `ShopSeeder.php` to include default accounts for `finance` and `warehouse` (staff) roles.
- **Acceptance Test:**
    1. Run `php artisan db:seed --class=ShopSeeder`.
    2. Verify `finance@bellevue.com` and `warehouse_staff@bellevue.com` exist in the `users` table.

### 1.3 Demo Mode Production Bypass Entry Points
- **Evidence:** 
    - `src/lib/demoSession.ts`: Line 23-34 (Logic for `DEMO_MODE` flag)
    - `src/App.tsx`: Lines 128-130 (Routes for `/pos/kiosk`, `/warehouse/kiosk`, `/admin/kiosk`)
- **Problem:** "Backdoor" routes exist that permit access to dashboards using local storage overrides, bypassing server-side authentication entirely.
- **Fix Approach:** Implement an environment check (`APP_ENV`) in the `AuthProvider` and routing logic to explicitly disable `DemoRoleSwitcher` and unauthorized kiosk routes in production.
- **Acceptance Test:**
    1. Set `APP_ENV=production` in `.env`.
    2. Attempt to navigate directly to `/pos/kiosk`.
    3. Verify a 404 or redirect to login occurs.
    4. Verify the "Demo" badge/switcher is hidden.

### 1.4 Reviews Feature Missing
- **Evidence:** 
    - `docs/_agents/07_reviews.md` (Audit confirm)
    - Database migrations (`backend/database/migrations/`) lacks `reviews` table.
- **Problem:** Missing critical social proof feature for the storefront.
- **Fix Approach:** Implement a dedicated `product_reviews` table and associated Inertia endpoints (as detailed in Feature Spec).
- **Acceptance Test:**
    1. Submit a review from a product page.
    2. Verify review appears in Admin moderation panel.
    3. Verify review only displays on storefront after approval.

### 1.5 Internal Analytics Missing
- **Evidence:** 
    - `docs/_agents/08_analytics.md` (Audit confirm)
    - Absence of tracking hooks in `CartContext.tsx` or `POSPage.tsx`.
- **Problem:** No visibility into conversion rates, sales channel velocity (Web vs POS), or inventory movement.
- **Fix Approach:** Implement a server-side `analytics_events` log and client-side tracking hooks (as detailed in Feature Spec).
- **Acceptance Test:**
    1. Perform a sale in POS.
    2. Verify a record is added to `analytics_events` with `event_type='pos_sale_completed'`.

---

## 2. Patch Order (Safe Sequential Implementation)

1.  **High Priority (Auth/Seed):** Fix `StaffLoginPage.tsx` redirect logic and update `ShopSeeder.php`. (Ensures testing can resume).
2.  **Safety (Security):** Hard-disable Demo Mode on production environment (`APP_ENV=production`).
3.  **Core Feature (Analytics):** Implement `analytics_events` table and basic page-view/sale logging. (Provides baseline for business tracking).
4.  **Secondary Feature (Reviews):** Implement `product_reviews` schema and moderation UI.

---

## 3. Shareholder Demo Safeguards

### MUST REMAIN UNCHANGED
- **Visual Branding:** The HSL Mint Green color palette and "Instrument Sans" typography.
- **Dashboard Layouts:** The sidebar and header structure of `/admin` and `/pos`.
- **Navigation URLs:** All primary entry points (`/admin`, `/pos`, `/shop`, `/repair`).

### SAFE TO ADJUST
- **Logic Refactoring:** Internal API handlers and redirect logic.
- **Data Seeders:** Adding new roles and orders to enhance the demo's visual richness.
- **Middleware:** Adding more specific role checks (`finance`, `warehouse`).
