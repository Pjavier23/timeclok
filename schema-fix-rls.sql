-- FIX: Drop old RLS policies and recreate with proper INSERT/UPDATE permissions

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Employees can see own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Owners can see company data" ON public.employees;

-- Create new RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS for employees
CREATE POLICY "Employees can view own data"
  ON public.employees
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can insert own record"
  ON public.employees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can see own time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert own time entries"
  ON public.time_entries
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own time entries"
  ON public.time_entries
  FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS for payroll
CREATE POLICY "Users can see own payroll"
  ON public.payroll
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS for companies
CREATE POLICY "Owners can see own company"
  ON public.companies
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can see company employees"
  ON public.employees
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );
