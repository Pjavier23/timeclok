-- Migration 005: Time Off Requests
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  denial_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_off_employee ON public.time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_company ON public.time_off_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON public.time_off_requests(status);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view and create their own requests
CREATE POLICY "Employees manage own time off" ON public.time_off_requests
  FOR ALL USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Owners can view and update all requests for their company
CREATE POLICY "Owners manage company time off" ON public.time_off_requests
  FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );
