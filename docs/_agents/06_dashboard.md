# Dashboard Agent: Evidence Report

## Summary

The application has **three dashboard types**:
1. **Admin Dashboard** - Full management interface
2. **Kiosk Dashboards** - Role-specific simplified views
3. **Customer Account** - Self-service portal

## Evidence

### 1. Admin Dashboard Pages

**Location:** `src/pages/admin/`

| Component | File | Purpose |
|-----------|------|---------|
| `AdminOverview.tsx` | `admin/AdminOverview.tsx` | Sales metrics, charts, today's stats |
| `AdminProducts.tsx` | `admin/AdminProducts.tsx` | Product CRUD, search, filters |
| `AdminCategories.tsx` | `admin/AdminCategories.tsx` | Category management |
| `AdminInventory.tsx` | `admin/AdminInventory.tsx` | Stock levels, adjustments |
| `AdminOrders.tsx` | `admin/AdminOrders.tsx` | Order list, status management |
| `AdminCustomers.tsx` | `admin/AdminCustomers.tsx` | Customer list, details |
| `AdminStaff.tsx` | `admin/AdminStaff.tsx` | Staff management (admin only) |
| `AdminDiscounts.tsx` | `admin/AdminDiscounts.tsx` | Coupon management |
| `AdminReports.tsx` | `admin/AdminReports.tsx` | Sales reports, exports |
| `AdminGiftCards.tsx` | `admin/AdminGiftCards.tsx` | Gift card management |
| `AdminRepairTickets.tsx` | `admin/AdminRepairTickets.tsx` | Repair ticket tracking |

### 2. Admin Layout

**File:** `src/components/admin/AdminLayout.tsx`

Components:
- Sidebar navigation
- Header with user menu
- Content area with outlet
- Breadcrumb navigation

### 3. Admin Sidebar

**File:** `src/components/admin/AdminSidebar.tsx`

Navigation items:
- Overview
- Products
- Categories
- Inventory
- Orders
- Repair Tickets
- Gift Cards
- Customers
- Staff (admin only)
- Discounts
- Reports

### 4. Kiosk Dashboards

**Location:** `src/pages/kiosk/`

| Component | File | Role | Features |
|-----------|------|------|----------|
| `CashierKiosk.tsx` | `kiosk/CashierKiosk.tsx` | Cashier | POS interface |
| `WarehouseKiosk.tsx` | `kiosk/WarehouseKiosk.tsx` | Warehouse | Stock management |
| `AdminKiosk.tsx` | `kiosk/AdminKiosk.tsx` | Admin | Overview dashboard |

### 5. POS Page (Full POS Interface)

**File:** `src/pages/POSPage.tsx` (45,676 bytes)

Features:
- Product grid with search
- Barcode/SKU lookup
- Cart management
- Customer lookup/create
- Payment processing (cash, card, split, gift card)
- Apply discounts/coupons
- Receipt preview
- Order history
- Offline mode support

### 6. Customer Account Dashboard

**Location:** `src/pages/account/`

| Component | Route | Purpose |
|-----------|-------|---------|
| `AccountDashboardPage.tsx` | `/account` | Overview stats |
| `AccountOrdersPage.tsx` | `/account/orders` | Order history |
| `AccountOrderDetailPage.tsx` | `/account/orders/:id` | Order details |
| `AccountTrackingPage.tsx` | `/account/tracking` | Order tracking |
| `AccountAddressesPage.tsx` | `/account/addresses` | Saved addresses |
| `AccountWishlistPage.tsx` | `/account/wishlist` | Wishlist items |
| `AccountGiftCardsPage.tsx` | `/account/gift-cards` | Gift card balance |
| `AccountSettingsPage.tsx` | `/account/settings` | Profile settings |

### 7. Account Layout

**File:** `src/components/account/AccountLayout.tsx`

Components:
- Sidebar navigation
- User profile section
- Content area
- Mobile-responsive menu

### 8. Demo Role Switcher

**File:** `src/components/DemoRoleSwitcher.tsx`

Allows switching between demo roles:
- Admin
- Warehouse Manager
- Cashier

Visible only when demo mode is enabled.

### 9. Dashboard Metrics (Admin Overview)

Expected metrics:
- Today's sales total
- Order count
- New customers
- Low stock items
- Recent orders
- Sales chart (weekly/monthly)
- Top selling products

### 10. Access Control

**Admin Pages:**
| Page | Required Role(s) |
|------|-----------------|
| Overview | admin, finance |
| Products | admin |
| Orders | admin, finance |
| Staff | admin (only) |
| Reports | admin, finance |

## Laravel Backend Dashboard Pages

**Location:** `backend/resources/js/Pages/admin/`

15 admin pages mirroring the SPA structure.

## Recommendations

1. Add real-time updates for order dashboard
2. Implement dashboard widgets customization
3. Add export functionality for all reports
4. Implement notification center
