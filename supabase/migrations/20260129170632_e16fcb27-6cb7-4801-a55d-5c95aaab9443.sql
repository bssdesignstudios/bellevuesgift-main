-- Bellevue Gifts & Supplies Ltd - Complete Database Schema

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  tax_class TEXT NOT NULL DEFAULT 'standard',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  location TEXT NOT NULL DEFAULT 'Freeport Store',
  qty_on_hand INTEGER NOT NULL DEFAULT 0,
  qty_reserved INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  island TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff table (linked to auth.users)
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('cashier', 'warehouse_manager', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'pos')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picking', 'ready', 'picked_up', 'shipped', 'delivered', 'cancelled', 'refunded')),
  fulfillment_method TEXT NOT NULL DEFAULT 'pickup' CHECK (fulfillment_method IN ('pickup', 'island_delivery', 'mailboat')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'pay_later', 'refunded', 'partial')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'split', 'gift_card', 'pay_later')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'gift_card')),
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gift cards table
CREATE TABLE public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  initial_balance DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Store settings table
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory adjustments table (for tracking changes)
CREATE TABLE public.inventory_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('receive', 'damage', 'shrink', 'count', 'sale', 'refund', 'reserve', 'unreserve')),
  qty_change INTEGER NOT NULL,
  notes TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Public read policies for storefront (categories, products, inventory)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Active products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Inventory is viewable by everyone" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Active coupons are viewable by everyone" ON public.coupons FOR SELECT USING (is_active = true);

-- Staff-only policies for admin operations
CREATE POLICY "Staff can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can manage all products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can manage inventory" ON public.inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can view customers" ON public.customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Anyone can create customers" ON public.customers FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update customers" ON public.customers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can view staff" ON public.staff FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true)
);

CREATE POLICY "Staff can view orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can manage order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Anyone can create payments" ON public.payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Gift cards viewable by staff" ON public.gift_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can manage gift cards" ON public.gift_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can manage coupons" ON public.coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff can view settings" ON public.store_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admins can manage settings" ON public.store_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true)
);

CREATE POLICY "Staff can manage inventory adjustments" ON public.inventory_adjustments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND is_active = true)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_channel ON public.orders(channel);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_staff_auth_user ON public.staff(auth_user_id);

-- Insert default VAT setting
INSERT INTO public.store_settings (key, value) VALUES ('vat_rate', '10');

-- Generate order number function
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
$$ LANGUAGE plpgsql SET search_path = public;