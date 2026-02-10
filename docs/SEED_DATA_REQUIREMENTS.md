# Bellevue Gifts: Seed Data Requirements

**Version:** 1.0  
**Context:** QA & Demo Environment Setup

---

## 1. Staff Accounts Matrix

Required to support all RBAC test cases:

| Role | Email | Password | Requirement |
|------|-------|----------|-------------|
| **Admin** | `admin@bellevue.com` | `password` | Already exists in `ShopSeeder.php` |
| **Cashier** | `cashier@bellevue.com` | `password` | Already exists in `ShopSeeder.php` |
| **Warehouse Manager** | `warehouse@bellevue.com` | `password` | Already exists in `ShopSeeder.php` |
| **Finance** | `finance@bellevue.com` | `password` | **MISSING** - Must be added to seeder |
| **Warehouse Staff** | `warehouse_staff@bellevue.com` | `password` | **MISSING** - Must be added to seeder |

---

## 2. Product & Catalog Distribution

To simulate a "Real World" store:
- **Total Products:** Minimum 50.
- **Categories:** Coverage for "Gifts", "Supplies", "Seasonal", "Repairs".
- **Inventory:** 20% of products must have stock < 10 (triggers Low Stock alerts).
- **Price Mix:** Products ranging from $5 to $500.

---

## 3. Order Data Requirements

### 3.1 Channel Split
- **Storefront (Web):** 10 orders with various statuses (`pending`, `shipped`).
- **POS:** 20 orders marked as `channel:pos`.

### 3.2 Functional Scenarios
- **Verification Flow:** 5 orders marked as `payment_status: pay_later` and `fulfillment_method: pickup`. Used to test Cashier collection flows.
- **Gift Card Usage:** 2 orders where `payment_method: gift_card`.

---

## 4. Repairs & Services

- **Repairs:** Minimum 10 tickets.
- **Distribution:** 
    - 3 `pending`
    - 2 `in_progress`
    - 3 `completed` (ready for pickup)
    - 2 `picked_up`.

---

## 5. Gift Cards & Coupons

- **Gift Cards:** 5 active codes with balances between $25 and $100. 1 disabled (inactive) code.
- **Coupons:** 
    - `WELCOME10`: 10% fixed.
    - `BELLEVUE25`: 25% for orders > $100.
    - `EXPIRED5`: Date in the past (to test failure case).

---

## 6. Current Seeder Audit (Evidence)

### Existing Seeders
- `backend/database/seeders/ShopSeeder.php`: Creates basic admin, cashier, and warehouse manager. Populates initial categories and products.

### Critical Gaps
1. **Missing Roles:** No finance or warehouse staff accounts.
2. **Missing Flow Data:** No pre-seeded orders or repair tickets, resulting in empty dashboards.
3. **Missing Gift Cards:** Test gift cards must be manually created in DB.

---

## 7. Implementation Plan
- Update `ShopSeeder.php` to include the `Staff Accounts Matrix`.
- Create a new `OrderSeeder.php` to populate 30+ transactions.
- Create a new `RepairSeeder.php` for ticket management demo.
