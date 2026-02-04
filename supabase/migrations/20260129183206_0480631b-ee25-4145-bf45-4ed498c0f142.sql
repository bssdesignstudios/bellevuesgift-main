-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Staff can manage all products" ON public.products;
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff can manage gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Staff can view staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can manage inventory adjustments" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Staff can view settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.store_settings;
DROP POLICY IF EXISTS "Inventory is viewable by everyone" ON public.inventory;
DROP POLICY IF EXISTS "Gift cards viewable by staff" ON public.gift_cards;
DROP POLICY IF EXISTS "Active coupons are viewable by everyone" ON public.coupons;

-- Create a security definer function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE auth_user_id = auth.uid()
      AND is_active = true
  )
$$;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- Staff table policies (using security definer functions)
CREATE POLICY "Staff can view staff" ON public.staff
FOR SELECT USING (public.is_staff());

CREATE POLICY "Admins can manage staff" ON public.staff
FOR ALL USING (public.is_admin());

-- Categories policies
CREATE POLICY "Staff can manage categories" ON public.categories
FOR ALL USING (public.is_staff());

-- Products policies
CREATE POLICY "Staff can manage all products" ON public.products
FOR ALL USING (public.is_staff());

-- Inventory policies
CREATE POLICY "Inventory is viewable by everyone" ON public.inventory
FOR SELECT USING (true);

CREATE POLICY "Staff can manage inventory" ON public.inventory
FOR ALL USING (public.is_staff());

-- Orders policies
CREATE POLICY "Staff can view orders" ON public.orders
FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE USING (public.is_staff());

-- Order items policies
CREATE POLICY "Staff can view order items" ON public.order_items
FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can manage order items" ON public.order_items
FOR ALL USING (public.is_staff());

-- Payments policies
CREATE POLICY "Staff can manage payments" ON public.payments
FOR ALL USING (public.is_staff());

-- Customers policies
CREATE POLICY "Staff can view customers" ON public.customers
FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can update customers" ON public.customers
FOR UPDATE USING (public.is_staff());

-- Coupons policies
CREATE POLICY "Active coupons are viewable by everyone" ON public.coupons
FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage coupons" ON public.coupons
FOR ALL USING (public.is_staff());

-- Gift cards policies
CREATE POLICY "Gift cards viewable by staff" ON public.gift_cards
FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can manage gift cards" ON public.gift_cards
FOR ALL USING (public.is_staff());

-- Inventory adjustments policies
CREATE POLICY "Staff can manage inventory adjustments" ON public.inventory_adjustments
FOR ALL USING (public.is_staff());

-- Store settings policies
CREATE POLICY "Staff can view settings" ON public.store_settings
FOR SELECT USING (public.is_staff());

CREATE POLICY "Admins can manage settings" ON public.store_settings
FOR ALL USING (public.is_admin());