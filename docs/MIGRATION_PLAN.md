# Bellevue Gifts: Migration Plan

**Version:** 1.0  
**Date:** 2026-02-09  
**Based On:** Codebase Audit Report

---

## 1. Migration Overview

### 1.1 Current State

The Bellevue Gifts codebase consists of two parallel implementations:

| Component | Legacy SPA | Laravel Backend |
|-----------|------------|-----------------|
| Location | `src/` | `backend/` |
| Framework | React + Vite | Laravel 11 + Inertia |
| Database | Supabase (cloud) | SQLite/PostgreSQL |
| Auth | Supabase Auth | Laravel Auth |
| Status | Demo/Prototype | Production-Ready |

### 1.2 Target State

- **Single Codebase:** Laravel 11 + Inertia.js + React
- **Database:** PostgreSQL (production) / SQLite (development)
- **Auth:** Laravel built-in authentication with role-based access
- **Deployment:** Single Laravel application

### 1.3 Migration Principles

1. **Preserve Existing Functionality** - No feature regression
2. **Incremental Migration** - Phase-by-phase rollout
3. **Data Integrity** - Zero data loss during migration
4. **Testing First** - Test coverage before each phase

---

## 2. Phase 1: Database Consolidation

### 2.1 Schema Analysis

**Current Laravel Migrations (Production-Ready):**

| Migration | Tables | Status |
|-----------|--------|--------|
| Users | `users`, `password_reset_tokens`, `sessions` | ✅ Complete |
| Shop Base | `categories`, `products`, `inventory`, `inventory_adjustments` | ✅ Complete |
| Customer System | `customers` | ✅ Complete |
| Order Management | `orders`, `order_items`, `payments`, `gift_cards`, `coupons`, `store_settings` | ✅ Complete |
| OPS/POS | `registers`, `staff` | ✅ Complete |
| Roles | `role` column on `users` | ✅ Complete |
| Repair Tickets | `repair_tickets` | ✅ Complete |
| Vendors | `vendors`, `vendor_id` on products | ✅ Complete |

### 2.2 Missing Tables (from Supabase)

The following Supabase features need verification in Laravel:

| Feature | Supabase | Laravel | Action |
|---------|----------|---------|--------|
| Order Number Function | `generate_order_number()` | ✅ Migration exists | Verify |
| RLS Policies | Full policies | Not applicable | Use middleware |
| Triggers | `update_updated_at` | ✅ Eloquent handles | None |

### 2.3 Data Migration Steps

1. **Export from Supabase (if needed):**
   ```bash
   supabase db dump --data-only > supabase_data.sql
   ```

2. **Transform Data:**
   - Convert UUIDs if needed
   - Map `auth_user_id` to Laravel user IDs
   - Import via Laravel seeders or SQL

3. **Verify Integrity:**
   ```bash
   php artisan tinker
   >>> \App\Models\Product::count()
   >>> \App\Models\Order::count()
   ```

### 2.4 Recommended Additions

**Product Reviews Table:**
```php
Schema::create('product_reviews', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
    $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
    $table->tinyInteger('rating')->unsigned();
    $table->string('title')->nullable();
    $table->text('body')->nullable();
    $table->boolean('is_approved')->default(false);
    $table->timestamps();
});
```

**Analytics Events Table (optional):**
```php
Schema::create('analytics_events', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('event_type'); // page_view, add_to_cart, purchase
    $table->json('properties')->nullable();
    $table->string('session_id')->nullable();
    $table->foreignUuid('customer_id')->nullable();
    $table->timestamps();
});
```

---

## 3. Phase 2: Authentication Consolidation

### 3.1 Current Auth Systems

| System | Provider | Location |
|--------|----------|----------|
| Staff Auth | Laravel Auth | `AuthController.php` |
| Customer Auth | Supabase Auth | `CustomerAuthContext.tsx` |
| Demo Mode | localStorage | `demoSession.ts` |

### 3.2 Target Auth System

**Single Laravel Auth for All Users:**

| User Type | Role | Login URL | Redirect |
|-----------|------|-----------|----------|
| Admin | `admin` | `/staff/login` | `/admin` |
| Cashier | `cashier` | `/staff/login` | `/pos` |
| Warehouse Manager | `warehouse_manager` | `/staff/login` | `/kiosk/warehouse` |
| Finance | `finance` | `/staff/login` | `/admin` |
| Customer | `customer` | `/account/login` | `/account` |

### 3.3 Migration Steps

1. **Update LoginController:**
   ```php
   // Add all role redirects
   match($user->role) {
       'admin' => '/admin',
       'cashier' => '/pos',
       'warehouse_manager' => '/kiosk/warehouse',
       'finance' => '/admin',
       'customer' => '/account',
       default => '/shop',
   };
   ```

2. **Customer Auth Migration:**
   - Create Laravel customer registration endpoint
   - Migrate existing Supabase auth users to Laravel
   - Update frontend to use Laravel endpoints

3. **Remove Demo Mode (Production):**
   ```bash
   # Production environment
   localStorage.removeItem('DEMO_MODE');
   localStorage.removeItem('demo_session');
   ```

### 3.4 Frontend Auth Updates

**Update `StaffLoginPage.tsx`:**

```typescript
// BEFORE (email heuristic)
router.visit(email.includes('admin') ? '/admin' : '/pos');

// AFTER (role-based)
const response = await signIn(email, password);
if (response.data.user) {
  switch (response.data.user.role) {
    case 'admin':
      router.visit('/admin');
      break;
    case 'cashier':
      router.visit('/pos');
      break;
    case 'warehouse_manager':
      router.visit('/kiosk/warehouse');
      break;
    case 'finance':
      router.visit('/admin');
      break;
    default:
      router.visit('/');
  }
}
```

### 3.5 Seeder Updates

**Add missing roles to `ShopSeeder.php`:**

```php
// Finance User
if (!User::where('email', 'finance@bellevue.com')->exists()) {
    User::create([
        'name' => 'Finance User',
        'email' => 'finance@bellevue.com',
        'password' => bcrypt('password'),
        'role' => 'finance',
    ]);
}

// Warehouse Staff
if (!User::where('email', 'warehouse_staff@bellevue.com')->exists()) {
    User::create([
        'name' => 'Warehouse Staff',
        'email' => 'warehouse_staff@bellevue.com',
        'password' => bcrypt('password'),
        'role' => 'warehouse',
    ]);
}
```

---

## 4. Phase 3: Route Consolidation

### 4.1 Storefront Routes

**Already implemented in Laravel (`web.php`):**

| Route | Controller | Status |
|-------|------------|--------|
| `/` | `ShopController@home` | ✅ |
| `/shop` | `ShopController@index` | ✅ |
| `/category/{slug}` | `ShopController@category` | ✅ |
| `/product/{slug}` | `ShopController@product` | ✅ |
| `/cart` | `CartController@index` | ✅ |
| `/checkout` | `CheckoutController@index` | ✅ |

### 4.2 Admin Routes

**Already implemented with RBAC:**

| Route | Middleware | Status |
|-------|------------|--------|
| `/admin` | `auth`, `role:admin,finance` | ✅ |
| `/admin/staff` | `auth`, `role:admin` | ✅ |
| `/pos` | `auth`, `role:admin,cashier,warehouse,warehouse_manager` | ✅ |

### 4.3 API Routes to Add

```php
// API routes for mobile/PWA
Route::prefix('api')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/products', [ApiProductController::class, 'index']);
    Route::get('/products/{id}', [ApiProductController::class, 'show']);
    Route::post('/orders', [ApiOrderController::class, 'store']);
    Route::get('/orders/{id}', [ApiOrderController::class, 'show']);
});
```

---

## 5. Phase 4: Feature Implementation

### 5.1 Product Reviews

**Implementation Steps:**

1. Create migration (see 2.4)
2. Create `Review` model
3. Create `ReviewController`
4. Add review form to `ProductPage.tsx`
5. Add review display component
6. Add admin moderation in `AdminProducts.tsx`

### 5.2 Analytics Integration

**Option A: Google Analytics 4**

```html
<!-- Add to app.blade.php -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Option B: Self-Hosted (Plausible/Umami)**

```bash
# Deploy Plausible
docker-compose up -d plausible
```

### 5.3 Gift Card Balance Check

**Current:** Implemented in `GiftCardsBalancePage.tsx`
**Status:** ✅ Complete (Supabase)
**Migration:** Update to use Laravel API

```php
// routes/web.php
Route::post('/gift-cards/check-balance', [GiftCardController::class, 'checkBalance']);
```

### 5.4 Repair Ticket System

**Current:** Table exists, admin page exists
**Status:** ✅ Backend complete
**Frontend:** Verify CRUD operations work

---

## 6. Phase 5: Legacy Code Removal

### 6.1 Files to Archive

```
src/
├── integrations/supabase/   # Move to archive
├── contexts/
│   ├── CustomerAuthContext.tsx  # Replace with Laravel auth
│   └── AuthContext.tsx          # Replace with Laravel auth
└── lib/
    └── demoSession.ts           # Remove in production
```

### 6.2 Cleanup Steps

1. **Update `package.json`:**
   - Remove `@supabase/supabase-js`
   - Remove unused Lovable dependencies

2. **Update Environment Variables:**
   - Remove `VITE_SUPABASE_URL`
   - Remove `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Add Laravel API URL if needed

3. **Archive Legacy SPA:**
   ```bash
   git mv src/ archive/legacy-spa/
   git commit -m "Archive legacy Supabase SPA"
   ```

---

## 7. Testing Checklist

### 7.1 Pre-Migration Tests

- [ ] Document all current Supabase data
- [ ] Screenshot all working features
- [ ] Record E2E test videos
- [ ] Export Supabase database

### 7.2 Post-Migration Tests

**Authentication:**
- [ ] Admin login → `/admin`
- [ ] Cashier login → `/pos`
- [ ] Warehouse Manager login → `/kiosk/warehouse`
- [ ] Finance login → `/admin`
- [ ] Customer registration
- [ ] Customer login → `/account`
- [ ] Password reset flow

**Storefront:**
- [ ] Homepage loads products
- [ ] Category filtering works
- [ ] Product detail page
- [ ] Add to cart
- [ ] Cart page updates
- [ ] Checkout flow (pickup)
- [ ] Checkout flow (delivery)
- [ ] Order confirmation

**POS:**
- [ ] Product search
- [ ] Barcode scan (if applicable)
- [ ] Add items to cart
- [ ] Customer lookup
- [ ] Payment (cash)
- [ ] Payment (card)
- [ ] Receipt generation

**Admin:**
- [ ] Dashboard metrics
- [ ] Product CRUD
- [ ] Order management
- [ ] Staff management (admin only)
- [ ] Reports generation

---

## 8. Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database | 1-2 days | None |
| Phase 2: Auth | 2-3 days | Phase 1 |
| Phase 3: Routes | 1 day | Phase 2 |
| Phase 4: Features | 3-5 days | Phase 3 |
| Phase 5: Cleanup | 1 day | Phase 4 |
| Testing | 2-3 days | All phases |
| **Total** | **10-15 days** | |

---

## 9. Risk Mitigation

### 9.1 Rollback Plan

1. **Database:** Keep Supabase instance active during migration
2. **Code:** Create `legacy/v1` branch before changes
3. **DNS:** Use feature flags or subdomain for testing

### 9.2 Data Backup

```bash
# Laravel database
php artisan backup:run

# Supabase
supabase db dump > backup_$(date +%Y%m%d).sql
```

### 9.3 Communication Plan

1. Notify stakeholders before migration start
2. Schedule maintenance window
3. Test in staging environment first
4. Document all changes

---

## 10. Success Criteria

| Metric | Target |
|--------|--------|
| All existing features working | 100% |
| Staff can log in with correct redirects | Pass |
| POS checkout functional | Pass |
| Web checkout functional | Pass |
| No console errors | Pass |
| Page load time | < 3s |
| Lighthouse score | > 80 |

---

## Appendix A: Commands Reference

```bash
# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan view:clear

# Production build
npm run build
php artisan optimize

# Run tests
php artisan test
npm run test
```

## Appendix B: Environment Variables

```env
# Laravel
APP_ENV=production
APP_KEY=base64:...
APP_URL=https://pos.bellevuegifts.com

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_DATABASE=bellevue
DB_USERNAME=postgres
DB_PASSWORD=secret

# Session
SESSION_DRIVER=database
SESSION_LIFETIME=120
```
