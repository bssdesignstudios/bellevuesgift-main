# Bellevue Gifts: RBAC Role & Access Matrix

**Version:** 1.0  
**Scope:** Canonical Access Control Rules

---

## 1. Role Definitions

| Role | Description |
|------|-------------|
| **customer** | External user of the storefront. Can manage their own profile and view order history. |
| **cashier** | Front-of-house staff. Operations focused on POS sales and retail transactions. |
| **warehouse_manager** | Back-of-house staff. Focused on fulfillment, stock received, and inventory adjustments. |
| **finance** | Operational admin. focused on P&L, sales reports, and export of tax data. |
| **admin** | High-level store operator. Manages staff, settings, and catalog. |
| **super_admin** | System-level access. Tenant management and cross-platform global settings. |

---

## 2. Route Access Table

| Route Pattern | Required Role(s) | Guard Location | Evidence Ref |
|---------------|------------------|----------------|--------------|
| `/account/*` | `customer` | `web.php` middleware: `auth` | `App.tsx:112` |
| `/pos*` | `admin, cashier, warehouse, warehouse_manager` | `web.php` middleware: `role:admin,cashier...` | `web.php` group |
| `/kiosk/warehouse*` | `admin, warehouse_manager` | `web.php` middleware: `role:admin,warehouse_manager` | `web.php` group |
| `/admin*` (Overview) | `admin, finance` | `web.php` middleware: `role:admin,finance` | `web.php` group |
| `/admin/staff*` | `admin` | `web.php` middleware: `role:admin` | `web.php` group |
| `/admin/settings*` | `admin, super_admin` | `web.php` middleware: `role:admin` | `web.php` entry |

---

## 3. Detailed Data Scope Rules

### 3.1 Customer Scope
- **Visibility:** Can only see orders and repair tickets where `customer_id` matches their user ID.
- **Actions:** Can create web orders, submit repair requests, and manage personal addresses.

### 3.2 Cashier Scope
- **Visibility:** Product catalog, active POS sessions.
- **Actions:** 
    - Create POS orders.
    - Collect payments for `pay_later` orders.
    - Verify and process store pickup orders.
    - **Restriction:** Cannot modify product prices or tax classes.

### 3.3 Warehouse Scope
- **Visibility:** Inventory levels by location, pending fulfillment orders.
- **Actions:** 
    - Update fulfillment status (e.g., `pending` -> `picking` -> `ready`).
    - Record inventory adjustments (damage/receive).
    - **Restriction:** Cannot view sales totals or customer payment details.

### 3.4 Finance Scope
- **Visibility:** Sales reports, tax (VAT) summaries, export lists.
- **Actions:** 
    - View and export sales data.
    - Manage discount coupons (limitations as per policy).
    - **Restriction:** Cannot modify product inventory or catalog items.

### 3.5 Admin Scope
- **Visibility:** Global view of all data.
- **Actions:** 
    - Full CRUD for products, categories, and customers.
    - Staff management (add/remove staff).
    - System configuration (VAT rates, store info).

### 3.6 Super Admin Scope
- **Visibility:** Multi-tenant dashboard.
- **Actions:** 
    - Manage staff roles across all platforms.
    - Global system health monitoring.
    - Global settings management.

---

## 4. Enforcement Strategy

- **Backend:** Enforced in `web.php` using custom `RoleMiddleware`. 
- **Frontend:** Conditional rendering in `AdminSidebar.tsx` and `DemoRoleSwitcher.tsx` based on `useAuth().staff.role`.
- **Database:** Supabase RLS policies (where applicable) act as the final safety net for direct cloud access.
