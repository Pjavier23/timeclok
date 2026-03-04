-- Migration 004: Fix RLS Security Advisor Errors
-- Run in Supabase SQL Editor
-- Fixes: Policy Exists RLS Disabled + RLS Disabled in Public for companies, project_assignments, schedules, projects

-- ============================================================
-- 1. public.companies — Enable RLS (policies already exist via schema.sql)
-- ============================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add policies for companies if they don't exist
DO $$
BEGIN
  -- Owners can view their own company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Owners can view own company'
  ) THEN
    CREATE POLICY "Owners can view own company" ON public.companies
      FOR SELECT USING (owner_id = auth.uid());
  END IF;

  -- Owners can update their own company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Owners can update own company'
  ) THEN
    CREATE POLICY "Owners can update own company" ON public.companies
      FOR UPDATE USING (owner_id = auth.uid());
  END IF;

  -- Owners can insert (create) a company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Owners can insert company'
  ) THEN
    CREATE POLICY "Owners can insert company" ON public.companies
      FOR INSERT WITH CHECK (owner_id = auth.uid());
  END IF;

  -- Employees can view the company they belong to
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Employees can view own company'
  ) THEN
    CREATE POLICY "Employees can view own company" ON public.companies
      FOR SELECT USING (
        id IN (
          SELECT company_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- 2. public.project_assignments — Enable RLS + add policies
-- ============================================================
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Owners can manage project assignments for their company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_assignments' AND policyname = 'Owners manage project assignments'
  ) THEN
    CREATE POLICY "Owners manage project assignments" ON public.project_assignments
      FOR ALL USING (
        project_id IN (
          SELECT id FROM public.projects WHERE company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
          )
        )
      );
  END IF;

  -- Employees can view their own assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_assignments' AND policyname = 'Employees view own assignments'
  ) THEN
    CREATE POLICY "Employees view own assignments" ON public.project_assignments
      FOR SELECT USING (
        employee_id IN (
          SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- 3. public.projects — RLS enabled but no policies existed
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Owners manage projects') THEN
    CREATE POLICY "Owners manage projects" ON public.projects
      FOR ALL USING (
        company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Employees view company projects') THEN
    CREATE POLICY "Employees view company projects" ON public.projects
      FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================
-- 4. public.schedules — Ensure RLS is enabled (migration 003 may have used bare table name)
-- ============================================================
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Owners manage schedules'
  ) THEN
    CREATE POLICY "Owners manage schedules" ON public.schedules
      FOR ALL USING (
        company_id IN (
          SELECT id FROM public.companies WHERE owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Employees view own schedules'
  ) THEN
    CREATE POLICY "Employees view own schedules" ON public.schedules
      FOR SELECT USING (
        employee_id IN (
          SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
