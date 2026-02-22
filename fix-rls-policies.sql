-- DROP existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Employees can see own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Owners can see company data" ON public.employees;

-- NEW PERMISSIVE POLICIES FOR SIGNUP
-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to select their own profile
CREATE POLICY "Users can select own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow anyone to insert companies (owner creates during signup)
CREATE POLICY "Anyone can create companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to select their companies
CREATE POLICY "Owners can select their companies"
  ON public.companies
  FOR SELECT
  USING (owner_id = auth.uid());

-- Allow anyone to insert into employees table
CREATE POLICY "Users can insert employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR company_id IN (
    SELECT id FROM public.companies WHERE owner_id = auth.uid()
  ));

-- Employees can see their own time entries
CREATE POLICY "Employees can insert own time entries"
  ON public.time_entries
  FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Employees can select own time entries"
  ON public.time_entries
  FOR SELECT
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Allow payroll inserts/selects for owners
CREATE POLICY "Owners can see payroll"
  ON public.payroll
  FOR SELECT
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  ));
