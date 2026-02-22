-- TimeClok Database Schema
-- Run this in Supabase SQL Editor

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_type TEXT CHECK (user_type IN ('owner', 'employee', 'supervisor')),
  company_id UUID,
  hourly_rate DECIMAL(10, 2),
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  hourly_rate DECIMAL(10, 2) NOT NULL,
  employee_type TEXT CHECK (employee_type IN ('w2', '1099', 'itin_contractor')),
  ssn_last_4 TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time Entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(10, 8),
  hours_worked DECIMAL(5, 2),
  approved_by UUID REFERENCES public.users(id),
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'on-hold')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Assignments table
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll table
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  week_ending DATE NOT NULL,
  total_hours DECIMAL(8, 2),
  hourly_rate DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  status TEXT CHECK (status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
  supervisor_id UUID REFERENCES public.users(id),
  paid_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - can be refined)
-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Employees can see their own data
CREATE POLICY "Employees can see own time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.employees WHERE id = employee_id
    )
  );

-- Owners can see all data in their company
CREATE POLICY "Owners can see company data"
  ON public.employees
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );
