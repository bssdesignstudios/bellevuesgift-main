# Routes Agent: Evidence Report

## Summary

Routes are defined in two locations:
1. **React Router** (`src/App.tsx`) - Client-side routing for SPA
2. **Laravel Routes** (`backend/routes/web.php`) - Server-side routing

## Evidence

### Storefront Routes (React Router)

| Route | Component | File:Line |
|-------|-----------|-----------|
| `/` | HomePage | `src/App.tsx:85` |
| `/shop` | ShopPage | `src/App.tsx:86` |
| `/category/:slug` | CategoryPage | `src/App.tsx:87` |
| `/product/:slug` | ProductPage | `src/App.tsx:88` |
| `/cart` | CartPage | `src/App.tsx:89` |
| `/checkout` | CheckoutPage | `src/App.tsx:90` |
| `/checkout/success/:id` | CheckoutSuccessPage | `src/App.tsx:91` |
| `/order/:id` | OrderPage | `src/App.tsx:92` |
| `/order/track` | TrackOrderPage | `src/App.tsx:93` |
| `/sale` | CategoryPage | `src/App.tsx:94` |
| `/search` | ShopPage | `src/App.tsx:95` |
| `/gift-cards` | GiftCardsPage | `src/App.tsx:96` |
| `/gift-cards/balance` | GiftCardsBalancePage | `src/App.tsx:97` |
| `/returns` | ReturnsPage | `src/App.tsx:98` |
| `/shipping` | ShippingPage | `src/App.tsx:99` |
| `/contact` | ContactPage | `src/App.tsx:100` |
| `/about` | AboutPage | `src/App.tsx:101` |
| `/faq` | FAQPage | `src/App.tsx:102` |
| `/repair` | RepairPage | `src/App.tsx:103` |

### Account Routes

| Route | Component | File:Line |
|-------|-----------|-----------|
| `/account/login` | AccountLoginPage | `src/App.tsx:107` |
| `/account/register` | AccountRegisterPage | `src/App.tsx:108` |
| `/account/forgot-password` | AccountForgotPasswordPage | `src/App.tsx:109` |
| `/account` | AccountDashboardPage | `src/App.tsx:113` |
| `/account/orders` | AccountOrdersPage | `src/App.tsx:114` |
| `/account/orders/:orderNumber` | AccountOrderDetailPage | `src/App.tsx:115` |
| `/account/tracking` | AccountTrackingPage | `src/App.tsx:116` |
| `/account/addresses` | AccountAddressesPage | `src/App.tsx:117` |
| `/account/wishlist` | AccountWishlistPage | `src/App.tsx:118` |
| `/account/gift-cards` | AccountGiftCardsPage | `src/App.tsx:119` |
| `/account/settings` | AccountSettingsPage | `src/App.tsx:120` |

### Staff/Admin Routes

| Route | Component | File:Line |
|-------|-----------|-----------|
| `/login` | LoginPage | `src/App.tsx:124` |
| `/staff/login` | StaffLoginPage | `src/App.tsx:125` |
| `/pos/kiosk` | CashierKiosk | `src/App.tsx:128` |
| `/warehouse/kiosk` | WarehouseKiosk | `src/App.tsx:129` |
| `/admin/kiosk` | AdminKiosk | `src/App.tsx:130` |
| `/debug/supabase` | SupabaseStatus | `src/App.tsx:133` |
| `/pos` | POSPage | `src/App.tsx:136` |
| `/not-authorized` | NotAuthorizedPage | `src/App.tsx:139` |
| `/admin` | AdminOverview | `src/App.tsx:143` |
| `/admin/products` | AdminProducts | `src/App.tsx:144` |
| `/admin/categories` | AdminCategories | `src/App.tsx:145` |
| `/admin/inventory` | AdminInventory | `src/App.tsx:146` |
| `/admin/orders` | AdminOrders | `src/App.tsx:147` |
| `/admin/repair-tickets` | AdminRepairTickets | `src/App.tsx:148` |
| `/admin/gift-cards` | AdminGiftCards | `src/App.tsx:149` |
| `/admin/customers` | AdminCustomers | `src/App.tsx:150` |
| `/admin/staff` | AdminStaff | `src/App.tsx:151` |
| `/admin/discounts` | AdminDiscounts | `src/App.tsx:152` |
| `/admin/reports` | AdminReports | `src/App.tsx:153` |

### Laravel Route Groups

| Group | Middleware | File:Line |
|-------|------------|-----------|
| POS | `auth`, `role:admin,cashier,warehouse,warehouse_manager` | `web.php` |
| Admin Overview | `auth`, `role:admin,finance` | `web.php` |
| Staff Management | `auth`, `role:admin` | `web.php` |
| Kiosk | `auth`, `role:admin,cashier,warehouse_manager` | `web.php` |

## Layouts Used

| Layout | Routes | Location |
|--------|--------|----------|
| `StorefrontLayout` | Storefront pages | `src/App.tsx:84` |
| `AccountLayout` | Account portal | `src/App.tsx:112` |
| `AdminLayout` | Admin pages | `src/App.tsx:142` |

## Route Count Summary

| Category | Count |
|----------|-------|
| Storefront | 19 |
| Account | 11 |
| Staff/Admin | 16 |
| **Total** | **46** |
