-- Create repair_tickets table
CREATE TABLE public.repair_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_contact TEXT DEFAULT 'phone',
  service_type TEXT NOT NULL CHECK (service_type IN ('repair', 'installation')),
  item_make TEXT,
  model_number TEXT,
  serial_number TEXT,
  problem_description TEXT NOT NULL,
  dropoff_method TEXT DEFAULT 'in-store' CHECK (dropoff_method IN ('in-store', 'pickup')),
  requested_date DATE,
  photos_urls TEXT[],
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'received', 'diagnosing', 'awaiting_parts', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled')),
  eta_date DATE,
  parts_list JSONB DEFAULT '[]',
  labor_hours NUMERIC DEFAULT 0,
  labor_rate NUMERIC DEFAULT 50,
  parts_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  assigned_staff_id UUID REFERENCES public.staff(id),
  customer_id UUID REFERENCES public.customers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repair_tasks table for project-style tasks
CREATE TABLE public.repair_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  assigned_to UUID REFERENCES public.staff(id),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for repair_tickets
CREATE POLICY "Anyone can create repair tickets" 
ON public.repair_tickets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can view all repair tickets" 
ON public.repair_tickets 
FOR SELECT 
USING (is_staff());

CREATE POLICY "Staff can update repair tickets" 
ON public.repair_tickets 
FOR UPDATE 
USING (is_staff());

CREATE POLICY "Customers can view their own repair tickets" 
ON public.repair_tickets 
FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Anyone can view repair ticket by ticket number" 
ON public.repair_tickets 
FOR SELECT 
USING (true);

-- RLS policies for repair_tasks
CREATE POLICY "Staff can manage repair tasks" 
ON public.repair_tasks 
FOR ALL 
USING (is_staff());

CREATE POLICY "Anyone can view tasks for visible tickets" 
ON public.repair_tasks 
FOR SELECT 
USING (true);

-- Function to generate repair ticket number
CREATE OR REPLACE FUNCTION public.generate_repair_ticket_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.repair_tickets
  WHERE ticket_number LIKE 'RPR-' || year_part || '-%';
  
  new_ticket_number := 'RPR-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN new_ticket_number;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_repair_tickets_updated_at
BEFORE UPDATE ON public.repair_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repair_tasks_updated_at
BEFORE UPDATE ON public.repair_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();