# Database Agent: Evidence Report

## Summary

The application uses **two database systems**:
1. **Laravel SQLite/PostgreSQL** - Production database (15 migrations)
2. **Supabase PostgreSQL** - Legacy cloud database (6 migrations)

## Evidence

### Laravel Migrations (15 files)

**Location:** `backend/database/migrations/`

| Migration | Tables Created |
|-----------|---------------|
| `0001_01_01_000000_create_users_table.php` | `users`, `password_reset_tokens`, `sessions` |
| `0001_01_01_000001_create_cache_table.php` | `cache`, `cache_locks` |
| `0001_01_01_000002_create_jobs_table.php` | `jobs`, `job_batches`, `failed_jobs` |
| `2026_02_04_025209_create_shop_base_tables.php` | `categories`, `products`, `inventory`, `inventory_adjustments` |
| `2026_02_04_025226_create_customer_system_tables.php` | `customers` |
| `2026_02_04_025242_create_order_management_tables.php` | `orders`, `order_items`, `payments`, `gift_cards`, `coupons`, `store_settings` |
| `2026_02_04_025301_create_ops_and_pos_tables.php` | `registers` |
| `2026_02_04_053715_add_role_to_users_table.php` | Adds `role` to `users` |
| `2026_02_04_072000_create_generate_order_number_function.php` | Order number function |
| `2026_02_04_115130_seed_gift_card_products.php` | Gift card product data |
| `2026_02_04_115321_seed_test_gift_cards.php` | Test gift cards |
| `2026_02_04_152237_create_repair_tickets_table.php` | `repair_tickets` |
| `2026_02_04_172904_add_inventory_fields_to_products_and_categories.php` | Additional product/category fields |
| `2026_02_04_180452_create_vendors_table.php` | `vendors` |
| `2026_02_04_180516_add_vendor_id_to_products_table.php` | `vendor_id` on products |

### Table Schemas

#### Users Table
```php
$table->id();
$table->string('name');
$table->string('email')->unique();
$table->timestamp('email_verified_at')->nullable();
$table->string('password');
$table->string('role')->default('customer'); // admin, cashier, warehouse, customer
$table->rememberToken();
$table->timestamps();
```

#### Products Table
```php
$table->uuid('id')->primary();
$table->foreignUuid('category_id')->nullable();
$table->string('name');
$table->string('slug')->unique();
$table->string('sku')->unique();
$table->string('barcode')->nullable();
$table->text('description')->nullable();
$table->decimal('price', 10, 2);
$table->decimal('sale_price', 10, 2)->nullable();
$table->string('tax_class')->default('standard');
$table->string('image_url')->nullable();
$table->string('card_color')->nullable();
$table->string('hex_code')->nullable();
$table->boolean('is_active')->default(true);
$table->timestamps();
```

#### Orders Table
```php
$table->uuid('id')->primary();
$table->string('order_number')->unique();
$table->foreignUuid('customer_id')->nullable();
$table->uuid('staff_id')->nullable();
$table->uuid('register_id')->nullable();
$table->enum('channel', ['web', 'pos']);
$table->enum('status', ['pending', 'confirmed', 'picking', 'ready', 'picked_up', 'shipped', 'delivered', 'cancelled', 'refunded'])->default('pending');
$table->enum('fulfillment_method', ['pickup', 'island_delivery', 'mailboat'])->default('pickup');
$table->enum('payment_status', ['pending', 'paid', 'pay_later', 'refunded', 'partial'])->default('pending');
$table->enum('payment_method', ['cash', 'card', 'split', 'gift_card', 'pay_later'])->nullable();
$table->decimal('subtotal', 10, 2)->default(0);
$table->decimal('vat_amount', 10, 2)->default(0);
$table->decimal('discount_amount', 10, 2)->default(0);
$table->decimal('total', 10, 2)->default(0);
$table->text('notes')->nullable();
$table->string('pickup_code')->nullable();
$table->timestamps();
```

#### Repair Tickets Table
```php
$table->uuid('id')->primary();
$table->foreignUuid('customer_id')->nullable();
$table->string('ticket_number')->unique();
$table->string('customer_name');
$table->string('customer_phone');
$table->string('item_type');
$table->text('issue_description');
$table->enum('status', ['pending', 'in_progress', 'completed', 'picked_up', 'cancelled'])->default('pending');
$table->text('technician_notes')->nullable();
$table->decimal('estimated_cost', 10, 2)->nullable();
$table->timestamps();
```

### Supabase Schema

**Location:** `supabase/migrations/20260129170632_*.sql`

Core tables (same as Laravel):
- `categories`
- `products`
- `inventory`
- `customers`
- `staff` (links to `auth.users`)
- `orders`
- `order_items`
- `payments`
- `gift_cards`
- `coupons`
- `store_settings`
- `inventory_adjustments`

### RLS Policies (Supabase)

```sql
-- Public read for products
CREATE POLICY "Active products are viewable by everyone" 
  ON public.products FOR SELECT USING (is_active = true);

-- Staff-only write
CREATE POLICY "Staff can manage all products" 
  ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
  );

-- Admin-only for staff management
CREATE POLICY "Admins can manage staff" 
  ON public.staff FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true)
  );
```

### Foreign Key Relationships

| Child Table | Foreign Key | Parent Table |
|-------------|-------------|--------------|
| products | category_id | categories |
| products | vendor_id | vendors |
| inventory | product_id | products |
| inventory_adjustments | product_id | products |
| orders | customer_id | customers |
| orders | staff_id | users |
| order_items | order_id | orders |
| order_items | product_id | products |
| payments | order_id | orders |
| repair_tickets | customer_id | customers |

### Order Number Generation

```sql
-- Pattern: BLV-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_order_number TEXT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'BLV-' || year_part || '-%';
  
  new_order_number := 'BLV-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;
```

## Missing Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `product_reviews` | Customer reviews | ❌ Not implemented |
| `analytics_events` | Usage tracking | ❌ Not implemented |
| `wishlist_items` | Customer wishlists | ❌ Not implemented |

## Recommendations

1. Add product reviews table
2. Consider analytics events table
3. Remove redundant Supabase schema after migration
4. Add database indexes for performance
