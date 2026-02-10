# Feature Specs: Reviews & Internal Analytics

**Version:** 1.0  
**Scope:** New Capability Specifications

---

## 1. Product Reviews System

### 1.1 Database Schema (Migrations)
- **Table:** `product_reviews`
- **Fields:**
    - `id` (UUID) - Primary Key
    - `product_id` (UUID) - Foreign Key to products
    - `customer_id` (UUID - Optional) - Foreign Key to customers
    - `rating` (Integer 1-5)
    - `title` (String)
    - `comment` (Text)
    - `is_approved` (Boolean, Default: False)
    - `is_verified_purchase` (Boolean, Default: False)
    - `staff_notes` (Text - Private)
    - `created_at / updated_at`

### 1.2 Endpoints (Inertia Actions)
| Action | Method | Path | Role |
|--------|--------|------|------|
| Store Review | `POST` | `/product/review` | logged-in customer |
| List Reviews | `GET` | `/api/product/{id}/reviews` | Public (Approved only) |
| Moderate | `PATCH` | `/admin/reviews/{id}`| admin |

### 1.3 UI/UX Specifications
- **Storefront:** 
    - Star rating summary next to product title.
    - Reviews tab at bottom of product page.
    - "Write a Review" modal for authenticated users.
- **Customer Account:**
    - "My Reviews" section to track submission status (Pending/Approved).
- **Admin Panel:**
    - New "Reviews" menu item.
    - Table view with "Approve" / "Reject" / "Context (Order Ref)" buttons.

### 1.4 Acceptance Tests
1. Authenticated user submits a 5-star review.
2. Review must NOT appear on the product page immediately.
3. Admin approves the review.
4. Review must appear on product page and star average must update.

---

## 2. Internal Analytics Engine

### 2.1 Database Schema
- **Table:** `analytics_events`
- **Fields:**
    - `event_name` (e.g., `atc`, `checkout_started`, `pos_completion`)
    - `user_id` / `session_id`
    - `role` (Identity of the actor)
    - `route` (Where the event occurred)
    - `metadata` (JSON - Store product IDs, cart values, errors)
    - `created_at`

### 2.2 Instrumentation Points (Hooks)
- **Page Views:** Listen to Inertia router visit events.
- **Conversion Funnel:**
    - Hook into `addItem` in `CartContext.tsx`.
    - Hook into `handleSubmit` in `CheckoutPage.tsx`.
- **POS Operations:**
    - Record event on `pos_sale_completed` in `POSPage.tsx`.
    - Record event on `pickup_confirmed`.

### 2.3 Admin Reporting
- **Dashboard Widgets:**
    - Sales by Channel (Dynamic pie chart: Web vs. POS).
    - Inventory Velocity (Most sold items per week).
    - Staff Performance (Transaction count per cashier).

### 2.4 Acceptance Tests
1. Click "Add to Cart" on a product.
2. Verify a record exists in `analytics_events` with `event_name: 'add_to_cart'`.
3. Complete a POS transaction.
4. Verify `analytics_events` contains `event_name: 'pos_sale_completed'` with the ticket total in JSON metadata.

---

## 3. Priority & Implementation Sequence

1. **Analytics Storage (Backend):** Create migration and Event listener.
2. **Review Storage (Backend):** Create migration and Model logic.
3. **Admin Monitoring (UI):** Add Analytics charts and Review moderation table.
4. **Storefront Integration (UI):** Star ratings and Review submission forms.
