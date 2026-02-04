-- Loyalty Points & Customer Tiers System
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_tier TEXT DEFAULT 'retail' CHECK (customer_tier IN ('retail', 'school', 'corporate', 'vip'));
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tier_discount NUMERIC DEFAULT 0;

-- Loyalty Transactions Log
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjustment')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Register Support
CREATE TABLE IF NOT EXISTS public.registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Freeport Store',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Register Sessions
CREATE TABLE IF NOT EXISTS public.register_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES public.registers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC,
  expected_balance NUMERIC,
  notes TEXT
);

-- POS Activity Logs
CREATE TABLE IF NOT EXISTS public.pos_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES public.registers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add register reference to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id) ON DELETE SET NULL;

-- Offline Queue for POS
CREATE TABLE IF NOT EXISTS public.offline_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES public.registers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff
CREATE POLICY "Staff can view loyalty transactions" ON public.loyalty_transactions FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can insert loyalty transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can view registers" ON public.registers FOR SELECT USING (public.is_staff());
CREATE POLICY "Admin can manage registers" ON public.registers FOR ALL USING (public.is_admin());

CREATE POLICY "Staff can view register sessions" ON public.register_sessions FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can manage own sessions" ON public.register_sessions FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update sessions" ON public.register_sessions FOR UPDATE USING (public.is_staff());

CREATE POLICY "Staff can view activity logs" ON public.pos_activity_logs FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can insert activity logs" ON public.pos_activity_logs FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can view offline queue" ON public.offline_queue FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can manage offline queue" ON public.offline_queue FOR ALL USING (public.is_staff());

-- Customer can view own loyalty
CREATE POLICY "Customers view own loyalty" ON public.loyalty_transactions FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
);

-- Seed default registers
INSERT INTO public.registers (name, location) VALUES
  ('Register 1', 'Freeport Store'),
  ('Register 2', 'Freeport Store')
ON CONFLICT DO NOTHING;