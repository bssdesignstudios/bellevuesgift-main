-- Add pickup_code column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pickup_code TEXT;

-- Create customer_addresses table for saved addresses
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  island TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- Add auth_user_id to customers table for customer auth
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Create unique index on customer auth_user_id
CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_idx ON public.customers(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_addresses
CREATE POLICY "Customers can view their own addresses"
ON public.customer_addresses FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert their own addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update their own addresses"
ON public.customer_addresses FOR UPDATE
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can delete their own addresses"
ON public.customer_addresses FOR DELETE
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage all addresses"
ON public.customer_addresses FOR ALL
USING (is_staff());

-- RLS policies for wishlists
CREATE POLICY "Customers can view their own wishlist"
ON public.wishlists FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can add to their wishlist"
ON public.wishlists FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can remove from their wishlist"
ON public.wishlists FOR DELETE
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all wishlists"
ON public.wishlists FOR SELECT
USING (is_staff());

-- Update customers table RLS to allow customers to view/update their own profile
CREATE POLICY "Customers can view their own profile"
ON public.customers FOR SELECT
USING (auth_user_id = auth.uid());

CREATE POLICY "Customers can update their own profile"
ON public.customers FOR UPDATE
USING (auth_user_id = auth.uid());

-- Update orders table RLS for customers to see their own orders
CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

-- Update order_items RLS for customers
CREATE POLICY "Customers can view their own order items"
ON public.order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE customer_id IN (
      SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
    )
  )
);

-- Function to generate pickup code
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate pickup code for pickup orders
CREATE OR REPLACE FUNCTION public.set_pickup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fulfillment_method = 'pickup' AND NEW.pickup_code IS NULL THEN
    NEW.pickup_code := generate_pickup_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_set_pickup_code
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_pickup_code();

-- Create trigger for updated_at on customer_addresses
CREATE TRIGGER update_customer_addresses_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();