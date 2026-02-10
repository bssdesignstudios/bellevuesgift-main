# Bellevue Gifts: Codebase Audit Report

**Generated:** 2026-02-09  
**Auditor:** Agent System  
**Repository:** bellevuegifts-main

---

## Executive Summary

This is a **hybrid codebase** consisting of:
1. **Legacy Lovable SPA** (`src/`): React + Vite + Supabase client-side application
2. **Laravel Backend** (`backend/`): Laravel 11 + Inertia.js + React server-rendered application

Both codebases share similar features but are **NOT integrated**. The Laravel backend is the **production-ready** system with proper authentication, middleware, and database management via SQLite/PostgreSQL.

---

## 1. Code Structure Agent

### 1.1 Directory Layout

```
bellevuegifts-main/
├── backend/                    # Laravel 11 Application (PRODUCTION)
│   ├── app/
│   │   ├── Http/Controllers/   # API & Web Controllers
│   │   ├── Models/             # Eloquent Models
│   │   └── Providers/
│   ├── database/
│   │   ├── migrations/         # 15 migration files
│   │   └── seeders/            # ShopSeeder.php
│   ├── resources/js/           # Inertia React Pages (131 .tsx files)
│   │   ├── Pages/              # 24 page components + subdirs
│   │   ├── components/         # UI components
│   │   └── contexts/           # AuthContext, CartContext
│   └── routes/
│       └── web.php             # 363 lines, full route definitions
│
├── src/                        # Legacy Lovable SPA (131 .tsx files)
│   ├── App.tsx                 # React Router routes
│   ├── contexts/               # AuthContext, CartContext, CustomerAuthContext
│   ├── integrations/supabase/  # Supabase client
│   ├── lib/                    # demoSession.ts, constants.ts
│   └── pages/                  # Page components
│
├── supabase/                   # Supabase migrations (6 SQL files)
│   ├── migrations/
│   └── functions/              # Edge functions
│
├── package.json                # Root Node.js dependencies (Vite, React, Shadcn)
└── vite.config.ts              # PWA configuration for POS
```

### 1.2 Key Metrics

| Metric | Legacy SPA (src/) | Laravel (backend/) |
|--------|-------------------|-------------------|
| TypeScript/TSX Files | 131 | 131 |
| Routes Defined | ~40 (App.tsx) | ~100 (web.php) |
| Database | Supabase (cloud) | SQLite/PostgreSQL |
| Auth System | Supabase Auth | Laravel built-in |

### 1.3 Key Files

| Purpose | File Path |
|---------|-----------|
| Main Entry (SPA) | `src/main.tsx` |
| App Router (SPA) | `src/App.tsx` L1-167 |
| Main Entry (Laravel) | `backend/resources/js/app.tsx` |
| Routes (Laravel) | `backend/routes/web.php` L1-363 |
| Auth Context (SPA) | `src/contexts/AuthContext.tsx` L1-216 |
| Auth Context (Laravel) | `backend/resources/js/contexts/AuthContext.tsx` L1-192 |
| Cart Context | `src/contexts/CartContext.tsx` L1-117 |
| Demo Session | `src/lib/demoSession.ts` L1-118 |
| Supabase Client | `src/integrations/supabase/client.ts` L1-17 |

---

## 2. Routes Agent

### 2.1 Storefront Routes (React Router - Legacy SPA)

| Route | Component | Evidence |
|-------|-----------|----------|
| `/` | `HomePage` | `src/App.tsx:85` |
| `/shop` | `ShopPage` | `src/App.tsx:86` |
| `/category/:slug` | `CategoryPage` | `src/App.tsx:87` |
| `/product/:slug` | `ProductPage` | `src/App.tsx:88` |
| `/cart` | `CartPage` | `src/App.tsx:89` |
| `/checkout` | `CheckoutPage` | `src/App.tsx:90` |
| `/checkout/success/:id` | `CheckoutSuccessPage` | `src/App.tsx:91` |
| `/order/:id` | `OrderPage` | `src/App.tsx:92` |
| `/order/track` | `TrackOrderPage` | `src/App.tsx:93` |
| `/gift-cards` | `GiftCardsPage` | `src/App.tsx:96` |
| `/gift-cards/balance` | `GiftCardsBalancePage` | `src/App.tsx:97` |
| `/repair` | `RepairPage` | `src/App.tsx:103` |
| `/contact` | `ContactPage` | `src/App.tsx:100` |
| `/about` | `AboutPage` | `src/App.tsx:101` |
| `/faq` | `FAQPage` | `src/App.tsx:102` |

### 2.2 Account Routes (Customer Portal)

| Route | Component | Evidence |
|-------|-----------|----------|
| `/account/login` | `AccountLoginPage` | `src/App.tsx:107` |
| `/account/register` | `AccountRegisterPage` | `src/App.tsx:108` |
| `/account/forgot-password` | `AccountForgotPasswordPage` | `src/App.tsx:109` |
| `/account` | `AccountDashboardPage` | `src/App.tsx:113` |
| `/account/orders` | `AccountOrdersPage` | `src/App.tsx:114` |
| `/account/orders/:orderNumber` | `AccountOrderDetailPage` | `src/App.tsx:115` |
| `/account/wishlist` | `AccountWishlistPage` | `src/App.tsx:118` |
| `/account/gift-cards` | `AccountGiftCardsPage` | `src/App.tsx:119` |
| `/account/settings` | `AccountSettingsPage` | `src/App.tsx:120` |

### 2.3 Staff/Admin Routes (Legacy SPA)

| Route | Component | Evidence |
|-------|-----------|----------|
| `/login` | `LoginPage` | `src/App.tsx:124` |
| `/staff/login` | `StaffLoginPage` | `src/App.tsx:125` |
| `/pos` | `POSPage` | `src/App.tsx:136` |
| `/pos/kiosk` | `CashierKiosk` | `src/App.tsx:128` |
| `/warehouse/kiosk` | `WarehouseKiosk` | `src/App.tsx:129` |
| `/admin/kiosk` | `AdminKiosk` | `src/App.tsx:130` |
| `/not-authorized` | `NotAuthorizedPage` | `src/App.tsx:139` |
| `/admin` | `AdminOverview` | `src/App.tsx:143` |
| `/admin/products` | `AdminProducts` | `src/App.tsx:144` |
| `/admin/orders` | `AdminOrders` | `src/App.tsx:147` |
| `/admin/staff` | `AdminStaff` | `src/App.tsx:151` |
| `/admin/reports` | `AdminReports` | `src/App.tsx:153` |
| `/admin/gift-cards` | `AdminGiftCards` | `src/App.tsx:149` |
| `/admin/repair-tickets` | `AdminRepairTickets` | `src/App.tsx:148` |

### 2.4 Laravel Backend Routes

| Route Group | Middleware | Evidence |
|-------------|-----------|----------|
| POS Routes | `auth`, `role:admin,cashier,warehouse,warehouse_manager` | `backend/routes/web.php` |
| Admin Overview | `auth`, `role:admin,finance` | `backend/routes/web.php` |
| Staff Management | `auth`, `role:admin` | `backend/routes/web.php` |

---

## 3. Authentication Agent

### 3.1 Staff Authentication (Laravel)

**Controller:** `backend/app/Http/Controllers/AuthController.php`

```php
// Allowed staff roles (L14-15)
$staffRoles = ['admin', 'cashier', 'warehouse', 'warehouse_manager', 'finance'];
```

**Login Controller Redirects:** `backend/app/Http/Controllers/Auth/LoginController.php`

| Role | Redirect Path |
|------|---------------|
| `admin` | `/admin` |
| `cashier` | `/pos` |
| `warehouse_manager` | `/kiosk/warehouse` |
| Other | `/shop` |

### 3.2 Staff Credentials (from Seeders)

**File:** `backend/database/seeders/ShopSeeder.php`

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@bellevue.com` | `password` |
| Cashier | `cashier@bellevue.com` | `password` |
| Warehouse Manager | `warehouse@bellevue.com` | `password` |

**Note:** `finance` and `warehouse` roles must be created manually via Tinker.

### 3.3 Customer Authentication (Supabase)

**File:** `src/contexts/CustomerAuthContext.tsx`

- Uses `@supabase/supabase-js` for auth
- Creates customer profile in `customers` table on signup
- Links via `auth_user_id` foreign key

### 3.4 Demo Mode System

**File:** `src/lib/demoSession.ts`

| Demo Role | Email | UUID |
|-----------|-------|------|
| `cashier` | `cashier1@bellevue.demo` | `00000000-0000-0000-0000-000000000001` |
| `warehouse` | `warehouse1@demo.com` | `00000000-0000-0000-0000-000000000002` |
| `admin` | `admin1@demo.com` | `00000000-0000-0000-0000-000000000003` |

### 3.5 RBAC Configuration

**File:** `backend/routes/web.php`

```php
Route::middleware(['auth', 'role:admin,cashier,warehouse,warehouse_manager'])->group(function () {
    // POS routes
});

Route::middleware(['auth'])->prefix('admin')->group(function () {
    Route::middleware(['role:admin,finance'])->group(function () {
        // Admin overview routes
    });
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/staff', ...); // Staff management
    });
});
```

---

## 4. Database Agent

### 4.1 Laravel Migrations (15 files)

**Location:** `backend/database/migrations/`

| Migration | Tables Created |
|-----------|---------------|
| `0001_01_01_000000_create_users_table.php` | `users`, `password_reset_tokens`, `sessions` |
| `2026_02_04_025209_create_shop_base_tables.php` | `categories`, `products`, `inventory`, `inventory_adjustments` |
| `2026_02_04_025226_create_customer_system_tables.php` | `customers` |
| `2026_02_04_025242_create_order_management_tables.php` | `orders`, `order_items`, `payments`, `gift_cards`, `coupons`, `store_settings` |
| `2026_02_04_025301_create_ops_and_pos_tables.php` | `registers`, `staff` (Supabase-compatible) |
| `2026_02_04_053715_add_role_to_users_table.php` | Adds `role` column to `users` |
| `2026_02_04_152237_create_repair_tickets_table.php` | `repair_tickets` |
| `2026_02_04_180452_create_vendors_table.php` | `vendors` |
| `2026_02_04_180516_add_vendor_id_to_products_table.php` | Adds `vendor_id` to `products` |

### 4.2 Supabase Schema (Legacy)

**Location:** `supabase/migrations/20260129170632_*.sql`

**Core Tables:**
- `categories` (id, name, slug, sort_order, is_active)
- `products` (id, category_id, name, slug, sku, barcode, price, sale_price, tax_class, image_url, is_active)
- `inventory` (id, product_id, location, qty_on_hand, qty_reserved, reorder_level)
- `customers` (id, name, phone, email, island, address)
- `staff` (id, auth_user_id, name, email, role, is_active)
- `orders` (id, order_number, customer_id, staff_id, channel, status, fulfillment_method, payment_status, payment_method, subtotal, vat_amount, discount_amount, total, notes)
- `order_items` (id, order_id, product_id, sku, name, qty, unit_price, line_total)
- `payments` (id, order_id, amount, method, reference)
- `gift_cards` (id, code, balance, initial_balance, is_active, used_at)
- `coupons` (id, code, discount_type, value, min_order_amount, is_active, start_at, end_at)
- `store_settings` (id, key, value)
- `inventory_adjustments` (id, product_id, adjustment_type, qty_change, notes, staff_id)

### 4.3 Key Foreign Keys

| Child Table | Foreign Key | Parent Table |
|-------------|-------------|--------------|
| `products` | `category_id` | `categories` |
| `products` | `vendor_id` | `vendors` |
| `inventory` | `product_id` | `products` |
| `orders` | `customer_id` | `customers` |
| `orders` | `staff_id` | `staff` / `users` |
| `order_items` | `order_id` | `orders` |
| `order_items` | `product_id` | `products` |
| `payments` | `order_id` | `orders` |
| `repair_tickets` | `customer_id` | `customers` |

### 4.4 Order Number Generation

**Function:** `generate_order_number()` (PostgreSQL/SQLite)

```sql
-- Pattern: BLV-YYYY-NNNNNN
-- Example: BLV-2026-000001
```

---

## 5. Purchase Flow Agent

### 5.1 Web Checkout Flow (Legacy SPA)

**File:** `src/pages/CheckoutPage.tsx`

1. Cart items from `CartContext` (localStorage-based)
2. Customer creation/lookup via Supabase
3. Order creation with:
   - `channel: 'web'`
   - `status: 'pending'`
   - `fulfillment_method: 'pickup' | 'island_delivery' | 'mailboat'`
   - `payment_status: 'paid' | 'pay_later'`
4. Order items insertion
5. Redirect to `/checkout/success/:id`

### 5.2 Fulfillment Methods

**Source:** `src/lib/constants.ts`

| Method | Description |
|--------|-------------|
| `pickup` | Store Pickup |
| `island_delivery` | Grand Bahama Delivery |
| `mailboat` | Out Island via Mailboat |

### 5.3 Payment Methods

| Method | Channel |
|--------|---------|
| `card` | Web (simulated) |
| `pay_later` | Web (pay on pickup) |
| `cash` | POS |
| `card` | POS |
| `split` | POS |
| `gift_card` | POS |

### 5.4 POS Checkout

**File:** `backend/resources/js/Pages/POSPage.tsx` (45KB)

- Full POS interface with product grid
- Cart management
- Customer lookup/create
- Payment processing
- Receipt generation
- Offline sync support (via PWA)

---

## 6. Dashboard Agent

### 6.1 Admin Dashboard Components

**Location:** `src/pages/admin/`

| Component | Purpose | Evidence |
|-----------|---------|----------|
| `AdminOverview.tsx` | Sales metrics, charts | `src/App.tsx:143` |
| `AdminProducts.tsx` | Product CRUD | `src/App.tsx:144` |
| `AdminCategories.tsx` | Category management | `src/App.tsx:145` |
| `AdminInventory.tsx` | Stock levels | `src/App.tsx:146` |
| `AdminOrders.tsx` | Order management | `src/App.tsx:147` |
| `AdminCustomers.tsx` | Customer list | `src/App.tsx:150` |
| `AdminStaff.tsx` | Staff management | `src/App.tsx:151` |
| `AdminDiscounts.tsx` | Coupon management | `src/App.tsx:152` |
| `AdminReports.tsx` | Sales reports | `src/App.tsx:153` |
| `AdminGiftCards.tsx` | Gift card management | `src/App.tsx:149` |
| `AdminRepairTickets.tsx` | Repair tracking | `src/App.tsx:148` |

### 6.2 Kiosk Dashboards

**Location:** `src/pages/kiosk/`

| Component | Role | Purpose |
|-----------|------|---------|
| `CashierKiosk.tsx` | Cashier | POS interface |
| `WarehouseKiosk.tsx` | Warehouse | Stock management |
| `AdminKiosk.tsx` | Admin | Overview dashboard |

---

## 7. Reviews Agent

### 7.1 Status: **NOT IMPLEMENTED**

No evidence of:
- Product reviews table
- Rating system
- Review submission forms
- Star/rating display components

**Search performed:** `review|rating|stars` - No results in `src/`

### 7.2 Recommendation

Add reviews table:
```sql
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    customer_id UUID REFERENCES customers(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## 8. Analytics Agent

### 8.1 Status: **NOT IMPLEMENTED**

No evidence of:
- Google Analytics integration
- Custom event tracking
- Page view tracking
- Conversion tracking

**Search performed:** `analytics|track|event|pageview` - No results in `src/`

### 8.2 Recommendation

Add analytics:
1. Google Tag Manager container
2. E-commerce events (add_to_cart, purchase)
3. Page view tracking

---

## 9. PWA/Offline Agent

### 9.1 Status: **IMPLEMENTED**

**Configuration:** `vite.config.ts:19-66`

```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Bellevue POS',
    short_name: 'BellevuePOS',
    description: 'Bellevue Gifts & Supplies Point of Sale',
    theme_color: '#00005D',
    scope: '/pos',
    start_url: '/pos',
    display: 'standalone',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
      },
    ],
  },
})
```

### 9.2 PWA Features

| Feature | Status |
|---------|--------|
| Service Worker | ✅ Auto-generated by Workbox |
| App Manifest | ✅ Configured for POS |
| Offline Caching | ✅ Static assets + Supabase API |
| Install Prompt | ✅ Standalone display mode |
| Icons | ⚠️ Referenced but need to verify files exist |

---

## 10. Security Agent

### 10.1 Authentication Security

| Item | Status | Evidence |
|------|--------|----------|
| bcrypt passwords | ✅ | `bcrypt('password')` in seeders |
| CSRF protection | ✅ | Laravel middleware |
| Session management | ✅ | `sessions` table in migrations |
| Role-based access | ✅ | Middleware in `web.php` |

### 10.2 RLS Policies (Supabase)

**File:** `supabase/migrations/20260129170632_*.sql:151-251`

- All tables have RLS enabled
- Staff-only write policies
- Public read for products/categories

### 10.3 Potential Vulnerabilities

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Demo credentials in production | HIGH | `ShopSeeder.php` | Remove or rotate in production |
| Fixed demo UUIDs | MEDIUM | `demoSession.ts` | Disable demo mode in production |
| Sensitive env vars | LOW | `backend/.env` | Verify not committed to repo |
| Email-based redirect heuristic | LOW | `StaffLoginPage.tsx:37` | Use role from user object |

### 10.4 Missing Security Features

| Feature | Status |
|---------|--------|
| 2FA/MFA | ❌ Not implemented |
| Rate limiting | ⚠️ Not verified |
| Input sanitization | ⚠️ Laravel handles |
| SQL injection protection | ✅ Eloquent ORM |
| XSS protection | ✅ React escapes by default |

---

## 11. Identified Issues & Recommendations

### 11.1 Critical Issues

1. **Dual Codebase Architecture**
   - Legacy SPA (`src/`) and Laravel (`backend/`) are separate
   - Recommendation: Consolidate to Laravel Inertia stack

2. **Frontend Redirect Logic**
   - `StaffLoginPage.tsx` uses email-based heuristic
   - Recommendation: Use authenticated user's `role` property

3. **Missing Roles in Seeders**
   - `finance` and `warehouse` roles not in `ShopSeeder.php`
   - Recommendation: Add to seeders

### 11.2 Medium Issues

1. **No Product Reviews**
2. **No Analytics Integration**
3. **Demo Mode Enabled by Default**

### 11.3 Improvements

1. Add proper error boundaries
2. Implement loading states consistently
3. Add comprehensive test coverage
4. Document API endpoints

---

## Appendix A: File Counts

| Directory | TS/TSX Files | PHP Files |
|-----------|--------------|-----------|
| `src/` | 131 | 0 |
| `backend/resources/js/` | 131 | 0 |
| `backend/app/` | 0 | ~50 |
| `backend/database/migrations/` | 0 | 15 |

## Appendix B: Dependencies

**Frontend (package.json):**
- React 18.3.1
- React Router DOM 6.30.1
- Tailwind CSS 3.4.17
- Radix UI (full suite)
- Tanstack Query 5.83.0
- Supabase JS 2.93.3
- Framer Motion 12.29.2
- Recharts 2.15.4
- Sonner 1.7.4

**Backend (composer.json):**
- Laravel 11
- Inertia.js 2.x
- SQLite/PostgreSQL
