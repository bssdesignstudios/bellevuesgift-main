# Bellevue Gifts: Conversion Checklist

**Purpose:** Track progress during the Laravel consolidation migration  
**Version:** 1.0  
**Last Updated:** 2026-02-09

---

## Phase 1: Database Consolidation

### 1.1 Schema Verification
- [x] Users table with role column
- [x] Categories table
- [x] Products table
- [x] Inventory table
- [x] Inventory adjustments table
- [x] Customers table
- [x] Orders table
- [x] Order items table
- [x] Payments table
- [x] Gift cards table
- [x] Coupons table
- [x] Store settings table
- [x] Repair tickets table
- [x] Vendors table
- [ ] Product reviews table (to be added)
- [ ] Analytics events table (optional)

### 1.2 Data Migration
- [ ] Export Supabase data (if applicable)
- [ ] Import to Laravel database
- [ ] Verify record counts match
- [ ] Test foreign key relationships
- [ ] Verify order number generation

### 1.3 Seeders
- [x] Admin user (admin@bellevue.com)
- [x] Cashier user (cashier@bellevue.com)
- [x] Warehouse manager (warehouse@bellevue.com)
- [ ] Finance user (finance@bellevue.com)
- [ ] Warehouse staff (warehouse_staff@bellevue.com)
- [x] Sample categories (15+)
- [x] Sample products (50+)
- [ ] Sample gift cards

---

## Phase 2: Authentication Consolidation

### 2.1 Staff Login
- [x] Login endpoint works
- [x] Admin redirects to /admin
- [x] Cashier redirects to /pos
- [x] Warehouse manager redirects to /kiosk/warehouse
- [ ] Finance redirects to /admin
- [ ] Warehouse staff redirects to /pos

### 2.2 Frontend Auth
- [ ] Remove email heuristic from StaffLoginPage.tsx
- [ ] Use role from authenticated user
- [ ] Handle auth errors gracefully
- [ ] Loading states implemented

### 2.3 Customer Auth
- [ ] Customer registration endpoint
- [ ] Customer login endpoint
- [ ] Password reset flow
- [ ] Email verification (optional)

### 2.4 Security
- [ ] Demo mode disabled in production
- [ ] Credentials rotated for production
- [ ] HTTPS enforced
- [ ] CSRF tokens validated

---

## Phase 3: Route Consolidation

### 3.1 Storefront Routes
- [x] / (Homepage)
- [x] /shop
- [x] /category/:slug
- [x] /product/:slug
- [x] /cart
- [x] /checkout
- [x] /checkout/success/:id
- [x] /gift-cards
- [x] /gift-cards/balance
- [x] /repair
- [x] /contact
- [x] /about
- [x] /faq
- [x] /returns
- [x] /shipping
- [x] /search

### 3.2 Account Routes
- [x] /account/login
- [x] /account/register
- [x] /account/forgot-password
- [x] /account (dashboard)
- [x] /account/orders
- [x] /account/orders/:id
- [x] /account/addresses
- [x] /account/wishlist
- [x] /account/gift-cards
- [x] /account/settings

### 3.3 Staff Routes
- [x] /staff/login
- [x] /pos
- [x] /admin
- [x] /admin/products
- [x] /admin/categories
- [x] /admin/inventory
- [x] /admin/orders
- [x] /admin/customers
- [x] /admin/staff
- [x] /admin/discounts
- [x] /admin/reports
- [x] /admin/gift-cards
- [x] /admin/repair-tickets

### 3.4 Kiosk Routes
- [x] /kiosk/warehouse
- [ ] /kiosk/cashier (if separate from /pos)
- [ ] /kiosk/admin (if separate from /admin)

---

## Phase 4: Feature Implementation

### 4.1 Product Reviews
- [ ] Migration created
- [ ] Model created
- [ ] Controller created
- [ ] Review form on product page
- [ ] Review list on product page
- [ ] Admin moderation interface

### 4.2 Analytics
- [ ] Google Analytics configured
- [ ] Page view tracking
- [ ] E-commerce events (add_to_cart)
- [ ] E-commerce events (purchase)
- [ ] Conversion tracking

### 4.3 Gift Cards
- [x] Database table exists
- [x] Balance check endpoint
- [x] Apply to order
- [ ] Purchase gift card (web)
- [ ] Admin CRUD interface

### 4.4 Repair Tickets
- [x] Database table exists
- [x] Admin list view
- [ ] Create ticket (web form)
- [ ] Track ticket status
- [ ] Customer notifications

### 4.5 PWA
- [x] Manifest configured
- [x] Service worker registered
- [x] Offline caching
- [ ] Install prompt
- [ ] Icon files verified (192x192, 512x512)

---

## Phase 5: Legacy Code Removal

### 5.1 Files to Remove
- [ ] src/integrations/supabase/ (after migration)
- [ ] src/lib/demoSession.ts (production only)
- [ ] Unused Supabase dependencies

### 5.2 Environment Cleanup
- [ ] Remove VITE_SUPABASE_URL
- [ ] Remove VITE_SUPABASE_PUBLISHABLE_KEY
- [ ] Update .env.example

### 5.3 Documentation
- [ ] Update README.md
- [ ] Update deployment docs
- [ ] Archive legacy code

---

## Pre-Launch Checklist

### Performance
- [ ] Lighthouse score > 80
- [ ] First contentful paint < 2s
- [ ] Time to interactive < 3s
- [ ] No layout shifts

### Accessibility
- [ ] All images have alt text
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works
- [ ] Color contrast passes

### SEO
- [ ] Meta titles on all pages
- [ ] Meta descriptions
- [ ] Open Graph tags
- [ ] Sitemap generated
- [ ] Robots.txt configured

### Security
- [ ] All credentials rotated
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] No sensitive data in logs

### Monitoring
- [ ] Error tracking configured
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Alerting configured

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
| Operations | | | |

---

## Notes

_Add any additional notes, blockers, or decisions here:_

1. 

2. 

3. 
